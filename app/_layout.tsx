import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { CartProvider } from '@/contexts/cart-context';
import { PantryProvider } from '@/contexts/pantry-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <CartProvider>
          <PantryProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="ai-modal" options={{ presentation: 'transparentModal', headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              <Stack.Screen
                name="schedule-order"
                options={{
                  headerShown: false,
                  presentation: 'transparentModal',
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              />
              <Stack.Screen name="order-summary" options={{ headerShown: false }} />
              <Stack.Screen name="product-detail" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="dark" translucent backgroundColor="transparent" />
          </ThemeProvider>
          </PantryProvider>
        </CartProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
