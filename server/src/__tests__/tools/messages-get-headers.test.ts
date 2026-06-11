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
 * Tests for thunderbird_messages_get header filtering (includeHeaders param).
 *
 * With format "full", the extension returns the complete raw RFC 822 header
 * map plus per-part MIME headers. Most of it is noise for MCP clients (DKIM
 * signatures, received chains, spam scores) and redundant with the extracted
 * root fields. By default the server reduces the header map to a threading
 * whitelist and strips per-part headers; includeHeaders: true restores the
 * raw passthrough.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { handleMessagesGet } from "../../tools/messages.js";
import { MessageActions } from "../../types/native-messaging.js";

/** Realistic format "full" payload as returned by the extension */
function makeFullMessage(): Record<string, unknown> {
  return {
    id: 5,
    author: "Support <support@example.com>",
    recipients: ["support@example.com"],
    subject: "Hello",
    date: "2026-06-10T10:46:00.000Z",
    read: false,
    tags: ["$label1"],
    folder: { id: "account1://All Mail", name: "All Mail" },
    parts: [
      {
        contentType: "text/html",
        partName: "1",
        size: 1084,
        body: "<p>Hello</p>",
        headers: {
          "content-transfer-encoding": ["quoted-printable"],
          "content-type": ["text/html; charset=utf-8"],
        },
        parts: [
          {
            contentType: "text/plain",
            partName: "1.1",
            body: "Hello",
            headers: { "content-type": ["text/plain; charset=utf-8"] },
          },
        ],
      },
    ],
    headers: {
      "dkim-signature": ["v=1; a=rsa-sha256; b=..."],
      received: ["from mta1.example.com", "from filter.example.com"],
      "authentication-results": ["example.com; dkim=pass"],
      "x-pm-spam": ["0yezJI6YSpyJec91"],
      "x-mozilla-status": ["0001"],
      from: ["Support <support@example.com>"],
      subject: ["Hello"],
      references: ["<ref-1@example.com>"],
      "in-reply-to": ["<orig@example.com>"],
      "reply-to": ["support@example.com"],
      "list-id": ["<list.example.com>"],
    },
  };
}

function parseResult(result: {
  content: Array<{ type: string; text?: string }>;
}): Record<string, unknown> {
  const firstContent = result.content[0] as { type: string; text: string };
  return JSON.parse(firstContent.text) as Record<string, unknown>;
}

describe("thunderbird_messages_get header filtering", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it("should reduce raw headers to the threading whitelist by default with format full", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: makeFullMessage(),
    });

    const result = await handleMessagesGet({ messageId: 5, format: "full" });

    expect(result.isError).toBeUndefined();
    const data = parseResult(result);
    const headers = data.headers as Record<string, string[]>;

    // Threading headers kept
    expect(headers.references).toEqual(["<ref-1@example.com>"]);
    expect(headers["in-reply-to"]).toEqual(["<orig@example.com>"]);
    expect(headers["reply-to"]).toEqual(["support@example.com"]);
    expect(headers["list-id"]).toEqual(["<list.example.com>"]);

    // Raw noise dropped
    expect(headers).not.toHaveProperty("dkim-signature");
    expect(headers).not.toHaveProperty("received");
    expect(headers).not.toHaveProperty("authentication-results");
    expect(headers).not.toHaveProperty("x-pm-spam");
    expect(headers).not.toHaveProperty("x-mozilla-status");
    // Redundant with extracted root fields
    expect(headers).not.toHaveProperty("from");
    expect(headers).not.toHaveProperty("subject");
  });

  it("should strip per-part MIME headers recursively while keeping bodies", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: makeFullMessage(),
    });

    const result = await handleMessagesGet({ messageId: 5, format: "full" });

    const data = parseResult(result);
    const parts = data.parts as Array<Record<string, unknown>>;

    expect(parts[0]).not.toHaveProperty("headers");
    expect(parts[0].contentType).toBe("text/html");
    expect(parts[0].partName).toBe("1");
    expect(parts[0].body).toBe("<p>Hello</p>");

    const nested = parts[0].parts as Array<Record<string, unknown>>;
    expect(nested[0]).not.toHaveProperty("headers");
    expect(nested[0].body).toBe("Hello");
  });

  it("should keep all extracted root fields intact", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: makeFullMessage(),
    });

    const result = await handleMessagesGet({ messageId: 5, format: "full" });

    const data = parseResult(result);
    expect(data.id).toBe(5);
    expect(data.author).toBe("Support <support@example.com>");
    expect(data.subject).toBe("Hello");
    expect(data.tags).toEqual(["$label1"]);
    expect(data.read).toBe(false);
    expect(data.folder).toEqual({
      id: "account1://All Mail",
      name: "All Mail",
    });
  });

  it("should return the complete raw header map with includeHeaders: true", async () => {
    const fixture = makeFullMessage();
    mockSendRequest.mockResolvedValue({ success: true, data: fixture });

    const result = await handleMessagesGet({
      messageId: 5,
      format: "full",
      includeHeaders: true,
    });

    expect(result.isError).toBeUndefined();
    const data = parseResult(result);
    expect(data).toEqual(fixture);
    const parts = data.parts as Array<Record<string, unknown>>;
    expect(parts[0]).toHaveProperty("headers");
  });

  it("should never forward format or includeHeaders to the extension", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: makeFullMessage(),
    });

    await handleMessagesGet({
      messageId: 5,
      format: "full",
      includeHeaders: true,
    });

    expect(mockSendRequest).toHaveBeenCalledWith(
      MessageActions.MESSAGES_GET_FULL,
      { messageId: 5 },
    );
  });

  it("should pass format headers responses through untouched", async () => {
    const headerOnly = {
      id: 5,
      author: "Support <support@example.com>",
      subject: "Hello",
      tags: ["$label1"],
    };
    mockSendRequest.mockResolvedValue({ success: true, data: headerOnly });

    const result = await handleMessagesGet({ messageId: 5 });

    expect(mockSendRequest).toHaveBeenCalledWith(MessageActions.MESSAGES_GET, {
      messageId: 5,
    });
    expect(parseResult(result)).toEqual(headerOnly);
  });

  it("should pass format raw responses through untouched", async () => {
    const raw = { raw: "Received: from a\r\nDKIM-Signature: v=1\r\n\r\nBody" };
    mockSendRequest.mockResolvedValue({ success: true, data: raw });

    const result = await handleMessagesGet({ messageId: 5, format: "raw" });

    expect(mockSendRequest).toHaveBeenCalledWith(
      MessageActions.MESSAGES_GET_RAW,
      { messageId: 5 },
    );
    expect(parseResult(result)).toEqual(raw);
  });

  it("should reject a non-boolean includeHeaders", async () => {
    const result = await handleMessagesGet({
      messageId: 5,
      includeHeaders: "yes",
    });

    expect(result.isError).toBe(true);
    expect(mockSendRequest).not.toHaveBeenCalled();
  });
});
