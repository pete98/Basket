import Constants from "expo-constants";
import { ApiClientError, type ApiError } from "./client";
import { withStoredAccessTokenHeader } from "./auth-header";
import { logApiError, logApiRequest, logApiResponse } from "./request-logger";
import type {
  CreateSupportTicketRequest,
  SupportAttachmentMetadata,
  SupportAttachmentMetadataRequest,
  SupportMessage,
  SupportMessageRequest,
  SupportTicket,
  SupportTicketPage,
} from "@/lib/types/support";

interface SupportApiExtra {
  supportServiceBaseUrl?: string;
  inventoryServiceBaseUrl?: string;
}

interface ApiPaginationEnvelope<T> {
  content?: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

const extra = (Constants.expoConfig?.extra ?? {}) as SupportApiExtra;
const SUPPORT_API_BASE_URL =
  extra.supportServiceBaseUrl ||
  process.env.EXPO_PUBLIC_SUPPORT_SERVICE_BASE_URL ||
  extra.inventoryServiceBaseUrl ||
  process.env.EXPO_PUBLIC_INVENTORY_BASE_URL ||
  "https://8816-2600-4041-41f3-f300-d954-a29a-e130-5fb0.ngrok-free.app";

function getSupportApiUrl(endpoint: string): string {
  return `${SUPPORT_API_BASE_URL}${endpoint}`;
}

function parseSupportApiError(
  status: number,
  rawBody: string,
): ApiError | undefined {
  if (!rawBody) return undefined;

  try {
    const errorData = JSON.parse(rawBody) as {
      status?: number;
      code?: string;
      error?: { message?: string; code?: string };
      message?: string;
      fieldErrors?:
        | Record<string, string>
        | { field?: string; message?: string }[];
    };

    const message = errorData.error?.message || errorData.message;
    const code = errorData.code || errorData.error?.code;
    return {
      status: typeof errorData.status === "number" ? errorData.status : status,
      message: message || `API request failed with status ${status}`,
      code: typeof code === "string" ? code : undefined,
      fieldErrors: errorData.fieldErrors,
    };
  } catch {
    return undefined;
  }
}

function formatSupportApiErrorMessage(status: number, rawBody: string): string {
  const fallback = `API request failed with status ${status}`;
  if (!rawBody) return fallback;

  try {
    const errorData = JSON.parse(rawBody) as {
      error?: { message?: string };
      message?: string;
    };
    return errorData.error?.message || errorData.message || fallback;
  } catch {
    return fallback;
  }
}

function normalizeTicket(rawTicket: SupportTicket): SupportTicket {
  const rawId = rawTicket.id || rawTicket.ticketId;
  return {
    ...rawTicket,
    id: String(rawId ?? ""),
    orderId: String(rawTicket.orderId ?? ""),
    storeId: String(rawTicket.storeId ?? ""),
    customerId: String(rawTicket.customerId ?? ""),
  };
}

function normalizeMessage(rawMessage: SupportMessage): SupportMessage {
  const rawId = rawMessage.id || rawMessage.messageId;
  return {
    ...rawMessage,
    id: String(rawId ?? ""),
    ticketId: String(rawMessage.ticketId ?? ""),
    authorId: String(rawMessage.authorId ?? ""),
  };
}

async function supportApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = getSupportApiUrl(endpoint);
  const method = options.method ?? "GET";
  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  const authHeaders = await withStoredAccessTokenHeader(options.headers);

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...authHeaders,
    },
  };

  const requestStartedAt = logApiRequest({
    method,
    url,
    headers: config.headers,
    body: config.body,
  });

  try {
    const response = await fetch(url, config);
    logApiResponse({
      method,
      url,
      status: response.status,
      durationMs: Date.now() - requestStartedAt,
    });

    if (!response.ok) {
      const rawErrorBody = await response.text();
      const message = formatSupportApiErrorMessage(
        response.status,
        rawErrorBody,
      );
      const errorResponse = parseSupportApiError(response.status, rawErrorBody);
      throw new ApiClientError(
        message,
        response.status,
        errorResponse?.code,
        errorResponse,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiClientError("Failed to parse API response", response.status);
    }
  } catch (error) {
    logApiError({
      method,
      url,
      durationMs: Date.now() - requestStartedAt,
      error,
    });
    if (error instanceof Error && error.name === "AbortError") throw error;
    if (error instanceof ApiClientError) throw error;
    if (
      error instanceof TypeError &&
      error.message === "Network request failed"
    )
      throw new ApiClientError(
        "Network error: Please check your internet connection",
      );
    throw new ApiClientError(
      error instanceof Error ? error.message : "An unexpected error occurred",
    );
  }
}

export interface CreateSupportTicketParams {
  payload: CreateSupportTicketRequest;
  signal?: AbortSignal;
}

export async function createSupportTicket(
  params: CreateSupportTicketParams,
): Promise<SupportTicket> {
  const ticket = await supportApiRequest<SupportTicket>("/v1/support/tickets", {
    method: "POST",
    body: JSON.stringify(params.payload),
    signal: params.signal,
  });
  return normalizeTicket(ticket);
}

export interface ListMySupportTicketsParams {
  customerId: string;
  page?: number;
  size?: number;
  signal?: AbortSignal;
}

export async function listMySupportTickets(
  params: ListMySupportTicketsParams,
): Promise<SupportTicketPage> {
  const query = new URLSearchParams({
    customerId: params.customerId,
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });

  const response = await supportApiRequest<
    ApiPaginationEnvelope<SupportTicket> | SupportTicket[]
  >(`/v1/support/tickets?${query.toString()}`, { signal: params.signal });

  if (Array.isArray(response)) {
    return {
      content: response.map(normalizeTicket),
      page: params.page ?? 0,
      size: params.size ?? 20,
      totalElements: response.length,
      totalPages: 1,
      hasNext: false,
    };
  }

  const content = Array.isArray(response.content)
    ? response.content.map(normalizeTicket)
    : [];
  const page = response.page ?? params.page ?? 0;
  const size = response.size ?? params.size ?? 20;
  const totalElements = response.totalElements ?? content.length;
  const totalPages = response.totalPages ?? 1;

  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    hasNext: page + 1 < totalPages,
  };
}

export interface GetSupportTicketDetailsParams {
  ticketId: string;
  signal?: AbortSignal;
}

export async function getSupportTicketDetails(
  params: GetSupportTicketDetailsParams,
): Promise<SupportTicket> {
  const ticket = await supportApiRequest<SupportTicket>(
    `/v1/support/tickets/${params.ticketId}`,
    {
      signal: params.signal,
    },
  );
  return normalizeTicket(ticket);
}

export interface AddSupportTicketMessageParams {
  ticketId: string;
  payload: SupportMessageRequest;
  signal?: AbortSignal;
}

export async function addSupportTicketMessage(
  params: AddSupportTicketMessageParams,
): Promise<SupportMessage> {
  const message = await supportApiRequest<SupportMessage>(
    `/v1/support/tickets/${params.ticketId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(params.payload),
      signal: params.signal,
    },
  );
  return normalizeMessage(message);
}

export interface ListSupportTicketMessagesParams {
  ticketId: string;
  signal?: AbortSignal;
}

export async function listSupportTicketMessages(
  params: ListSupportTicketMessagesParams,
): Promise<SupportMessage[]> {
  const messages = await supportApiRequest<SupportMessage[]>(
    `/v1/support/tickets/${params.ticketId}/messages`,
    { signal: params.signal },
  );
  if (!Array.isArray(messages)) return [];
  return messages.map(normalizeMessage);
}

export interface AddSupportTicketAttachmentParams {
  ticketId: string;
  payload: SupportAttachmentMetadataRequest;
  signal?: AbortSignal;
}

export async function addSupportTicketAttachment(
  params: AddSupportTicketAttachmentParams,
): Promise<SupportAttachmentMetadata> {
  return supportApiRequest<SupportAttachmentMetadata>(
    `/v1/support/tickets/${params.ticketId}/attachments`,
    {
      method: "POST",
      body: JSON.stringify(params.payload),
      signal: params.signal,
    },
  );
}
