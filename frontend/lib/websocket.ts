import {
  WSMessage,
  WSMessageType,
  TranscriptEntry,
  ThreatEntry,
  MOCK_SCAM_TRANSCRIPT,
  MOCK_THREAT_FEED,
  MOCK_RISK_PROGRESSION,
} from "./types";

type MessageHandler = (message: WSMessage) => void;
type ConnectionHandler = () => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Map<WSMessageType | "all", MessageHandler[]> = new Map();
  private onConnectHandlers: ConnectionHandler[] = [];
  private onDisconnectHandlers: ConnectionHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isIntentionalClose = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url);
      this.isIntentionalClose = false;

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onConnectHandlers.forEach((h) => h());
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          const typeHandlers = this.messageHandlers.get(message.type) || [];
          typeHandlers.forEach((h) => h(message));
          const allHandlers = this.messageHandlers.get("all") || [];
          allHandlers.forEach((h) => h(message));
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      this.ws.onclose = () => {
        this.onDisconnectHandlers.forEach((h) => h());
        if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (e) {
      console.error("Failed to create WebSocket:", e);
    }
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    this.ws?.close();
    this.ws = null;
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(type: WSMessageType | "all", handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  off(type: WSMessageType | "all", handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    this.messageHandlers.set(
      type,
      handlers.filter((h) => h !== handler)
    );
  }

  onConnect(handler: ConnectionHandler): void {
    this.onConnectHandlers.push(handler);
  }

  onDisconnect(handler: ConnectionHandler): void {
    this.onDisconnectHandlers.push(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/live-analysis";
    wsManager = new WebSocketManager(wsUrl);
  }
  return wsManager;
}

// Demo mode: simulate WebSocket messages locally without a real backend
export function simulateDemoWebSocket(
  onMessage: (msg: WSMessage) => void,
  onComplete: () => void
): () => void {
  let cancelled = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  // Start call
  const t0 = setTimeout(() => {
    if (cancelled) return;
    onMessage({
      type: "call_start",
      data: { callerNumber: "+91 98765 43210" },
      timestamp: new Date().toISOString(),
    });
  }, 500);
  timeouts.push(t0);

  // Stream transcript entries
  MOCK_SCAM_TRANSCRIPT.forEach((entry: TranscriptEntry, i: number) => {
    const t = setTimeout(() => {
      if (cancelled) return;
      onMessage({ type: "transcript", data: entry, timestamp: new Date().toISOString() });
    }, 1500 + i * 1800);
    timeouts.push(t);
  });

  // Stream threat entries
  MOCK_THREAT_FEED.forEach((threat: ThreatEntry, i: number) => {
    const t = setTimeout(() => {
      if (cancelled) return;
      onMessage({ type: "threat", data: threat, timestamp: new Date().toISOString() });
    }, 2500 + i * 1600);
    timeouts.push(t);
  });

  // Stream risk score progression
  MOCK_RISK_PROGRESSION.forEach((score: number, i: number) => {
    const t = setTimeout(() => {
      if (cancelled) return;
      onMessage({ type: "risk_update", data: { score }, timestamp: new Date().toISOString() });
    }, 1000 + i * 1200);
    timeouts.push(t);
  });

  // Final alert trigger
  const tAlert = setTimeout(() => {
    if (cancelled) return;
    onMessage({ type: "alert", data: null, timestamp: new Date().toISOString() });
    onComplete();
  }, 10000);
  timeouts.push(tAlert);

  // Return cleanup function
  return () => {
    cancelled = true;
    timeouts.forEach(clearTimeout);
  };
}
