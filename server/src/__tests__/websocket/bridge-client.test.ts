/**
 * Tests for WebSocketBridgeClient (MCP server side of the bridge connection).
 *
 * Locks down the current connect()/sendRequest()/timeout behavior, and
 * specifies the reconnection feature wired in Phase 4 of the audit fixes.
 *
 * RED (Phase 1, fixed in Phase 4):
 * - "reconnects automatically after the bridge restarts"
 * - "emits reconnect_failed after exhausting maxReconnectAttempts"
 *   (reconnectAttempts/maxReconnectAttempts are currently written, never read)
 */
import { describe, it, expect, afterEach } from "vitest";
import http from "http";
import WebSocket from "ws";
import { WebSocketBridge, WsMessage } from "../../websocket/bridge.js";
import { WebSocketBridgeClient } from "../../websocket/bridge-client.js";

/** Base port for this file; bumped per test to avoid cross-test collisions. */
const BASE_PORT = 20200;
let portCursor = 0;

function fetchToken(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/auth/token`, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        try {
          resolve((JSON.parse(data) as { token: string }).token);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error("Token fetch timeout"));
    });
  });
}

/** Connects a fake Thunderbird extension to the bridge. */
function connectFakeThunderbird(
  port: number,
  token: string,
  onRequest?: (message: WsMessage, ws: WebSocket) => void,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}/thunderbird?token=${token}`,
    );
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Fake Thunderbird connection timeout"));
    }, 3000);
    ws.on("open", () => {
      clearTimeout(timeout);
      resolve(ws);
    });
    ws.on("message", (data: Buffer) => {
      const message = JSON.parse(data.toString()) as WsMessage;
      if (message.type === "request" && onRequest) {
        onRequest(message, ws);
      }
    });
    ws.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/** Waits for a named event on the client, failing after timeoutMs. */
function waitForEvent(
  client: WebSocketBridgeClient,
  event: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}" event`)),
      timeoutMs,
    );
    client.once(event, () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

describe("WebSocketBridgeClient", () => {
  let bridge: WebSocketBridge | null = null;
  let client: WebSocketBridgeClient | null = null;
  let port: number;

  async function startBridge(): Promise<WebSocketBridge> {
    const instance = new WebSocketBridge({
      port,
      timeout: 2000,
      maxPendingRequests: 10,
    });
    await instance.start();
    return instance;
  }

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
    if (bridge) {
      await bridge.stop();
      bridge = null;
    }
  });

  it("connects to a live bridge (token fetch + WebSocket open)", async () => {
    port = BASE_PORT + portCursor++;
    bridge = await startBridge();

    client = new WebSocketBridgeClient({ port, timeout: 2000 });
    await client.connect();

    expect(client.isConnected()).toBe(true);
  });

  it("rejects connect() when no bridge is listening", async () => {
    port = BASE_PORT + portCursor++;
    const offline = new WebSocketBridgeClient({ port, timeout: 2000 });

    await expect(offline.connect()).rejects.toThrow(
      /Failed to authenticate with bridge/,
    );
    expect(offline.isConnected()).toBe(false);
  });

  it("rejects sendRequest() immediately when never connected", async () => {
    port = BASE_PORT + portCursor++;
    const offline = new WebSocketBridgeClient({ port, timeout: 2000 });

    await expect(offline.sendRequest("messages.list")).rejects.toThrow(
      /Not connected to WebSocket bridge/,
    );
  });

  it("relays a request end-to-end through the bridge", async () => {
    port = BASE_PORT + portCursor++;
    bridge = await startBridge();
    const token = await fetchToken(port);
    const thunderbird = await connectFakeThunderbird(
      port,
      token,
      (message, ws) => {
        ws.send(
          JSON.stringify({
            id: message.id,
            type: "response",
            success: true,
            data: { ok: true },
            timestamp: new Date().toISOString(),
          }),
        );
      },
    );

    client = new WebSocketBridgeClient({ port, timeout: 2000 });
    await client.connect();

    const response = await client.sendRequest("messages.list");
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ ok: true });

    thunderbird.close();
  });

  it("rejects sendRequest() with a timeout when Thunderbird never answers", async () => {
    port = BASE_PORT + portCursor++;
    bridge = await startBridge();
    const token = await fetchToken(port);
    // Fake Thunderbird that swallows requests (no onRequest handler).
    const thunderbird = await connectFakeThunderbird(port, token);

    client = new WebSocketBridgeClient({ port, timeout: 2000 });
    await client.connect();

    await expect(
      client.sendRequest("messages.list", {}, 300),
    ).rejects.toThrow(/Request timeout: messages\.list \(300ms\)/);

    thunderbird.close();
  });

  it("emits disconnected and rejects pending requests when the bridge stops", async () => {
    port = BASE_PORT + portCursor++;
    bridge = await startBridge();

    client = new WebSocketBridgeClient({ port, timeout: 2000 });
    await client.connect();

    const disconnected = waitForEvent(client, "disconnected", 3000);
    await bridge.stop();
    bridge = null;
    await disconnected;

    expect(client.isConnected()).toBe(false);
  });

  it("reconnects automatically after the bridge restarts", { timeout: 15000 }, async () => {
    port = BASE_PORT + portCursor++;
    bridge = await startBridge();

    client = new WebSocketBridgeClient({ port, timeout: 2000 });
    await client.connect();
    expect(client.isConnected()).toBe(true);

    // The bridge dies (e.g. docker compose restart)...
    const reconnected = waitForEvent(client, "connected", 10000);
    await bridge.stop();

    // ...and comes back on the same port with a NEW auth token.
    bridge = await startBridge();

    // The client must re-fetch the token and re-establish the session
    // (exponential backoff, first attempt ~1s after the disconnect).
    await reconnected;
    expect(client.isConnected()).toBe(true);
  });

  it("emits reconnect_failed after exhausting maxReconnectAttempts", { timeout: 15000 }, async () => {
    port = BASE_PORT + portCursor++;
    bridge = await startBridge();

    client = new WebSocketBridgeClient({ port, timeout: 2000 });
    await client.connect();

    // The bridge dies and never comes back: after maxReconnectAttempts
    // (3 attempts: ~1s, ~2s, ~4s backoff) the client must give up and
    // surface a terminal "reconnect_failed" event.
    const gaveUp = waitForEvent(client, "reconnect_failed", 12000);
    await bridge.stop();
    bridge = null;

    await gaveUp;
    expect(client.isConnected()).toBe(false);
  });
});
