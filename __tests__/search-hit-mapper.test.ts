import { mapSearchHitToProduct } from '@/lib/utils/products';
import { InventorySearchHit } from '@/lib/types/api';

describe('mapSearchHitToProduct', () => {
  it('maps categoryDisplayName from store inventory search hits', () => {
    const hit: InventorySearchHit = {
      id: 999,
      storeId: 1,
      inventoryItemId: 101,
      itemName: 'Basmati Rice 10lb',
      categoryDisplayName: 'Grains',
      subCategoryDisplayName: 'Rice',
      brand: 'Daawat',
      imageUrl: 'https://cdn.example.com/rice.jpg',
      description: 'Long grain rice',
      weight: 4.54,
      weightUnit: 'kg',
      calories: 160,
      price: 18.99,
      stockQuantity: 42,
      popularityScore: 80,
      score: 12.34,
    };

    const mapped = mapSearchHitToProduct(hit);

    expect(mapped.id).toBe('999');
    expect(mapped.name).toBe('Basmati Rice 10lb');
    expect(mapped.category).toBe('Grains');
    expect(mapped.brand).toBe('Daawat');
    expect(mapped.inStock).toBe(true);
    expect(mapped.stockQuantity).toBe(42);
  });

  it('falls back to legacy category/brand fields when display names are missing', () => {
    const hit: InventorySearchHit = {
      id: 123,
      storeId: 7,
      productName: 'Legacy Product',
      categories: 'Snacks',
      subCategory: 'Chips',
      brandName: 'Legacy Brand',
      imageUrl: '',
      description: 'Legacy shaped payload',
      price: 3.49,
      stockQuantity: 0,
      score: 1.25,
    };

    const mapped = mapSearchHitToProduct(hit);

    expect(mapped.name).toBe('Legacy Product');
    expect(mapped.category).toBe('Snacks');
    expect(mapped.brand).toBe('Legacy Brand');
    expect(mapped.inStock).toBe(false);
  });
});
