import { useCart } from '@/contexts/cart-context';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


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

    <NativeTabs.Trigger name="cart">
      <Label>Cart</Label>
      <Icon sf={"cart.fill"} drawable='shopping-cart' />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="user">
      <Label>User</Label>
      <Icon sf={"person.fill"} drawable='person' />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="orders">
      <Label>Orders</Label>
      <Icon sf={"bag.fill"} drawable='bag' />
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
    bottom: 50,
    left: SCREEN_WIDTH * 0.5 - 20,
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
    transform: [{ translateX: 0 }, { translateY: -10 }],
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
