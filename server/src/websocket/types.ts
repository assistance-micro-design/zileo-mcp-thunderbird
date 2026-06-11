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
