/**
 * Client Adapter for WebSocket Bridge
 * Provides the same interface as NativeMessagingClient but uses WebSocket
 * @module websocket/client-adapter
 */

import { getWebSocketBridge, type WsMessage } from "./bridge.js";
import logger from "../utils/logger.js";

/**
 * Response type matching the native messaging format
 */
export interface ClientResponse {
  id: string;
  type: "response";
  success: boolean;
  data?: unknown;
  error?: { code: number; message: string; data?: unknown };
  timestamp: string;
}

/**
 * Client adapter that wraps WebSocket bridge
 * Exposes same interface as NativeMessagingClient for compatibility
 */
class WebSocketClientAdapter {
  /**
   * Send a request to Thunderbird extension
   */
  async sendRequest(
    action: string,
    params: Record<string, unknown> = {},
    timeout?: number,
  ): Promise<ClientResponse> {
    const bridge = getWebSocketBridge();

    if (!bridge.isConnected()) {
      throw new Error("Not connected to Thunderbird extension");
    }

    const response = await bridge.sendRequest(action, params, timeout);

    return {
      id: response.id,
      type: "response",
      success: response.success ?? true,
      data: response.data,
      error: response.error,
      timestamp: response.timestamp,
    };
  }

  /**
   * Check if connected to Thunderbird
   */
  isConnected(): boolean {
    try {
      const bridge = getWebSocketBridge();
      return bridge.isConnected();
    } catch {
      return false;
    }
  }
}

// Singleton instance
let clientAdapter: WebSocketClientAdapter | null = null;

/**
 * Get the client adapter instance
 * Compatible with getNativeClient() interface
 */
export function getClient(): WebSocketClientAdapter {
  if (!clientAdapter) {
    clientAdapter = new WebSocketClientAdapter();
  }
  return clientAdapter;
}

// Re-export as getNativeClient for backward compatibility
export const getNativeClient = getClient;
