import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getUserByAuth0, getUserServiceBaseUrl } from '@/lib/api/users';
import { auth0Config, isAuth0Configured } from '@/lib/config/auth0';

const ACCESS_TOKEN_KEY = 'auth0_access_token';
const FALLBACK_AUTH0_AUDIENCE = 'https://adminapi';

const decodeJwtPayload = (token: string) => {
  const payload = token.split('.')[1];
  if (!payload) return null;
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  if (typeof globalThis.atob !== 'function') {
    console.warn('JWT decode skipped: atob not available');
    return null;
  }
  try {
    return JSON.parse(globalThis.atob(padded)) as Record<string, unknown>;
  } catch (error) {
    console.warn('JWT decode failed', error);
    return null;
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 375, 0.9), 1.15);
  const styles = useMemo(() => createStyles(scale), [scale]);

  const [isProcessing, setIsProcessing] = useState(false);
  const { authorize, isLoading } = useAuth0();

  const redirect = typeof params.redirect === 'string' ? params.redirect : undefined;
  const rawRedirectParams =
    typeof params.redirectParams === 'string' ? params.redirectParams : undefined;

  let redirectParams: Record<string, string> | undefined;
  if (rawRedirectParams) {
    try {
      const parsed = JSON.parse(rawRedirectParams) as Record<string, unknown>;
      redirectParams = Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, String(value)]),
      );
    } catch (error) {
      console.warn('Invalid redirect params', error);
    }
  }

  const redirectHref = useMemo(() => {
    if (!redirect) return undefined;
    if (!redirectParams || Object.keys(redirectParams).length === 0) return redirect as Href;

    const searchParams = new URLSearchParams(redirectParams);
    return `${redirect}?${searchParams.toString()}` as Href;
  }, [redirect, redirectParams]);

  const handlePrimary = async () => {
    if (!isAuth0Configured) return;
    setIsProcessing(true);
    try {
      const resolvedAudience = auth0Config.audience || FALLBACK_AUTH0_AUDIENCE;
      const authorizeParameters: Parameters<typeof authorize>[0] = {
        audience: resolvedAudience,
        scope: 'openid profile email offline_access',
      };
      const authorizeOptions = auth0Config.customScheme
        ? { customScheme: auth0Config.customScheme }
        : undefined;
      if (auth0Config.customScheme) {
        console.log('Auth0 custom scheme configured:', auth0Config.customScheme);
      }
      console.log('Auth0 authorize options:', {
        audience: resolvedAudience,
        customScheme: authorizeOptions?.customScheme || '(default)',
      });
      const authResult = await authorize(authorizeParameters, authorizeOptions);
      console.log('Auth0 authorize succeeded');
      let shouldOnboard = false;
      console.log('Auth0 credentials keys:', Object.keys(authResult ?? {}));
      const accessToken = authResult?.accessToken;
      if (accessToken) {
        console.log('Received access token:', {
          received: true,
          length: accessToken.length,
          preview: `${accessToken.slice(0, 12)}...${accessToken.slice(-6)}`,
        });
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
        const tokenParts = accessToken.split('.');
        const tokenPreview = `${accessToken.slice(0, 18)}...${accessToken.slice(-10)}`;
        console.log('Auth0 access token diagnostics:', {
          length: accessToken.length,
          segments: tokenParts.length,
          preview: tokenPreview,
        });
        const decoded = decodeJwtPayload(accessToken);
        if (decoded) {
          console.log('Auth0 token claims:', {
            sub: typeof decoded.sub === 'string' ? decoded.sub : '(missing)',
            aud: decoded.aud ?? '(missing)',
            iss: decoded.iss ?? '(missing)',
          });
        } else {
          console.warn('Access token is not a JWT (opaque token).');
        }
        console.log('User service base URL:', getUserServiceBaseUrl());
        try {
          const userRecord = await getUserByAuth0(accessToken);
          console.log('User lookup by Auth0 succeeded:', userRecord);
        } catch (error) {
          console.warn('User lookup by Auth0 failed', error);
          shouldOnboard = true;
        }
      } else {
        console.warn('Auth0 access token missing after login');
      }
      if (shouldOnboard) {
        router.replace('/onboarding');
      } else if (redirectHref) {
        router.replace(redirectHref);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Auth0 login failed', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const primaryDisabled = !isAuth0Configured || isLoading || isProcessing;
  const primaryLabel = !isAuth0Configured ? 'Configure Auth0' : 'Continue to Sign in / Sign up';

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 * scale }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Basket</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Log in to sync carts, track deliveries, and save favorites.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            accessibilityRole="button"
            onPress={handlePrimary}
            disabled={primaryDisabled}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

  const createStyles = (scale: number) =>
    StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#f8fafc',
      paddingHorizontal: 20 * scale,
    },
    flex: {
      flex: 1,
      justifyContent: 'space-between',
    },
    header: {
      marginTop: 24 * scale,
      gap: 10 * scale,
    },
    eyebrow: {
      fontSize: 13 * scale,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: '#64748b',
    },
    title: {
      fontSize: 28 * scale,
      fontWeight: '800',
      color: '#0f172a',
    },
    subtitle: {
      fontSize: 15 * scale,
      lineHeight: 22 * scale,
      color: '#475569',
    },
    footer: {
      paddingTop: 24 * scale,
      gap: 12 * scale,
    },
    primaryButton: {
      backgroundColor: '#0f172a',
      paddingVertical: 16 * scale,
      borderRadius: 999,
      alignItems: 'center',
    },
    primaryButtonText: {
      fontSize: 16 * scale,
      fontWeight: '700',
      color: '#fff',
    },
  });
