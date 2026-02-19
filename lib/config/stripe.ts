import Constants from 'expo-constants';

interface StripeExtra {
  stripePublishableKey?: string;
  stripeMerchantId?: string;
  stripeUrlScheme?: string;
  paymentsServiceBaseUrl?: string;
  paymentSheetPath?: string;
  orderServiceBaseUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as StripeExtra;

function resolveStripeValue(value: string | undefined, name: string): string {
  if (!value || value.startsWith('YOUR_STRIPE_')) {
    console.warn(`[Stripe] Missing ${name}. Update your Expo config or env vars.`);
    return '';
  }
  return value;
}

function buildPaymentSheetUrl(baseUrl: string, path: string): string {
  if (!baseUrl) return '';
  if (baseUrl.endsWith('/') && path.startsWith('/')) return `${baseUrl}${path.slice(1)}`;
  if (!baseUrl.endsWith('/') && !path.startsWith('/')) return `${baseUrl}/${path}`;
  return `${baseUrl}${path}`;
}

function resolveUrlScheme(value: string | string[] | undefined): string {
  if (!value) return '';
  if (Array.isArray(value)) return value[0] ?? '';
  return value;
}

const paymentsServiceBaseUrl =
  process.env.EXPO_PUBLIC_PAYMENTS_BASE_URL || 'https://8816-2600-4041-41f3-f300-d954-a29a-e130-5fb0.ngrok-free.app';
const paymentIntentPath = process.env.EXPO_PUBLIC_STRIPE_PAYMENT_SHEET_PATH || '/payments/intents';

export const stripeConfig = {
  publishableKey: resolveStripeValue(extra.stripePublishableKey, 'Stripe publishable key'),
  merchantIdentifier: extra.stripeMerchantId ?? '',
  urlScheme: resolveUrlScheme(extra.stripeUrlScheme ?? Constants.expoConfig?.scheme),
  paymentsServiceBaseUrl,
  paymentIntentPath,
  paymentIntentUrl: buildPaymentSheetUrl(paymentsServiceBaseUrl, paymentIntentPath),
};

export const isStripeConfigured = Boolean(
  stripeConfig.publishableKey && stripeConfig.paymentIntentUrl
);
