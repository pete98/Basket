import { Product as ApiProduct } from '../types/api';
import { UIProduct } from '../types/ui';

export function formatWeight(weight?: number, weightUnit?: string): string {
  if (!weight) return '';

  const unit = weightUnit?.toUpperCase();
  if (unit === 'GRAM') {
    return `${weight}g`;
  }
  if (unit === 'OZ') {
    return `${weight}oz`;
  }
  if (weightUnit) {
    return `${weight} ${weightUnit.toLowerCase()}`;
  }
  return weight.toString();
}

export function mapApiProductToProduct(apiProduct: ApiProduct): UIProduct {
  return {
    id: apiProduct.id.toString(),
    name: apiProduct.itemName,
    price: apiProduct.price,
    image: apiProduct.imageUrl,
    category: apiProduct.categories || apiProduct.subCategory || '',
    inStock: apiProduct.stockQuantity > 0,
    weight: apiProduct.weight,
    weightUnit: apiProduct.weightUnit,
    calories: apiProduct.calories,
    brand: apiProduct.brand,
    description: apiProduct.description,
    stockQuantity: apiProduct.stockQuantity,
    popularityScore: apiProduct.popularityScore,
  };
}

export function mapSearchHitToProduct(hit: ApiProduct & { score?: number }): UIProduct {
  return mapApiProductToProduct(hit);
}
