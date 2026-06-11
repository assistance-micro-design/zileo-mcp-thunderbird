/*
 * Copyright 2025-2026 Assistance Micro Design
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Client Adapter for WebSocket Bridge
 * Thin request façade used by tool handlers and resources; the action→result
 * generic surfaces the extension response types at compile time.
 * @module websocket/client-adapter
 */

import { getWebSocketBridge } from "./bridge.js";
import type { ActionResult } from "../types/action-results.js";

/**
 * Typed response envelope relayed from the Thunderbird extension.
 * `data` is typed from the action via the ActionResultMap contract.
 */
export interface ClientResponse<T = unknown> {
  id: string;
  type: "response";
  success: boolean;
  data?: T;
  error?: { code: number; message: string; data?: unknown };
  timestamp: string;
}

/**
 * Client adapter that wraps the WebSocket bridge with a typed request API.
 */
class WebSocketClientAdapter {
  /**
   * Send a request to the Thunderbird extension.
   * @param action - Native action name (e.g. MessageActions.MESSAGES_LIST);
   *   literal actions get a typed `data` field via ActionResultMap
   * @param params - Action parameters forwarded to the extension
   * @param timeout - Optional per-request timeout (ms)
   * @returns The typed response envelope
   * @throws Error if the bridge is not connected
   */
  async sendRequest<A extends string>(
    action: A,
    params: Record<string, unknown> = {},
    timeout?: number,
  ): Promise<ClientResponse<ActionResult<A>>> {
    const bridge = getWebSocketBridge();

    if (!bridge.isConnected()) {
      throw new Error("Not connected to Thunderbird extension");
    }

    const response = await bridge.sendRequest(action, params, timeout);

    return {
      id: response.id,
      type: "response",
      success: response.success ?? true,
      data: response.data as ActionResult<A>,
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
 * Get the WebSocket bridge client adapter instance.
 * (Formerly exported as getNativeClient — renamed because the native
 * messaging transport was removed; this has always been the WebSocket path.)
 */
export function getBridgeClient(): WebSocketClientAdapter {
  if (!clientAdapter) {
    clientAdapter = new WebSocketClientAdapter();
  }
  return clientAdapter;
}
