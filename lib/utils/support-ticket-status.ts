export const SUPPORT_TICKET_STATUSES = {
  open: "OPEN",
  waitingForStore: "WAITING_FOR_STORE",
  underReview: "UNDER_REVIEW",
  escalated: "ESCALATED",
  waitingForCustomer: "WAITING_FOR_CUSTOMER",
  resolved: "RESOLVED",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
} as const;

const NON_TERMINAL_STATUS_MAP: Record<string, boolean> = {
  [SUPPORT_TICKET_STATUSES.open]: true,
  [SUPPORT_TICKET_STATUSES.waitingForStore]: true,
  [SUPPORT_TICKET_STATUSES.underReview]: true,
  [SUPPORT_TICKET_STATUSES.escalated]: true,
  [SUPPORT_TICKET_STATUSES.waitingForCustomer]: true,
};

const TERMINAL_STATUS_MAP: Record<string, boolean> = {
  [SUPPORT_TICKET_STATUSES.resolved]: true,
  [SUPPORT_TICKET_STATUSES.rejected]: true,
  [SUPPORT_TICKET_STATUSES.cancelled]: true,
};

export function normalizeTicketStatus(status: string | null | undefined): string {
  if (!status) return SUPPORT_TICKET_STATUSES.open;
  return status.trim().toUpperCase();
}

export function isNonTerminalTicketStatus(status: string | null | undefined): boolean {
  const normalizedStatus = normalizeTicketStatus(status);
  return NON_TERMINAL_STATUS_MAP[normalizedStatus] === true;
}

export function isTerminalTicketStatus(status: string | null | undefined): boolean {
  const normalizedStatus = normalizeTicketStatus(status);
  return TERMINAL_STATUS_MAP[normalizedStatus] === true;
}

