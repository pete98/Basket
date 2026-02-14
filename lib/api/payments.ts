import { stripeConfig } from '@/lib/config/stripe';

import { ApiClientError } from './client';

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
  signal?: AbortSignal;
}

async function paymentApiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  if (!url) throw new ApiClientError('Payment endpoint is not configured.');

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

  try {
    const response = await fetch(url, config);
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
  const response = await paymentApiRequest<PaymentIntentApiResponse>(
    stripeConfig.paymentIntentUrl,
    {
      method: 'POST',
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
