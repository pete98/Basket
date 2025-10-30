import { AIFab } from '@/components/ai/fab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { StyleSheet, View } from 'react-native';


export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <View style={styles.root}>
      <NativeTabs minimizeBehavior='onScrollDown'>

    <NativeTabs.Trigger name="index">
      <Label>Home</Label>
      <Icon sf={"house.fill"} drawable='home' />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="explore">
      <Label>Categories</Label>
      <Icon sf={"square.grid.2x2.fill"} drawable='apps' />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="user">
      <Label>Cart</Label>
      <Icon sf={"cart.fill"} drawable='shopping-cart' />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="search" role='search'>
      <Label>Search</Label>
      <Icon sf={"magnifyingglass"} drawable='search' />
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
