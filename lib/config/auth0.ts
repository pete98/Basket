import Constants from 'expo-constants';

type ExpoExtra = {
  auth0Domain?: string;
  auth0ClientId?: string;
  auth0Audience?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const appScheme = Constants.expoConfig?.scheme;
const defaultCustomScheme = Array.isArray(appScheme) ? appScheme[0] : appScheme;

const fallbackWarning = (value: string | undefined, name: string) => {
  if (!value || value.startsWith('YOUR_AUTH0_')) {
    console.warn(`[Auth0] Missing ${name}. Update your Expo config or env vars.`);
    return '';
  }
  return value;
};

export const auth0Config = {
  domain: fallbackWarning(extra.auth0Domain, 'Auth0 domain'),
  clientId: fallbackWarning(extra.auth0ClientId, 'Auth0 client ID'),
  audience: extra.auth0Audience || process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || '',
  customScheme: process.env.EXPO_PUBLIC_AUTH0_CUSTOM_SCHEME || defaultCustomScheme || '',
};

export const isAuth0Configured = Boolean(auth0Config.domain && auth0Config.clientId);
