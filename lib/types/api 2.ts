// Category types matching /api/categories response
export interface Category {
  id: number;
  code: string;
  displayName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  displayOrder?: number; // Optional field to control UI display order
  icon?: string; // Optional icon/emoji for the category
}

// API returns array directly, not wrapped in data/meta
export type CategoryResponse = Category[];

// Product types matching /api/inventory response (InventoryResponseDTO)
export interface Product {
  id: number;
  itemName: string;
  productCode: string;
  sku: string;
  price: number;
  stockQuantity: number;
  categories: string;
  subCategory: string;
  brand: string;
  modifiers: string;
  labels: string;
  taxRate: number;
  taxEnabled: boolean;
  fees: string;
  description: string;
  imageUrl: string;
  calories?: number;
  weight?: number;
  weightUnit?: string;
  popularityScore?: number;
}

// API returns array directly, not wrapped in data/meta
export type ProductResponse = Product[];

// Search types matching /api/search/items response (InventorySearchResponse)
export interface InventorySearchHit extends Product {
  score: number;
}

export interface SearchFacets {
  [key: string]: { [value: string]: number };
}

export interface InventorySearchResponse {
  found: number;
  page: number;
  pageSize: number;
  hits: InventorySearchHit[];
  facets?: SearchFacets;
}

// Autocomplete types matching /api/search/items/autocomplete response
export interface AutocompleteResponse {
  suggestions: string[];
}

// Store types matching /api/stores/by-zip response
export interface Store {
  id: number;
  code: string;
  displayName: string;
  phone?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  status: string;
  pickupEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// API returns array directly, not wrapped in data/meta
export type StoreResponse = Store[];
