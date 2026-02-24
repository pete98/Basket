import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useEffect } from 'react';

import { Auth0Provider } from 'react-native-auth0';

import { auth0Config } from '@/lib/config/auth0';
import { stripeConfig } from '@/lib/config/stripe';
import { CartProvider } from '@/contexts/cart-context';
import { CheckoutProvider } from '@/contexts/checkout-context';
import { LocationProvider } from '@/contexts/location-context';
import { PantryProvider } from '@/contexts/pantry-context';
import { useAuthSession } from '@/hooks/use-auth-session';
import { AppShellSkeleton } from '@/components/ui/app-shell-skeleton';

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
              <CheckoutProvider>
                <PantryProvider>
                  <LocationProvider>
                    <ThemeProvider value={DefaultTheme}>
                      <AppStack />
                      <StatusBar style="dark" translucent backgroundColor="transparent" />
                    </ThemeProvider>
                  </LocationProvider>
                </PantryProvider>
              </CheckoutProvider>
            </CartProvider>
          </Auth0Provider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppStack() {
  const { isAuthResolved, isLoggedIn } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthResolved) return;
    if (!isLoggedIn && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthResolved, isLoggedIn, pathname, router]);

  if (!isAuthResolved) {
    return <AppShellSkeleton />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="find-store" options={{ headerShown: false }} />
      <Stack.Screen name="delivery-address" options={{ headerShown: false }} />
      <Stack.Screen name="ai-modal" options={{ presentation: 'transparentModal', headerShown: false }} />
      <Stack.Screen name="category-products" options={{ headerShown: false }} />
      <Stack.Screen name="subcategory-products" options={{ headerShown: false }} />
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
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="order-summary" options={{ headerShown: false }} />
      <Stack.Screen name="order-history" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
