export const ORDER_STATUSES = {
  pendingPayment: 'PENDING_PAYMENT',
  paid: 'PAID',
  readyForPickup: 'READY_FOR_PICKUP',
  pickedUp: 'PICKED_UP',
  cancelled: 'CANCELLED',
  paymentFailed: 'PAYMENT_FAILED',
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const FULFILLMENT_TYPES = {
  pickup: 'PICKUP',
  delivery: 'DELIVERY',
} as const;

export type FulfillmentType = (typeof FULFILLMENT_TYPES)[keyof typeof FULFILLMENT_TYPES];

export const DELIVERY_STATUSES = {
  notRequired: 'NOT_REQUIRED',
  quoteCreated: 'QUOTE_CREATED',
  dispatchPending: 'DISPATCH_PENDING',
  dispatched: 'DISPATCHED',
  inTransit: 'IN_TRANSIT',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
  dispatchFailed: 'DISPATCH_FAILED',
} as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[keyof typeof DELIVERY_STATUSES];

export interface OrderItemInput {
  productId: number;
  quantity: number;
}

export interface DeliveryContact {
  name: string;
  phone: string;
}

export interface DeliveryAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface CreateOrderRequest {
  userId: number;
  storeId: number;
  items: OrderItemInput[];
  fulfillmentType?: FulfillmentType;
  deliveryContact?: DeliveryContact;
  deliveryAddress?: DeliveryAddress;
  deliveryQuoteId?: string;
  deliveryQuoteFee?: number;
  deliveryQuoteExpiresAt?: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  notes?: string;
}

export interface DeliveryQuoteRequest {
  storeId: number;
  deliveryAddress: DeliveryAddress;
  pickupReadyDt?: string;
  pickupDeadlineDt?: string;
  dropoffReadyDt?: string;
  dropoffDeadlineDt?: string;
}

export interface DeliveryQuoteResponse {
  quoteId: string;
  estimatedFee: number;
  eta: string;
  expiresAt: string;
  currency: string;
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
  fulfillmentType?: FulfillmentType;
  deliveryStatus?: DeliveryStatus;
  currency: string;
  subtotalBeforeDiscount?: number;
  discountTotal?: number;
  subtotal: number;
  tax: number;
  total: number;
  deliveryFeeQuoted?: number | null;
  deliveryFeeFinal?: number | null;
  deliveryFeeAdjustmentAmount?: number | null;
  deliveryFeeAdjustmentStatus?: string | null;
  deliveryQuoteId?: string | null;
  deliveryQuoteExpiresAt?: string | null;
  deliveryTrackingUrl?: string | null;
  deliveryExternalId?: string | null;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  createdAt: string;
  updatedAt: string;
  items: OrderLineItem[];
}

export interface OrderStatusResponse {
  orderId: string;
  status: OrderStatus;
  fulfillmentType?: FulfillmentType;
  deliveryStatus?: DeliveryStatus;
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
