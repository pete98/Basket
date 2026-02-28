import {
  CHAT_EVENT_TYPES,
  CHAT_INPUT_MODES,
  CHAT_NODE_IDS,
  DELIVERY_MODES,
  ORDER_STATUSES,
  SUPPORT_TICKET_TYPES,
  type ChatEvent,
  type ChatNodeId,
  type ChatTransition,
  type OrderContext,
  type QuickReplyOption,
  type SupportChatState,
  type SupportTicketType,
} from "@/supportChat/types";

const SKIP_VALUE = "__SKIP__";

const TYPE_QUICK_REPLIES: QuickReplyOption[] = [
  {
    id: "cancel",
    label: "Cancel order",
    value: SUPPORT_TICKET_TYPES.cancellation,
  },
  {
    id: "missing",
    label: "Missing item",
    value: SUPPORT_TICKET_TYPES.missingItem,
  },
  {
    id: "damaged",
    label: "Damaged item",
    value: SUPPORT_TICKET_TYPES.damagedItem,
  },
  { id: "wrong", label: "Wrong item", value: SUPPORT_TICKET_TYPES.wrongItem },
  {
    id: "not-received",
    label: "Delivery not received",
    value: SUPPORT_TICKET_TYPES.deliveryNotReceived,
  },
  {
    id: "delay",
    label: "Delivery delay",
    value: SUPPORT_TICKET_TYPES.deliveryDelay,
  },
  {
    id: "quality",
    label: "Quality issue",
    value: SUPPORT_TICKET_TYPES.qualityIssue,
  },
  {
    id: "payment",
    label: "Payment issue",
    value: SUPPORT_TICKET_TYPES.paymentIssue,
  },
  { id: "other", label: "Something else", value: SUPPORT_TICKET_TYPES.other },
];

function withWarnings(
  state: SupportChatState,
  warnings: string[],
): SupportChatState {
  if (warnings.length === 0) return state;
  return { ...state, warnings: [...state.warnings, ...warnings] };
}

function shouldAskWindowCheck(
  orderContext: OrderContext,
  type: SupportTicketType,
): boolean {
  const requiresWindowCheck =
    type === SUPPORT_TICKET_TYPES.missingItem ||
    type === SUPPORT_TICKET_TYPES.damagedItem ||
    type === SUPPORT_TICKET_TYPES.wrongItem ||
    type === SUPPORT_TICKET_TYPES.qualityIssue;
  if (!requiresWindowCheck) return false;
  return Boolean(orderContext.deliveredAt);
}

function shouldShowCancellationWarning(orderContext: OrderContext): boolean {
  return (
    orderContext.orderStatus === ORDER_STATUSES.pickedUp ||
    orderContext.orderStatus === ORDER_STATUSES.delivered
  );
}

function getTypeStartNode(type: SupportTicketType): ChatNodeId {
  if (type === SUPPORT_TICKET_TYPES.cancellation)
    return CHAT_NODE_IDS.cancellationReason;
  if (type === SUPPORT_TICKET_TYPES.missingItem)
    return CHAT_NODE_IDS.missingItemName;
  if (type === SUPPORT_TICKET_TYPES.damagedItem)
    return CHAT_NODE_IDS.damagedItemName;
  if (type === SUPPORT_TICKET_TYPES.wrongItem)
    return CHAT_NODE_IDS.wrongExpected;
  if (type === SUPPORT_TICKET_TYPES.deliveryNotReceived)
    return CHAT_NODE_IDS.deliveryNotReceivedWhere;
  if (type === SUPPORT_TICKET_TYPES.deliveryDelay)
    return CHAT_NODE_IDS.deliveryDelayWait;
  if (type === SUPPORT_TICKET_TYPES.qualityIssue)
    return CHAT_NODE_IDS.qualityIssueText;
  if (type === SUPPORT_TICKET_TYPES.paymentIssue)
    return CHAT_NODE_IDS.paymentIssueKind;
  return CHAT_NODE_IDS.otherDescription;
}

function nextAfterTypeSelection(
  state: SupportChatState,
  orderContext: OrderContext,
  type: SupportTicketType,
): SupportChatState {
  const withType: SupportChatState = {
    ...state,
    draft: { ...state.draft, ticketType: type },
  };

  if (
    type === SUPPORT_TICKET_TYPES.cancellation &&
    shouldShowCancellationWarning(orderContext)
  ) {
    return {
      ...withWarnings(withType, [
        "This order may not be cancellable after pickup. You can still submit for review.",
      ]),
      nodeId: CHAT_NODE_IDS.cancellationWarning,
    };
  }

  if (shouldAskWindowCheck(orderContext, type)) {
    return {
      ...withType,
      nodeId: CHAT_NODE_IDS.withinWindowPrompt,
    };
  }

  return {
    ...withType,
    nodeId: getTypeStartNode(type),
  };
}

function applyTextValue(
  state: SupportChatState,
  value: string,
): SupportChatState {
  const normalized = value.trim();
  if (state.nodeId === CHAT_NODE_IDS.cancellationReasonOther)
    return {
      ...state,
      draft: { ...state.draft, cancellationReason: normalized },
      nodeId: CHAT_NODE_IDS.cancellationAccepted,
    };
  if (state.nodeId === CHAT_NODE_IDS.missingItemName)
    return {
      ...state,
      draft: { ...state.draft, missingItemName: normalized },
      nodeId: CHAT_NODE_IDS.missingItemQty,
    };
  if (state.nodeId === CHAT_NODE_IDS.missingItemQty)
    return {
      ...state,
      draft: {
        ...state.draft,
        missingItemQty: Number.parseInt(normalized, 10) || 1,
      },
      nodeId: CHAT_NODE_IDS.missingItemPhoto,
    };
  if (state.nodeId === CHAT_NODE_IDS.damagedItemName)
    return {
      ...state,
      draft: { ...state.draft, damagedItemName: normalized },
      nodeId: CHAT_NODE_IDS.damagedItemPhoto,
    };
  if (state.nodeId === CHAT_NODE_IDS.wrongExpected)
    return {
      ...state,
      draft: { ...state.draft, wrongExpectedItem: normalized },
      nodeId: CHAT_NODE_IDS.wrongReceived,
    };
  if (state.nodeId === CHAT_NODE_IDS.wrongReceived)
    return {
      ...state,
      draft: { ...state.draft, wrongReceivedItem: normalized },
      nodeId: CHAT_NODE_IDS.wrongPhoto,
    };
  if (state.nodeId === CHAT_NODE_IDS.deliveryNotReceivedWhereOther)
    return {
      ...state,
      draft: { ...state.draft, deliveryNotReceivedWhere: normalized },
      nodeId: CHAT_NODE_IDS.deliveryNotReceivedNotes,
    };
  if (state.nodeId === CHAT_NODE_IDS.deliveryNotReceivedNotes)
    return {
      ...state,
      draft: { ...state.draft, deliveryNotReceivedNotes: normalized },
      nodeId: CHAT_NODE_IDS.evidence,
    };
  if (state.nodeId === CHAT_NODE_IDS.deliveryDelayNotes)
    return {
      ...state,
      draft: { ...state.draft, deliveryDelayNotes: normalized },
      nodeId: CHAT_NODE_IDS.evidence,
    };
  if (state.nodeId === CHAT_NODE_IDS.qualityIssueText)
    return {
      ...state,
      draft: { ...state.draft, qualityIssueText: normalized },
      nodeId: CHAT_NODE_IDS.qualityIssuePhoto,
    };
  if (state.nodeId === CHAT_NODE_IDS.paymentIssueOther)
    return {
      ...state,
      draft: { ...state.draft, paymentIssueKind: normalized },
      nodeId: CHAT_NODE_IDS.evidence,
    };
  if (state.nodeId === CHAT_NODE_IDS.otherDescription)
    return {
      ...state,
      draft: { ...state.draft, otherDescription: normalized },
      nodeId: CHAT_NODE_IDS.evidence,
    };

  return state;
}

function applyChooseValue(
  state: SupportChatState,
  orderContext: OrderContext,
  value: string,
): SupportChatState {
  if (state.nodeId === CHAT_NODE_IDS.greeting)
    return nextAfterTypeSelection(
      state,
      orderContext,
      value as SupportTicketType,
    );

  if (state.nodeId === CHAT_NODE_IDS.withinWindowPrompt) {
    const next: SupportChatState = {
      ...state,
      draft: { ...state.draft, withinWindow: value === "YES" },
      nodeId: getTypeStartNode(
        state.draft.ticketType || SUPPORT_TICKET_TYPES.other,
      ),
    };

    if (value === "NO") {
      return {
        ...withWarnings(next, [
          "It may be outside the review window, but you can still submit.",
        ]),
        nodeId: CHAT_NODE_IDS.outsideWindowWarning,
      };
    }

    return next;
  }

  if (state.nodeId === CHAT_NODE_IDS.cancellationReason) {
    if (value === "OTHER")
      return { ...state, nodeId: CHAT_NODE_IDS.cancellationReasonOther };
    return {
      ...state,
      draft: { ...state.draft, cancellationReason: value },
      nodeId: CHAT_NODE_IDS.cancellationAccepted,
    };
  }

  if (state.nodeId === CHAT_NODE_IDS.cancellationAccepted)
    return {
      ...state,
      draft: { ...state.draft, cancellationAccepted: value },
      nodeId: CHAT_NODE_IDS.evidence,
    };

  if (state.nodeId === CHAT_NODE_IDS.missingItemPhoto)
    return { ...state, nodeId: CHAT_NODE_IDS.evidence };

  if (state.nodeId === CHAT_NODE_IDS.damagedItemPhoto)
    return { ...state, nodeId: CHAT_NODE_IDS.damagedPackaging };

  if (state.nodeId === CHAT_NODE_IDS.damagedPackaging)
    return {
      ...state,
      draft: { ...state.draft, damagedPackaging: value },
      nodeId: CHAT_NODE_IDS.evidence,
    };

  if (state.nodeId === CHAT_NODE_IDS.wrongPhoto)
    return { ...state, nodeId: CHAT_NODE_IDS.evidence };

  if (state.nodeId === CHAT_NODE_IDS.deliveryNotReceivedWhere) {
    if (value === "OTHER")
      return { ...state, nodeId: CHAT_NODE_IDS.deliveryNotReceivedWhereOther };
    return {
      ...state,
      draft: { ...state.draft, deliveryNotReceivedWhere: value },
      nodeId: CHAT_NODE_IDS.deliveryNotReceivedNotes,
    };
  }

  if (state.nodeId === CHAT_NODE_IDS.deliveryDelayWait)
    return {
      ...state,
      draft: { ...state.draft, deliveryDelayWait: value },
      nodeId: CHAT_NODE_IDS.deliveryDelayNotes,
    };

  if (state.nodeId === CHAT_NODE_IDS.qualityIssuePhoto)
    return { ...state, nodeId: CHAT_NODE_IDS.evidence };

  if (state.nodeId === CHAT_NODE_IDS.paymentIssueKind) {
    if (value === "OTHER")
      return { ...state, nodeId: CHAT_NODE_IDS.paymentIssueOther };
    return {
      ...state,
      draft: { ...state.draft, paymentIssueKind: value },
      nodeId: CHAT_NODE_IDS.evidence,
    };
  }

  if (state.nodeId === CHAT_NODE_IDS.evidence)
    return { ...state, nodeId: CHAT_NODE_IDS.summary };

  return state;
}

function withContinue(state: SupportChatState): SupportChatState {
  if (state.nodeId === CHAT_NODE_IDS.cancellationWarning)
    return { ...state, nodeId: CHAT_NODE_IDS.cancellationReason };
  if (state.nodeId === CHAT_NODE_IDS.outsideWindowWarning)
    return {
      ...state,
      nodeId: getTypeStartNode(
        state.draft.ticketType || SUPPORT_TICKET_TYPES.other,
      ),
    };
  if (state.nodeId === CHAT_NODE_IDS.summary)
    return { ...state, nodeId: CHAT_NODE_IDS.submitted };
  return state;
}

export function createInitialChatState(): SupportChatState {
  return {
    nodeId: CHAT_NODE_IDS.greeting,
    draft: {},
    warnings: [],
  };
}

export function transition(
  state: SupportChatState,
  event: ChatEvent,
  orderContext: OrderContext,
): SupportChatState {
  if (event.type === CHAT_EVENT_TYPES.edit) {
    const type = state.draft.ticketType;
    if (!type) return { ...state, nodeId: CHAT_NODE_IDS.greeting };
    return { ...state, nodeId: getTypeStartNode(type) };
  }

  if (event.type === CHAT_EVENT_TYPES.continue) {
    return withContinue(state);
  }

  if (event.type === CHAT_EVENT_TYPES.skip) {
    if (state.nodeId === CHAT_NODE_IDS.deliveryNotReceivedNotes)
      return {
        ...state,
        draft: { ...state.draft, deliveryNotReceivedNotes: "" },
        nodeId: CHAT_NODE_IDS.evidence,
      };
    if (state.nodeId === CHAT_NODE_IDS.deliveryDelayNotes)
      return {
        ...state,
        draft: { ...state.draft, deliveryDelayNotes: "" },
        nodeId: CHAT_NODE_IDS.evidence,
      };
    return state;
  }

  if (event.type === CHAT_EVENT_TYPES.textSubmit && event.value) {
    return applyTextValue(state, event.value);
  }

  if (event.type === CHAT_EVENT_TYPES.choose && event.value) {
    if (event.value === SKIP_VALUE)
      return transition(state, { type: CHAT_EVENT_TYPES.skip }, orderContext);
    return applyChooseValue(state, orderContext, event.value);
  }

  return state;
}

export function getNodePrompt(
  state: SupportChatState,
  orderContext: OrderContext,
): ChatTransition {
  const isDelivery = orderContext.deliveryMode === DELIVERY_MODES.delivery;

  if (state.nodeId === CHAT_NODE_IDS.greeting) {
    return {
      state,
      assistantMessages: ["Hi! I can help with your order. What's the issue?"],
      quickReplies: TYPE_QUICK_REPLIES,
      inputMode: CHAT_INPUT_MODES.quickReply,
    };
  }

  if (state.nodeId === CHAT_NODE_IDS.cancellationWarning)
    return {
      state,
      assistantMessages: [
        "This order may not be cancellable after pickup. You can still submit for review.",
      ],
      quickReplies: [{ id: "continue", label: "Continue", value: "CONTINUE" }],
      inputMode: CHAT_INPUT_MODES.quickReply,
    };

  if (state.nodeId === CHAT_NODE_IDS.withinWindowPrompt)
    return {
      state,
      assistantMessages: ["Was this delivered within the last 6 hours?"],
      quickReplies: [
        { id: "yes", label: "Yes", value: "YES" },
        { id: "no", label: "No", value: "NO" },
      ],
      inputMode: CHAT_INPUT_MODES.quickReply,
    };

  if (state.nodeId === CHAT_NODE_IDS.outsideWindowWarning)
    return {
      state,
      assistantMessages: [
        "It may be outside the review window, but you can still submit.",
      ],
      quickReplies: [{ id: "continue", label: "Continue", value: "CONTINUE" }],
      inputMode: CHAT_INPUT_MODES.quickReply,
    };

  if (state.nodeId === CHAT_NODE_IDS.cancellationReason)
    return {
      state,
      assistantMessages: ["Why would you like to cancel this order?"],
      quickReplies: [
        {
          id: "mistake",
          label: "Ordered by mistake",
          value: "Ordered by mistake",
        },
        { id: "cheaper", label: "Found cheaper", value: "Found cheaper" },
        { id: "slow", label: "Delivery too long", value: "Delivery too long" },
        { id: "other", label: "Other", value: "OTHER" },
      ],
      inputMode: CHAT_INPUT_MODES.quickReply,
    };

  if (state.nodeId === CHAT_NODE_IDS.cancellationReasonOther)
    return {
      state,
      assistantMessages: ["Please share your cancellation reason."],
      quickReplies: [],
      inputMode: CHAT_INPUT_MODES.text,
    };

  if (state.nodeId === CHAT_NODE_IDS.cancellationAccepted)
    return {
      state,
      assistantMessages: ["Has your order already been accepted by the store?"],
      quickReplies: [
        { id: "yes", label: "Yes", value: "Yes" },
        { id: "no", label: "No", value: "No" },
        { id: "unsure", label: "Not sure", value: "Not sure" },
      ],
      inputMode: CHAT_INPUT_MODES.quickReply,
    };

  if (state.nodeId === CHAT_NODE_IDS.missingItemName)
    return {
      state,
      assistantMessages: ["What item is missing?"],
      quickReplies: [],
      inputMode: CHAT_INPUT_MODES.text,
    };

  if (state.nodeId === CHAT_NODE_IDS.missingItemQty)
    return {
      state,
      assistantMessages: ["How many are missing?"],
      quickReplies: [],
      inputMode: CHAT_INPUT_MODES.number,
    };

  if (state.nodeId === CHAT_NODE_IDS.missingItemPhoto)
    return {
      state,
      assistantMessages: ["Do you have a photo of your delivered items?"],
      quickReplies: [
        { id: "yes", label: "Yes, I can add one", value: "YES" },
        { id: "no", label: "No", value: "NO" },
      ],
      inputMode: CHAT_INPUT_MODES.attachmentPrompt,
      expectsAttachmentPrompt: true,
    };

  if (state.nodeId === CHAT_NODE_IDS.damagedItemName)
    return {
      state,
      assistantMessages: ["Which item is damaged?"],
      quickReplies: [],
      inputMode: CHAT_INPUT_MODES.text,
    };

  if (state.nodeId === CHAT_NODE_IDS.damagedItemPhoto)
    return {
      state,
      assistantMessages: ["Please add a damage photo if you can."],
      quickReplies: [
        { id: "yes", label: "Add photo", value: "YES" },
        { id: "skip", label: "Skip", value: "NO" },
      ],
      inputMode: CHAT_INPUT_MODES.attachmentPrompt,
      expectsAttachmentPrompt: true,
    };

  if (state.nodeId === CHAT_NODE_IDS.damagedPackaging)
    return {
      state,
      assistantMessages: ["Was the packaging damaged?"],
      quickReplies: [
        { id: "yes", label: "Yes", value: "Yes" },
        { id: "no", label: "No", value: "No" },
        { id: "not-sure", label: "Not sure", value: "Not sure" },
      ],
      inputMode: CHAT_INPUT_MODES.quickReply,
    };

  if (state.nodeId === CHAT_NODE_IDS.wrongExpected)
    return {
      state,
      assistantMessages: ["What item were you expecting?"],
      quickReplies: [],
      inputMode: CHAT_INPUT_MODES.text,
    };

  if (state.nodeId === CHAT_NODE_IDS.wrongReceived)
    return {
      state,
      assistantMessages: ["What item did you receive instead?"],
      quickReplies: [],
      inputMode: CHAT_INPUT_MODES.text,
    };

  if (state.nodeId === CHAT_NODE_IDS.wrongPhoto)
    return {
      state,
      assistantMessages: ["If possible, add a photo of the received item."],
      quickReplies: [
        { id: "yes", label: "Add photo", value: "YES" },
        { id: "skip", label: "Skip", value: "NO" },
      ],
      inputMode: CHAT_INPUT_MODES.attachmentPrompt,
      expectsAttachmentPrompt: true,
    };

  if (state.nodeId === CHAT_NODE_IDS.deliveryNotReceivedWhere)
    return {
      state,
      assistantMessages: ["Where have you checked already?"],
      quickReplies: [
        { id: "door", label: "Front door", value: "Front door" },
        { id: "lobby", label: "Lobby", value: "Lobby" },
        { id: "neighbor", label: "Neighbor", value: "Neighbor" },
        { id: "other", label: "Other", value: "OTHER" },
      ],
      inputMode: CHAT_INPUT_MODES.quickReply,
    };

  if (state.nodeId === CHAT_NODE_IDS.deliveryNotReceivedWhereOther)
    return {
      state,
      assistantMessages: ["Please tell us where you checked."],
      quickReplies: [],
      inputMode: CHAT_INPUT_MODES.text,
    };

  if (state.nodeId === CHAT_NODE_IDS.deliveryNotReceivedNotes)
    return {
      state,
      assistantMessages: ["Any extra notes? This is optional."],
      quickReplies: [{ id: "skip", label: "Skip", value: SKIP_VALUE }],
      inputMode: CHAT_INPUT_MODES.optionalText,
    };

  if (state.nodeId === CHAT_NODE_IDS.deliveryDelayWait)
    return {
      state,
      assistantMessages: ["How long have you been waiting?"],
      quickReplies: [
        { id: "lt15", label: "< 15 min", value: "<15 min" },
        { id: "15-30", label: "15-30 min", value: "15-30 min" },
        { id: "30-60", label: "30-60 min", value: "30-60 min" },
        { id: "1h+", label: "1h+", value: "1h+" },
      ],
      inputMode: CHAT_INPUT_MODES.quickReply,
    };

  if (state.nodeId === CHAT_NODE_IDS.deliveryDelayNotes)
    return {
      state,
      assistantMessages: [
        isDelivery
          ? "Any extra details about the delay? This is optional."
          : "Any extra details? This is optional.",
      ],
      quickReplies: [{ id: "skip", label: "Skip", value: SKIP_VALUE }],
      inputMode: CHAT_INPUT_MODES.optionalText,
    };

  if (state.nodeId === CHAT_NODE_IDS.qualityIssueText)
    return {
      state,
      assistantMessages: ["Please describe the quality issue."],
      quickReplies: [],
      inputMode: CHAT_INPUT_MODES.text,
    };

  if (state.nodeId === CHAT_NODE_IDS.qualityIssuePhoto)
    return {
      state,
      assistantMessages: ["If possible, add a photo to help with review."],
      quickReplies: [
        { id: "add", label: "Add photo", value: "YES" },
        { id: "skip", label: "Skip", value: "NO" },
      ],
      inputMode: CHAT_INPUT_MODES.attachmentPrompt,
      expectsAttachmentPrompt: true,
    };

  if (state.nodeId === CHAT_NODE_IDS.paymentIssueKind)
    return {
      state,
      assistantMessages: ["What payment issue are you seeing?"],
      quickReplies: [
        { id: "double", label: "Charged twice", value: "Charged twice" },
        { id: "failed", label: "Payment failed", value: "Payment failed" },
        { id: "refund", label: "Refund missing", value: "Refund missing" },
        { id: "other", label: "Other", value: "OTHER" },
      ],
      inputMode: CHAT_INPUT_MODES.quickReply,
    };

  if (state.nodeId === CHAT_NODE_IDS.paymentIssueOther)
    return {
      state,
      assistantMessages: ["Please describe the payment issue."],
      quickReplies: [],
      inputMode: CHAT_INPUT_MODES.text,
    };

  if (state.nodeId === CHAT_NODE_IDS.otherDescription)
    return {
      state,
      assistantMessages: ["Please describe the issue."],
      quickReplies: [],
      inputMode: CHAT_INPUT_MODES.text,
    };

  if (state.nodeId === CHAT_NODE_IDS.evidence)
    return {
      state,
      assistantMessages: [
        "You can add photos now, then continue to review before submitting.",
      ],
      quickReplies: [{ id: "continue", label: "Continue", value: "CONTINUE" }],
      inputMode: CHAT_INPUT_MODES.attachmentPrompt,
      expectsAttachmentPrompt: true,
    };

  if (state.nodeId === CHAT_NODE_IDS.summary)
    return {
      state,
      assistantMessages: [
        "Please review your ticket summary before submitting.",
      ],
      quickReplies: [
        { id: "submit", label: "Submit", value: "CONTINUE" },
        { id: "edit", label: "Edit", value: "EDIT" },
      ],
      inputMode: CHAT_INPUT_MODES.summary,
    };

  return {
    state,
    assistantMessages: [
      "Ticket created. We'll review this and get back to you. If eligible, you may receive a refund or replacement.",
    ],
    quickReplies: [],
    inputMode: CHAT_INPUT_MODES.quickReply,
  };
}

export function isTextInputNode(nodeId: ChatNodeId): boolean {
  return (
    nodeId === CHAT_NODE_IDS.cancellationReasonOther ||
    nodeId === CHAT_NODE_IDS.missingItemName ||
    nodeId === CHAT_NODE_IDS.missingItemQty ||
    nodeId === CHAT_NODE_IDS.damagedItemName ||
    nodeId === CHAT_NODE_IDS.wrongExpected ||
    nodeId === CHAT_NODE_IDS.wrongReceived ||
    nodeId === CHAT_NODE_IDS.deliveryNotReceivedWhereOther ||
    nodeId === CHAT_NODE_IDS.deliveryNotReceivedNotes ||
    nodeId === CHAT_NODE_IDS.deliveryDelayNotes ||
    nodeId === CHAT_NODE_IDS.qualityIssueText ||
    nodeId === CHAT_NODE_IDS.paymentIssueOther ||
    nodeId === CHAT_NODE_IDS.otherDescription
  );
}
