import { useCart } from '@/contexts/cart-context';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT_COLOR = '#030303';
const SOFT_NEUTRAL_BG = '#F5F5F5';
const NEUTRAL_BORDER_COLOR = '#D0D5DD';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateQuantity, removeItem } = useCart();
  const { ensureAuthenticated } = useAuthGuard();
  const { items, total } = state;

  const taxRate = 0.06625; // Estimated tax rate
  const tax = total * taxRate;
  const finalTotal = total + tax;
  const itemCountLabel = items.length === 1 ? '1 item' : `${items.length} items`;

  const pickupEtaMessage =
    'Ready within about 15 minutes once the store confirms your order.';
  const pickupLocationAddress = '617 Alabama Ave SW Birmingham, AL 35211';
  const pickupLocationLabel = 'Basket Market';

  const handleCheckout = () => {
    if (!items.length) return;
    const checkoutTarget = {
      pathname: '/order-summary',
      params: {
        fulfillmentType: 'pickup',
        pickupEta: pickupEtaMessage,
        pickupLocation: pickupLocationAddress,
        pickupLocationName: pickupLocationLabel,
        deliveryFee: '0',
      },
    };

    if (!ensureAuthenticated(checkoutTarget)) return;
    router.push(checkoutTarget);
  };

  const handleIncreaseQuantity = (id: string, currentQuantity: number) => {
    updateQuantity(id, currentQuantity + 1);
  };

  const handleDecreaseQuantity = (id: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
      updateQuantity(id, currentQuantity - 1);
    } else {
      removeItem(id);
    }
  };

  const renderCartItem = ({ item }: { item: (typeof items)[number] }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemImageWrapper}>
        {item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.itemImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
            <Ionicons name="image-outline" size={28} color="#B0B3C1" />
          </View>
        )}
      </View>

      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.itemMeta}>Ready in 10 min · In stock</Text>

        <View style={styles.itemFooter}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleDecreaseQuantity(item.id, item.quantity)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="remove" size={16} color={ACCENT_COLOR} />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleIncreaseQuantity(item.id, item.quantity)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="add" size={16} color={ACCENT_COLOR} />
            </TouchableOpacity>
          </View>

          <Text style={styles.itemTotal}>
            ${(item.price * item.quantity).toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeItem(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={16} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.pageHeaderBackground, { paddingTop: insets.top + 8 }]}>
          <View style={styles.pageHeaderContent}>
            <View>
              <Text style={styles.pageHeaderTitle}>My Cart</Text>
              <Text style={styles.pageHeaderSubtitle}>It feels lonely in here</Text>
            </View>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={44} color="#B0B3C1" />
          </View>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>
            Browse the market and add fresh items to get started.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/')}>
            <Text style={styles.emptyButtonText}>Explore products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeaderBackground, { paddingTop: insets.top + 8 }]}>
        <View style={styles.pageHeaderContent}>
          <View>
            <Text style={styles.pageHeaderTitle}>My Cart</Text>
            <Text style={styles.pageHeaderSubtitle}>
              {itemCountLabel} · ${total.toFixed(2)} subtotal
            </Text>
          </View>
          <View style={styles.deliveryTag}>
            <Ionicons name="bicycle-outline" size={16} color="#fff" />
            <Text style={styles.deliveryTagText}>Free delivery over $35</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderCartItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (est.)</Text>
                <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryValue}>Free</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total due today</Text>
                <Text style={styles.totalValue}>${finalTotal.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        }
      />

      <View
        style={[
          styles.checkoutContainer,
          {
            bottom: Math.max(insets.bottom + 64, 88),
          },
        ]}>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          activeOpacity={0.9}>
          <Text style={styles.checkoutButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F9',
    position: 'relative',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#101828',
  },
  subtitle: {
    fontSize: 14,
    color: '#667085',
    marginTop: 4,
  },
  deliveryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  deliveryTagText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  pageHeaderBackground: {
    backgroundColor: '#f97316',
    borderBottomWidth: 1,
    borderBottomColor: '#ea580c',
    marginBottom: 16,
  },
  pageHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    marginBottom: 8,
  },
  pageHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  pageHeaderSubtitle: {
    color: '#ffe8d2',
    fontSize: 14,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101828',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: ACCENT_COLOR,
    borderRadius: 999,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    position: 'relative',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  itemImageWrapper: {
    width: 84,
    height: 84,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
  itemImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: SOFT_NEUTRAL_BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: NEUTRAL_BORDER_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    minWidth: 32,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginTop: 18,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E4E7EC',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111322',
  },
  checkoutContainer: {
    position: 'absolute',
    right: 20,
  },
  checkoutButton: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
