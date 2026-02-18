import { ThemedText } from '@/components/themed-text';
import { useCart } from '@/contexts/cart-context';
import { UIProduct } from '@/lib/types/ui';
import { formatWeight } from '@/lib/utils/products';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  const { addItem, updateQuantity, removeItem, state } = useCart();
  const priceValue = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0;
  const originalPriceValue =
    typeof product.originalPrice === 'number' && Number.isFinite(product.originalPrice)
      ? product.originalPrice
      : undefined;
  const hasDiscountedPrice =
    typeof originalPriceValue === 'number' && originalPriceValue > priceValue;

  const cartItem = state.items.find((item) => item.id === product.id);
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
      {quantity > 0 ? (
        <View style={styles.quantityCounter}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={handleDecrement}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <View style={styles.quantityButtonInner}>
              <Ionicons name="remove" size={16} color="#007AFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.quantityNumberContainer}>
            <Text style={styles.quantityText}>{quantity}</Text>
          </View>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={handleIncrement}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <View style={styles.quantityButtonInner}>
              <Ionicons name="add" size={16} color="#007AFF" />
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addToCartIcon}
          onPress={handleAddToCart}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#000" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={handleProductPress}
        activeOpacity={0.7}
        style={styles.productContent}
      >
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="contain" />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color="#ccc" />
          </View>
        )}

        <ThemedText style={styles.productName} numberOfLines={2}>
          {product.name}
        </ThemedText>

        {weightCaloriesText ? (
          <ThemedText style={styles.productWeightCalories}>{weightCaloriesText}</ThemedText>
        ) : null}

        {showPrice && (
          <View style={styles.priceRow}>
            <ThemedText style={styles.productPrice}>${priceValue.toFixed(2)}</ThemedText>
            {hasDiscountedPrice && (
              <ThemedText style={styles.productOriginalPrice}>
                ${originalPriceValue.toFixed(2)}
              </ThemedText>
            )}
            {!!product.promoTag && (
              <ThemedText style={styles.productPromoTag}>{product.promoTag}</ThemedText>
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
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  productCardNoBorder: {
    borderWidth: 0,
  },
  productContent: {
    flex: 1,
  },
  addToCartIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  quantityCounter: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    paddingHorizontal: 2,
    paddingVertical: 2,
    zIndex: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    minHeight: 32,
  },
  quantityButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  quantityButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityNumberContainer: {
    minWidth: 28,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
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
  productName: {
    fontSize: 14,
    fontWeight: '600',
    minHeight: 15,
    color: '#000',
  },
  productWeightCalories: {
    fontSize: 13,
    color: '#666',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a5568',
  },
  priceRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E4E7EC',
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
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
  },
});
