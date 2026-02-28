import { buildTicketPayload } from "@/supportChat/buildTicketPayload";
import {
  SUPPORT_TICKET_TYPES,
  type LocalAttachment,
  type OrderContext,
} from "@/supportChat/types";

describe("buildTicketPayload", () => {
  it("maps missing item payload fields", () => {
    const orderContext: OrderContext = {
      orderId: "order-1",
      storeId: "store-1",
      deliveryMode: "DELIVERY",
    };

    const payload = buildTicketPayload({
      orderContext,
      draft: {
        ticketType: SUPPORT_TICKET_TYPES.missingItem,
        missingItemName: "Milk 1L",
        missingItemQty: 1,
      },
      attachments: [],
    });

    expect(payload.type).toBe(SUPPORT_TICKET_TYPES.missingItem);
    expect(payload.subject).toContain("Missing item");
    expect(payload.description).toContain("Missing item: Milk 1L");
    expect(payload.description).toContain("Missing quantity: 1");
    expect(payload.evidenceProvided).toBe(false);
    expect(payload.priority).toBe("HIGH");
  });

  it("sets evidenceProvided true when attachments exist", () => {
    const attachments: LocalAttachment[] = [
      {
        id: "one",
        uri: "file:///one.jpg",
        fileName: "one.jpg",
        mimeType: "image/jpeg",
      },
    ];

    const payload = buildTicketPayload({
      orderContext: { orderId: "order-2" },
      draft: {
        ticketType: SUPPORT_TICKET_TYPES.damagedItem,
        damagedItemName: "Eggs",
      },
      attachments,
    });

    expect(payload.evidenceProvided).toBe(true);
  });

  it("truncates subject and description to backend limits", () => {
    const veryLong = "x".repeat(6000);

    const payload = buildTicketPayload({
      orderContext: { orderId: veryLong },
      draft: {
        ticketType: SUPPORT_TICKET_TYPES.other,
        otherDescription: veryLong,
      },
      attachments: [],
    });

    expect(payload.subject.length).toBeLessThanOrEqual(255);
    expect(payload.description.length).toBeLessThanOrEqual(4000);
  });
});
