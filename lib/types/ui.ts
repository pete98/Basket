export interface UIProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
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
