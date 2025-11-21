export type PantryItemStatus = 'fresh' | 'expiring' | 'low' | 'expired';

export type PantryCategory = 'All' | 'Running Low' | 'Expiring Soon' | 'Staples' | 'Snacks' | 'Produce';

export interface PantryItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  quantityUnit?: string;
  expiryDate?: string; // ISO date string
  category: PantryCategory;
  status: PantryItemStatus;
  addedDate: string; // ISO date string
}

export interface PantryState {
  items: PantryItem[];
  selectedCategory: PantryCategory;
  searchQuery: string;
}

