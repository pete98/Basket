import { apiRequest } from './client';
import { Product } from '../types/api';

export interface FetchProductsParams {
  categoryName?: string;
  subcategoryName?: string;
}

function buildCategoryEndpoint(categoryName: string): string {
  return `/api/inventory/category/${encodeURIComponent(categoryName)}`;
}

function buildSubcategoryEndpoint(subcategoryName: string): string {
  return `/api/inventory/subcategory/${encodeURIComponent(subcategoryName)}`;
}

export async function fetchProductsByCategoryName(categoryName: string): Promise<Product[]> {
  return apiRequest<Product[]>(buildCategoryEndpoint(categoryName));
}

export async function fetchProductsBySubcategoryName(subcategoryName: string): Promise<Product[]> {
  return apiRequest<Product[]>(buildSubcategoryEndpoint(subcategoryName));
}

export async function fetchProducts(params?: FetchProductsParams): Promise<Product[]> {
  if (params?.categoryName) {
    return fetchProductsByCategoryName(params.categoryName);
  }
  if (params?.subcategoryName) {
    return fetchProductsBySubcategoryName(params.subcategoryName);
  }
  return apiRequest<Product[]>('/api/inventory');
}
