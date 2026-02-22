import { useCallback } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuthSession } from '@/hooks/use-auth-session';

type RedirectTarget = {
  pathname: string;
  params?: Record<string, string>;
};

export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthResolved, isLoggedIn } = useAuthSession();

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
      if (!isAuthResolved) return false;
      if (isLoggedIn) return true;
      openLogin(target);
      return false;
    },
    [isAuthResolved, isLoggedIn, openLogin],
  );

  return { isLoggedIn, isAuthResolved, ensureAuthenticated, openLogin };
}
