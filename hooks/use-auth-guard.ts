import { useCallback } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';

type RedirectTarget = {
  pathname: string;
  params?: Record<string, string>;
};

export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth0();
  const isLoggedIn = Boolean(user);

  const openLogin = useCallback(
    (target?: RedirectTarget) => {
      const redirect = target?.pathname ?? pathname ?? '/';
      const redirectParams = target?.params
        ? JSON.stringify(target.params)
        : undefined;

      router.push({
        pathname: '/login',
        params: {
          redirect,
          ...(redirectParams ? { redirectParams } : {}),
        },
      });
    },
    [pathname, router],
  );

  const ensureAuthenticated = useCallback(
    (target?: RedirectTarget) => {
      if (isLoggedIn) return true;
      openLogin(target);
      return false;
    },
    [isLoggedIn, openLogin],
  );

  return { isLoggedIn, ensureAuthenticated, openLogin };
}
