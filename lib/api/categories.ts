import { apiRequest } from './client';
import { Category } from '../types/api';

interface CategoriesResponse {
  data?: Category[];
}

export async function fetchCategories(): Promise<Category[]> {
  // API may return array directly or wrapped in { data: [...] }
  const response = await apiRequest<Category[] | CategoriesResponse>('/api/categories');
  
  // Handle both response formats
  if (Array.isArray(response)) {
    return response;
  }
  
  // If wrapped in data object
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data || [];
  }
  
  return [];
}

