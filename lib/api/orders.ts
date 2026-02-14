import Constants from 'expo-constants';

import { ApiClientError } from './client';
import {
  CancelOrderRequest,
  CompletePickupRequest,
  ConfirmPaymentRequest,
  CreateOrderRequest,
  Order,
  OrderStatusResponse,
  PickupSlotsResponse,
  ReadyForPickupRequest,
  StoreOrderSummary,
} from '../types/orders';

const ORDER_API_BASE_URL =
  Constants.expoConfig?.extra?.orderServiceBaseUrl ?? 'https://21wdkmqssqbo.share.zrok.io';

function getOrderApiUrl(endpoint: string): string {
  return `${ORDER_API_BASE_URL}${endpoint}`;
}

async function orderApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = getOrderApiUrl(endpoint);
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
