import { apiRequest } from './client';
import { Category, Product, Store, StoreHomeLayout, StoreResponse, Subcategory } from '../types/api';

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
  accessToken?: string;
  signal?: AbortSignal;
}

export async function getStoreById(params: GetStoreByIdParams): Promise<Store> {
  const headers: HeadersInit | undefined = params.accessToken
    ? { Authorization: `Bearer ${params.accessToken}` }
    : undefined;

  return apiRequest<Store>(`/api/stores/${params.storeId}`, {
    headers,
    signal: params.signal,
  });
}

export interface GetStoreHomeLayoutParams {
  storeId: number;
  accessToken?: string;
  signal?: AbortSignal;
}

export async function getStoreHomeLayout(params: GetStoreHomeLayoutParams): Promise<StoreHomeLayout> {
  const headers: HeadersInit | undefined = params.accessToken
    ? { Authorization: `Bearer ${params.accessToken}` }
    : undefined;

  return apiRequest<StoreHomeLayout>(`/api/stores/${params.storeId}/home-layout`, {
    headers,
    signal: params.signal,
  });
}

export interface GetStoreInventoryParams {
  storeId: number;
  accessToken?: string;
  signal?: AbortSignal;
}

export async function getStoreInventory(params: GetStoreInventoryParams): Promise<Product[]> {
  const headers: HeadersInit | undefined = params.accessToken
    ? { Authorization: `Bearer ${params.accessToken}` }
    : undefined;

  return apiRequest<Product[]>(`/api/stores/${params.storeId}/inventory`, {
    headers,
    signal: params.signal,
  });
}

export interface GetStoreInventoryItemByIdParams {
  storeId: number;
  id: number;
  accessToken?: string;
  signal?: AbortSignal;
  includePromotionOverlay?: boolean;
}

export async function getStoreInventoryItemById(
  params: GetStoreInventoryItemByIdParams
): Promise<Product> {
  const headers: HeadersInit | undefined = params.accessToken
    ? { Authorization: `Bearer ${params.accessToken}` }
    : undefined;
  const queryParams = new URLSearchParams();
  if (typeof params.includePromotionOverlay === 'boolean') {
    queryParams.set('includePromotionOverlay', params.includePromotionOverlay ? 'true' : 'false');
  }
  const queryString = queryParams.toString();

  return apiRequest<Product>(
    `/api/stores/${params.storeId}/inventory/${params.id}${queryString ? `?${queryString}` : ''}`,
    {
      headers,
      signal: params.signal,
    }
  );
}

export interface GetStoreCategoriesParams {
  storeId: number;
  accessToken?: string;
  signal?: AbortSignal;
}

export interface GetSubcategoriesByCategoryCodeParams {
  categoryCode: string;
  accessToken?: string;
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

function normalizeStoreSubcategory(raw: unknown): Subcategory | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  const code =
    coerceString(data.code) ??
    coerceString(data.subCategoryCode) ??
    coerceString(data.subcategoryCode);
  if (!code) return null;

  const displayName =
    coerceString(data.displayName) ??
    coerceString(data.subCategoryDisplayName) ??
    coerceString(data.subcategoryDisplayName) ??
    coerceString(data.name) ??
    code;

  return {
    id: coerceNumber(data.id) ?? coerceNumber(data.subCategoryId) ?? undefined,
    code,
    displayName,
    categoryCode:
      coerceString(data.categoryCode) ??
      coerceString(data.parentCategoryCode) ??
      undefined,
    description: coerceString(data.description) ?? undefined,
    createdAt: coerceString(data.createdAt) ?? undefined,
    updatedAt: coerceString(data.updatedAt) ?? undefined,
    displayOrder: coerceNumber(data.displayOrder) ?? undefined,
  };
}

export async function getStoreCategories(params: GetStoreCategoriesParams): Promise<Category[]> {
  const headers: HeadersInit | undefined = params.accessToken
    ? { Authorization: `Bearer ${params.accessToken}` }
    : undefined;

  const response = await apiRequest<Category[] | { data?: Category[] }>(
    `/api/stores/${params.storeId}/categories`,
    {
      headers,
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

export async function getSubcategoriesByCategoryCode(
  params: GetSubcategoriesByCategoryCodeParams
): Promise<Subcategory[]> {
  const categoryCode = params.categoryCode.trim();
  if (!categoryCode) return [];

  const headers: HeadersInit | undefined = params.accessToken
    ? { Authorization: `Bearer ${params.accessToken}` }
    : undefined;

  const queryParams = new URLSearchParams({ categoryCode });
  const response = await apiRequest<Subcategory[] | { data?: Subcategory[] }>(
    `/api/subcategories?${queryParams.toString()}`,
    {
      headers,
      signal: params.signal,
    }
  );

  const source = Array.isArray(response)
    ? response
    : response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)
      ? response.data
      : [];

  const normalized = source
    .map((item) => normalizeStoreSubcategory(item))
    .filter((item): item is Subcategory => item !== null);

  const dedupedByCode = new Map<string, Subcategory>();
  normalized.forEach((subcategory) => {
    dedupedByCode.set(subcategory.code.trim().toLowerCase(), subcategory);
  });

  return Array.from(dedupedByCode.values());
}
