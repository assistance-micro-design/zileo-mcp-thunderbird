/**
 * WebSocket Bridge Client for Thunderbird Communication
 * Connects to an existing WebSocket bridge server instead of creating one
 * @module websocket/bridge-client
 */

import http from "http";
import WebSocket from "ws";
import { EventEmitter } from "events";
import logger from "../utils/logger.js";
import { OperationTimeoutError } from "../utils/errors.js";
import type { WsMessage, WebSocketBridgeOptions } from "./types.js";

/**
 * Fetches the auth token from the bridge HTTP endpoint.
 * The bridge serves the token at GET /auth/token for localhost connections only.
 *
 * @param port - The bridge port number
 * @returns The auth token string
 * @throws Error if the token cannot be fetched
 */
export function fetchBridgeToken(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      `http://127.0.0.1:${port}/auth/token`,
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(
              new Error(
                `Auth token fetch failed with status ${res.statusCode}`,
              ),
            );
            return;
          }
          try {
            const parsed = JSON.parse(data) as { token?: string };
            if (!parsed.token) {
              reject(new Error("No token in auth response"));
              return;
            }
            resolve(parsed.token);
          } catch {
            reject(new Error("Invalid auth token response"));
          }
        });
      },
    );
    req.on("error", (error) => {
      reject(
        new Error(
          `Auth token fetch error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    });
    req.setTimeout(5000, () => {
      req.destroy(new Error("Auth token fetch timeout"));
    });
  });
}

/**
 * Pending request info
 */
interface PendingRequest {
  resolve: (response: WsMessage) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  action: string;
}

/**
 * WebSocket Bridge Client
 * Connects to an existing bridge server and provides the same interface as WebSocketBridge
 */
export class WebSocketBridgeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private readonly options: Required<WebSocketBridgeOptions>;
  private readonly pendingRequests: Map<string, PendingRequest>;
  private requestCounter: number = 0;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 3;
  /** Base delay for exponential reconnection backoff (1s, 2s, 4s, ...) */
  private readonly reconnectBaseDelayMs: number = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  /** True while a scheduled reconnect attempt is pending/running */
  private reconnecting: boolean = false;
  /** True once a connection has succeeded (reconnect only makes sense then) */
  private everConnected: boolean = false;
  /** Set by disconnect() so an intentional close does not trigger reconnection */
  private intentionalClose: boolean = false;

  /**
   * SEC-AUTH-001: Tool permissions received from the bridge.
   * Updated when the bridge broadcasts "ready" or "permissionsUpdated" notifications.
   */
  private toolPermissions: Record<string, boolean> = {};

  constructor(options: WebSocketBridgeOptions) {
    super();
    this.options = {
      port: options.port,
      host: options.host || "127.0.0.1",
      timeout: options.timeout || 30000,
      maxPendingRequests: options.maxPendingRequests || 100,
    };
    this.pendingRequests = new Map();
  }

  /**
   * Connect to an existing WebSocket bridge server.
   * Fetches the auth token via HTTP first, then connects via WebSocket.
   */
  async connect(): Promise<void> {
    // SEC-WS-001: Fetch auth token before WebSocket connection
    let token: string;
    try {
      token = await fetchBridgeToken(this.options.port);
      logger.debug("Auth token fetched successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to authenticate with bridge: ${message}`);
    }

    return new Promise((resolve, reject) => {
      // Connect to /mcp path for MCP clients (allows multiple connections)
      const url = `ws://127.0.0.1:${this.options.port}/mcp?token=${token}`;
      logger.info(
        `Connecting to existing bridge at ws://127.0.0.1:${this.options.port}/mcp`,
      );

      try {
        this.ws = new WebSocket(url);

        const connectionTimeout = setTimeout(() => {
          if (this.ws) {
            this.ws.close();
          }
          reject(new Error(`Connection timeout to bridge at ${url}`));
        }, 5000);

        this.ws.on("open", () => {
          clearTimeout(connectionTimeout);
          logger.info("Connected to existing WebSocket bridge");
          this.reconnectAttempts = 0;
          this.reconnecting = false;
          this.everConnected = true;
          this.emit("connected");
          resolve();
        });

        this.ws.on("message", (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString()) as WsMessage;
            this.handleMessage(message);
          } catch (error) {
            logger.error("Failed to parse message:", error);
          }
        });

        this.ws.on("close", () => {
          logger.info("Disconnected from WebSocket bridge");
          this.ws = null;
          this.rejectAllPending("Connection closed");
          this.emit("disconnected");
          // Audit fix: a bridge restart used to kill the MCP session for
          // good. Re-establish with exponential backoff unless the close
          // was requested (disconnect()) or a retry is already scheduled.
          if (!this.intentionalClose && !this.reconnecting && this.everConnected) {
            this.scheduleReconnect();
          }
        });

        this.ws.on("error", (error) => {
          clearTimeout(connectionTimeout);
          logger.error("WebSocket client error:", error);
          this.emit("error", error);
          reject(error);
        });
      } catch (error) {
        logger.error("Failed to connect to WebSocket bridge:", error);
        reject(error);
      }
    });
  }

  /**
   * Schedule the next reconnection attempt with exponential backoff
   * (1s, 2s, 4s by default). After maxReconnectAttempts consecutive
   * failures, gives up and emits a terminal "reconnect_failed" event.
   * Each attempt re-fetches the auth token: a restarted bridge generates
   * a new one.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn(
        `Bridge reconnection abandoned after ${this.maxReconnectAttempts} attempts`,
      );
      this.reconnecting = false;
      this.emit("reconnect_failed");
      return;
    }

    this.reconnectAttempts++;
    this.reconnecting = true;
    const delay =
      this.reconnectBaseDelayMs * 2 ** (this.reconnectAttempts - 1);
    logger.info(
      `Reconnecting to bridge in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        logger.debug(
          `Reconnect attempt ${this.reconnectAttempts} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.scheduleReconnect();
      });
    }, delay);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WsMessage): void {
    logger.debug(`Received message: ${message.type} (${message.id})`);

    switch (message.type) {
      case "response":
        this.handleResponse(message);
        break;
      case "notification": {
        // SEC-AUTH-001: Capture tool permissions from any notification that carries them.
        // - "connected" (welcome): initial permissions when joining the bridge
        // - "ready": broadcast when Thunderbird extension connects
        // - "permissionsUpdated": broadcast when user changes options
        const notifData = message.data as Record<string, unknown> | undefined;
        if (notifData?.toolPermissions) {
          this.toolPermissions = notifData.toolPermissions as Record<string, boolean>;
          logger.info(
            `Tool permissions received via "${message.event}" (${Object.keys(this.toolPermissions).length} entries)`,
          );
        }
        // Handle welcome message from bridge
        if (message.event === "connected") {
          const data = message.data as
            | { thunderbirdConnected?: boolean }
            | undefined;
          logger.info(
            `Bridge reports Thunderbird connected: ${data?.thunderbirdConnected ?? "unknown"}`,
          );
        }
        this.emit("notification", message);
        break;
      }
      case "ping":
        // Respond to ping with pong
        this.sendPong(message.id);
        break;
      case "pong":
        logger.debug("Pong received from bridge");
        break;
      default:
        logger.warn("Unknown message type:", message);
    }
  }

  /**
   * Send pong response
   */
  private sendPong(pingId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const pong: WsMessage = {
        id: pingId,
        type: "pong",
        timestamp: new Date().toISOString(),
      };
      this.ws.send(JSON.stringify(pong));
      logger.debug("Sent pong to bridge");
    }
  }

  /**
   * Handle response message
   */
  private handleResponse(response: WsMessage): void {
    const pending = this.pendingRequests.get(response.id);

    if (!pending) {
      logger.warn(`Received response for unknown request: ${response.id}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.success) {
      logger.debug(`Request completed: ${pending.action}`);
      pending.resolve(response);
    } else {
      logger.warn(`Request failed: ${pending.action}`, response.error);
      pending.reject(new Error(response.error?.message || "Request failed"));
    }
  }

  /**
   * Send request to Thunderbird extension via the bridge
   */
  async sendRequest(
    action: string,
    params: Record<string, unknown> = {},
    timeout?: number,
  ): Promise<WsMessage> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to WebSocket bridge");
    }

    if (this.pendingRequests.size >= this.options.maxPendingRequests) {
      throw new Error("Too many pending requests");
    }

    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    const requestTimeout = timeout || this.options.timeout;

    const request: WsMessage = {
      id: requestId,
      type: "request",
      action,
      params,
      timestamp: new Date().toISOString(),
    };

    logger.debug(`Sending request via bridge: ${action} (${requestId})`);

    return new Promise<WsMessage>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new OperationTimeoutError(action, requestTimeout));
      }, requestTimeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        action,
      });

      try {
        this.ws!.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Check if connected to bridge
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * SEC-AUTH-001: Get tool permissions received from the bridge.
   * Returns an empty object if no permissions have been received yet.
   */
  getToolPermissions(): Record<string, boolean> {
    return this.toolPermissions;
  }

  /**
   * Reject all pending requests
   */
  private rejectAllPending(reason: string): void {
    for (const [_id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  /**
   * Disconnect from the bridge (intentional: cancels any pending
   * reconnection and prevents the close event from scheduling one)
   */
  async disconnect(): Promise<void> {
    logger.info("Disconnecting from WebSocket bridge");

    this.intentionalClose = true;
    this.reconnecting = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.rejectAllPending("Client disconnecting");

    return new Promise((resolve) => {
      if (this.ws) {
        this.ws.once("close", () => {
          this.ws = null;
          resolve();
        });
        this.ws.close();
      } else {
        resolve();
      }
    });
  }
}

/**
 * Try to connect to an existing bridge
 * Returns a WebSocketBridgeClient if successful, null otherwise
 */
export async function tryConnectToExistingBridge(
  port: number,
  timeout: number = 30000,
): Promise<WebSocketBridgeClient | null> {
  const client = new WebSocketBridgeClient({
    port,
    timeout,
    maxPendingRequests: 100,
  });

  try {
    await client.connect();
    logger.info(`Successfully connected to existing bridge on port ${port}`);
    return client;
  } catch (error) {
    logger.debug(
      `No existing bridge found on port ${port}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}
