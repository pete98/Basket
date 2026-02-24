import { ProductCard } from '@/components/product-card';
import { ProductDetailSheet } from '@/components/product-detail-sheet';
import { ThemedText } from '@/components/themed-text';
import { useCart } from '@/contexts/cart-context';
import { getStoreInventory, getSubcategoriesByCategoryCode } from '@/lib/api/stores';
import { Product as ApiProduct, Subcategory } from '@/lib/types/api';
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
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CategoryParams {
  displayName?: string;
  code?: string;
  storeId?: string;
}

interface ProductSubcategorySection {
  id: string;
  title: string;
  products: UIProduct[];
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

function extractProductSubcategory(product: ApiProduct): string {
  return (
    product.subCategoryDisplayName ||
    product.subCategory ||
    ''
  ).trim();
}

function normalizeSubcategoryLookup(subcategory: Subcategory): Set<string> {
  const values = [subcategory.displayName, subcategory.code]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const candidates = new Set<string>();
  values.forEach((value) => {
    candidates.add(normalizeCategoryValue(value));
    tokenizeCategoryValue(value).forEach((token) => candidates.add(token));
  });
  return candidates;
}

function buildGroupedProductSections(
  inventory: ApiProduct[],
  subcategories: Subcategory[],
  normalizedCategoryCandidates: string[]
): ProductSubcategorySection[] {
  const filteredInventory = inventory.filter((product) => {
    const productCategoryTokens = tokenizeCategoryValue(
      product.categoryDisplayName ||
      product.categories ||
      product.subCategoryDisplayName ||
      product.subCategory ||
      ''
    );
    if (productCategoryTokens.length === 0) return false;
    return normalizedCategoryCandidates.some((candidate) => productCategoryTokens.includes(candidate));
  });
  if (filteredInventory.length === 0) return [];

  const subcategoryLookup = subcategories.map((subcategory) => ({
    subcategory,
    normalizedCandidates: normalizeSubcategoryLookup(subcategory),
  }));
  const sectionOrder = subcategoryLookup
    .sort((a, b) => {
      const orderA = a.subcategory.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.subcategory.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.subcategory.displayName.localeCompare(b.subcategory.displayName);
    })
    .map(({ subcategory }) => subcategory.code);

  const sectionsByCode = new Map<string, ProductSubcategorySection>();
  const sectionOrderSet = new Set<string>();

  const appendProduct = (code: string, title: string, product: ApiProduct) => {
    const existingSection = sectionsByCode.get(code);
    if (!existingSection) {
      sectionsByCode.set(code, {
        id: code,
        title,
        products: [mapApiProductToProduct(product)],
      });
      return;
    }
    existingSection.products.push(mapApiProductToProduct(product));
  };

  filteredInventory.forEach((product) => {
    const productSubcategory = extractProductSubcategory(product);
    const normalizedSubcategoryTokens = tokenizeCategoryValue(productSubcategory);
    const matchedSubcategory = subcategoryLookup.find(({ normalizedCandidates }) =>
      normalizedSubcategoryTokens.some((token) => normalizedCandidates.has(token))
    );

    if (matchedSubcategory) {
      const sectionCode = matchedSubcategory.subcategory.code;
      sectionOrderSet.add(sectionCode);
      appendProduct(sectionCode, matchedSubcategory.subcategory.displayName, product);
      return;
    }

    const fallbackTitle = productSubcategory || 'Other';
    const fallbackCode = `unmapped-${normalizeCategoryValue(fallbackTitle)}`;
    appendProduct(fallbackCode, fallbackTitle, product);
  });

  const configuredSections = sectionOrder
    .filter((code) => sectionOrderSet.has(code))
    .map((code) => sectionsByCode.get(code))
    .filter((section): section is ProductSubcategorySection => Boolean(section));
  const fallbackSections = Array.from(sectionsByCode.values())
    .filter((section) => !sectionOrderSet.has(section.id))
    .sort((a, b) => a.title.localeCompare(b.title));

  return [...configuredSections, ...fallbackSections];
}

export default function CategoryProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as CategoryParams;
  const { getCredentials } = useAuth0();
  const { addItem, updateQuantity, state } = useCart();
  const [productSections, setProductSections] = useState<ProductSubcategorySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UIProduct | null>(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [addButtonState, setAddButtonState] = useState<'idle' | 'added'>('idle');
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const modalSheetTranslateY = useRef(new Animated.Value(520)).current;
  const modalSheetDragY = useRef(new Animated.Value(0)).current;
  const isClosingProductModal = useRef(false);
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
  const categoryCodeParam =
    typeof params.code === 'string' && params.code.trim().length > 0
      ? params.code.trim()
      : '';
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

  const openSubcategoryProducts = useCallback((section: ProductSubcategorySection) => {
    router.push({
      pathname: '/subcategory-products',
      params: {
        displayName: categoryLabel,
        code: categoryCodeParam,
        storeId: resolvedStoreId?.toString(),
        subcategoryTitle: section.title,
        subcategoryCode: section.id.startsWith('unmapped-') ? '' : section.id,
      },
    });
  }, [categoryCodeParam, categoryLabel, resolvedStoreId, router]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadProducts() {
      if (categoryCandidates.length === 0) {
        if (!isMounted) return;
        setProductSections([]);
        setIsLoading(false);
        setErrorMessage('Missing category details');
        return;
      }

      if (resolvedStoreId === null) {
        if (!isMounted) return;
        setProductSections([]);
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
          setProductSections([]);
          setErrorMessage('Log in to load products.');
          return;
        }

        const [inventory, subcategories] = await Promise.all([
          getStoreInventory({
            storeId: resolvedStoreId,
            accessToken,
            signal: abortController.signal,
          }),
          categoryCodeParam
            ? getSubcategoriesByCategoryCode({
                categoryCode: categoryCodeParam,
                accessToken,
                signal: abortController.signal,
              })
            : Promise.resolve([]),
        ]);
        const nextSections = buildGroupedProductSections(
          inventory,
          subcategories,
          normalizedCategoryCandidates
        );

        if (!isMounted) return;
        setProductSections(nextSections);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (!isMounted) return;
        setProductSections([]);
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
  }, [
    categoryCandidates,
    categoryCodeParam,
    getAccessToken,
    normalizedCategoryCandidates,
    resolvedStoreId,
  ]);

  function openProductModal(product: UIProduct) {
    setSelectedProduct(product);
  }

  function closeProductModal() {
    setSelectedProduct(null);
  }

  useEffect(() => {
    if (!isProductModalVisible) return;

    modalSheetDragY.setValue(0);
    Animated.parallel([
      Animated.timing(modalBackdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(modalSheetTranslateY, {
        toValue: 0,
        friction: 9,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isProductModalVisible, modalBackdropOpacity, modalSheetDragY, modalSheetTranslateY]);

  const bottomSheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        modalSheetDragY.setValue(Math.max(0, gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.2) {
          closeProductModal();
          return;
        }

        Animated.spring(modalSheetDragY, {
          toValue: 0,
          speed: 22,
          bounciness: 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(modalSheetDragY, {
          toValue: 0,
          speed: 22,
          bounciness: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sectionListContent}
        >
          {productSections.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>
                No products found in this category
              </ThemedText>
            </View>
          ) : (
            productSections.map((section) => {
              return (
                <View key={section.id} style={styles.subcategorySection}>
                  <TouchableOpacity
                    style={styles.subcategoryHeader}
                    onPress={() => openSubcategoryProducts(section)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`View all ${section.title}`}
                  >
                    <ThemedText style={styles.subcategoryTitle}>{section.title}</ThemedText>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                  <View style={styles.subcategoryDivider} />
                  <FlatList
                    data={section.products}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => `${section.id}-${item.id}`}
                    contentContainerStyle={styles.subcategoryHorizontalList}
                    renderItem={({ item }) => (
                      <View style={styles.horizontalCardWrapper}>
                        <ProductCard
                          product={item}
                          onPress={openProductModal}
                          showBorder={false}
                        />
                      </View>
                    )}
                  />
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <ProductDetailSheet
        product={selectedProduct}
        storeId={resolvedStoreId}
        getAccessToken={getAccessToken}
        onDismiss={closeProductModal}
      />
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
  sectionListContent: {
    paddingHorizontal: 12,
    paddingBottom: 22,
    gap: 16,
  },
  subcategorySection: {
    gap: 8,
  },
  subcategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  subcategoryTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  subcategoryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  subcategoryHorizontalList: {
    paddingTop: 0,
    paddingBottom: 4,
    paddingRight: 12,
    gap: 10,
  },
  horizontalCardWrapper: {
    width: 164,
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1200,
  },
  modalBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    height: '82%',
    maxHeight: '92%',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 6,
  },
  modalHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D0D5DD',
  },
  modalHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 2,
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
  modalPromoTag: {
    alignSelf: 'flex-start',
    maxWidth: '70%',
    borderRadius: 8,
    backgroundColor: '#16A34A',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
    textTransform: 'uppercase',
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
