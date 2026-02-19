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

export const STORE_REVIEW_STATUSES = {
  pending: 'PENDING',
  accepted: 'ACCEPTED',
  rejected: 'REJECTED',
} as const;

export type StoreReviewStatus =
  (typeof STORE_REVIEW_STATUSES)[keyof typeof STORE_REVIEW_STATUSES];

export const PAYMENT_COLLECTION_STATUSES = {
  notStarted: 'NOT_STARTED',
  authorizing: 'AUTHORIZING',
  authorized: 'AUTHORIZED',
  captureRequested: 'CAPTURE_REQUESTED',
  captured: 'CAPTURED',
  authCancelled: 'AUTH_CANCELLED',
  failed: 'FAILED',
} as const;

export type PaymentCollectionStatus =
  (typeof PAYMENT_COLLECTION_STATUSES)[keyof typeof PAYMENT_COLLECTION_STATUSES];

export const ORDER_SUBSTITUTION_STATUSES = {
  pendingCustomer: 'PENDING_CUSTOMER',
  acceptedByCustomer: 'ACCEPTED_BY_CUSTOMER',
  declinedByCustomer: 'DECLINED_BY_CUSTOMER',
  applied: 'APPLIED',
  cancelled: 'CANCELLED',
} as const;

export type OrderSubstitutionStatus =
  (typeof ORDER_SUBSTITUTION_STATUSES)[keyof typeof ORDER_SUBSTITUTION_STATUSES];

export const SUBSTITUTION_DECISIONS = {
  accept: 'ACCEPT',
  decline: 'DECLINE',
} as const;

export type SubstitutionDecision =
  (typeof SUBSTITUTION_DECISIONS)[keyof typeof SUBSTITUTION_DECISIONS];

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
  storeReviewStatus?: StoreReviewStatus;
  paymentCollectionStatus?: PaymentCollectionStatus;
  hasPendingSubstitutions?: boolean;
  pendingSubstitutionCount?: number;
  customerName?: string | null;
  customerPhone?: string | null;
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
  substitutions?: OrderSubstitution[];
}

export interface OrderStatusResponse {
  orderId: string;
  status: OrderStatus;
  storeReviewStatus?: StoreReviewStatus;
  paymentCollectionStatus?: PaymentCollectionStatus;
  hasPendingSubstitutions?: boolean;
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
  storeId?: number;
  status: OrderStatus;
  storeReviewStatus?: StoreReviewStatus;
  paymentCollectionStatus?: PaymentCollectionStatus;
  fulfillmentType?: FulfillmentType;
  deliveryStatus?: DeliveryStatus;
  customerName?: string | null;
  customerPhone?: string | null;
  pendingSubstitutionCount?: number;
  deliveryTrackingUrl?: string | null;
  total: number;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  createdAt: string;
}

export interface OrderSubstitution {
  id: number;
  orderItemId?: number | null;
  requestedProductId?: number | null;
  replacementProductId?: number | null;
  replacementName?: string | null;
  replacementQty?: number | null;
  replacementUnitPrice?: number | null;
  reason?: string | null;
  status: OrderSubstitutionStatus;
  proposedBy?: string | null;
  proposedAt?: string | null;
  customerDecision?: SubstitutionDecision | null;
  customerDecisionAt?: string | null;
}

export interface CustomerSubstitutionDecisionRequest {
  decision: SubstitutionDecision;
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
