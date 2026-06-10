/**
 * Tests for the WebSocket bridge relay layer (MCP client ⇄ bridge ⇄ Thunderbird).
 *
 * Mounts a real WebSocketBridge (same technique as bridge-auth.test.ts) plus
 * a fake Thunderbird extension connection and real MCP client connections,
 * to lock down the relay behavior before the audit refactors touch bridge.ts.
 *
 * RED (Phase 1, fixed in Phase 2):
 * - "purges the per-client rate-limit log when an MCP client disconnects"
 *   (mcpClientMessageLog currently leaks one entry per disconnected client)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "http";
import WebSocket from "ws";
import { WebSocketBridge, WsMessage } from "../../websocket/bridge.js";

/** Base port for this file; each test gets a fresh bridge on a unique port. */
const BASE_PORT = 20100;
let portCursor = 0;

/** Structural view of the bridge internals observed by the leak test. */
interface BridgeInternals {
  mcpClientMessageLog: Map<WebSocket, number[]>;
}

function getInternals(bridge: WebSocketBridge): BridgeInternals {
  return bridge as unknown as BridgeInternals;
}

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

/**
 * Test client wrapping a WebSocket connection to the bridge.
 * Collects every incoming message and lets tests await specific ones.
 */
class TestWsClient {
  readonly ws: WebSocket;
  readonly messages: WsMessage[] = [];
  private waiters: Array<{
    predicate: (m: WsMessage) => boolean;
    resolve: (m: WsMessage) => void;
  }> = [];

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on("message", (data: Buffer) => {
      const message = JSON.parse(data.toString()) as WsMessage;
      this.messages.push(message);
      this.waiters = this.waiters.filter((waiter) => {
        if (waiter.predicate(message)) {
          waiter.resolve(message);
          return false;
        }
        return true;
      });
    });
  }

  static connect(port: number, path: string, token: string): Promise<TestWsClient> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}${path}?token=${token}`);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`Connection timeout on ${path}`));
      }, 3000);
      ws.on("open", () => {
        clearTimeout(timeout);
        resolve(new TestWsClient(ws));
      });
      ws.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  send(message: WsMessage): void {
    this.ws.send(JSON.stringify(message));
  }

  /** Resolves with the first message (past or future) matching the predicate. */
  waitFor(
    predicate: (m: WsMessage) => boolean,
    timeoutMs = 3000,
  ): Promise<WsMessage> {
    const existing = this.messages.find(predicate);
    if (existing) {
      return Promise.resolve(existing);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Timed out waiting for message")),
        timeoutMs,
      );
      this.waiters.push({
        predicate,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        },
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      this.ws.once("close", () => resolve());
      this.ws.close();
    });
  }
}

function makeRequest(id: string, action: string): WsMessage {
  return {
    id,
    type: "request",
    action,
    params: {},
    timestamp: new Date().toISOString(),
  };
}

/** Polls until the condition holds or the timeout elapses. */
async function waitUntil(
  condition: () => boolean,
  timeoutMs = 3000,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitUntil timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe("WebSocket bridge relay (MCP client ⇄ Thunderbird)", () => {
  let bridge: WebSocketBridge;
  let port: number;
  let token: string;

  beforeEach(async () => {
    port = BASE_PORT + portCursor++;
    bridge = new WebSocketBridge({
      port,
      timeout: 2000,
      maxPendingRequests: 10,
    });
    await bridge.start();
    token = await fetchToken(port);
  });

  afterEach(async () => {
    await bridge.stop();
  });

  it("relays a request to Thunderbird and the response back to the MCP client", async () => {
    const thunderbird = await TestWsClient.connect(port, "/thunderbird", token);
    const mcp = await TestWsClient.connect(port, "/mcp", token);

    mcp.send(makeRequest("relay_1", "messages.list"));

    // The fake Thunderbird receives the relayed request...
    const relayed = await thunderbird.waitFor(
      (m) => m.type === "request" && m.id === "relay_1",
    );
    expect(relayed.action).toBe("messages.list");

    // ...answers it, and the MCP client receives the response.
    thunderbird.send({
      id: "relay_1",
      type: "response",
      success: true,
      data: { messages: [] },
      timestamp: new Date().toISOString(),
    });

    const response = await mcp.waitFor(
      (m) => m.type === "response" && m.id === "relay_1",
    );
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ messages: [] });

    await mcp.close();
    await thunderbird.close();
  });

  it("returns an error response when Thunderbird is not connected", async () => {
    const mcp = await TestWsClient.connect(port, "/mcp", token);

    mcp.send(makeRequest("no_tb_1", "messages.list"));

    const response = await mcp.waitFor(
      (m) => m.type === "response" && m.id === "no_tb_1",
    );
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(-1);

    await mcp.close();
  });

  it("rate-limits an MCP client beyond 120 messages per minute (code -6)", async () => {
    const mcp = await TestWsClient.connect(port, "/mcp", token);

    // 120 pings are allowed...
    for (let i = 0; i < 120; i++) {
      mcp.send({
        id: `ping_${i}`,
        type: "ping",
        timestamp: new Date().toISOString(),
      });
    }
    await mcp.waitFor((m) => m.type === "pong" && m.id === "ping_119", 5000);

    // ...the 121st message is rejected with the rate-limit error.
    mcp.send(makeRequest("limited_1", "messages.list"));
    const response = await mcp.waitFor(
      (m) => m.type === "response" && m.id === "limited_1",
    );
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(-6);
    expect(response.error?.message).toContain("Rate limit");

    await mcp.close();
  });

  it("rejects all pending requests when Thunderbird disconnects (code -4)", async () => {
    const thunderbird = await TestWsClient.connect(port, "/thunderbird", token);
    const mcp = await TestWsClient.connect(port, "/mcp", token);

    mcp.send(makeRequest("pending_1", "messages.list"));
    await thunderbird.waitFor(
      (m) => m.type === "request" && m.id === "pending_1",
    );

    // Thunderbird vanishes without answering.
    await thunderbird.close();

    const response = await mcp.waitFor(
      (m) => m.type === "response" && m.id === "pending_1",
    );
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(-4);
    expect(response.error?.message).toContain("Thunderbird disconnected");

    await mcp.close();
  });

  it("survives a Thunderbird response addressed to a disconnected MCP client", async () => {
    const thunderbird = await TestWsClient.connect(port, "/thunderbird", token);
    const mcp = await TestWsClient.connect(port, "/mcp", token);

    mcp.send(makeRequest("ghost_1", "messages.list"));
    await thunderbird.waitFor(
      (m) => m.type === "request" && m.id === "ghost_1",
    );

    // The MCP client disconnects before the answer arrives.
    await mcp.close();
    await waitUntil(() => bridge.getMcpClientCount() === 0);

    // Thunderbird answers anyway: the bridge must not crash.
    thunderbird.send({
      id: "ghost_1",
      type: "response",
      success: true,
      data: { messages: [] },
      timestamp: new Date().toISOString(),
    });

    // The bridge is still fully functional for a fresh client.
    const mcp2 = await TestWsClient.connect(port, "/mcp", token);
    mcp2.send(makeRequest("alive_1", "messages.list"));
    const relayed = await thunderbird.waitFor(
      (m) => m.type === "request" && m.id === "alive_1",
    );
    expect(relayed.action).toBe("messages.list");

    await mcp2.close();
    await thunderbird.close();
  });

  it("purges the per-client rate-limit log when an MCP client disconnects", async () => {
    const internals = getInternals(bridge);
    const mcp = await TestWsClient.connect(port, "/mcp", token);

    mcp.send({
      id: "ping_leak",
      type: "ping",
      timestamp: new Date().toISOString(),
    });
    await mcp.waitFor((m) => m.type === "pong" && m.id === "ping_leak");
    expect(internals.mcpClientMessageLog.size).toBe(1);

    await mcp.close();
    await waitUntil(() => bridge.getMcpClientCount() === 0);

    // Without the purge, the closed socket stays in the Map forever (leak).
    await waitUntil(() => internals.mcpClientMessageLog.size === 0);
    expect(internals.mcpClientMessageLog.size).toBe(0);
  });

  it("replaces a zombie Thunderbird connection with the new one", async () => {
    const zombie = await TestWsClient.connect(port, "/thunderbird", token);
    const zombieClosed = new Promise<void>((resolve) => {
      zombie.ws.once("close", () => resolve());
    });

    // A second extension connection (event page restart) takes over.
    const fresh = await TestWsClient.connect(port, "/thunderbird", token);
    await zombieClosed;
    expect(bridge.isConnected()).toBe(true);

    // Requests are now routed to the new connection.
    const mcp = await TestWsClient.connect(port, "/mcp", token);
    mcp.send(makeRequest("takeover_1", "messages.list"));
    const relayed = await fresh.waitFor(
      (m) => m.type === "request" && m.id === "takeover_1",
    );
    expect(relayed.action).toBe("messages.list");

    await mcp.close();
    await fresh.close();
  });
});
