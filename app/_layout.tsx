import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';

import { Auth0Provider } from 'react-native-auth0';

import { auth0Config } from '@/lib/config/auth0';
import { stripeConfig } from '@/lib/config/stripe';
import { CartProvider } from '@/contexts/cart-context';
import { LocationProvider } from '@/contexts/location-context';
import { PantryProvider } from '@/contexts/pantry-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StripeProvider
          publishableKey={stripeConfig.publishableKey}
          merchantIdentifier={stripeConfig.merchantIdentifier || undefined}
          urlScheme={stripeConfig.urlScheme || undefined}
        >
          <Auth0Provider domain={auth0Config.domain} clientId={auth0Config.clientId}>
            <CartProvider>
              <PantryProvider>
                <LocationProvider>
                  <ThemeProvider value={DefaultTheme}>
                    <Stack>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="login" options={{ headerShown: false }} />
                      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                      <Stack.Screen name="find-store" options={{ headerShown: false }} />
                      <Stack.Screen name="ai-modal" options={{ presentation: 'transparentModal', headerShown: false }} />
                      <Stack.Screen name="category-products" options={{ headerShown: false }} />
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
                    </Stack>
                    <StatusBar style="dark" translucent backgroundColor="transparent" />
                  </ThemeProvider>
                </LocationProvider>
              </PantryProvider>
            </CartProvider>
          </Auth0Provider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
