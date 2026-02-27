/**
 * WebSocket Bridge for Thunderbird Communication
 * Supports multiple MCP clients connecting to a single Thunderbird extension
 * @module websocket/bridge
 */

import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import { createServer, Server as HttpServer, IncomingMessage } from "http";
import logger from "../utils/logger.js";
import {
  WebSocketBridgeClient,
  tryConnectToExistingBridge,
} from "./bridge-client.js";

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
 * Pending request info
 */
interface PendingRequest {
  resolve: (response: WsMessage) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  action: string;
  mcpClient?: WebSocket; // Track which MCP client made the request
}

/**
 * Maximum WebSocket payload size (5 MiB)
 * Messages exceeding this limit are rejected with close code 1009
 */
const MAX_WS_PAYLOAD = 5 * 1024 * 1024;

/**
 * Allowed local hostnames for WebSocket origin validation
 */
const ALLOWED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Validates whether a WebSocket upgrade origin is allowed.
 * Accepts:
 * - undefined/null/empty (CLI, docker exec, native connections)
 * - localhost, 127.0.0.1, ::1 (local connections)
 * - moz-extension:// (Thunderbird extension)
 *
 * Rejects all other origins (external websites, other extensions, etc.)
 *
 * @param origin - The Origin header from the WebSocket upgrade request
 * @returns true if the origin is allowed, false otherwise
 */
export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (origin === undefined || origin === null || origin === "") {
    return true;
  }

  if (origin.startsWith("moz-extension://")) {
    return true;
  }

  try {
    const url = new URL(origin);
    return ALLOWED_LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * WebSocket Bridge Options
 */
export interface WebSocketBridgeOptions {
  port: number;
  timeout?: number;
  maxPendingRequests?: number;
}

/**
 * WebSocket Bridge for Thunderbird Extension
 * Supports two types of connections:
 * - Thunderbird extension (single connection, handles requests)
 * - MCP clients (multiple connections, send requests)
 */
export class WebSocketBridge extends EventEmitter {
  private httpServer: HttpServer | null = null;
  private wssThunderbird: WebSocketServer | null = null;
  private wssMcp: WebSocketServer | null = null;
  private thunderbirdClient: WebSocket | null = null;
  private mcpClients: Set<WebSocket> = new Set();
  private readonly options: Required<WebSocketBridgeOptions>;
  private readonly pendingRequests: Map<string, PendingRequest>;
  private requestCounter: number = 0;

  constructor(options: WebSocketBridgeOptions) {
    super();
    this.options = {
      port: options.port,
      timeout: options.timeout || 30000,
      maxPendingRequests: options.maxPendingRequests || 100,
    };
    this.pendingRequests = new Map();
  }

  /**
   * Start the WebSocket server with path-based routing
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server for path-based WebSocket routing
        this.httpServer = createServer((req, res) => {
          // Simple health check endpoint
          if (req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                status: "ok",
                thunderbird: this.thunderbirdClient !== null,
                mcpClients: this.mcpClients.size,
              }),
            );
          } else {
            res.writeHead(404);
            res.end();
          }
        });

        // WebSocket server for Thunderbird extension (single client)
        this.wssThunderbird = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_PAYLOAD });
        this.wssThunderbird.on("connection", (ws: WebSocket) => {
          this.handleThunderbirdConnection(ws);
        });

        // WebSocket server for MCP clients (multiple clients)
        this.wssMcp = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_PAYLOAD });
        this.wssMcp.on("connection", (ws: WebSocket) => {
          this.handleMcpConnection(ws);
        });

        // Route WebSocket upgrades based on URL path
        this.httpServer.on(
          "upgrade",
          (request: IncomingMessage, socket, head) => {
            // SEC-WS-003: Validate origin before allowing upgrade
            const origin = request.headers.origin;
            if (!isAllowedOrigin(origin)) {
              logger.warn(
                `WebSocket upgrade rejected: forbidden origin "${origin}"`,
              );
              socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
              socket.destroy();
              return;
            }

            const pathname = new URL(
              request.url || "/",
              `http://${request.headers.host}`,
            ).pathname;

            if (pathname === "/thunderbird" || pathname === "/") {
              // Default path and /thunderbird go to Thunderbird handler
              this.wssThunderbird!.handleUpgrade(
                request,
                socket,
                head,
                (ws) => {
                  this.wssThunderbird!.emit("connection", ws, request);
                },
              );
            } else if (pathname === "/mcp") {
              // /mcp path goes to MCP clients handler
              this.wssMcp!.handleUpgrade(request, socket, head, (ws) => {
                this.wssMcp!.emit("connection", ws, request);
              });
            } else {
              logger.warn(`Unknown WebSocket path: ${pathname}`);
              socket.destroy();
            }
          },
        );

        this.httpServer.on("error", (error) => {
          logger.error("HTTP server error:", error);
          reject(error);
        });

        this.httpServer.listen(this.options.port, () => {
          logger.info(
            `WebSocket bridge listening on port ${this.options.port}`,
          );
          logger.info(
            `  - Thunderbird extension: ws://localhost:${this.options.port}/thunderbird (or /)`,
          );
          logger.info(
            `  - MCP clients: ws://localhost:${this.options.port}/mcp`,
          );
          resolve();
        });
      } catch (error) {
        logger.error("Failed to start WebSocket server:", error);
        reject(error);
      }
    });
  }

  /**
   * Handle Thunderbird extension connection (single client)
   *
   * Strategy: Always accept new connections and replace existing ones.
   * This handles the case where the Thunderbird extension's event page
   * was terminated and restarted, leaving a "zombie" connection on the server.
   */
  private handleThunderbirdConnection(ws: WebSocket): void {
    // Always replace existing client - new connection wins
    // This is important for MV3 event pages that can restart
    if (this.thunderbirdClient) {
      logger.info("Replacing existing Thunderbird connection with new one");
      this.cleanupThunderbirdClient();
    }

    logger.info("Thunderbird extension connected");
    this.thunderbirdClient = ws;
    this.emit("connected");

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WsMessage;
        this.handleThunderbirdMessage(message);
      } catch (error) {
        logger.error("Failed to parse Thunderbird message:", error);
      }
    });

    ws.on("close", () => {
      logger.info("Thunderbird extension disconnected");
      this.thunderbirdClient = null;
      this.rejectAllPending("Thunderbird disconnected");
      this.emit("disconnected");
    });

    ws.on("error", (error) => {
      logger.error("Thunderbird WebSocket error:", error);
      this.emit("error", error);
    });
  }

  /**
   * Handle MCP client connection (multiple clients allowed)
   */
  private handleMcpConnection(ws: WebSocket): void {
    logger.info(`MCP client connected (total: ${this.mcpClients.size + 1})`);
    this.mcpClients.add(ws);

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WsMessage;
        this.handleMcpMessage(message, ws);
      } catch (error) {
        logger.error("Failed to parse MCP client message:", error);
      }
    });

    ws.on("close", () => {
      this.mcpClients.delete(ws);
      logger.info(
        `MCP client disconnected (remaining: ${this.mcpClients.size})`,
      );
      // Reject pending requests from this client
      this.rejectPendingForClient(ws, "MCP client disconnected");
    });

    ws.on("error", (error) => {
      logger.error("MCP client WebSocket error:", error);
    });

    // Send connection confirmation to MCP client
    const welcome: WsMessage = {
      id: `welcome_${Date.now()}`,
      type: "notification",
      event: "connected",
      data: { thunderbirdConnected: this.thunderbirdClient !== null },
      timestamp: new Date().toISOString(),
    };
    ws.send(JSON.stringify(welcome));
  }

  /**
   * Handle message from Thunderbird extension
   */
  private handleThunderbirdMessage(message: WsMessage): void {
    logger.debug(`Received from Thunderbird: ${message.type} (${message.id})`);

    switch (message.type) {
      case "response":
        this.handleResponse(message);
        break;
      case "notification":
        this.emit("notification", message);
        // Broadcast notifications to all MCP clients
        this.broadcastToMcpClients(message);
        break;
      case "heartbeat":
        this.sendPingToThunderbird();
        break;
      case "pong":
        logger.debug("Pong received from Thunderbird");
        break;
      default:
        logger.warn("Unknown message type from Thunderbird:", message);
    }
  }

  /**
   * Handle message from MCP client (relay requests to Thunderbird)
   */
  private handleMcpMessage(message: WsMessage, mcpClient: WebSocket): void {
    logger.debug(`Received from MCP client: ${message.type} (${message.id})`);

    switch (message.type) {
      case "request":
        // Relay request to Thunderbird
        this.relayRequestToThunderbird(message, mcpClient);
        break;
      case "ping": {
        // Respond with pong
        const pong: WsMessage = {
          id: message.id,
          type: "pong",
          timestamp: new Date().toISOString(),
        };
        mcpClient.send(JSON.stringify(pong));
        break;
      }
      default:
        logger.warn("Unexpected message type from MCP client:", message);
    }
  }

  /**
   * Relay request from MCP client to Thunderbird
   */
  private relayRequestToThunderbird(
    request: WsMessage,
    mcpClient: WebSocket,
  ): void {
    if (
      !this.thunderbirdClient ||
      this.thunderbirdClient.readyState !== WebSocket.OPEN
    ) {
      // Send error back to MCP client
      const errorResponse: WsMessage = {
        id: request.id,
        type: "response",
        success: false,
        error: { code: -1, message: "Not connected to Thunderbird extension" },
        timestamp: new Date().toISOString(),
      };
      mcpClient.send(JSON.stringify(errorResponse));
      return;
    }

    if (this.pendingRequests.size >= this.options.maxPendingRequests) {
      const errorResponse: WsMessage = {
        id: request.id,
        type: "response",
        success: false,
        error: { code: -2, message: "Too many pending requests" },
        timestamp: new Date().toISOString(),
      };
      mcpClient.send(JSON.stringify(errorResponse));
      return;
    }

    // Store pending request with reference to MCP client
    const timeoutHandle = setTimeout(() => {
      this.pendingRequests.delete(request.id);
      const timeoutResponse: WsMessage = {
        id: request.id,
        type: "response",
        success: false,
        error: { code: -3, message: `Request timeout: ${request.action}` },
        timestamp: new Date().toISOString(),
      };
      if (mcpClient.readyState === WebSocket.OPEN) {
        mcpClient.send(JSON.stringify(timeoutResponse));
      }
    }, this.options.timeout);

    this.pendingRequests.set(request.id, {
      resolve: () => {}, // Not used for relayed requests
      reject: () => {}, // Not used for relayed requests
      timeout: timeoutHandle,
      action: request.action || "unknown",
      mcpClient,
    });

    // Forward request to Thunderbird
    logger.debug(
      `Relaying request to Thunderbird: ${request.action} (${request.id})`,
    );
    this.thunderbirdClient.send(JSON.stringify(request));
  }

  /**
   * Handle response from Thunderbird
   */
  private handleResponse(response: WsMessage): void {
    const pending = this.pendingRequests.get(response.id);

    if (!pending) {
      logger.warn(`Received response for unknown request: ${response.id}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    // If this was a relayed request from an MCP client, send response back to that client
    if (pending.mcpClient && pending.mcpClient.readyState === WebSocket.OPEN) {
      logger.debug(
        `Relaying response to MCP client: ${pending.action} (${response.id})`,
      );
      pending.mcpClient.send(JSON.stringify(response));
    } else if (!pending.mcpClient) {
      // Direct request (from this bridge instance)
      if (response.success) {
        logger.debug(`Request completed: ${pending.action}`);
        pending.resolve(response);
      } else {
        logger.warn(`Request failed: ${pending.action}`, response.error);
        pending.reject(new Error(response.error?.message || "Request failed"));
      }
    }
  }

  /**
   * Broadcast message to all connected MCP clients
   */
  private broadcastToMcpClients(message: WsMessage): void {
    const payload = JSON.stringify(message);
    for (const client of this.mcpClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  /**
   * Send ping to Thunderbird extension
   */
  private sendPingToThunderbird(): void {
    if (
      this.thunderbirdClient &&
      this.thunderbirdClient.readyState === WebSocket.OPEN
    ) {
      const ping: WsMessage = {
        id: `ping_${Date.now()}`,
        type: "ping",
        timestamp: new Date().toISOString(),
      };
      this.thunderbirdClient.send(JSON.stringify(ping));
      logger.debug("Sent ping to Thunderbird");
    }
  }

  /**
   * Send request to Thunderbird extension (for direct use, not via MCP client)
   */
  async sendRequest(
    action: string,
    params: Record<string, unknown> = {},
    timeout?: number,
  ): Promise<WsMessage> {
    if (
      !this.thunderbirdClient ||
      this.thunderbirdClient.readyState !== WebSocket.OPEN
    ) {
      throw new Error("Not connected to Thunderbird extension");
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

    logger.debug(`Sending request: ${action} (${requestId})`);

    return new Promise<WsMessage>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${action} (${requestTimeout}ms)`));
      }, requestTimeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        action,
      });

      try {
        this.thunderbirdClient!.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Check if connected to Thunderbird
   */
  isConnected(): boolean {
    return (
      this.thunderbirdClient !== null &&
      this.thunderbirdClient.readyState === WebSocket.OPEN
    );
  }

  /**
   * Get number of connected MCP clients
   */
  getMcpClientCount(): number {
    return this.mcpClients.size;
  }

  /**
   * Reject all pending requests
   */
  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      if (
        pending.mcpClient &&
        pending.mcpClient.readyState === WebSocket.OPEN
      ) {
        const errorResponse: WsMessage = {
          id,
          type: "response",
          success: false,
          error: { code: -4, message: reason },
          timestamp: new Date().toISOString(),
        };
        pending.mcpClient.send(JSON.stringify(errorResponse));
      } else {
        pending.reject(new Error(reason));
      }
    }
    this.pendingRequests.clear();
  }

  /**
   * Reject pending requests for a specific MCP client
   */
  private rejectPendingForClient(client: WebSocket, _reason: string): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending.mcpClient === client) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(id);
      }
    }
  }

  /**
   * Clean up Thunderbird client connection
   */
  private cleanupThunderbirdClient(): void {
    if (this.thunderbirdClient) {
      try {
        this.thunderbirdClient.removeAllListeners();
        if (this.thunderbirdClient.readyState === WebSocket.OPEN) {
          this.thunderbirdClient.close();
        }
      } catch {
        // Ignore errors during cleanup
      }
      this.thunderbirdClient = null;
      this.rejectAllPending("Thunderbird client replaced");
    }
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    logger.info("Stopping WebSocket bridge");

    this.rejectAllPending("Server stopping");

    // Close all MCP clients
    for (const client of this.mcpClients) {
      client.close();
    }
    this.mcpClients.clear();

    // Close Thunderbird client
    if (this.thunderbirdClient) {
      this.thunderbirdClient.close();
      this.thunderbirdClient = null;
    }

    // Close WebSocket servers
    return new Promise((resolve) => {
      const closeServers = (): void => {
        if (this.httpServer) {
          this.httpServer.close(() => {
            this.httpServer = null;
            this.wssThunderbird = null;
            this.wssMcp = null;
            resolve();
          });
        } else {
          resolve();
        }
      };

      if (this.wssThunderbird) {
        this.wssThunderbird.close(() => {
          if (this.wssMcp) {
            this.wssMcp.close(closeServers);
          } else {
            closeServers();
          }
        });
      } else {
        closeServers();
      }
    });
  }
}

/**
 * Common interface for bridge operations (both server and client modes)
 */
export interface BridgeInterface {
  sendRequest(
    action: string,
    params?: Record<string, unknown>,
    timeout?: number,
  ): Promise<WsMessage>;
  isConnected(): boolean;
  on(event: string, listener: (...args: unknown[]) => void): this;
}

// Singleton instance - can be either server (WebSocketBridge) or client (WebSocketBridgeClient)
let bridgeInstance: WebSocketBridge | WebSocketBridgeClient | null = null;
let isClientMode: boolean = false;

/**
 * Get or create WebSocket bridge instance
 */
export function getWebSocketBridge(): BridgeInterface {
  if (!bridgeInstance) {
    throw new Error("WebSocket bridge not initialized");
  }
  return bridgeInstance;
}

/**
 * Check if running in client mode (connected to existing bridge)
 */
export function isBridgeClientMode(): boolean {
  return isClientMode;
}

/**
 * Initialize WebSocket bridge
 * First tries to connect to an existing bridge (client mode),
 * falls back to creating a new bridge server if none exists
 */
export async function initializeWebSocketBridge(
  options: WebSocketBridgeOptions,
): Promise<BridgeInterface> {
  if (bridgeInstance) {
    logger.warn("WebSocket bridge already initialized");
    return bridgeInstance;
  }

  // First, try to connect to an existing bridge (client mode)
  logger.info(`Checking for existing bridge on port ${options.port}...`);
  const client = await tryConnectToExistingBridge(
    options.port,
    options.timeout || 30000,
  );

  if (client) {
    logger.info("Connected to existing bridge in client mode");
    bridgeInstance = client;
    isClientMode = true;
    return bridgeInstance;
  }

  // No existing bridge found, create server
  logger.info("No existing bridge found, creating new bridge server...");
  const server = new WebSocketBridge(options);
  await server.start();
  bridgeInstance = server;
  isClientMode = false;
  return bridgeInstance;
}

/**
 * Initialize WebSocket bridge in server-only mode
 * Always creates a new server, never tries client mode
 */
export async function initializeWebSocketBridgeServer(
  options: WebSocketBridgeOptions,
): Promise<WebSocketBridge> {
  if (bridgeInstance) {
    if (bridgeInstance instanceof WebSocketBridge) {
      logger.warn("WebSocket bridge server already initialized");
      return bridgeInstance;
    }
    throw new Error("Bridge is already initialized in client mode");
  }

  const server = new WebSocketBridge(options);
  await server.start();
  bridgeInstance = server;
  isClientMode = false;
  return server;
}

/**
 * Stop WebSocket bridge
 */
export async function stopWebSocketBridge(): Promise<void> {
  if (bridgeInstance) {
    if (bridgeInstance instanceof WebSocketBridge) {
      await bridgeInstance.stop();
    } else if (bridgeInstance instanceof WebSocketBridgeClient) {
      await bridgeInstance.disconnect();
    }
    bridgeInstance = null;
    isClientMode = false;
  }
}

// Re-export for convenience
export {
  tryConnectToExistingBridge,
  WebSocketBridgeClient,
} from "./bridge-client.js";
