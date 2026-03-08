import { ThemedText } from '@/components/themed-text';
import { useCart } from '@/contexts/cart-context';
import { UIProduct } from '@/lib/types/ui';
import { formatWeight } from '@/lib/utils/products';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProductCardProps {
  product: UIProduct;
  onPress?: (product: UIProduct) => void;
  showPrice?: boolean;
  showBorder?: boolean;
}

export function ProductCard({
  product,
  onPress,
  showPrice = true,
  showBorder = true,
}: ProductCardProps) {
  const { addItem, itemsById, updateQuantity, removeItem } = useCart();
  const priceValue = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0;
  const originalPriceValue =
    typeof product.originalPrice === 'number' && Number.isFinite(product.originalPrice)
      ? product.originalPrice
      : undefined;
  const hasDiscountedPrice =
    typeof originalPriceValue === 'number' && originalPriceValue > priceValue;

  const cartItem = itemsById.get(product.id);
  const quantity = cartItem?.quantity || 0;

  function handleAddToCart() {
    addItem({
      id: product.id,
      name: product.name,
      price: priceValue,
      image: product.image || '',
    });
  }

  function handleIncrement() {
    if (quantity === 0) {
      handleAddToCart();
      return;
    }
    updateQuantity(product.id, quantity + 1);
  }

  function handleDecrement() {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1);
      return;
    }
    if (quantity === 1) {
      removeItem(product.id);
    }
  }

  function handleProductPress() {
    if (onPress) onPress(product);
  }

  const formattedWeight = formatWeight(product.weight, product.weightUnit);
  const weightCaloriesText =
    formattedWeight && product.calories
      ? `${formattedWeight} • ${product.calories} cals`
      : formattedWeight
        ? formattedWeight
        : product.calories
          ? `${product.calories} cals`
          : '';

  return (
    <View style={[styles.productCard, !showBorder && styles.productCardNoBorder]}>
      <TouchableOpacity
        onPress={handleProductPress}
        activeOpacity={0.7}
        style={styles.productContent}
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${product.name}`}
        accessibilityHint="Opens product details"
      >
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.productImage}
            contentFit="contain"
            transition={120}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color="#ccc" />
          </View>
        )}

        <View style={styles.detailsBlock}>
          <View style={styles.promoSlot}>
            {!!product.promoTag && (
              <ThemedText style={styles.productPromoTag} numberOfLines={1} ellipsizeMode="tail">
                {product.promoTag}
              </ThemedText>
            )}
          </View>
          <View style={styles.nameSlot}>
            <ThemedText style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
              {product.name}
            </ThemedText>
          </View>
          <View style={styles.metaSlot}>
            {weightCaloriesText ? (
              <ThemedText style={styles.productWeightCalories} numberOfLines={1} ellipsizeMode="tail">
                {weightCaloriesText}
              </ThemedText>
            ) : (
              <View style={styles.metaSpacer} />
            )}
          </View>
        </View>

        {showPrice && (
          <View style={styles.priceRow}>
            {quantity > 0 ? (
              <View style={styles.expandedRow}>
              <View style={styles.quantityCounterExpanded}>
                <TouchableOpacity
                  style={styles.quantityButtonExpanded}
                  onPress={handleDecrement}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease quantity for ${product.name}`}
                  accessibilityHint="Removes one item from cart"
                >
                  <View style={styles.quantityButtonInnerExpanded}>
                    <Ionicons name="remove" size={18} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <View style={styles.quantityNumberContainerExpanded}>
                  <Text style={styles.quantityTextExpanded}>{quantity}</Text>
                </View>
                <TouchableOpacity
                  style={styles.quantityButtonExpanded}
                  onPress={handleIncrement}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase quantity for ${product.name}`}
                  accessibilityHint="Adds one item to cart"
                >
                  <View style={styles.quantityButtonInnerExpanded}>
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>
              </View>
            ) : (
              <View style={styles.collapsedRow}>
                <View style={styles.priceInfo}>
                  <ThemedText style={styles.productPrice}>${priceValue.toFixed(2)}</ThemedText>
                  {hasDiscountedPrice && (
                    <ThemedText style={styles.productOriginalPrice}>
                      ${originalPriceValue.toFixed(2)}
                    </ThemedText>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.addToCartIcon}
                  onPress={handleAddToCart}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${product.name} to cart`}
                  accessibilityHint="Adds this product to your cart"
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    width: '100%',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  productCardNoBorder: {
    borderWidth: 0,
  },
  productContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  addToCartIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  collapsedRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  expandedRow: {
    width: '100%',
  },
  quantityCounterExpanded: {
    width: '100%',
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000',
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  quantityButtonExpanded: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonInnerExpanded: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityNumberContainerExpanded: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityTextExpanded: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsBlock: {
    minHeight: 52,
    flex: 1,
  },
  promoSlot: {
    height: 20,
    justifyContent: 'center',
  },
  nameSlot: {
    height: 20,
    justifyContent: 'center',
  },
  metaSlot: {
    height: 18,
    justifyContent: 'center',
    paddingBottom: 2,
  },
  metaSpacer: {
    height: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: '#000',
  },
  productWeightCalories: {
    fontSize: 12,
    lineHeight: 14,
    color: '#666',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a5568',
  },
  priceRow: {
    marginTop: 'auto',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E4E7EC',
    marginBottom: 0,
    paddingBottom: 0,
  },
  priceInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  productOriginalPrice: {
    fontSize: 12,
    color: '#98A2B3',
    textDecorationLine: 'line-through',
  },
  productPromoTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#16A34A',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});
