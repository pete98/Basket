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

export interface OrderDetails {
  deliveryDate: string;
  deliveryTimeSlot: DeliverySlot;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  deliveryInstructions?: string;
  textMessageUpdates: boolean;
  paymentMethodId?: string;
  promoCode?: string;
  tipAmount?: number;
}







