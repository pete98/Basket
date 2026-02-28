import {
  SUPPORT_PRIORITIES,
  SUPPORT_TICKET_TYPES,
  type LocalAttachment,
  type OrderContext,
  type SupportChatDraft,
  type SupportPriority,
  type SupportTicketType,
  type TicketPayloadBuildResult,
} from "@/supportChat/types";

const SUBJECT_MAX = 255;
const DESCRIPTION_MAX = 4000;

const ISSUE_LABELS: Record<SupportTicketType, string> = {
  CANCELLATION: "Cancellation request",
  DELIVERY_NOT_RECEIVED: "Delivery not received",
  DELIVERY_DELAY: "Delivery delay",
  DAMAGED_ITEM: "Damaged item",
  MISSING_ITEM: "Missing item",
  WRONG_ITEM: "Wrong item",
  QUALITY_ISSUE: "Quality issue",
  PAYMENT_ISSUE: "Payment issue",
  OTHER: "Support request",
};

function trimToMax(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

function getPriority(type: SupportTicketType): SupportPriority {
  if (type === SUPPORT_TICKET_TYPES.deliveryNotReceived)
    return SUPPORT_PRIORITIES.urgent;
  if (
    type === SUPPORT_TICKET_TYPES.missingItem ||
    type === SUPPORT_TICKET_TYPES.damagedItem ||
    type === SUPPORT_TICKET_TYPES.wrongItem ||
    type === SUPPORT_TICKET_TYPES.paymentIssue
  ) {
    return SUPPORT_PRIORITIES.high;
  }
  return SUPPORT_PRIORITIES.medium;
}

function nonEmptyLine(
  label: string,
  value: string | number | undefined,
): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return `${label}: ${text}`;
}

function buildDetails(draft: SupportChatDraft): string[] {
  const details: (string | null)[] = [];

  details.push(nonEmptyLine("Cancellation reason", draft.cancellationReason));
  details.push(nonEmptyLine("Order accepted", draft.cancellationAccepted));
  details.push(nonEmptyLine("Missing item", draft.missingItemName));
  details.push(nonEmptyLine("Missing quantity", draft.missingItemQty));
  details.push(nonEmptyLine("Damaged item", draft.damagedItemName));
  details.push(nonEmptyLine("Packaging damaged", draft.damagedPackaging));
  details.push(nonEmptyLine("Expected item", draft.wrongExpectedItem));
  details.push(nonEmptyLine("Received item", draft.wrongReceivedItem));
  details.push(
    nonEmptyLine("Checked location", draft.deliveryNotReceivedWhere),
  );
  details.push(nonEmptyLine("Delivery notes", draft.deliveryNotReceivedNotes));
  details.push(nonEmptyLine("Delay duration", draft.deliveryDelayWait));
  details.push(nonEmptyLine("Delay notes", draft.deliveryDelayNotes));
  details.push(nonEmptyLine("Quality issue", draft.qualityIssueText));
  details.push(nonEmptyLine("Payment issue", draft.paymentIssueKind));
  details.push(nonEmptyLine("Additional details", draft.otherDescription));

  if (draft.withinWindow === true)
    details.push("Reported within 6-hour window: Yes");
  if (draft.withinWindow === false)
    details.push("Reported within 6-hour window: No");

  return details.filter((line): line is string => Boolean(line));
}

export function buildTicketPayload(params: {
  orderContext: OrderContext;
  draft: SupportChatDraft;
  attachments: LocalAttachment[];
}): TicketPayloadBuildResult {
  const type = params.draft.ticketType || SUPPORT_TICKET_TYPES.other;
  const issueLabel = ISSUE_LABELS[type];
  const subject = trimToMax(
    `${issueLabel} - Order ${params.orderContext.orderId}`,
    SUBJECT_MAX,
  );

  const descriptionLines = [
    `Issue type: ${issueLabel}`,
    `Order ID: ${params.orderContext.orderId}`,
    params.orderContext.deliveryMode
      ? `Delivery mode: ${params.orderContext.deliveryMode}`
      : null,
    ...buildDetails(params.draft),
    `Attachments provided: ${params.attachments.length > 0 ? "Yes" : "No"}`,
    "Requested outcome: Please review and assist. If eligible, a refund or replacement may be offered.",
  ].filter((line): line is string => Boolean(line));

  const description = trimToMax(descriptionLines.join("\n"), DESCRIPTION_MAX);

  const firstUserMessage = buildDetails(params.draft).join("\n").trim();

  return {
    type,
    subject,
    description,
    priority: getPriority(type),
    evidenceProvided: params.attachments.length > 0,
    initialMessageBody: firstUserMessage || undefined,
  };
}
