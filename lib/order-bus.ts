export const ORDER_EVENTS = {
  OrderPlaced: 'order/placed',
} as const;

type OrderEvent = typeof ORDER_EVENTS[keyof typeof ORDER_EVENTS];
type Listener<T = unknown> = (payload: T) => void;

interface OrderPlacedPayload {
  orderId: string;
}

class OrderBus {
  private listeners: Record<OrderEvent, Set<Listener>> = {
    [ORDER_EVENTS.OrderPlaced]: new Set(),
  };

  emit<T>(event: OrderEvent, payload: T): void {
    const set = this.listeners[event];
    if (!set) return;

    set.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.warn('[order-bus] listener error', error);
      }
    });
  }

  on<T>(event: OrderEvent, listener: Listener<T>): () => void {
    const set = this.listeners[event];
    if (!set) return () => {};
    set.add(listener as Listener);
    return () => this.off(event, listener);
  }

  off<T>(event: OrderEvent, listener: Listener<T>): void {
    const set = this.listeners[event];
    if (!set) return;
    set.delete(listener as Listener);
  }
}

export const orderBus = new OrderBus();
export type { OrderPlacedPayload };
