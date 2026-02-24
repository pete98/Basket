import { stripeConfig } from '@/lib/config/stripe';

import { ApiClientError } from './client';
import { logApiError, logApiRequest, logApiResponse } from './request-logger';
import { withStoredAccessTokenHeader } from './auth-header';

export interface CreatePaymentIntentRequest {
  orderId: string;
}

interface PaymentIntentApiResponse {
  paymentId: number;
  orderId: string;
  stripePaymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  customerId: string;
  ephemeralKeySecret: string;
  publishableKey: string;
}

export interface CreatePaymentIntentResponse {
  paymentId: number;
  orderId: string;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  customerId: string;
  ephemeralKeySecret: string;
  publishableKey: string;
}

export interface CreatePaymentIntentParams {
  payload: CreatePaymentIntentRequest;
  accessToken: string;
  storeId: number | string;
  signal?: AbortSignal;
}

export interface CancelPaymentIntentRequest {
  paymentIntentId: string;
}

export interface CancelPaymentIntentResponse {
  success: boolean;
  status: string | null;
  message: string | null;
  error: string | null;
}

export interface CancelPaymentIntentParams {
  payload: CancelPaymentIntentRequest;
  accessToken: string;
  signal?: AbortSignal;
}

interface CreateCustomerSessionApiResponse {
  customer: string;
  customerSessionClientSecret: string;
}

export interface CreateCustomerSessionResponse {
  customerId: string;
  customerSessionClientSecret: string;
}

interface CreateSetupIntentApiResponse {
  setupIntent: string;
}

export interface CreateSetupIntentResponse {
  setupIntentClientSecret: string;
}

function formatPaymentApiErrorMessage(status: number, rawBody: string): string {
  const fallback = `API request failed with status ${status}`;
  if (!rawBody) return fallback;

  try {
    const parsed = JSON.parse(rawBody) as {
      error?: { message?: string };
      message?: string;
      details?: unknown;
    };
    const message = parsed.error?.message || parsed.message;
    if (!message) return `${fallback}: ${rawBody}`;
    if (!parsed.details) return message;
    return `${message} (${JSON.stringify(parsed.details)})`;
  } catch {
    return `${fallback}: ${rawBody}`;
  }
}

function isRouteMissingError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  if (error.status === 404) return true;
  const message = error.message.toLowerCase();
  return message.includes('no static resource') || message.includes('not found');
}

function buildCancelPaymentFallbackUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path.includes('/api/cancel-payment')) {
      parsed.pathname = path.replace('/api/cancel-payment', '/cancel-payment');
      return parsed.toString();
    }
    if (path.includes('/cancel-payment')) {
      parsed.pathname = path.replace('/cancel-payment', '/api/cancel-payment');
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

async function paymentApiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  if (!url) throw new ApiClientError('Payment endpoint is not configured.');
  const method = options.method ?? 'GET';

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };

  const authHeaders = await withStoredAccessTokenHeader(options.headers);
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...authHeaders,
    },
  };

  const requestStartedAt = logApiRequest({
    method,
    url,
    headers: config.headers,
    body: config.body,
  });

  try {
    const response = await fetch(url, config);
    logApiResponse({
      method,
      url,
      status: response.status,
      durationMs: Date.now() - requestStartedAt,
    });
    if (!response.ok) {
      const rawBody = await response.text();
      const message = formatPaymentApiErrorMessage(response.status, rawBody);
      throw new ApiClientError(message, response.status);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiClientError('Failed to parse API response', response.status);
    }
  } catch (error) {
    logApiError({
      method,
      url,
      durationMs: Date.now() - requestStartedAt,
      error,
    });
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof ApiClientError) throw error;
    if (error instanceof TypeError && error.message === 'Network request failed') {
      throw new ApiClientError('Network error: Please check your internet connection');
    }
    throw new ApiClientError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResponse> {
  const normalizedStoreId =
    typeof params.storeId === 'number' ? String(params.storeId) : params.storeId.trim();
  if (!normalizedStoreId) throw new ApiClientError('Missing store id for payment intent.');

  const response = await paymentApiRequest<PaymentIntentApiResponse>(
    stripeConfig.paymentIntentUrl,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'X-Store-Id': normalizedStoreId,
      },
      body: JSON.stringify(params.payload),
      signal: params.signal,
    }
  );

  return {
    paymentId: response.paymentId,
    orderId: response.orderId,
    paymentIntentId: response.stripePaymentIntentId,
    clientSecret: response.clientSecret,
    amount: response.amount,
    currency: response.currency,
    status: response.status,
    customerId: response.customerId,
    ephemeralKeySecret: response.ephemeralKeySecret,
    publishableKey: response.publishableKey,
  };
}

export async function cancelPaymentIntent(
  params: CancelPaymentIntentParams
): Promise<CancelPaymentIntentResponse> {
  const paymentIntentId = params.payload.paymentIntentId.trim();
  if (!paymentIntentId) throw new ApiClientError('Missing payment intent id for cancellation.');

  const request: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({ paymentIntentId }),
    signal: params.signal,
  };

  try {
    return await paymentApiRequest<CancelPaymentIntentResponse>(stripeConfig.cancelPaymentUrl, request);
  } catch (error) {
    if (!isRouteMissingError(error)) throw error;
    const fallbackUrl = buildCancelPaymentFallbackUrl(stripeConfig.cancelPaymentUrl);
    if (!fallbackUrl || fallbackUrl === stripeConfig.cancelPaymentUrl) throw error;
    return paymentApiRequest<CancelPaymentIntentResponse>(fallbackUrl, request);
  }
}

export async function createStripeCustomerSession(
  signal?: AbortSignal
): Promise<CreateCustomerSessionResponse> {
  const response = await paymentApiRequest<CreateCustomerSessionApiResponse>(
    stripeConfig.customerSessionUrl,
    {
      method: 'POST',
      signal,
    }
  );

  if (!response.customer?.trim()) {
    throw new ApiClientError('Customer session response is missing customer id.');
  }
  if (!response.customerSessionClientSecret?.trim()) {
    throw new ApiClientError('Customer session response is missing client secret.');
  }

  return {
    customerId: response.customer,
    customerSessionClientSecret: response.customerSessionClientSecret,
  };
}

export async function createStripeSetupIntent(
  signal?: AbortSignal
): Promise<CreateSetupIntentResponse> {
  const response = await paymentApiRequest<CreateSetupIntentApiResponse>(
    stripeConfig.customerSetupIntentUrl,
    {
      method: 'POST',
      signal,
    }
  );

  if (!response.setupIntent?.trim()) {
    throw new ApiClientError('Setup intent response is missing client secret.');
  }

  return {
    setupIntentClientSecret: response.setupIntent,
  };
}
