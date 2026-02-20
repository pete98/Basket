import { ProductCard } from '@/components/product-card';
import { ThemedText } from '@/components/themed-text';
import { useCart } from '@/contexts/cart-context';
import { getStoreInventory } from '@/lib/api/stores';
import { UIProduct } from '@/lib/types/ui';
import { buildCategoryNameCandidates } from '@/lib/utils/category';
import { formatWeight, mapApiProductToProduct } from '@/lib/utils/products';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface CategoryParams {
  displayName?: string;
  code?: string;
  storeId?: string;
}

const ACCESS_TOKEN_KEY = 'auth0_access_token';

function parseStoreIdParam(storeId: string | undefined): number | null {
  if (!storeId) return null;
  const parsedStoreId = Number.parseInt(storeId, 10);
  if (Number.isNaN(parsedStoreId)) return null;
  return parsedStoreId;
}

function normalizeCategoryValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function tokenizeCategoryValue(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(/[,/|>]/)
    .map((token) => normalizeCategoryValue(token))
    .filter((token) => token.length > 0);
}

export default function CategoryProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<CategoryParams>();
  const insets = useSafeAreaInsets();
  const { getCredentials } = useAuth0();
  const { addItem, updateQuantity, state } = useCart();
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UIProduct | null>(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [addButtonState, setAddButtonState] = useState<'idle' | 'added'>('idle');
  const addToCartScale = useRef(new Animated.Value(1)).current;
  const addButtonFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeModalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryLabel =
    typeof params.displayName === 'string' && params.displayName.trim().length > 0
      ? params.displayName
      : 'Category';

  const categoryCandidates = useMemo(
    () =>
      buildCategoryNameCandidates({
        displayName: typeof params.displayName === 'string' ? params.displayName : undefined,
        code: typeof params.code === 'string' ? params.code : undefined,
      }),
    [params.code, params.displayName]
  );
  const normalizedCategoryCandidates = useMemo(
    () => categoryCandidates.map((candidate) => normalizeCategoryValue(candidate)),
    [categoryCandidates]
  );
  const routeStoreId = parseStoreIdParam(typeof params.storeId === 'string' ? params.storeId : undefined);
  const resolvedStoreId = routeStoreId;
  const getAccessToken = useCallback(async () => {
    let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (accessToken) return accessToken;
    const credentials = await getCredentials();
    accessToken = credentials?.accessToken ?? null;
    if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    return accessToken;
  }, [getCredentials]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadProducts() {
      if (categoryCandidates.length === 0) {
        if (!isMounted) return;
        setProducts([]);
        setIsLoading(false);
        setErrorMessage('Missing category details');
        return;
      }

      if (resolvedStoreId === null) {
        if (!isMounted) return;
        setProducts([]);
        setIsLoading(false);
        setErrorMessage('Select a store to view category products.');
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (!isMounted) return;
          setProducts([]);
          setErrorMessage('Log in to load products.');
          return;
        }

        const inventory = await getStoreInventory({
          storeId: resolvedStoreId,
          accessToken,
          signal: abortController.signal,
        });
        const mappedProducts = inventory.map(mapApiProductToProduct);
        const filteredProducts = mappedProducts.filter((product) => {
          const productCategoryTokens = tokenizeCategoryValue(product.category || '');
          if (productCategoryTokens.length === 0) return false;
          return normalizedCategoryCandidates.some((candidate) =>
            productCategoryTokens.some((token) => token === candidate)
          );
        });

        if (!isMounted) return;
        setProducts(filteredProducts);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (!isMounted) return;
        setProducts([]);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load products');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [categoryCandidates, getAccessToken, normalizedCategoryCandidates, resolvedStoreId]);

  function openProductModal(product: UIProduct) {
    const cartItem = state.items.find((item) => item.id === product.id);
    if (addButtonFeedbackTimer.current) {
      clearTimeout(addButtonFeedbackTimer.current);
    }
    if (closeModalTimer.current) {
      clearTimeout(closeModalTimer.current);
    }
    setSelectedProduct(product);
    setSelectedQuantity(cartItem?.quantity || 1);
    setIsDescriptionOpen(false);
    setAddButtonState('idle');
    addToCartScale.setValue(1);
    setIsProductModalVisible(true);
  }

  function closeProductModal() {
    setIsProductModalVisible(false);
    setSelectedProduct(null);
    setIsDescriptionOpen(false);
  }

  function handleIncrement() {
    setSelectedQuantity((prev) => prev + 1);
  }

  function handleDecrement() {
    setSelectedQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }

  function handleAddToCart() {
    if (!selectedProduct) return;
    const desiredQuantity = Math.max(selectedQuantity, 1);
    const cartItem = state.items.find((item) => item.id === selectedProduct.id);
    const quantity = cartItem?.quantity || 0;

    if (quantity === 0) {
      addItem({
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        image: selectedProduct.image || '',
      });
      if (desiredQuantity > 1) {
        updateQuantity(selectedProduct.id, desiredQuantity);
      }
      return;
    }

    updateQuantity(selectedProduct.id, desiredQuantity);
  }

  function handleAddToCartPress() {
    handleAddToCart();
    setAddButtonState('added');

    if (addButtonFeedbackTimer.current) {
      clearTimeout(addButtonFeedbackTimer.current);
    }
    addButtonFeedbackTimer.current = setTimeout(() => {
      setAddButtonState('idle');
    }, 1200);

    if (closeModalTimer.current) {
      clearTimeout(closeModalTimer.current);
    }
    closeModalTimer.current = setTimeout(() => {
      closeProductModal();
    }, 700);

    Animated.sequence([
      Animated.timing(addToCartScale, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(addToCartScale, {
        toValue: 1.05,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(addToCartScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }

  useEffect(() => {
    if (!selectedProduct) return;
    const cartItem = state.items.find((item) => item.id === selectedProduct.id);
    setSelectedQuantity(cartItem?.quantity || 1);
  }, [selectedProduct, state.items]);

  useEffect(() => {
    return () => {
      if (addButtonFeedbackTimer.current) {
        clearTimeout(addButtonFeedbackTimer.current);
      }
      if (closeModalTimer.current) {
        clearTimeout(closeModalTimer.current);
      }
    };
  }, []);

  const formattedWeight = selectedProduct ? formatWeight(selectedProduct.weight, selectedProduct.weightUnit) : '';
  const weightCaloriesText =
    formattedWeight && selectedProduct?.calories
      ? `${formattedWeight} • ${selectedProduct.calories} cals`
      : formattedWeight
        ? formattedWeight
        : selectedProduct?.calories
          ? `${selectedProduct.calories} cals`
          : '';
  const normalizedName = selectedProduct?.name?.toLowerCase() ?? '';
  const quantityLabel = normalizedName.includes('avocado') ? 'avocado' : 'item';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          {categoryLabel}
        </ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a5568" />
          <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
        </View>
      ) : errorMessage ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ProductCard product={item} onPress={openProductModal} />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>
                No products found in this category
              </ThemedText>
            </View>
          }
        />
      )}

      <Modal
        visible={isProductModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeProductModal}
      >
        <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={[styles.modalCard, { paddingTop: 12 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeProductModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#111322" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeroCard}>
                <View style={styles.modalHeroImageWrapper}>
                  {selectedProduct?.image ? (
                    <Image
                      source={{ uri: selectedProduct.image }}
                      style={styles.modalHeroImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.modalImagePlaceholder}>
                      <Ionicons name="image-outline" size={72} color="#CED2DA" />
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.modalMeta}>
                <ThemedText style={styles.modalTitle}>
                  {selectedProduct?.name || 'Product'}
                </ThemedText>
                <Text style={styles.modalSubtitle}>
                  {weightCaloriesText || `1 ${quantityLabel}`}
                </Text>

                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalSalePrice}>
                    ${selectedProduct ? selectedProduct.price.toFixed(2) : '0.00'}
                  </Text>
                  {selectedProduct ? (
                    <Text style={styles.modalOriginalPrice}>
                      ${(selectedProduct.price * 1.13).toFixed(2)}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.modalDetailBlock}>
                  <TouchableOpacity
                    style={styles.modalAccordionHeader}
                    onPress={() => setIsDescriptionOpen((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalAccordionTitle}>Product detail</Text>
                    <Ionicons
                      name={isDescriptionOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#111322"
                    />
                  </TouchableOpacity>
                  {isDescriptionOpen ? (
                    <Text style={styles.modalDescription}>
                      {selectedProduct?.description || 'No description available.'}
                    </Text>
                  ) : null}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={handleDecrement}
                  disabled={selectedQuantity <= 1}
                >
                  <Text style={[styles.stepperButtonText, selectedQuantity <= 1 && styles.disabledText]}>
                    -
                  </Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{selectedQuantity}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={handleIncrement}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Animated.View style={[styles.cartButtonWrapper, { transform: [{ scale: addToCartScale }] }]}>
                <TouchableOpacity
                  style={styles.cartButton}
                  onPress={handleAddToCartPress}
                  activeOpacity={0.9}
                >
                  <Text style={styles.cartButtonText}>
                    {addButtonState === 'added' ? 'Item added!' : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '48%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
    color: '#475569',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#6B6B6B',
  },
  modalCard: {
    height: '100%',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalHeroCard: {
    marginHorizontal: 24,
    marginTop: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  modalHeroImageWrapper: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalHeroImage: {
    width: '100%',
    height: '100%',
  },
  modalImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7FB',
  },
  modalMeta: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#667085',
    marginTop: 4,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 14,
  },
  modalSalePrice: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalOriginalPrice: {
    fontSize: 16,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  modalDetailBlock: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    paddingTop: 14,
  },
  modalAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalAccordionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalDescription: {
    fontSize: 15,
    color: '#475467',
    lineHeight: 22,
    marginTop: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0F172A',
  },
  disabledText: {
    color: '#CFD3DA',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginHorizontal: 12,
  },
  cartButton: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#0DB44D',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cartButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  cartButtonWrapper: {
    flex: 1,
  },
});
