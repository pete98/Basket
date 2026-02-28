import Constants from "expo-constants";
import { withStoredAccessTokenHeader } from "@/lib/api/auth-header";
import {
  type AddAttachmentMetadataRequest,
  type AddMessageRequest,
  type AttachmentMetadataResponse,
  type CreateTicketRequest,
  type TicketListResponse,
  type TicketMessageResponse,
  type TicketResponse,
} from "@/supportChat/types";

interface SupportExtra {
  supportServiceBaseUrl?: string;
  inventoryServiceBaseUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as SupportExtra;
const SUPPORT_API_BASE_URL =
  extra.supportServiceBaseUrl ||
  process.env.SUPPORT_API_BASE_URL ||
  process.env.EXPO_PUBLIC_SUPPORT_SERVICE_BASE_URL ||
  extra.inventoryServiceBaseUrl ||
  process.env.EXPO_PUBLIC_INVENTORY_BASE_URL ||
  "https://8816-2600-4041-41f3-f300-d954-a29a-e130-5fb0.ngrok-free.app";

class SupportApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SupportApiError";
    this.status = status;
  }
}

function buildUrl(path: string): string {
  return `${SUPPORT_API_BASE_URL}${path}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await withStoredAccessTokenHeader(options.headers);
  const url = buildUrl(path);
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...headers,
      },
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === "Network request failed") {
      throw new SupportApiError(
        `Network request failed. Support API URL: ${SUPPORT_API_BASE_URL}`,
      );
    }

    throw new SupportApiError(
      error instanceof Error ? error.message : "Support request failed.",
    );
  }

  if (!response.ok) {
    const bodyText = await response.text();
    let message = `Support request failed (${response.status}).`;

    if (bodyText) {
      try {
        const parsed = JSON.parse(bodyText) as {
          message?: string;
          error?: { message?: string };
        };
        message = parsed.error?.message || parsed.message || message;
      } catch {
        message = message;
      }
    }

    throw new SupportApiError(message, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new SupportApiError(
      "Unable to parse support API response.",
      response.status,
    );
  }
}

function normalizeTicket(ticket: TicketResponse): TicketResponse {
  return {
    ...ticket,
    ticketId: String(ticket.ticketId || ticket.id || ""),
    customerId: String(ticket.customerId || ""),
    storeId: ticket.storeId ? String(ticket.storeId) : undefined,
    orderId: String(ticket.orderId || ""),
  };
}

function normalizeMessage(
  message: TicketMessageResponse,
): TicketMessageResponse {
  return {
    ...message,
    ticketId: String(message.ticketId || ""),
    authorId: String(message.authorId || ""),
    messageId: String(message.messageId || message.id || ""),
  };
}

const SUPPORT_AI_LIMITS = {
  messageMaxLength: 4000,
  conversationIdMaxLength: 120,
  maxMetadataEntries: 20,
} as const;

export interface SupportAiChatRequest {
  message: string;
  selectedOrderId: string;
  conversationId?: string;
  confirmAction?: boolean;
  pendingActionToken?: string;
  filters?: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface SupportAiChatResponse {
  conversationId?: string;
  requiresConfirmation?: boolean;
  pendingAction?: {
    token?: string;
    [key: string]: unknown;
  };
  ticketId?: string;
  message?: string;
  reply?: string;
  content?: string;
  assistantMessage?: string;
  output?: string;
  [key: string]: unknown;
}

const SUPPORT_AI_CHAT_PATH = "/api/v1/support/chats";

function normalizeSupportAiChatRequest(
  payload: SupportAiChatRequest,
): SupportAiChatRequest {
  const message = payload.message.trim();
  if (!message) {
    throw new SupportApiError("Message is required.");
  }

  if (message.length > SUPPORT_AI_LIMITS.messageMaxLength) {
    throw new SupportApiError(
      `Message is too long (max ${SUPPORT_AI_LIMITS.messageMaxLength} characters).`,
    );
  }

  const conversationId = payload.conversationId?.trim();
  if (
    conversationId &&
    conversationId.length > SUPPORT_AI_LIMITS.conversationIdMaxLength
  ) {
    throw new SupportApiError(
      `Conversation ID is too long (max ${SUPPORT_AI_LIMITS.conversationIdMaxLength} characters).`,
    );
  }

  const selectedOrderId = payload.selectedOrderId.trim();
  if (!selectedOrderId) {
    throw new SupportApiError("selectedOrderId is required.");
  }

  const metadataEntries = Object.entries(payload.metadata ?? {}).slice(
    0,
    SUPPORT_AI_LIMITS.maxMetadataEntries,
  );

  const filterEntries = Object.entries(payload.filters ?? {}).slice(
    0,
    SUPPORT_AI_LIMITS.maxMetadataEntries,
  );
  const pendingActionToken = payload.pendingActionToken?.trim();

  return {
    message,
    selectedOrderId,
    conversationId: conversationId || undefined,
    confirmAction: payload.confirmAction === true ? true : undefined,
    pendingActionToken: pendingActionToken || undefined,
    filters: filterEntries.length > 0 ? Object.fromEntries(filterEntries) : undefined,
    metadata:
      metadataEntries.length > 0 ? Object.fromEntries(metadataEntries) : undefined,
  };
}

export async function createTicket(
  payload: CreateTicketRequest,
): Promise<TicketResponse> {
  const ticket = await request<TicketResponse>("/v1/support/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeTicket(ticket);
}

export async function getTicket(ticketId: string): Promise<TicketResponse> {
  const ticket = await request<TicketResponse>(
    `/v1/support/tickets/${ticketId}`,
  );
  return normalizeTicket(ticket);
}

export async function listTickets(params: {
  customerId: string;
  page?: number;
  size?: number;
}): Promise<TicketListResponse> {
  const query = new URLSearchParams({
    customerId: params.customerId,
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });

  const response = await request<TicketListResponse | TicketResponse[]>(
    `/v1/support/tickets?${query.toString()}`,
  );

  if (Array.isArray(response)) {
    return {
      content: response.map(normalizeTicket),
      page: params.page ?? 0,
      size: params.size ?? 20,
      totalElements: response.length,
      totalPages: 1,
    };
  }

  return {
    ...response,
    content: Array.isArray(response.content)
      ? response.content.map(normalizeTicket)
      : [],
  };
}

export async function addMessage(
  ticketId: string,
  payload: AddMessageRequest,
): Promise<TicketMessageResponse> {
  const message = await request<TicketMessageResponse>(
    `/v1/support/tickets/${ticketId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return normalizeMessage(message);
}

export async function listMessages(
  ticketId: string,
): Promise<TicketMessageResponse[]> {
  const messages = await request<TicketMessageResponse[]>(
    `/v1/support/tickets/${ticketId}/messages`,
  );
  if (!Array.isArray(messages)) return [];
  return messages.map(normalizeMessage);
}

export async function addAttachmentMetadata(
  ticketId: string,
  payload: AddAttachmentMetadataRequest,
): Promise<AttachmentMetadataResponse> {
  return request<AttachmentMetadataResponse>(
    `/v1/support/tickets/${ticketId}/attachments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function chatWithSupportAi(
  payload: SupportAiChatRequest,
): Promise<SupportAiChatResponse> {
  const normalized = normalizeSupportAiChatRequest(payload);
  console.log("[Support AI] Request", {
    path: SUPPORT_AI_CHAT_PATH,
    baseUrl: SUPPORT_API_BASE_URL,
    messageLength: normalized.message.length,
    selectedOrderId: normalized.selectedOrderId,
    hasConversationId: Boolean(normalized.conversationId),
    isConfirmAction: normalized.confirmAction === true,
  });

  try {
    const response = await request<SupportAiChatResponse>(SUPPORT_AI_CHAT_PATH, {
      method: "POST",
      body: JSON.stringify(normalized),
    });

    console.log("[Support AI] Success", {
      path: SUPPORT_AI_CHAT_PATH,
      hasConversationId:
        typeof response.conversationId === "string" &&
        response.conversationId.length > 0,
    });

    return response;
  } catch (error) {
    console.log("[Support AI] Error", {
      path: SUPPORT_AI_CHAT_PATH,
      status: error instanceof SupportApiError ? (error.status ?? null) : null,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
