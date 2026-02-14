import { apiRequest } from './client';
import { InventorySearchResponse, AutocompleteResponse } from '../types/api';

export interface SearchProductsParams {
  storeId: number;
  query?: string;
  category?: string[];
  brand?: string[];
  inStockOnly?: boolean;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export async function searchProducts(params: SearchProductsParams): Promise<InventorySearchResponse> {
  const {
    storeId,
    query = "*",
    category = [],
    brand = [],
    inStockOnly,
    sortBy,
    page = 1,
    pageSize = 24,
  } = params;
  const normalizedPage = Math.max(page, 1);
  const normalizedPageSize = Math.min(Math.max(pageSize, 1), 100);

  const queryParams = new URLSearchParams();
  queryParams.append('storeId', storeId.toString());
  
  if (query) {
    queryParams.append('query', query);
  }
  
  // Add repeatable category parameters
  category.forEach((cat) => {
    queryParams.append('category', cat);
  });
  
  // Add repeatable brand parameters
  brand.forEach((b) => {
    queryParams.append('brand', b);
  });
  
  if (inStockOnly === true) {
    queryParams.append('inStockOnly', 'true');
  }
  
  if (sortBy) {
    queryParams.append('sortBy', sortBy);
  }
  
  queryParams.append('page', normalizedPage.toString());
  queryParams.append('pageSize', normalizedPageSize.toString());
  
  return apiRequest<InventorySearchResponse>(`/api/search/items?${queryParams.toString()}`);
}


export interface AutocompleteParams {
  query: string;
  limit?: number;
  signal?: AbortSignal;
}

export async function getAutocompleteSuggestions(params: AutocompleteParams): Promise<AutocompleteResponse> {
  if (!params.query.trim()) {
    return { suggestions: [] };
  }

  const queryParams = new URLSearchParams();
  queryParams.append('query', params.query.trim());
  
  let limit = params.limit || 5;
  if (limit < 1 || limit > 20) {
    limit = 5;
  }
  queryParams.append('limit', limit.toString());
  
  return apiRequest<AutocompleteResponse>(`/api/search/items/autocomplete?${queryParams.toString()}`, {
    signal: params.signal,
  });
}
