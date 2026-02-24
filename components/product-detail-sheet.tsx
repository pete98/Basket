import { useCart } from '@/contexts/cart-context';
import { getStoreInventoryItemById } from '@/lib/api/stores';
import { Product as ApiProduct } from '@/lib/types/api';
import { UIProduct } from '@/lib/types/ui';
import { formatWeight, mapApiProductToProduct } from '@/lib/utils/products';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProductDetailSheetProps {
  product: UIProduct | null;
  storeId: number | null;
  getAccessToken: () => Promise<string | null>;
  onDismiss: () => void;
}

export function ProductDetailSheet({ product, storeId, getAccessToken, onDismiss }: ProductDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { addItem, updateQuantity, state } = useCart();
  const productSheetRef = useRef<TrueSheet | null>(null);
  const addToCartScale = useRef(new Animated.Value(1)).current;
  const productDetailsRequestIdRef = useRef(0);
  const addButtonFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeModalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedProductDetail, setSelectedProductDetail] = useState<ApiProduct | null>(null);
  const [isProductDetailLoading, setIsProductDetailLoading] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [addButtonState, setAddButtonState] = useState<'idle' | 'added'>('idle');

  useEffect(() => {
    if (!product) return;
    setSelectedProductDetail(null);
    setIsDescriptionOpen(false);
    setAddButtonState('idle');
    addToCartScale.setValue(1);
    const cartItem = state.items.find((item) => item.id === product.id);
    setSelectedQuantity(cartItem?.quantity || 1);
    requestAnimationFrame(() => {
      void productSheetRef.current?.present(0);
    });

    const inventoryItemId = Number.parseInt(product.id, 10);
    if (storeId === null || Number.isNaN(inventoryItemId)) return;

    const requestId = ++productDetailsRequestIdRef.current;
    setIsProductDetailLoading(true);
    void (async () => {
      try {
        const accessToken = await getAccessToken();
        const detailedProduct = await getStoreInventoryItemById({
          storeId,
          id: inventoryItemId,
          accessToken: accessToken ?? undefined,
          includePromotionOverlay: true,
        });
        if (productDetailsRequestIdRef.current !== requestId) return;
        setSelectedProductDetail(detailedProduct);
      } catch (error) {
        console.warn('[product-sheet] failed to load inventory item detail', error);
      } finally {
        if (productDetailsRequestIdRef.current === requestId) setIsProductDetailLoading(false);
      }
    })();
  }, [addToCartScale, getAccessToken, product, state.items, storeId]);

  useEffect(() => {
    return () => {
      if (addButtonFeedbackTimer.current) clearTimeout(addButtonFeedbackTimer.current);
      if (closeModalTimer.current) clearTimeout(closeModalTimer.current);
    };
  }, []);

  function handleDismiss() {
    productDetailsRequestIdRef.current += 1;
    setSelectedProductDetail(null);
    setIsProductDetailLoading(false);
    setIsDescriptionOpen(false);
    setAddButtonState('idle');
    addToCartScale.setValue(1);
    onDismiss();
  }

  function closeSheet() {
    void productSheetRef.current?.dismiss();
  }

  function handleIncrement() {
    setSelectedQuantity((prev) => prev + 1);
  }

  function handleDecrement() {
    setSelectedQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }

  function handleAddToCart() {
    if (!product) return;
    const desiredQuantity = Math.max(selectedQuantity, 1);
    const cartItem = state.items.find((item) => item.id === product.id);
    const quantity = cartItem?.quantity || 0;
    const selectedProductPrice =
      typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0;

    if (quantity === 0) {
      addItem({
        id: product.id,
        name: product.name,
        price: selectedProductPrice,
        image: product.image || '',
      });
      if (desiredQuantity > 1) updateQuantity(product.id, desiredQuantity);
      return;
    }

    updateQuantity(product.id, desiredQuantity);
  }

  function handleAddToCartPress() {
    handleAddToCart();
    setAddButtonState('added');

    if (addButtonFeedbackTimer.current) clearTimeout(addButtonFeedbackTimer.current);
    addButtonFeedbackTimer.current = setTimeout(() => {
      setAddButtonState('idle');
    }, 1200);

    if (closeModalTimer.current) clearTimeout(closeModalTimer.current);
    closeModalTimer.current = setTimeout(() => {
      closeSheet();
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

  const mergedProduct = useMemo(() => {
    if (!product) return null;
    if (!selectedProductDetail) return product;
    const mappedDetail = mapApiProductToProduct(selectedProductDetail);
    return {
      ...product,
      ...mappedDetail,
      name: mappedDetail.name || product.name,
      image: mappedDetail.image || product.image,
      category: mappedDetail.category || product.category,
      description: mappedDetail.description || product.description,
    };
  }, [product, selectedProductDetail]);

  const formattedWeight = mergedProduct ? formatWeight(mergedProduct.weight, mergedProduct.weightUnit) : '';
  const weightCaloriesText =
    formattedWeight && mergedProduct?.calories
      ? `${formattedWeight} • ${mergedProduct.calories} cals`
      : formattedWeight
        ? formattedWeight
        : mergedProduct?.calories
          ? `${mergedProduct.calories} cals`
          : '';
  const detailBasePrice =
    selectedProductDetail && typeof selectedProductDetail.price === 'number' && Number.isFinite(selectedProductDetail.price)
      ? selectedProductDetail.price
      : undefined;
  const detailPromoPrice =
    selectedProductDetail &&
    typeof selectedProductDetail.promoPrice === 'number' &&
    Number.isFinite(selectedProductDetail.promoPrice)
      ? selectedProductDetail.promoPrice
      : undefined;
  const selectedProductPrice =
    typeof detailPromoPrice === 'number'
      ? detailPromoPrice
      : mergedProduct && typeof mergedProduct.price === 'number' && Number.isFinite(mergedProduct.price)
        ? mergedProduct.price
        : 0;
  const selectedProductOriginalPrice =
    typeof detailBasePrice === 'number'
      ? detailBasePrice
      : mergedProduct?.originalPrice;
  const promoLabel =
    selectedProductDetail?.promoTag?.trim() ||
    mergedProduct?.promoTag?.trim() ||
    '';
  const displayName =
    selectedProductDetail?.itemName?.trim() ||
    selectedProductDetail?.productName?.trim() ||
    mergedProduct?.name ||
    'Product';
  const metadataLine = [
    typeof selectedProductDetail?.stockQuantity === 'number'
      ? `${selectedProductDetail.stockQuantity > 0 ? 'In stock' : 'Out of stock'} (${selectedProductDetail.stockQuantity})`
      : null,
    weightCaloriesText || mergedProduct?.brand?.trim() || mergedProduct?.category?.trim() || '1 item',
  ]
    .filter((value): value is string => Boolean(value))
    .join(' • ');
  const descriptionText =
    selectedProductDetail?.description?.trim() ||
    mergedProduct?.description ||
    'No description available.';

  const footer = mergedProduct ? (
    <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.quantitySection}>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepperButton} onPress={handleDecrement} disabled={selectedQuantity <= 1}>
            <Text style={[styles.stepperButtonText, selectedQuantity <= 1 && styles.disabledText]}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{selectedQuantity}</Text>
          <TouchableOpacity style={styles.stepperButton} onPress={handleIncrement}>
            <Text style={styles.stepperButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Animated.View style={[styles.cartButtonWrapper, { transform: [{ scale: addToCartScale }] }]}>
        <TouchableOpacity style={styles.cartButton} onPress={handleAddToCartPress} activeOpacity={0.9}>
          <Text style={styles.cartButtonText}>{addButtonState === 'added' ? 'Item added!' : 'Add to Cart'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  ) : undefined;

  return (
    <TrueSheet ref={productSheetRef} detents={[1]} footer={footer} scrollable onDidDismiss={handleDismiss}>
      <View style={styles.bottomSheetContent}>
        {mergedProduct ? (
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sheetCloseOverlay}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeSheet} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#111322" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalHeroCard}>
              <View style={styles.modalHeroImageWrapper}>
                {mergedProduct.image ? (
                  <Image source={{ uri: mergedProduct.image }} style={styles.modalHeroImage} resizeMode="contain" />
                ) : (
                  <View style={styles.modalImagePlaceholder}>
                    <Ionicons name="image-outline" size={72} color="#CED2DA" />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.modalMeta}>
              {promoLabel ? (
                <Text style={styles.modalPromoTag} numberOfLines={1} ellipsizeMode="tail">
                  {promoLabel}
                </Text>
              ) : null}
              <Text style={styles.modalTitle}>{displayName}</Text>
              <Text style={styles.modalSubtitle}>
                {isProductDetailLoading ? 'Loading product details...' : metadataLine}
              </Text>

              <View style={styles.modalPriceRow}>
                <Text style={styles.modalSalePrice}>${selectedProductPrice.toFixed(2)}</Text>
                {typeof selectedProductOriginalPrice === 'number' && selectedProductOriginalPrice > selectedProductPrice ? (
                  <Text style={styles.modalOriginalPrice}>${selectedProductOriginalPrice.toFixed(2)}</Text>
                ) : null}
              </View>

              <View style={styles.modalDetailBlock}>
                <TouchableOpacity style={styles.modalAccordionHeader} onPress={() => setIsDescriptionOpen((prev) => !prev)} activeOpacity={0.8}>
                  <Text style={styles.modalAccordionTitle}>Product detail</Text>
                  <Ionicons name={isDescriptionOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#111322" />
                </TouchableOpacity>
                {isDescriptionOpen ? <Text style={styles.modalDescription}>{descriptionText}</Text> : null}
              </View>
            </View>
          </ScrollView>
        ) : null}
      </View>
    </TrueSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetContent: {
    flex: 1,
    minHeight: 320,
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
  sheetCloseOverlay: {
    position: 'absolute',
    top: 10,
    right: 14,
    zIndex: 10,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingTop: 44,
    paddingBottom: 20,
  },
  modalHeroCard: {
    marginHorizontal: 24,
    marginTop: 30,
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
    paddingTop: 12,
    paddingBottom: 12,
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
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  quantitySection: {
    alignItems: 'flex-start',
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
  cartButtonWrapper: {
    flex: 1,
  },
  cartButton: {
    flex: 1,
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
});
