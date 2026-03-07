import { useCart } from "@/contexts/cart-context";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { StyleSheet, View } from "react-native";


export default function TabLayout() {
  const { state } = useCart();
  const cartItemCount = state.itemCount;
  const cartBadgeValue = cartItemCount > 99 ? "99+" : String(cartItemCount);

  return (
    <View style={styles.root}>
      <NativeTabs
        backgroundColor="#0f172a"
        tintColor="#f97316"
        disableTransparentOnScrollEdge
        iconColor={{ default: "#94a3b8", selected: "black" }}
        labelStyle={{
          default: { color: "#94a3b8", fontSize: 10 },
          selected: { color: "black", fontWeight: "600" },
        }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" drawable="home" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="deals">
          <NativeTabs.Trigger.Label>Deals</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="tag.fill" drawable="local-offer" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="cart">
          <NativeTabs.Trigger.Label>Cart</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="cart.fill" drawable="shopping-cart" />
          <NativeTabs.Trigger.Badge hidden={cartItemCount <= 0}>
            {cartBadgeValue}
          </NativeTabs.Trigger.Badge>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="user">
          <NativeTabs.Trigger.Label>User</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="person.fill" drawable="person" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
