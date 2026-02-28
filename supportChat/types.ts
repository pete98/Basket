export const SUPPORT_TICKET_TYPES = {
  cancellation: "CANCELLATION",
  deliveryNotReceived: "DELIVERY_NOT_RECEIVED",
  deliveryDelay: "DELIVERY_DELAY",
  damagedItem: "DAMAGED_ITEM",
  missingItem: "MISSING_ITEM",
  wrongItem: "WRONG_ITEM",
  qualityIssue: "QUALITY_ISSUE",
  paymentIssue: "PAYMENT_ISSUE",
  other: "OTHER",
} as const;

export type SupportTicketType =
  (typeof SUPPORT_TICKET_TYPES)[keyof typeof SUPPORT_TICKET_TYPES];

export const SUPPORT_PRIORITIES = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  urgent: "URGENT",
} as const;

export type SupportPriority =
  (typeof SUPPORT_PRIORITIES)[keyof typeof SUPPORT_PRIORITIES];

export const ORDER_STATUSES = {
  placed: "PLACED",
  accepted: "ACCEPTED",
  ready: "READY",
  pickedUp: "PICKED_UP",
  delivered: "DELIVERED",
  failed: "FAILED",
  cancelled: "CANCELLED",
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const DELIVERY_MODES = {
  pickup: "PICKUP",
  delivery: "DELIVERY",
} as const;

export type DeliveryMode = (typeof DELIVERY_MODES)[keyof typeof DELIVERY_MODES];

export const CHAT_NODE_IDS = {
  greeting: "GREETING",
  withinWindowPrompt: "WITHIN_WINDOW_PROMPT",
  outsideWindowWarning: "OUTSIDE_WINDOW_WARNING",
  cancellationWarning: "CANCELLATION_WARNING",
  cancellationReason: "CANCELLATION_REASON",
  cancellationReasonOther: "CANCELLATION_REASON_OTHER",
  cancellationAccepted: "CANCELLATION_ACCEPTED",
  missingItemName: "MISSING_ITEM_NAME",
  missingItemQty: "MISSING_ITEM_QTY",
  missingItemPhoto: "MISSING_ITEM_PHOTO",
  damagedItemName: "DAMAGED_ITEM_NAME",
  damagedItemPhoto: "DAMAGED_ITEM_PHOTO",
  damagedPackaging: "DAMAGED_PACKAGING",
  wrongExpected: "WRONG_EXPECTED",
  wrongReceived: "WRONG_RECEIVED",
  wrongPhoto: "WRONG_PHOTO",
  deliveryNotReceivedWhere: "DELIVERY_NOT_RECEIVED_WHERE",
  deliveryNotReceivedWhereOther: "DELIVERY_NOT_RECEIVED_WHERE_OTHER",
  deliveryNotReceivedNotes: "DELIVERY_NOT_RECEIVED_NOTES",
  deliveryDelayWait: "DELIVERY_DELAY_WAIT",
  deliveryDelayNotes: "DELIVERY_DELAY_NOTES",
  qualityIssueText: "QUALITY_ISSUE_TEXT",
  qualityIssuePhoto: "QUALITY_ISSUE_PHOTO",
  paymentIssueKind: "PAYMENT_ISSUE_KIND",
  paymentIssueOther: "PAYMENT_ISSUE_OTHER",
  otherDescription: "OTHER_DESCRIPTION",
  evidence: "EVIDENCE",
  summary: "SUMMARY",
  submitted: "SUBMITTED",
} as const;

export type ChatNodeId = (typeof CHAT_NODE_IDS)[keyof typeof CHAT_NODE_IDS];

export const CHAT_INPUT_MODES = {
  quickReply: "QUICK_REPLY",
  text: "TEXT",
  number: "NUMBER",
  optionalText: "OPTIONAL_TEXT",
  attachmentPrompt: "ATTACHMENT_PROMPT",
  summary: "SUMMARY",
} as const;

export type ChatInputMode =
  (typeof CHAT_INPUT_MODES)[keyof typeof CHAT_INPUT_MODES];

export interface OrderContext {
  orderId: string;
  storeId?: string;
  orderStatus?: OrderStatus;
  deliveryMode?: DeliveryMode;
  deliveredAt?: string | null;
}

export interface LocalAttachment {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface QuickReplyOption {
  id: string;
  label: string;
  value: string;
}

export interface SupportChatDraft {
  ticketType?: SupportTicketType;
  withinWindow?: boolean;
  cancellationReason?: string;
  cancellationAccepted?: string;
  missingItemName?: string;
  missingItemQty?: number;
  damagedItemName?: string;
  damagedPackaging?: string;
  wrongExpectedItem?: string;
  wrongReceivedItem?: string;
  deliveryNotReceivedWhere?: string;
  deliveryNotReceivedNotes?: string;
  deliveryDelayWait?: string;
  deliveryDelayNotes?: string;
  qualityIssueText?: string;
  paymentIssueKind?: string;
  otherDescription?: string;
}

export interface SupportChatState {
  nodeId: ChatNodeId;
  draft: SupportChatDraft;
  warnings: string[];
}

export interface ChatTransition {
  state: SupportChatState;
  assistantMessages: string[];
  quickReplies: QuickReplyOption[];
  inputMode: ChatInputMode;
  expectsAttachmentPrompt?: boolean;
}

export const CHAT_EVENT_TYPES = {
  choose: "CHOOSE",
  textSubmit: "TEXT_SUBMIT",
  skip: "SKIP",
  continue: "CONTINUE",
  edit: "EDIT",
} as const;

export type ChatEventType =
  (typeof CHAT_EVENT_TYPES)[keyof typeof CHAT_EVENT_TYPES];

export interface ChatEvent {
  type: ChatEventType;
  value?: string;
}

export interface TicketPayloadBuildResult {
  type: SupportTicketType;
  subject: string;
  description: string;
  priority: SupportPriority;
  evidenceProvided: boolean;
  initialMessageBody?: string;
}

export interface TicketResponse {
  ticketId: string;
  id?: string;
  orderId: string;
  storeId?: string;
  customerId: string;
  type: SupportTicketType;
  subject: string;
  description: string;
  priority?: SupportPriority;
  status: string;
  evidenceProvided?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface TicketMessageResponse {
  messageId?: string;
  id?: string;
  ticketId: string;
  authorType: "CUSTOMER" | "SUPPORT_AGENT" | "SYSTEM" | string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface AttachmentMetadataResponse {
  id?: string;
  ticketId?: string;
  url: string;
  contentType: string;
  fileName: string;
  createdAt?: string;
}

export interface CreateTicketRequest {
  orderId: string;
  storeId?: string;
  customerId: string;
  type: SupportTicketType;
  subject: string;
  description: string;
  priority?: SupportPriority;
  evidenceProvided?: boolean;
}

export interface AddMessageRequest {
  authorType: "CUSTOMER";
  authorId: string;
  body: string;
}

export interface AddAttachmentMetadataRequest {
  url: string;
  contentType: string;
  fileName: string;
}

export interface TicketListResponse {
  content: TicketResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
