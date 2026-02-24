import { InventorySearchHit, Product as ApiProduct } from '../types/api';
import { UIProduct } from '../types/ui';

const WEIGHT_UNIT_LABELS: Record<string, string> = {
  G: 'g',
  GRAM: 'g',
  GRAMS: 'g',
  KG: 'kg',
  KILOGRAM: 'kg',
  KILOGRAMS: 'kg',
  OZ: 'oz',
  OUNCE: 'oz',
  OUNCES: 'oz',
  FL_OZ: 'oz',
  FLOZ: 'oz',
  FLUID_OUNCE: 'oz',
  FLUID_OUNCES: 'oz',
  LB: 'lb',
  LBS: 'lb',
  POUND: 'lb',
  POUNDS: 'lb',
  ML: 'ml',
  MILLILITER: 'ml',
  MILLILITERS: 'ml',
  L: 'L',
  LITER: 'L',
  LITERS: 'L',
  EA: 'ea',
  EACH: 'ea',
  UNIT: 'ea',
  CT: 'ct',
  COUNT: 'ct',
  PC: 'pc',
  PCS: 'pc',
  PIECE: 'pc',
  PIECES: 'pc',
  PK: 'pk',
  PACK: 'pk',
};

function formatWeightUnitLabel(weightUnit?: string): string {
  if (!weightUnit) return '';

  const normalizedUnit = weightUnit
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  const mappedUnit = WEIGHT_UNIT_LABELS[normalizedUnit];
  if (mappedUnit) return mappedUnit;

  return weightUnit
    .trim()
    .replace(/[_-]+/g, ' ')
    .toLowerCase();
}

export function formatWeight(weight?: number, weightUnit?: string): string {
  if (!weight) return '';

  const unitLabel = formatWeightUnitLabel(weightUnit);
  if (!unitLabel) return weight.toString();
  return `${weight} ${unitLabel}`;
}

export function mapApiProductToProduct(apiProduct: ApiProduct): UIProduct {
  const category =
    apiProduct.categoryDisplayName ||
    apiProduct.subCategoryDisplayName ||
    apiProduct.categories ||
    apiProduct.subCategory ||
    '';
  const productName = apiProduct.itemName || apiProduct.productName || '';
  const hasPromotionFlag = apiProduct.hasPromotion === true;
  const hasPromotionBoolean = typeof apiProduct.hasPromotion === 'boolean';
  const promoPrice =
    typeof apiProduct.promoPrice === 'number' && Number.isFinite(apiProduct.promoPrice)
      ? apiProduct.promoPrice
      : undefined;
  const basePrice =
    typeof apiProduct.price === 'number' && Number.isFinite(apiProduct.price)
      ? apiProduct.price
      : 0;
  const hasPromoPrice = typeof promoPrice === 'number';
  const hasPromotion = hasPromotionBoolean ? hasPromotionFlag : hasPromoPrice;
  const effectivePrice = hasPromotion && hasPromoPrice ? promoPrice : basePrice;
  const discount =
    hasPromotion && hasPromoPrice && basePrice > promoPrice
      ? Math.round(((basePrice - promoPrice) / basePrice) * 100)
      : undefined;

  return {
    id: apiProduct.id.toString(),
    name: productName,
    // Inventory API `price` is base/original; for UI use promo when available.
    price: effectivePrice,
    originalPrice: hasPromotion ? basePrice : undefined,
    promoPrice: hasPromotion ? promoPrice : undefined,
    promoTag: hasPromotion ? apiProduct.promoTag : undefined,
    promotionId: hasPromotion ? apiProduct.promotionId : undefined,
    promotionType: hasPromotion ? apiProduct.promotionType : undefined,
    promotionEndsAt: hasPromotion ? apiProduct.promotionEndsAt : undefined,
    hasPromotion,
    isPromotionEstimated: hasPromotion ? apiProduct.isPromotionEstimated : undefined,
    image: apiProduct.imageUrl || '',
    category,
    inStock: apiProduct.stockQuantity > 0,
    discount,
    weight: apiProduct.weight,
    weightUnit: apiProduct.weightUnit,
    calories: apiProduct.calories,
    brand: apiProduct.brand || apiProduct.brandName,
    description: apiProduct.description,
    stockQuantity: apiProduct.stockQuantity,
    popularityScore: apiProduct.popularityScore,
  };
}

export function mapSearchHitToProduct(hit: InventorySearchHit): UIProduct {
  const category =
    hit.categoryDisplayName ||
    hit.subCategoryDisplayName ||
    hit.categories ||
    hit.subCategory ||
    '';
  const productName = hit.itemName || hit.productName || '';
  const hasPromotionFlag = hit.hasPromotion === true;
  const hasPromotionBoolean = typeof hit.hasPromotion === 'boolean';
  const promoPrice =
    typeof hit.promoPrice === 'number' && Number.isFinite(hit.promoPrice)
      ? hit.promoPrice
      : undefined;
  const basePrice =
    typeof hit.price === 'number' && Number.isFinite(hit.price)
      ? hit.price
      : 0;
  const hasPromoPrice = typeof promoPrice === 'number';
  const hasPromotion = hasPromotionBoolean ? hasPromotionFlag : hasPromoPrice;
  const effectivePrice = hasPromotion && hasPromoPrice ? promoPrice : basePrice;
  const discount =
    hasPromotion && hasPromoPrice && basePrice > promoPrice
      ? Math.round(((basePrice - promoPrice) / basePrice) * 100)
      : undefined;

  return {
    id: hit.id.toString(),
    name: productName,
    // Search API `price` is base/original; for UI use promo when available.
    price: effectivePrice,
    originalPrice: hasPromotion ? basePrice : undefined,
    promoPrice: hasPromotion ? promoPrice : undefined,
    promoTag: hasPromotion ? hit.promoTag : undefined,
    promotionId: hasPromotion ? hit.promotionId : undefined,
    promotionType: hasPromotion ? hit.promotionType : undefined,
    promotionEndsAt: hasPromotion ? hit.promotionEndsAt : undefined,
    hasPromotion,
    isPromotionEstimated: hasPromotion ? hit.isPromotionEstimated : undefined,
    image: hit.imageUrl || '',
    category,
    inStock: hit.stockQuantity > 0,
    discount,
    weight: hit.weight,
    weightUnit: hit.weightUnit,
    calories: hit.calories,
    brand: hit.brand || hit.brandName,
    description: hit.description,
    stockQuantity: hit.stockQuantity,
    popularityScore: hit.popularityScore,
  };
}
