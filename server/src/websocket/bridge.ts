/**
 * WebSocket Bridge for Thunderbird Communication
 * Supports multiple MCP clients connecting to a single Thunderbird extension
 * @module websocket/bridge
 */

import crypto from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import {
  createServer,
  Server as HttpServer,
  IncomingMessage,
  ServerResponse,
} from "http";
import { Duplex } from "stream";
import logger from "../utils/logger.js";
import { OperationTimeoutError } from "../utils/errors.js";
import {
  isToolAllowed,
  getToolTier,
  resolveActionToMcpTool,
} from "../permissions/tool-permissions.js";
import {
  WebSocketBridgeClient,
  tryConnectToExistingBridge,
} from "./bridge-client.js";
import type { WsMessage, WebSocketBridgeOptions } from "./types.js";

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
 * SEC-REVIEW-001: Rate limiter constants for /auth/token endpoint.
 * Allows max TOKEN_RATE_LIMIT requests per TOKEN_RATE_WINDOW_MS per IP.
 */
const TOKEN_RATE_LIMIT = 10;
const TOKEN_RATE_WINDOW_MS = 60_000;

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
 * Validates the Host header of an HTTP request against local hostnames.
 * Prevents DNS rebinding: a malicious domain resolving to 127.0.0.1 would
 * carry its own Host header (e.g. "evil.example:9876") and must be rejected
 * even though the underlying socket address is local.
 *
 * @param host - The raw Host header value (may include a port)
 * @returns true if the host is localhost, 127.0.0.1 or [::1]
 */
export function isAllowedHostHeader(host: string | undefined): boolean {
  if (!host) {
    return false;
  }
  try {
    const url = new URL(`http://${host}`);
    return ALLOWED_LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Loopback addresses (direct connections)
 */
const LOOPBACK_ADDRESSES = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);

/**
 * Checks whether an IP address belongs to a private network (RFC 1918).
 * This is needed for Docker deployments where port-forwarded connections
 * arrive from the Docker bridge gateway (typically 172.17.0.1).
 *
 * @param address - The IP address to check
 * @returns true if the address is in a private network range
 */
function isPrivateNetwork(address: string): boolean {
  // Strip IPv4-mapped IPv6 prefix
  const ip = address.startsWith("::ffff:") ? address.slice(7) : address;

  // 10.0.0.0/8
  if (ip.startsWith("10.")) {
    return true;
  }

  // 172.16.0.0/12 (Docker bridge networks)
  if (ip.startsWith("172.")) {
    const parts = ip.split(".");
    const secondOctet = parseInt(parts[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  // 192.168.0.0/16
  if (ip.startsWith("192.168.")) {
    return true;
  }

  return false;
}

/**
 * Checks whether a socket remote address is a local or private network address.
 * Used to restrict the /auth/token endpoint to local/Docker access only.
 *
 * Accepts:
 * - Loopback addresses (127.0.0.1, ::1)
 * - Private network addresses (10.x, 172.16-31.x, 192.168.x)
 *   This covers Docker bridge networks where port-forwarded connections
 *   appear to come from the gateway IP (e.g., 172.17.0.1)
 *
 * @param address - The remoteAddress from a socket connection
 * @returns true if the address is local or private, false otherwise
 */
export function isLocalAddress(address: string | undefined): boolean {
  if (!address) {
    return false;
  }
  if (LOOPBACK_ADDRESSES.has(address)) {
    return true;
  }
  return isPrivateNetwork(address);
}

/**
 * SEC-REVIEW-003: Rate limiter cleanup interval (5 minutes)
 */
const RATE_LIMITER_CLEANUP_INTERVAL_MS = 5 * 60_000;

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

  /**
   * Authentication token for WebSocket connections.
   * Generated at startup, served via GET /auth/token (localhost only),
   * and validated on every WebSocket upgrade request.
   */
  private readonly authToken: string;

  /**
   * SEC-AUTH-001: Tool permissions received from the Thunderbird extension.
   * Updated when the extension sends "ready" or "permissionsUpdated" notifications.
   * Empty object means no permissions received yet (defaults will be used).
   */
  private toolPermissions: Record<string, boolean> = {};

  /**
   * SEC-REVIEW-001: Per-IP request timestamps for /auth/token rate limiting.
   */
  private readonly tokenRequestLog: Map<string, number[]> = new Map();

  /**
   * SEC-REVIEW-003: Periodic cleanup timer for rate limiter Map.
   */
  private rateLimiterCleanupTimer: NodeJS.Timeout | null = null;

  /**
   * SEC-AUDIT-001: Per-MCP-client message counters for rate limiting.
   * Tracks timestamps of recent messages per client to enforce max messages/minute.
   */
  private readonly mcpClientMessageLog: Map<WebSocket, number[]> = new Map();
  private static readonly MCP_MSG_RATE_LIMIT = 120;
  private static readonly MCP_MSG_RATE_WINDOW_MS = 60_000;

  constructor(options: WebSocketBridgeOptions) {
    super();
    this.options = {
      port: options.port,
      host: options.host || "127.0.0.1",
      timeout: options.timeout || 30000,
      maxPendingRequests: options.maxPendingRequests || 100,
    };
    this.pendingRequests = new Map();
    this.authToken = crypto.randomBytes(32).toString("hex");
    logger.info("WebSocket auth token generated");
  }

  /**
   * Start the WebSocket server with path-based routing
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server for path-based WebSocket routing
        this.httpServer = createServer((req, res) => {
          this.handleHttpRequest(req, res);
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

        // Route WebSocket upgrades based on URL path.
        // SEC-AUDIT: the whole handler is wrapped in try/catch — a malformed
        // request (invalid Host header, multi-byte token, ...) must produce a
        // clean rejection, never an uncaught exception that kills the process.
        this.httpServer.on(
          "upgrade",
          (request: IncomingMessage, socket, head) => {
            try {
              this.handleUpgrade(request, socket, head);
            } catch (error) {
              logger.warn(
                `WebSocket upgrade rejected: malformed request (${error instanceof Error ? error.message : "unknown error"})`,
              );
              try {
                socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
              } catch {
                // Socket already gone - nothing to write to
              }
              socket.destroy();
            }
          },
        );

        this.httpServer.on("error", (error) => {
          logger.error("HTTP server error:", error);
          reject(error);
        });

        // SEC-REVIEW-003: Start periodic rate limiter cleanup
        this.rateLimiterCleanupTimer = setInterval(() => {
          this.cleanupRateLimiter();
        }, RATE_LIMITER_CLEANUP_INTERVAL_MS);

        // SEC-REVIEW-002: Bind to host (default 127.0.0.1) to prevent network exposure
        this.httpServer.listen(this.options.port, this.options.host, () => {
          logger.info(
            `WebSocket bridge listening on ${this.options.host}:${this.options.port}`,
          );
          logger.info(
            `  - Thunderbird extension: ws://${this.options.host}:${this.options.port}/thunderbird (or /)`,
          );
          logger.info(
            `  - MCP clients: ws://${this.options.host}:${this.options.port}/mcp`,
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
   * Routes plain HTTP requests: /health, /auth/token, 404 otherwise.
   *
   * @param req - The incoming HTTP request
   * @param res - The HTTP response
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    if (req.url === "/health") {
      // Simple health check endpoint
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          thunderbird: this.thunderbirdClient !== null,
          mcpClients: this.mcpClients.size,
        }),
      );
    } else if (req.url === "/auth/token") {
      this.handleAuthToken(req, res);
    } else {
      res.writeHead(404);
      res.end();
    }
  }

  /**
   * Serves the WebSocket auth token (SEC-WS-001).
   * SEC-REVIEW-001/002: restricted CORS, per-IP rate limiting, local source
   * address check, and Host header validation (DNS rebinding guard).
   *
   * @param req - The incoming HTTP request
   * @param res - The HTTP response
   */
  private handleAuthToken(req: IncomingMessage, res: ServerResponse): void {
    const remoteAddr = req.socket.remoteAddress || "";

    // SEC-REVIEW-002: Reject requests from non-local IPs
    if (!isLocalAddress(remoteAddr)) {
      logger.warn(`Auth token request rejected: non-local IP ${remoteAddr}`);
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Forbidden: local access only" }));
      return;
    }

    // SEC-AUDIT: DNS rebinding guard — the Host header must name a
    // local endpoint, regardless of the (local/private) source IP.
    if (!isAllowedHostHeader(req.headers.host)) {
      logger.warn(
        `Auth token request rejected: forbidden Host "${req.headers.host}"`,
      );
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Forbidden: invalid Host header" }));
      return;
    }

    // Rate limiting: max TOKEN_RATE_LIMIT requests per TOKEN_RATE_WINDOW_MS per IP
    const now = Date.now();
    const timestamps = this.tokenRequestLog.get(remoteAddr) || [];
    const recent = timestamps.filter((t) => now - t < TOKEN_RATE_WINDOW_MS);
    if (recent.length >= TOKEN_RATE_LIMIT) {
      logger.warn(`Auth token rate limit exceeded for ${remoteAddr}`);
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Too many requests" }));
      return;
    }
    recent.push(now);
    this.tokenRequestLog.set(remoteAddr, recent);

    logger.debug(`Auth token served to ${remoteAddr}`);
    // SEC-REVIEW-001: Reflect origin only if allowed (moz-extension://, localhost);
    // reject all others with "null" to block cross-origin web page attacks.
    const requestOrigin = req.headers.origin;
    const corsOrigin =
      isAllowedOrigin(requestOrigin) && requestOrigin ? requestOrigin : "null";
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": corsOrigin,
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ token: this.authToken }));
  }

  /**
   * Routes a WebSocket upgrade request after validating origin and auth token.
   * Called from the http "upgrade" listener, which catches any exception
   * thrown here and turns it into a clean 400 rejection.
   *
   * @param request - The HTTP upgrade request
   * @param socket - The underlying duplex socket
   * @param head - The first packet of the upgraded stream
   */
  private handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): void {
    // SEC-WS-003: Validate origin before allowing upgrade
    const origin = request.headers.origin;
    if (!isAllowedOrigin(origin)) {
      logger.warn(`WebSocket upgrade rejected: forbidden origin "${origin}"`);
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    // Throws TypeError on a malformed Host header — caught by the caller.
    const requestUrl = new URL(
      request.url || "/",
      `http://${request.headers.host}`,
    );
    const pathname = requestUrl.pathname;

    // SEC-WS-001: Validate auth token before allowing upgrade.
    // Compare in BYTE length, not string length: a multi-byte token of the
    // same character length would make crypto.timingSafeEqual throw.
    const token = requestUrl.searchParams.get("token");
    const tokenBuffer = token === null ? null : Buffer.from(token, "utf8");
    const authBuffer = Buffer.from(this.authToken, "utf8");
    if (
      !tokenBuffer ||
      tokenBuffer.length !== authBuffer.length ||
      !crypto.timingSafeEqual(tokenBuffer, authBuffer)
    ) {
      logger.warn("WebSocket upgrade rejected: invalid or missing auth token");
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    if (pathname === "/thunderbird" || pathname === "/") {
      // Default path and /thunderbird go to Thunderbird handler
      this.wssThunderbird!.handleUpgrade(request, socket, head, (ws) => {
        this.wssThunderbird!.emit("connection", ws, request);
      });
    } else if (pathname === "/mcp") {
      // /mcp path goes to MCP clients handler
      this.wssMcp!.handleUpgrade(request, socket, head, (ws) => {
        this.wssMcp!.emit("connection", ws, request);
      });
    } else {
      logger.warn(`Unknown WebSocket path: ${pathname}`);
      socket.destroy();
    }
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

    // Every handler below is identity-guarded (`this.thunderbirdClient === ws`)
    // so a replaced (zombie) connection can finish closing without clobbering
    // the state of its replacement. Do NOT use removeAllListeners() here: it
    // would also strip the ws server's internal client-tracking listener and
    // make wss.close() wait forever in stop().
    ws.on("message", (data: Buffer) => {
      if (this.thunderbirdClient !== ws) {
        return;
      }
      try {
        const message = JSON.parse(data.toString()) as WsMessage;
        this.handleThunderbirdMessage(message);
      } catch (error) {
        logger.error("Failed to parse Thunderbird message:", error);
      }
    });

    ws.on("close", () => {
      if (this.thunderbirdClient !== ws) {
        return;
      }
      logger.info("Thunderbird extension disconnected");
      this.thunderbirdClient = null;
      this.rejectAllPending("Thunderbird disconnected");
      this.emit("disconnected");
    });

    ws.on("error", (error) => {
      if (this.thunderbirdClient !== ws) {
        return;
      }
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
      // SEC-AUDIT: purge the rate-limit log entry, otherwise the Map keeps
      // one entry per disconnected client forever (memory leak).
      this.mcpClientMessageLog.delete(ws);
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
    // SEC-AUTH-001: Include current tool permissions so the client
    // doesn't have to wait for a future notification
    const welcomeData: Record<string, unknown> = {
      thunderbirdConnected: this.thunderbirdClient !== null,
    };
    if (Object.keys(this.toolPermissions).length > 0) {
      welcomeData.toolPermissions = this.toolPermissions;
    }
    const welcome: WsMessage = {
      id: `welcome_${Date.now()}`,
      type: "notification",
      event: "connected",
      data: welcomeData,
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
        // SEC-AUTH-001: Capture tool permissions from extension notifications
        if (message.event === "ready" || message.event === "permissionsUpdated") {
          const data = message.data as Record<string, unknown> | undefined;
          if (data?.toolPermissions) {
            this.toolPermissions = data.toolPermissions as Record<string, boolean>;
            logger.info(`Tool permissions updated (${Object.keys(this.toolPermissions).length} entries)`);
          }
        }
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
   * SEC-AUDIT-001: Check per-client message rate limit.
   * @returns true if the message is allowed, false if rate-limited
   */
  private checkMcpClientRateLimit(mcpClient: WebSocket): boolean {
    const now = Date.now();
    const windowStart = now - WebSocketBridge.MCP_MSG_RATE_WINDOW_MS;

    let timestamps = this.mcpClientMessageLog.get(mcpClient);
    if (!timestamps) {
      timestamps = [];
      this.mcpClientMessageLog.set(mcpClient, timestamps);
    }

    // Remove timestamps outside the window
    const firstValid = timestamps.findIndex((t) => t > windowStart);
    if (firstValid > 0) {
      timestamps.splice(0, firstValid);
    } else if (firstValid === -1) {
      timestamps.length = 0;
    }

    if (timestamps.length >= WebSocketBridge.MCP_MSG_RATE_LIMIT) {
      return false;
    }

    timestamps.push(now);
    return true;
  }

  /**
   * Handle message from MCP client (relay requests to Thunderbird)
   */
  private handleMcpMessage(message: WsMessage, mcpClient: WebSocket): void {
    logger.debug(`Received from MCP client: ${message.type} (${message.id})`);

    // SEC-AUDIT-001: Enforce per-client message rate limit
    if (!this.checkMcpClientRateLimit(mcpClient)) {
      logger.warn(
        `MCP client rate-limited: exceeded ${WebSocketBridge.MCP_MSG_RATE_LIMIT} msg/min`,
      );
      const errorResponse: WsMessage = {
        id: message.id,
        type: "response",
        success: false,
        error: { code: -6, message: "Rate limit exceeded. Max 120 messages per minute." },
        timestamp: new Date().toISOString(),
      };
      mcpClient.send(JSON.stringify(errorResponse));
      return;
    }

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

    // SEC-REVIEW-009: Enforce tool permissions at the bridge level.
    // Resolve native action (e.g. "messages.getFull", "compose.beginForward")
    // to the correct MCP tool name for permission lookup.
    // System actions (ping, getVersion) return undefined and bypass checks.
    const mcpToolName = request.action
      ? resolveActionToMcpTool(request.action)
      : undefined;
    if (mcpToolName && !isToolAllowed(mcpToolName, this.toolPermissions)) {
      const tier = getToolTier(mcpToolName) || "unknown";
      logger.warn(`Bridge denied tool call: ${request.action} (tier: ${tier})`);
      const errorResponse: WsMessage = {
        id: request.id,
        type: "response",
        success: false,
        error: {
          code: -5,
          message: `Tool "${request.action}" is disabled by user (tier: ${tier}). Enable it in the Thunderbird extension options (Add-ons Manager > Thunderbird MCP Server > Options).`,
        },
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
    } else if (pending.mcpClient) {
      logger.debug(
        `Dropping response for disconnected MCP client: ${pending.action} (${response.id})`,
      );
    } else {
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
        reject(new OperationTimeoutError(action, requestTimeout));
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
   * SEC-AUTH-001: Get tool permissions received from the Thunderbird extension.
   * Returns an empty object if no permissions have been received yet.
   */
  getToolPermissions(): Record<string, boolean> {
    return this.toolPermissions;
  }

  /**
   * SEC-REVIEW-003: Remove expired entries from the rate limiter Map.
   * Called periodically to prevent unbounded memory growth.
   */
  cleanupRateLimiter(): void {
    const now = Date.now();
    for (const [ip, timestamps] of this.tokenRequestLog.entries()) {
      const recent = timestamps.filter((t) => now - t < TOKEN_RATE_WINDOW_MS);
      if (recent.length === 0) {
        this.tokenRequestLog.delete(ip);
      } else {
        this.tokenRequestLog.set(ip, recent);
      }
    }
    logger.debug(`Rate limiter cleanup: ${this.tokenRequestLog.size} IPs tracked`);
  }

  /**
   * SEC-REVIEW-003: Get current rate limiter size (for testing).
   */
  getRateLimiterSize(): number {
    return this.tokenRequestLog.size;
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
   * Clean up Thunderbird client connection.
   * Detaches the stale connection first (its identity-guarded handlers become
   * no-ops), then closes it gracefully so the ws server can keep tracking the
   * socket until the close handshake completes.
   */
  private cleanupThunderbirdClient(): void {
    const stale = this.thunderbirdClient;
    if (stale) {
      this.thunderbirdClient = null;
      try {
        if (stale.readyState === WebSocket.OPEN) {
          stale.close();
        }
      } catch {
        // Ignore errors during cleanup
      }
      this.rejectAllPending("Thunderbird client replaced");
    }
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    logger.info("Stopping WebSocket bridge");

    // SEC-REVIEW-003: Clear rate limiter cleanup timer
    if (this.rateLimiterCleanupTimer) {
      clearInterval(this.rateLimiterCleanupTimer);
      this.rateLimiterCleanupTimer = null;
    }

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
          // Drop idle keep-alive HTTP sockets (token fetches) so close()
          // resolves immediately instead of waiting for their timeout.
          this.httpServer.closeIdleConnections();
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
  getToolPermissions(): Record<string, boolean>;
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
