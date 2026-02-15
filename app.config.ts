import { ConfigContext, ExpoConfig } from 'expo/config';

const DEFAULT_BUNDLE_ID = 'com.baskets';

export default ({ config }: ConfigContext): ExpoConfig => {
  const auth0Domain =
    process.env.EXPO_PUBLIC_AUTH0_DOMAIN ||
    process.env.AUTH0_DOMAIN ||
    'dev-hhtarorh33yux8dc.us.auth0.com';
  const auth0ClientId =
    process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ||
    process.env.AUTH0_CLIENT_ID ||
    'KfQvdaBw3rTbZpLwhcBJxoZ8swOoPNf9';
  const auth0Audience =
    process.env.EXPO_PUBLIC_AUTH0_AUDIENCE ||
    process.env.AUTH0_AUDIENCE ||
    'https://adminapi';
  const iosBundleIdentifier = process.env.EXPO_IOS_BUNDLE_ID || DEFAULT_BUNDLE_ID;
  const androidPackage = process.env.EXPO_ANDROID_PACKAGE || DEFAULT_BUNDLE_ID;
  const auth0Scheme = `${iosBundleIdentifier}.auth0`;
  const orderServiceBaseUrl =
    process.env.EXPO_PUBLIC_ORDER_SERVICE_BASE_URL ||
    process.env.ORDER_SERVICE_BASE_URL ||
    'https://thick-ducks-double.loca.lt';
  const paymentsServiceBaseUrl =
    process.env.EXPO_PUBLIC_PAYMENTS_BASE_URL ||
    process.env.PAYMENTS_BASE_URL ||
    'https://major-pots-press.loca.lt';
  const stripePublishableKey =
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    'pk_test_51SnkXWDRL0l42CwWp1UTp1NU9jcAGk52p95Hlwt0a9Zba0ME6g4mTGpcZ8gRsqx1FfHDSIz86vlEqJpoBw64nNCb00VibZzF9G';
  const stripeMerchantId =
    process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID || process.env.STRIPE_MERCHANT_ID || '';
  const stripeUrlScheme =
    process.env.EXPO_PUBLIC_STRIPE_URL_SCHEME || process.env.STRIPE_URL_SCHEME || auth0Scheme;
  const paymentSheetPath =
    process.env.EXPO_PUBLIC_STRIPE_PAYMENT_SHEET_PATH ||
    process.env.STRIPE_PAYMENT_SHEET_PATH ||
    '/payments/intents';
  const inventoryServiceBaseUrl =
    process.env.EXPO_PUBLIC_INVENTORY_BASE_URL ||
    process.env.INVENTORY_BASE_URL ||
    'https://cd7ba7c78881.ngrok-free.app';
  const userServiceBaseUrl =
    process.env.EXPO_PUBLIC_USER_SERVICE_BASE_URL ||
    process.env.USER_SERVICE_BASE_URL ||
    'https://3snjivztz81a.share.zrok.io';

  return {
    ...config,
    name: 'Basket',
    slug: 'Basket',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: auth0Scheme,
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: iosBundleIdentifier,
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: androidPackage,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      'expo-secure-store',
      [
        'react-native-auth0',
        {
          domain: auth0Domain,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      ...(config.extra ?? {}),
      auth0Domain,
      auth0ClientId,
      auth0Audience,
      orderServiceBaseUrl,
      paymentsServiceBaseUrl,
      stripePublishableKey,
      stripeMerchantId,
      stripeUrlScheme,
      paymentSheetPath,
      inventoryServiceBaseUrl,
      userServiceBaseUrl,
    },
  };
};
