import { PantryCategory, PantryItemStatus } from '@/lib/types/pantry';

export const PANTRY_CATEGORIES: PantryCategory[] = [
  'All',
  'Running Low',
  'Expiring Soon',
  'Staples',
  'Snacks',
  'Produce',
];

export const STATUS_COLORS: Record<PantryItemStatus, string> = {
  fresh: '#34C759', // Green
  expiring: '#FFCC00', // Yellow
  low: '#FF3B30', // Red
  expired: '#FF3B30', // Red
};

export const STATUS_BADGE_COLORS: Record<PantryItemStatus, { bg: string; text: string }> = {
  fresh: { bg: '#ECFDF5', text: '#047857' },
  expiring: { bg: '#FEF3C7', text: '#92400E' },
  low: { bg: '#FEE2E2', text: '#991B1B' },
  expired: { bg: '#FEE2E2', text: '#991B1B' },
};

export const DEFAULT_ITEM_IMAGE = 'https://via.placeholder.com/150?text=Item';

export const RECIPE_SUGGESTIONS = [
  'Aloo Sabzi',
  'Pasta with Vegetables',
  'Stir Fry',
  'Salad Bowl',
  'Soup',
  'Sandwich',
  'Rice Bowl',
  'Omelette',
];

export const PANTRY_STORAGE_KEY = 'pantry_items_v1';

