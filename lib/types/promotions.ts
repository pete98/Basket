export interface DealSectionProductSnapshot {
  productId: number;
  name: string;
  imageUrl: string | null;
  brand: string | null;
  category: string | null;
  originalPrice: number | null;
  promoPrice: number | null;
  discountLabel: string | null;
}

export interface DealSection {
  promotionId: number;
  title: string;
  subtitle: string | null;
  badgeText: string | null;
  endsAt: string | null;
  timezone: string | null;
  products: DealSectionProductSnapshot[];
}

export interface DealsSectionsResponse {
  storeId: number;
  generatedAt: string;
  sections: DealSection[];
}
