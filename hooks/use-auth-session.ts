import * as SecureStore from 'expo-secure-store';
import { useAuth0 } from 'react-native-auth0';
import { useEffect, useMemo, useState } from 'react';

const ACCESS_TOKEN_KEY = 'auth0_access_token';

interface UseAuthSessionResult {
  isLoggedIn: boolean;
  isAuthResolved: boolean;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  if (typeof globalThis.atob !== 'function') return null;

  try {
    return JSON.parse(globalThis.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const exp = payload.exp;
  if (typeof exp !== 'number') return false;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowInSeconds;
}

export function useAuthSession(): UseAuthSessionResult {
  const { user, isLoading } = useAuth0();
  const [hasStoredToken, setHasStoredToken] = useState<boolean | null>(null);

  useEffect(() => {
    let isActive = true;

    async function resolveStoredToken() {
      if (user) {
        if (isActive) setHasStoredToken(true);
        return;
      }

      try {
        const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (!accessToken) {
          if (isActive) setHasStoredToken(false);
          return;
        }

        if (isJwtExpired(accessToken)) {
          await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
          if (isActive) setHasStoredToken(false);
          return;
        }

        if (isActive) setHasStoredToken(true);
      } catch (error) {
        console.warn('Unable to resolve auth token state', error);
        if (isActive) setHasStoredToken(false);
      }
    }

    if (!isLoading) void resolveStoredToken();

    return () => {
      isActive = false;
    };
  }, [isLoading, user]);

  return useMemo(() => {
    const isLoggedIn = Boolean(user) || hasStoredToken === true;
    const isAuthResolved = !isLoading && (Boolean(user) || hasStoredToken !== null);

    return { isLoggedIn, isAuthResolved };
  }, [hasStoredToken, isLoading, user]);
}
