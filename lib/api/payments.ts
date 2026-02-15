import { stripeConfig } from '@/lib/config/stripe';

import { ApiClientError } from './client';
import { logApiError, logApiRequest, logApiResponse } from './request-logger';

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
}

export interface CreatePaymentIntentResponse {
  paymentId: number;
  orderId: string;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface CreatePaymentIntentParams {
  payload: CreatePaymentIntentRequest;
  accessToken: string;
  storeId: number | string;
  signal?: AbortSignal;
}

async function paymentApiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  if (!url) throw new ApiClientError('Payment endpoint is not configured.');
  const method = options.method ?? 'GET';

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
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
      let message = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        message = errorData.error?.message || errorData.message || message;
      } catch {
        // ignore parse errors
      }
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
  };
}
