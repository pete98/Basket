import { apiRequest } from './client';
import { Category, Product, Store, StoreHomeLayout, StoreResponse } from '../types/api';

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

export interface GetStoreHomeLayoutParams {
  storeId: number;
  signal?: AbortSignal;
}

export async function getStoreHomeLayout(params: GetStoreHomeLayoutParams): Promise<StoreHomeLayout> {
  return apiRequest<StoreHomeLayout>(`/api/stores/${params.storeId}/home-layout`, {
    signal: params.signal,
  });
}

export interface GetStoreInventoryParams {
  storeId: number;
  signal?: AbortSignal;
}

export async function getStoreInventory(params: GetStoreInventoryParams): Promise<Product[]> {
  return apiRequest<Product[]>(`/api/stores/${params.storeId}/inventory`, {
    signal: params.signal,
  });
}

export interface GetStoreCategoriesParams {
  storeId: number;
  signal?: AbortSignal;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function coerceString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function normalizeStoreCategory(raw: unknown): Category | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  const id = coerceNumber(data.id) ?? coerceNumber(data.categoryId);
  if (id === null) return null;

  const code =
    coerceString(data.code) ??
    coerceString(data.categoryCode) ??
    `CATEGORY_${id}`;
  const displayName =
    coerceString(data.displayName) ??
    coerceString(data.categoryDisplayName) ??
    coerceString(data.name) ??
    code;

  return {
    id,
    code,
    displayName,
    description: coerceString(data.description) ?? '',
    createdAt: coerceString(data.createdAt) ?? '',
    updatedAt: coerceString(data.updatedAt) ?? '',
    displayOrder: coerceNumber(data.displayOrder) ?? undefined,
    icon: coerceString(data.icon) ?? undefined,
  };
}

export async function getStoreCategories(params: GetStoreCategoriesParams): Promise<Category[]> {
  const response = await apiRequest<Category[] | { data?: Category[] }>(
    `/api/stores/${params.storeId}/categories`,
    {
      signal: params.signal,
    }
  );

  const source = Array.isArray(response)
    ? response
    : response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)
      ? response.data
      : [];

  const normalized = source
    .map((item) => normalizeStoreCategory(item))
    .filter((item): item is Category => item !== null);

  const dedupedById = new Map<number, Category>();
  normalized.forEach((category) => {
    dedupedById.set(category.id, category);
  });

  return Array.from(dedupedById.values());
}
