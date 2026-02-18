export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export interface DeliverySlot {
  id: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  deliveryFee: number;
  available: boolean;
}

export interface FulfillmentTypeMap {
  delivery: 'delivery';
  pickup: 'pickup';
}

export interface OrderDetails {
  fulfillmentType?: FulfillmentTypeMap[keyof FulfillmentTypeMap];
  deliveryDate?: string;
  deliveryTimeSlot?: DeliverySlot;
  deliveryAddress?: string;
  pickupEta?: string;
  pickupLocation?: string;
  pickupLocationName?: string;
  recipientName: string;
  recipientPhone: string;
  deliveryInstructions?: string;
  textMessageUpdates: boolean;
  paymentMethodId?: string;
  promoCode?: string;
  tipAmount?: number;
}





