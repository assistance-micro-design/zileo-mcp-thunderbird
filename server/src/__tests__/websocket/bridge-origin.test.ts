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
 * Tests for WebSocket origin validation
 * SEC-WS-003: Validate origin on WebSocket upgrade
 */

import { describe, it, expect } from "vitest";
import { isAllowedOrigin } from "../../websocket/bridge.js";

describe("isAllowedOrigin", () => {
  describe("should accept valid origins", () => {
    it("should accept undefined origin (CLI, docker exec, native)", () => {
      expect(isAllowedOrigin(undefined)).toBe(true);
    });

    it("should accept null origin", () => {
      expect(isAllowedOrigin(null)).toBe(true);
    });

    it("should accept empty string origin", () => {
      expect(isAllowedOrigin("")).toBe(true);
    });

    it("should accept http://localhost", () => {
      expect(isAllowedOrigin("http://localhost")).toBe(true);
    });

    it("should accept http://localhost with port", () => {
      expect(isAllowedOrigin("http://localhost:9876")).toBe(true);
    });

    it("should accept http://127.0.0.1", () => {
      expect(isAllowedOrigin("http://127.0.0.1")).toBe(true);
    });

    it("should accept http://127.0.0.1 with port", () => {
      expect(isAllowedOrigin("http://127.0.0.1:9876")).toBe(true);
    });

    it("should accept http://[::1]", () => {
      expect(isAllowedOrigin("http://[::1]")).toBe(true);
    });

    it("should accept http://[::1] with port", () => {
      expect(isAllowedOrigin("http://[::1]:9876")).toBe(true);
    });

    it("should accept moz-extension:// origin", () => {
      expect(isAllowedOrigin("moz-extension://abc-123-def")).toBe(true);
    });

    it("should accept moz-extension:// with UUID path", () => {
      expect(
        isAllowedOrigin(
          "moz-extension://e4a8a97b-f2c2-4981-9e88-1234567890ab",
        ),
      ).toBe(true);
    });
  });

  describe("should reject invalid origins", () => {
    it("should reject external http origin", () => {
      expect(isAllowedOrigin("http://evil.com")).toBe(false);
    });

    it("should reject external https origin", () => {
      expect(isAllowedOrigin("https://attacker.example.com")).toBe(false);
    });

    it("should reject chrome-extension:// origin", () => {
      expect(isAllowedOrigin("chrome-extension://abc-123")).toBe(false);
    });

    it("should reject file:// origin", () => {
      expect(isAllowedOrigin("file:///home/user/page.html")).toBe(false);
    });

    it("should reject origin with localhost in path", () => {
      expect(isAllowedOrigin("http://evil.com/localhost")).toBe(false);
    });

    it("should reject origin with localhost as subdomain", () => {
      expect(isAllowedOrigin("http://localhost.evil.com")).toBe(false);
    });

    it("should reject non-loopback IP", () => {
      expect(isAllowedOrigin("http://192.168.1.1")).toBe(false);
    });

    it("should reject non-loopback IP with port", () => {
      expect(isAllowedOrigin("http://10.0.0.1:9876")).toBe(false);
    });
  });
});
