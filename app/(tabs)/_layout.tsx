import { useCart } from '@/contexts/cart-context';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_COUNT = 4;
const CART_TAB_INDEX = 2; // Home, Deals, Cart, User
const CART_TAB_CENTER_X = (SCREEN_WIDTH / TAB_COUNT) * (CART_TAB_INDEX + 0.5);
const TAB_ICON_SIZE = 24;
const CART_BADGE_SIZE = 20;
const CART_BADGE_BOTTOM = 58;


export default function TabLayout() {
  const { state } = useCart();
  const cartItemCount = state.itemCount;

  return (
    <View style={styles.root}>
      <NativeTabs backgroundColor="#0f172a"
  tintColor="#f97316"
  iconColor={{ default: '#94a3b8', selected: '#f97316' }}
  labelStyle={{
    default: { color: '#94a3b8', fontSize: 10 },
    selected: { color: '#f97316', fontWeight: '600' },
  }}
  >

    <NativeTabs.Trigger name="index">
      <Label>Home</Label>
      <Icon sf={"house.fill"} drawable='home' />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="deals">
      <Label>Deals</Label>
      <Icon sf={"tag.fill"} drawable='local-offer' />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="cart">
      <Label>Cart</Label>
      <Icon sf={"cart.fill"} drawable='shopping-cart' />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="user">
      <Label>User</Label>
      <Icon sf={"person.fill"} drawable='person' />
    </NativeTabs.Trigger>

      </NativeTabs>
      {cartItemCount > 0 && (
        <View style={styles.cartBadgeOverlay} pointerEvents="none">
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cartBadgeOverlay: {
    position: 'absolute',
    bottom: CART_BADGE_BOTTOM,
    left: CART_TAB_CENTER_X + TAB_ICON_SIZE / 2 - CART_BADGE_SIZE / 2,
    zIndex: 1000,
  },
  cartBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
