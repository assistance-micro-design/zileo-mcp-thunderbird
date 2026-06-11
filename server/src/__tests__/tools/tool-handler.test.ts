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
 * Tests for executeToolHandler utility
 * Validates the shared handler wrapper used by all standard tool handlers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Mock the websocket client-adapter module
const mockSendRequest = vi.fn();
vi.mock("../../websocket/client-adapter.js", () => ({
  getBridgeClient: (): { sendRequest: typeof mockSendRequest } => ({
    sendRequest: mockSendRequest,
  }),
}));

// Mock logger to prevent output
vi.mock("../../utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { executeToolHandler } from "../../tools/tool-handler.js";
import { isoDatetime } from "../../tools/schema-helpers.js";

describe("executeToolHandler", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  const testSchema = z.object({
    id: z.string().max(100),
    limit: z.number().int().positive().optional().default(10),
  });

  // =========================================================================
  // Success path
  // =========================================================================

  it("should parse args, send request, and return formatted JSON on success", async () => {
    const mockData = { items: [{ id: "1", name: "Test" }] };
    mockSendRequest.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const result = await executeToolHandler(
      { id: "abc", limit: 5 },
      testSchema,
      "test.action",
      "handleTest",
    );

    expect(result.isError).toBeUndefined();
    const firstContent = result.content[0] as { type: string; text: string };
    const parsed = JSON.parse(firstContent.text);
    expect(parsed).toEqual(mockData);
    expect(mockSendRequest).toHaveBeenCalledWith("test.action", {
      id: "abc",
      limit: 5,
    });
  });

  it("should apply zod defaults to missing optional params", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: { ok: true },
    });

    await executeToolHandler(
      { id: "abc" },
      testSchema,
      "test.action",
      "handleTest",
    );

    expect(mockSendRequest).toHaveBeenCalledWith("test.action", {
      id: "abc",
      limit: 10,
    });
  });

  // =========================================================================
  // Error paths
  // =========================================================================

  it("should return isError when zod validation fails", async () => {
    const result = await executeToolHandler(
      { id: 123 }, // id should be string
      testSchema,
      "test.action",
      "handleTest",
    );

    expect(result.isError).toBe(true);
    expect(mockSendRequest).not.toHaveBeenCalled();
    const text = (result.content[0] as { text: string }).text;
    const jsonRpcError = JSON.parse(text) as { code: number; message: string };
    expect(jsonRpcError.code).toBe(-32602);
    expect(jsonRpcError.message).toContain("Invalid params");
    expect(jsonRpcError.message).toContain("id");
  });

  it("should return an actionable message for invalid datetime params", async () => {
    const dateSchema = z.object({ dateFrom: isoDatetime().optional() });

    const result = await executeToolHandler(
      { dateFrom: "2026-01-15" }, // missing timezone offset
      dateSchema,
      "test.action",
      "handleTest",
    );

    expect(result.isError).toBe(true);
    expect(mockSendRequest).not.toHaveBeenCalled();
    const text = (result.content[0] as { text: string }).text;
    const jsonRpcError = JSON.parse(text) as { code: number; message: string };
    expect(jsonRpcError.code).toBe(-32602);
    expect(jsonRpcError.message).toContain("dateFrom");
    expect(jsonRpcError.message).toContain(
      "ISO 8601 with timezone offset, e.g. 2026-01-15T10:00:00Z",
    );
  });

  it("should return isError when response.success is false", async () => {
    mockSendRequest.mockResolvedValue({
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });

    const result = await executeToolHandler(
      { id: "abc" },
      testSchema,
      "test.action",
      "handleTest",
    );

    expect(result.isError).toBe(true);
  });

  it("should return isError when sendRequest throws", async () => {
    mockSendRequest.mockRejectedValue(new Error("Connection lost"));

    const result = await executeToolHandler(
      { id: "abc" },
      testSchema,
      "test.action",
      "handleTest",
    );

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Connection lost");
  });

  // =========================================================================
  // transformParams option
  // =========================================================================

  it("should apply transformParams before sending request", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: { ok: true },
    });

    await executeToolHandler(
      { id: "abc" },
      testSchema,
      "test.action",
      "handleTest",
      {
        transformParams: (parsed) => ({
          ...parsed,
          extra: true,
        }),
      },
    );

    expect(mockSendRequest).toHaveBeenCalledWith("test.action", {
      id: "abc",
      limit: 10,
      extra: true,
    });
  });

  // =========================================================================
  // transformResponse option
  // =========================================================================

  it("should apply transformResponse to format output", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: { items: [1, 2, 3] },
    });

    const result = await executeToolHandler(
      { id: "abc" },
      testSchema,
      "test.action",
      "handleTest",
      {
        transformResponse: () => ({ success: true }),
      },
    );

    const firstContent = result.content[0] as { type: string; text: string };
    const parsed = JSON.parse(firstContent.text);
    expect(parsed).toEqual({ success: true });
  });

  // =========================================================================
  // Empty schema (e.g. accountsList)
  // =========================================================================

  it("should work with empty schema", async () => {
    const emptySchema = z.object({});
    mockSendRequest.mockResolvedValue({
      success: true,
      data: [{ id: "1" }],
    });

    const result = await executeToolHandler(
      {},
      emptySchema,
      "accounts.list",
      "handleAccountsList",
    );

    expect(result.isError).toBeUndefined();
    expect(mockSendRequest).toHaveBeenCalledWith("accounts.list", {});
  });
});
