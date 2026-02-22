import * as SecureStore from 'expo-secure-store';
import { useAuth0 } from 'react-native-auth0';
import { useEffect, useMemo, useState } from 'react';

const ACCESS_TOKEN_KEY = 'auth0_access_token';

interface UseAuthSessionResult {
  isLoggedIn: boolean;
  isAuthResolved: boolean;
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
        if (isActive) setHasStoredToken(Boolean(accessToken));
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
