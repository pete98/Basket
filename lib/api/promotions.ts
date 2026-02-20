import { ApiClientError } from './client';
import { logApiError, logApiRequest, logApiResponse } from './request-logger';
import { withStoredAccessTokenHeader } from './auth-header';
import type { DealsSectionsResponse } from '../types/promotions';

const PROMOTION_API_BASE_URL = 'https://8816-2600-4041-41f3-f300-d954-a29a-e130-5fb0.ngrok-free.app';

export interface GetDealsSectionsParams {
  storeId: number;
  accessToken?: string;
  signal?: AbortSignal;
}

function getPromotionApiUrl(endpoint: string): string {
  return `${PROMOTION_API_BASE_URL}${endpoint}`;
}

async function promotionApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = getPromotionApiUrl(endpoint);
  const method = options.method ?? 'GET';
  const authHeaders = await withStoredAccessTokenHeader(options.headers);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders,
  };

  const requestStartedAt = logApiRequest({
    method,
    url,
    headers,
    body: options.body,
  });

  try {
    const response = await fetch(url, { ...options, headers });
    logApiResponse({
      method,
      url,
      status: response.status,
      durationMs: Date.now() - requestStartedAt,
    });

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const errorData = (await response.json()) as { error?: { message?: string }; message?: string };
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        // Keep fallback error message when body is not JSON
      }
      throw new ApiClientError(errorMessage, response.status);
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

export async function getDealsSections(
  params: GetDealsSectionsParams
): Promise<DealsSectionsResponse> {
  const headers: HeadersInit | undefined = params.accessToken
    ? { Authorization: `Bearer ${params.accessToken}` }
    : undefined;

  return promotionApiRequest<DealsSectionsResponse>(
    `/stores/${params.storeId}/deals/sections`,
    {
      headers,
      signal: params.signal,
    }
  );
}
