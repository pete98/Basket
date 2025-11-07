import { AIFab } from '@/components/ai/fab';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { StyleSheet, View } from 'react-native';


export default function TabLayout() {
  return (
    <View style={styles.root}>
      <NativeTabs backgroundColor="#0f172a"
  tintColor="#f97316"
  iconColor={{ default: '#94a3b8', selected: '#f97316' }}
  labelStyle={{
    default: { color: '#94a3b8', fontSize: 10 },
    selected: { color: '#f97316', fontWeight: '600' },
  }}>

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
      <Icon sf={"bag.fill"} drawable='shopping-bag' />
    </NativeTabs.Trigger>

      </NativeTabs>
      <AIFab />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
