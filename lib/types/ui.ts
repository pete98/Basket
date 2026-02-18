export interface UIProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  promoPrice?: number;
  promoTag?: string;
  promotionId?: number;
  promotionType?: string;
  promotionEndsAt?: string;
  hasPromotion?: boolean;
  isPromotionEstimated?: boolean;
  image: string;
  category: string;
  inStock: boolean;
  discount?: number;
  weight?: number;
  weightUnit?: string;
  calories?: number;
  brand?: string;
  description?: string;
  stockQuantity?: number;
  popularityScore?: number;
}
