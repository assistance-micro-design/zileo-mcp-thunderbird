/**
 * Shared WebSocket bridge types.
 * Extracted from bridge.ts so bridge-client.ts no longer imports bridge.ts
 * (which imports bridge-client.ts) — breaking the module cycle.
 * @module websocket/types
 */

/**
 * Message types for WebSocket communication
 */
export interface WsMessage {
  id: string;
  type: "request" | "response" | "notification" | "ping" | "pong" | "heartbeat";
  action?: string;
  event?: string;
  params?: Record<string, unknown>;
  data?: unknown;
  success?: boolean;
  error?: { code: number; message: string; data?: unknown };
  timestamp: string;
}

/**
 * WebSocket Bridge Options
 */
export interface WebSocketBridgeOptions {
  port: number;
  host?: string;
  timeout?: number;
  maxPendingRequests?: number;
}
