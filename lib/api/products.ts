import { apiRequest } from './client';
import { Product } from '../types/api';

export interface FetchProductsParams {
  categoryId?: string;
}

export async function fetchProducts(params?: FetchProductsParams): Promise<Product[]> {
  // API returns array directly from /api/inventory
  const allProducts = await apiRequest<Product[]>('/api/inventory');
  
  // Filter by category if provided
  if (params?.categoryId) {
    return allProducts.filter(product => 
      product.categories === params.categoryId || 
      product.subCategory === params.categoryId
    );
  }
  
  return allProducts;
}

