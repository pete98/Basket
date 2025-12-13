import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { CartProvider } from '@/contexts/cart-context';
import { LocationProvider } from '@/contexts/location-context';
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
            <LocationProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                  <Stack.Screen name="ai-modal" options={{ presentation: 'transparentModal', headerShown: false }} />
                  <Stack.Screen
                    name="modal"
                    options={{
                      presentation: 'transparentModal',
                      headerShown: false,
                      contentStyle: { backgroundColor: 'transparent' },
                    }}
                  />
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
            </LocationProvider>
          </PantryProvider>
        </CartProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
