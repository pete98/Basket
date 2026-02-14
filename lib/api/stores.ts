import { apiRequest } from './client';
import { Store, StoreResponse } from '../types/api';

export interface GetStoresByZipParams {
  zip: string;
  signal?: AbortSignal;
}

export async function getStoresByZip(params: GetStoresByZipParams): Promise<StoreResponse> {
  const zip = params.zip.trim();
  if (!zip) {
    return [];
  }

  const queryParams = new URLSearchParams({ zip });

  return apiRequest<StoreResponse>(`/api/stores/by-zip?${queryParams.toString()}`, {
    signal: params.signal,
  });
}

export interface GetStoreByIdParams {
  storeId: number;
  signal?: AbortSignal;
}

export async function getStoreById(params: GetStoreByIdParams): Promise<Store> {
  return apiRequest<Store>(`/api/stores/${params.storeId}`, {
    signal: params.signal,
  });
}
