import Constants from 'expo-constants';
import { ApiClientError, type ApiError } from './client';
import { logApiError, logApiRequest, logApiResponse } from './request-logger';
import {
  CancelOrderRequest,
  CustomerSubstitutionDecisionRequest,
  CompletePickupRequest,
  ConfirmPaymentRequest,
  CreateOrderRequest,
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
  Order,
  OrderStatusResponse,
  PickupSlotsResponse,
  ReadyForPickupRequest,
  StoreOrderSummary,
} from '../types/orders';

interface OrderApiExtra {
  orderServiceBaseUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as OrderApiExtra;
const ORDER_API_BASE_URL =
  extra.orderServiceBaseUrl ||
  process.env.EXPO_PUBLIC_ORDER_SERVICE_BASE_URL ||
  'https://8816-2600-4041-41f3-f300-d954-a29a-e130-5fb0.ngrok-free.app';

function getOrderApiUrl(endpoint: string): string {
  return `${ORDER_API_BASE_URL}${endpoint}`;
}

function formatOrderApiErrorMessage(status: number, rawBody: string): string {
  const defaultMessage = `API request failed with status ${status}`;
  if (!rawBody) return defaultMessage;

  try {
    const errorData = JSON.parse(rawBody) as {
      error?: { message?: string };
      message?: string;
      details?: unknown;
    };
    const apiMessage = errorData.error?.message || errorData.message;
    if (!apiMessage) return `${defaultMessage}: ${rawBody}`;
    if (!errorData.details) return apiMessage;
    return `${apiMessage} (${JSON.stringify(errorData.details)})`;
  } catch {
    return `${defaultMessage}: ${rawBody}`;
  }
}

function parseOrderApiError(status: number, rawBody: string): ApiError | undefined {
  if (!rawBody) return undefined;
  try {
    const errorData = JSON.parse(rawBody) as {
      status?: number;
      code?: string;
      error?: { message?: string; code?: string };
      message?: string;
      fieldErrors?: Record<string, string> | { field?: string; message?: string }[];
    };

    const message = errorData.error?.message || errorData.message;
    const code = errorData.code || errorData.error?.code;
    return {
      status: typeof errorData.status === 'number' ? errorData.status : status,
      message: message || `API request failed with status ${status}`,
      code: typeof code === 'string' ? code : undefined,
      fieldErrors: errorData.fieldErrors,
    };
  } catch {
    return undefined;
  }
}

async function orderApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = getOrderApiUrl(endpoint);
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
      const rawErrorBody = await response.text();
      const message = formatOrderApiErrorMessage(response.status, rawErrorBody);
      const errorResponse = parseOrderApiError(response.status, rawErrorBody);
      throw new ApiClientError(message, response.status, errorResponse?.code, errorResponse);
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

export interface CreateOrderParams {
  payload: CreateOrderRequest;
  signal?: AbortSignal;
}

export async function createOrder(params: CreateOrderParams): Promise<Order> {
  return orderApiRequest<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(params.payload),
    signal: params.signal,
  });
}

export interface CreateDeliveryQuoteParams {
  payload: DeliveryQuoteRequest;
  signal?: AbortSignal;
}

export async function createDeliveryQuote(
  params: CreateDeliveryQuoteParams
): Promise<DeliveryQuoteResponse> {
  return orderApiRequest<DeliveryQuoteResponse>('/orders/delivery-quote', {
    method: 'POST',
    body: JSON.stringify(params.payload),
    signal: params.signal,
  });
}

export interface GetOrderParams {
  orderId: string;
  signal?: AbortSignal;
}

export async function getOrder(params: GetOrderParams): Promise<Order> {
  return orderApiRequest<Order>(`/orders/${params.orderId}`, {
    signal: params.signal,
  });
}

export interface GetOrderStatusParams {
  orderId: string;
  signal?: AbortSignal;
}

export async function getOrderStatus(params: GetOrderStatusParams): Promise<OrderStatusResponse> {
  return orderApiRequest<OrderStatusResponse>(`/orders/${params.orderId}/status`, {
    signal: params.signal,
  });
}

export interface CancelOrderParams {
  orderId: string;
  payload?: CancelOrderRequest;
  signal?: AbortSignal;
}

export async function cancelOrder(params: CancelOrderParams): Promise<OrderStatusResponse> {
  return orderApiRequest<OrderStatusResponse>(`/orders/${params.orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(params.payload ?? {}),
    signal: params.signal,
  });
}

export interface ConfirmPaymentParams {
  orderId: string;
  payload: ConfirmPaymentRequest;
  signal?: AbortSignal;
}

export async function confirmPayment(params: ConfirmPaymentParams): Promise<OrderStatusResponse> {
  return orderApiRequest<OrderStatusResponse>(`/orders/${params.orderId}/payments/confirm`, {
    method: 'POST',
    body: JSON.stringify(params.payload),
    signal: params.signal,
  });
}

export interface ReadyForPickupParams {
  orderId: string;
  payload?: ReadyForPickupRequest;
  signal?: AbortSignal;
}

export async function markReadyForPickup(
  params: ReadyForPickupParams
): Promise<OrderStatusResponse> {
  return orderApiRequest<OrderStatusResponse>(`/orders/${params.orderId}/pickup/ready`, {
    method: 'POST',
    body: JSON.stringify(params.payload ?? {}),
    signal: params.signal,
  });
}

export interface CompletePickupParams {
  orderId: string;
  payload?: CompletePickupRequest;
  signal?: AbortSignal;
}

export async function completePickup(
  params: CompletePickupParams
): Promise<OrderStatusResponse> {
  return orderApiRequest<OrderStatusResponse>(`/orders/${params.orderId}/pickup/complete`, {
    method: 'POST',
    body: JSON.stringify(params.payload ?? {}),
    signal: params.signal,
  });
}

export interface GetStoreOrdersParams {
  storeId: number;
  status?: string;
  signal?: AbortSignal;
}

function buildStoreOrdersQuery(status?: string): string {
  const queryParams = new URLSearchParams();
  if (status) queryParams.set('status', status);
  return queryParams.toString();
}

export async function getStoreOrders(params: GetStoreOrdersParams): Promise<StoreOrderSummary[]> {
  const query = buildStoreOrdersQuery(params.status);
  const endpoint = query
    ? `/stores/${params.storeId}/orders?${query}`
    : `/stores/${params.storeId}/orders`;

  return orderApiRequest<StoreOrderSummary[]>(endpoint, {
    signal: params.signal,
  });
}

export interface GetUserOrdersParams {
  userId: number;
  accessToken?: string;
  signal?: AbortSignal;
}

export async function getUserOrders(params: GetUserOrdersParams): Promise<StoreOrderSummary[]> {
  const headers: HeadersInit | undefined = params.accessToken
    ? { Authorization: `Bearer ${params.accessToken}` }
    : undefined;

  return orderApiRequest<StoreOrderSummary[]>(`/users/${params.userId}/orders`, {
    headers,
    signal: params.signal,
  });
}

export interface DecideSubstitutionParams {
  orderId: string;
  substitutionId: number;
  payload: CustomerSubstitutionDecisionRequest;
  signal?: AbortSignal;
}

export async function decideSubstitution(
  params: DecideSubstitutionParams
): Promise<Order> {
  return orderApiRequest<Order>(
    `/orders/${params.orderId}/substitutions/${params.substitutionId}/decision`,
    {
      method: 'POST',
      body: JSON.stringify(params.payload),
      signal: params.signal,
    }
  );
}

export interface GetPickupSlotsParams {
  storeId: number;
  date: string;
  signal?: AbortSignal;
}

export async function getPickupSlots(
  params: GetPickupSlotsParams
): Promise<PickupSlotsResponse> {
  const queryParams = new URLSearchParams({ date: params.date });
  return orderApiRequest<PickupSlotsResponse>(
    `/stores/${params.storeId}/pickup-slots?${queryParams.toString()}`,
    {
      signal: params.signal,
    }
  );
}
