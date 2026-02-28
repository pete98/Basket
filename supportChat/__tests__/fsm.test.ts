import { createInitialChatState, transition } from "@/supportChat/fsm";
import {
  CHAT_EVENT_TYPES,
  CHAT_NODE_IDS,
  ORDER_STATUSES,
  SUPPORT_TICKET_TYPES,
  type OrderContext,
} from "@/supportChat/types";

describe("support chat fsm", () => {
  it("handles missing item flow to summary", () => {
    const context: OrderContext = {
      orderId: "order-1",
      orderStatus: ORDER_STATUSES.delivered,
      deliveredAt: new Date().toISOString(),
    };

    let state = createInitialChatState();
    state = transition(
      state,
      {
        type: CHAT_EVENT_TYPES.choose,
        value: SUPPORT_TICKET_TYPES.missingItem,
      },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.withinWindowPrompt);

    state = transition(
      state,
      { type: CHAT_EVENT_TYPES.choose, value: "YES" },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.missingItemName);

    state = transition(
      state,
      { type: CHAT_EVENT_TYPES.textSubmit, value: "Milk 1L" },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.missingItemQty);

    state = transition(
      state,
      { type: CHAT_EVENT_TYPES.textSubmit, value: "2" },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.missingItemPhoto);

    state = transition(
      state,
      { type: CHAT_EVENT_TYPES.choose, value: "NO" },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.evidence);

    state = transition(
      state,
      { type: CHAT_EVENT_TYPES.choose, value: "CONTINUE" },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.summary);
  });

  it("shows cancellation warning for picked up order", () => {
    const context: OrderContext = {
      orderId: "order-2",
      orderStatus: ORDER_STATUSES.pickedUp,
    };

    let state = createInitialChatState();
    state = transition(
      state,
      {
        type: CHAT_EVENT_TYPES.choose,
        value: SUPPORT_TICKET_TYPES.cancellation,
      },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.cancellationWarning);

    state = transition(state, { type: CHAT_EVENT_TYPES.continue }, context);
    expect(state.nodeId).toBe(CHAT_NODE_IDS.cancellationReason);

    state = transition(
      state,
      { type: CHAT_EVENT_TYPES.choose, value: "Ordered by mistake" },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.cancellationAccepted);

    state = transition(
      state,
      { type: CHAT_EVENT_TYPES.choose, value: "No" },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.evidence);
  });

  it("handles delivery not received path with optional notes", () => {
    const context: OrderContext = { orderId: "order-3" };

    let state = createInitialChatState();
    state = transition(
      state,
      {
        type: CHAT_EVENT_TYPES.choose,
        value: SUPPORT_TICKET_TYPES.deliveryNotReceived,
      },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.deliveryNotReceivedWhere);

    state = transition(
      state,
      { type: CHAT_EVENT_TYPES.choose, value: "Lobby" },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.deliveryNotReceivedNotes);

    state = transition(state, { type: CHAT_EVENT_TYPES.skip }, context);
    expect(state.nodeId).toBe(CHAT_NODE_IDS.evidence);

    state = transition(
      state,
      { type: CHAT_EVENT_TYPES.choose, value: "CONTINUE" },
      context,
    );
    expect(state.nodeId).toBe(CHAT_NODE_IDS.summary);
  });
});
