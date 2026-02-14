export const ORDER_STATUSES = {
  pendingPayment: 'PENDING_PAYMENT',
  paid: 'PAID',
  readyForPickup: 'READY_FOR_PICKUP',
  pickedUp: 'PICKED_UP',
  cancelled: 'CANCELLED',
  paymentFailed: 'PAYMENT_FAILED',
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export interface OrderItemInput {
  productId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  userId: number;
  storeId: number;
  items: OrderItemInput[];
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  notes?: string;
}

export interface OrderLineItem {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  orderId: string;
  userId: number;
  storeId: number;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  createdAt: string;
  updatedAt: string;
  items: OrderLineItem[];
}

export interface OrderStatusResponse {
  orderId: string;
  status: OrderStatus;
  updatedAt: string;
}

export interface CancelOrderRequest {
  reason?: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  status: string;
  paidAt?: string;
}

export interface ReadyForPickupRequest {
  readyAt?: string;
}

export interface CompletePickupRequest {
  pickedUpAt?: string;
  pickedUpBy?: string;
}

export interface StoreOrderSummary {
  orderId: string;
  userId: number;
  status: OrderStatus;
  total: number;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  createdAt: string;
}

export interface PickupSlot {
  start: string;
  end: string;
  label: string;
}

export interface PickupSlotsResponse {
  storeId: number;
  date: string;
  slots: PickupSlot[];
}
