export const AGENT_EVENTS = {
  SelectCategory: 'agent/selectCategory',
} as const;

type AgentEvent = typeof AGENT_EVENTS[keyof typeof AGENT_EVENTS];
type Listener<T = any> = (payload: T) => void;

class AgentBus {
  private listeners: Record<AgentEvent, Set<Listener>> = {
    [AGENT_EVENTS.SelectCategory]: new Set(),
  };

  emit<T>(event: AgentEvent, payload: T): void {
    const set = this.listeners[event];
    if (!set) return;
    set.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.warn('[agent-bus] listener error', error);
      }
    });
  }

  on<T>(event: AgentEvent, listener: Listener<T>): () => void {
    const set = this.listeners[event];
    if (!set) return () => {};
    set.add(listener as Listener);
    return () => this.off(event, listener);
  }

  off<T>(event: AgentEvent, listener: Listener<T>): void {
    const set = this.listeners[event];
    if (!set) return;
    set.delete(listener as Listener);
  }
}

export const agentBus = new AgentBus();

export interface SelectCategoryPayload {
  category: string;
}
