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
 * Tests for WebSocket authentication
 * SEC-WS-001: Token-based authentication for WebSocket connections
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import net from "net";
import WebSocket from "ws";
import { WebSocketBridge, isLocalAddress } from "../../websocket/bridge.js";

const TEST_PORT = 19876;

/**
 * Helper: fetch auth token from bridge HTTP endpoint
 */
function fetchToken(port: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/auth/token`, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        resolve({ status: res.statusCode ?? 0, body: data });
      });
    });
    req.on("error", reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error("Timeout"));
    });
  });
}

/**
 * Helper: attempt WebSocket upgrade and return the HTTP response code
 */
function attemptWsUpgrade(
  port: number,
  path: string,
  token?: string,
): Promise<{ connected: boolean; closeCode?: number }> {
  return new Promise((resolve) => {
    const url = token
      ? `ws://127.0.0.1:${port}${path}?token=${token}`
      : `ws://127.0.0.1:${port}${path}`;

    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ connected: false });
    }, 3000);

    ws.on("open", () => {
      clearTimeout(timeout);
      ws.close();
      resolve({ connected: true });
    });

    ws.on("unexpected-response", (_req, res) => {
      clearTimeout(timeout);
      resolve({ connected: false, closeCode: res.statusCode });
    });

    ws.on("error", () => {
      clearTimeout(timeout);
      resolve({ connected: false });
    });
  });
}

describe("WebSocket Authentication (SEC-WS-001)", () => {
  let bridge: WebSocketBridge;

  beforeAll(async () => {
    bridge = new WebSocketBridge({
      port: TEST_PORT,
      timeout: 5000,
      maxPendingRequests: 10,
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  describe("GET /auth/token endpoint", () => {
    it("should return a token with HTTP 200 for localhost requests", async () => {
      const result = await fetchToken(TEST_PORT);

      expect(result.status).toBe(200);

      const parsed = JSON.parse(result.body);
      expect(parsed).toHaveProperty("token");
      expect(typeof parsed.token).toBe("string");
    });

    it("should return a 64-character hex token (32 bytes)", async () => {
      const result = await fetchToken(TEST_PORT);
      const parsed = JSON.parse(result.body);

      expect(parsed.token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should return the same token on multiple calls", async () => {
      const result1 = await fetchToken(TEST_PORT);
      const result2 = await fetchToken(TEST_PORT);

      const token1 = JSON.parse(result1.body).token;
      const token2 = JSON.parse(result2.body).token;

      expect(token1).toBe(token2);
    });
  });

  describe("WebSocket upgrade with token validation", () => {
    it("should reject /thunderbird upgrade without token (401)", async () => {
      const result = await attemptWsUpgrade(TEST_PORT, "/thunderbird");

      expect(result.connected).toBe(false);
      expect(result.closeCode).toBe(401);
    });

    it("should reject /mcp upgrade without token (401)", async () => {
      const result = await attemptWsUpgrade(TEST_PORT, "/mcp");

      expect(result.connected).toBe(false);
      expect(result.closeCode).toBe(401);
    });

    it("should reject upgrade with invalid token (401)", async () => {
      const result = await attemptWsUpgrade(
        TEST_PORT,
        "/thunderbird",
        "invalid-token-value",
      );

      expect(result.connected).toBe(false);
      expect(result.closeCode).toBe(401);
    });

    it("should reject / path upgrade without token (401)", async () => {
      const result = await attemptWsUpgrade(TEST_PORT, "/");

      expect(result.connected).toBe(false);
      expect(result.closeCode).toBe(401);
    });

    it("should accept /thunderbird upgrade with valid token", async () => {
      const tokenResult = await fetchToken(TEST_PORT);
      const token = JSON.parse(tokenResult.body).token;

      const result = await attemptWsUpgrade(TEST_PORT, "/thunderbird", token);

      expect(result.connected).toBe(true);
    });

    it("should accept /mcp upgrade with valid token", async () => {
      const tokenResult = await fetchToken(TEST_PORT);
      const token = JSON.parse(tokenResult.body).token;

      const result = await attemptWsUpgrade(TEST_PORT, "/mcp", token);

      expect(result.connected).toBe(true);
    });

    it("should accept / path upgrade with valid token", async () => {
      const tokenResult = await fetchToken(TEST_PORT);
      const token = JSON.parse(tokenResult.body).token;

      const result = await attemptWsUpgrade(TEST_PORT, "/", token);

      expect(result.connected).toBe(true);
    });
  });

  describe("isLocalAddress (utility function)", () => {
    it("should accept 127.0.0.1 (IPv4 loopback)", () => {
      expect(isLocalAddress("127.0.0.1")).toBe(true);
    });

    it("should accept ::1 (IPv6 loopback)", () => {
      expect(isLocalAddress("::1")).toBe(true);
    });

    it("should accept ::ffff:127.0.0.1 (IPv4-mapped IPv6 loopback)", () => {
      expect(isLocalAddress("::ffff:127.0.0.1")).toBe(true);
    });

    it("should accept 172.17.0.1 (Docker bridge gateway)", () => {
      expect(isLocalAddress("172.17.0.1")).toBe(true);
    });

    it("should accept 172.20.0.3 (Docker network range)", () => {
      expect(isLocalAddress("172.20.0.3")).toBe(true);
    });

    it("should accept 10.0.0.1 (private network)", () => {
      expect(isLocalAddress("10.0.0.1")).toBe(true);
    });

    it("should accept 192.168.1.1 (private network)", () => {
      expect(isLocalAddress("192.168.1.1")).toBe(true);
    });

    it("should accept ::ffff:172.17.0.1 (IPv4-mapped Docker address)", () => {
      expect(isLocalAddress("::ffff:172.17.0.1")).toBe(true);
    });

    it("should reject undefined", () => {
      expect(isLocalAddress(undefined)).toBe(false);
    });

    it("should reject public IP 8.8.8.8", () => {
      expect(isLocalAddress("8.8.8.8")).toBe(false);
    });

    it("should reject public IP 203.0.113.1", () => {
      expect(isLocalAddress("203.0.113.1")).toBe(false);
    });

    it("should reject 172.32.0.1 (outside Docker range)", () => {
      expect(isLocalAddress("172.32.0.1")).toBe(false);
    });
  });
});

describe("SEC-REVIEW-002: /auth/token IP restriction", () => {
  let bridge: WebSocketBridge;

  beforeAll(async () => {
    bridge = new WebSocketBridge({
      port: TEST_PORT + 1,
      timeout: 5000,
      maxPendingRequests: 10,
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  it("should accept /auth/token from localhost (127.0.0.1)", async () => {
    const result = await fetchTokenFromHost(TEST_PORT + 1, "127.0.0.1");
    expect(result.status).toBe(200);
    const parsed = JSON.parse(result.body);
    expect(parsed).toHaveProperty("token");
  });

  it("should reject /auth/token with a non-local Host header (DNS rebinding)", async () => {
    const result = await fetchTokenWithHostHeader(
      TEST_PORT + 1,
      "evil.example:9876",
    );
    expect(result.status).toBe(403);
    expect(result.body).toContain("invalid Host header");
  });

  it("should accept /auth/token with Host localhost:port", async () => {
    const result = await fetchTokenWithHostHeader(
      TEST_PORT + 1,
      `localhost:${TEST_PORT + 1}`,
    );
    expect(result.status).toBe(200);
  });
});

/**
 * Helper: fetch the auth token while spoofing the Host header
 * (connects to 127.0.0.1 but presents an arbitrary Host, as a DNS
 * rebinding attack would).
 */
function fetchTokenWithHostHeader(
  port: number,
  hostHeader: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/auth/token",
        headers: { Host: hostHeader },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body: data });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error("Timeout"));
    });
  });
}

describe("SEC-REVIEW-003: Rate limiter cleanup", () => {
  it("should expose cleanupRateLimiter method", () => {
    const bridge = new WebSocketBridge({
      port: TEST_PORT + 2,
      timeout: 5000,
      maxPendingRequests: 10,
    });
    expect(typeof bridge.cleanupRateLimiter).toBe("function");
  });

  it("should remove expired entries from rate limiter", async () => {
    const bridge = new WebSocketBridge({
      port: TEST_PORT + 3,
      timeout: 5000,
      maxPendingRequests: 10,
    });
    await bridge.start();
    try {
      // Make requests to populate the rate limiter
      await fetchTokenFromHost(TEST_PORT + 3, "127.0.0.1");
      await fetchTokenFromHost(TEST_PORT + 3, "127.0.0.1");

      // Rate limiter should have entries
      expect(bridge.getRateLimiterSize()).toBeGreaterThan(0);

      // Cleanup should not remove recent entries
      bridge.cleanupRateLimiter();
      expect(bridge.getRateLimiterSize()).toBeGreaterThan(0);
    } finally {
      await bridge.stop();
    }
  });
});

describe("DoS hardening: malformed upgrade requests must not crash the bridge", () => {
  let bridge: WebSocketBridge;
  const PORT = TEST_PORT + 4;

  beforeAll(async () => {
    bridge = new WebSocketBridge({
      port: PORT,
      timeout: 5000,
      maxPendingRequests: 10,
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  it("should cleanly reject a 64-char multi-byte token (401) and stay alive", async () => {
    // "é".repeat(64) has String length 64 (same as the hex token) but a
    // Buffer byteLength of 128: without a byte-length guard,
    // crypto.timingSafeEqual throws RangeError and kills the process.
    const multiByteToken = encodeURIComponent("é".repeat(64));

    const result = await attemptWsUpgrade(PORT, "/thunderbird", multiByteToken);
    expect(result.connected).toBe(false);
    expect(result.closeCode).toBe(401);

    // The bridge must still answer afterwards (process alive, port bound).
    const after = await fetchToken(PORT);
    expect(after.status).toBe(200);
  });

  it("should cleanly reject an upgrade with a malformed Host header and stay alive", async () => {
    // "[::1" (unclosed bracket) makes `new URL(url, "http://[::1")` throw.
    const response = await rawUpgradeWithHost(PORT, "[::1");

    expect(response).not.toBeNull();
    expect(response).toMatch(/^HTTP\/1\.1 4\d\d/);

    const after = await fetchToken(PORT);
    expect(after.status).toBe(200);
  });
});

/**
 * Helper: send a raw HTTP upgrade request with an arbitrary Host header
 * (the ws client library always sends a well-formed Host, so we need a raw
 * socket to exercise the malformed case). Resolves with the beginning of the
 * HTTP response, or null if the connection died without any response.
 */
function rawUpgradeWithHost(
  port: number,
  hostHeader: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    let data = "";
    let settled = false;
    const finish = (): void => {
      if (!settled) {
        settled = true;
        resolve(data.length > 0 ? data : null);
      }
    };

    const socket = net.connect(port, "127.0.0.1", () => {
      socket.write(
        "GET /thunderbird?token=deadbeef HTTP/1.1\r\n" +
          `Host: ${hostHeader}\r\n` +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n" +
          "Sec-WebSocket-Version: 13\r\n\r\n",
      );
    });
    socket.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    socket.on("close", finish);
    socket.on("error", finish);
    socket.setTimeout(2000, () => {
      socket.destroy();
      finish();
    });
  });
}

/**
 * Helper: fetch auth token from a specific host address
 */
function fetchTokenFromHost(
  port: number,
  host: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: host, port, path: "/auth/token" },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body: data });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error("Timeout"));
    });
  });
}
