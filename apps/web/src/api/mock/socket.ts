// ─── Mock Socket ───
// Simulates a socket.io client connection for real-time events.

type EventHandler = (data: any) => void;

class MockSocket {
  private handlers = new Map<string, Set<EventHandler>>();
  public connected = false;

  connect() {
    this.connected = true;
    this.serverEmit("connect", undefined);
  }

  disconnect() {
    this.connected = false;
    this.serverEmit("disconnect", undefined);
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler) {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  emit(event: string, ...args: any[]) {
    // Client-to-server emits, normally handled by the server.
    // For the mock, we don't do much with these yet, but we could log them.
    console.log(`[MockSocket Emit] ${event}`, args);
  }

  // Helper for our mock backend to trigger events on the client
  serverEmit(event: string, data: any) {
    const set = this.handlers.get(event);
    if (set) {
      set.forEach((handler) => handler(data));
    }
  }
}

export const mockSocket = new MockSocket();
