type Listener<T> = (data: T) => void;

class RealtimeEventBus {
  private listeners: Map<string, Set<Listener<unknown>>> = new Map();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('bugbusters_realtime_channel');
        this.channel.onmessage = (event) => {
          if (event.data && typeof event.data === 'object') {
            const { type, payload } = event.data;
            this.emitLocal(type, payload);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization failed, using in-memory only', e);
      }
    }
  }

  public on<T>(eventType: string, listener: Listener<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    const set = this.listeners.get(eventType)!;
    set.add(listener as Listener<unknown>);

    return () => {
      set.delete(listener as Listener<unknown>);
      if (set.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  private emitLocal<T>(eventType: string, payload: T): void {
    const set = this.listeners.get(eventType);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`Error in realtime listener for ${eventType}:`, err);
        }
      });
    }
  }

  public emit<T>(eventType: string, payload: T): void {
    // 1. Notify local listeners in the current tab
    this.emitLocal(eventType, payload);

    // 2. Broadcast to other tabs if channel available
    if (this.channel) {
      try {
        this.channel.postMessage({ type: eventType, payload });
      } catch (e) {
        console.warn('BroadcastChannel postMessage failed:', e);
      }
    }
  }
}

export const realtimeBus = new RealtimeEventBus();
