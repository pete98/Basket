import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <NativeTabs minimizeBehavior='onScrollDown'>

    <NativeTabs.Trigger name="index">
      <Label>Home</Label>
      <Icon sf={"house.fill"} />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="explore">
      <Label>Categories</Label>
      <Icon sf={"square.grid.2x2.fill"} />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="user">
      <Label>User</Label>
      <Icon sf={"person.fill"} />
    </NativeTabs.Trigger>

    <NativeTabs.Trigger name="search" role='search'>
      <Label>Search</Label>
      <Icon sf={"magnifyingglass"} />
    </NativeTabs.Trigger>



  </NativeTabs>
  );
}
