export const SUPPORT_TICKET_TYPES = {
  missingItem: "MISSING_ITEM",
  damagedItem: "DAMAGED_ITEM",
  wrongItem: "WRONG_ITEM",
  deliveryDelay: "DELIVERY_DELAY",
  paymentRefund: "PAYMENT_REFUND",
  other: "OTHER",
} as const;

export type SupportTicketType =
  (typeof SUPPORT_TICKET_TYPES)[keyof typeof SUPPORT_TICKET_TYPES];

export const SUPPORT_TICKET_PRIORITIES = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
} as const;

export type SupportTicketPriority =
  (typeof SUPPORT_TICKET_PRIORITIES)[keyof typeof SUPPORT_TICKET_PRIORITIES];

export const SUPPORT_MESSAGE_AUTHOR_TYPES = {
  customer: "CUSTOMER",
  supportAgent: "SUPPORT_AGENT",
  system: "SYSTEM",
} as const;

export type SupportMessageAuthorType =
  (typeof SUPPORT_MESSAGE_AUTHOR_TYPES)[keyof typeof SUPPORT_MESSAGE_AUTHOR_TYPES];

export interface CreateSupportTicketRequest {
  orderId: string;
  storeId: string;
  customerId: string;
  type: SupportTicketType;
  subject: string;
  description: string;
  priority: SupportTicketPriority;
  evidenceProvided: boolean;
}

export interface SupportAttachmentMetadataRequest {
  url: string;
  contentType: string;
  fileName: string;
}

export interface SupportMessageRequest {
  authorType: SupportMessageAuthorType;
  authorId: string;
  body: string;
}

export interface SupportTicket {
  id: string;
  ticketId?: string;
  orderId: string;
  storeId: string;
  customerId: string;
  type: SupportTicketType | string;
  subject: string;
  description: string;
  priority: SupportTicketPriority | string;
  status: string;
  evidenceProvided: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SupportMessage {
  id: string;
  messageId?: string;
  ticketId: string;
  authorType: SupportMessageAuthorType | string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface SupportAttachmentMetadata {
  id?: string;
  ticketId?: string;
  url: string;
  contentType: string;
  fileName: string;
  createdAt?: string;
}

export interface SupportTicketPage {
  content: SupportTicket[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}
