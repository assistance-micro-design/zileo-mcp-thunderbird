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
 * Tests for thunderbird_messages_get body conversion (bodyFormat param).
 *
 * With bodyFormat: "text" and format "full", the server projects the MIME
 * parts to text-first content: existing text/plain parts are preferred (the
 * redundant text/html alternative is dropped), HTML-only bodies are
 * converted to plain text server-side, and non-text parts (attachments,
 * images) keep their metadata without body. The default ("original") leaves
 * bodies exactly as stored.
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

const NEWSLETTER_HTML = `<!DOCTYPE html><html lang="fr-FR"><head>
<style type="text/css">@media only screen and (max-width: 480px) { h1 { font-size: 22px !important; } }</style>
</head><body>
<!--[if gte mso 15]><table width="600"><tr><td>conditional junk<![endif]-->
<img width="1" height="1" src="https://tracking.example.com/pixel.gif" alt=""/>
<p>Bonjour les <strong>Guerriers</strong>,</p>
<p>Voici le <a href="https://tracking.example.com/cl/abc123">rapport</a> &amp; bonne lecture&nbsp;!</p>
<p>L&#39;analyse du secteur &lt;spatial&gt;.</p>
<script>var x = "should not appear";</script>
</body></html>`;

/** HTML-only message (no text/plain alternative) */
function makeHtmlOnlyMessage(): Record<string, unknown> {
  return {
    id: 1,
    author: "Paul <nepasrepondre@example.com>",
    subject: "Newsletter",
    tags: [],
    parts: [
      {
        contentType: "text/html",
        partName: "1",
        size: 41580,
        body: NEWSLETTER_HTML,
      },
    ],
    headers: { references: ["<ref@example.com>"] },
  };
}

/** multipart/alternative message with attachment */
function makeAlternativeMessage(): Record<string, unknown> {
  return {
    id: 2,
    author: "Alice <alice@example.com>",
    subject: "Report",
    tags: ["$label1"],
    parts: [
      {
        contentType: "multipart/mixed",
        partName: "",
        parts: [
          {
            contentType: "multipart/alternative",
            partName: "1",
            parts: [
              {
                contentType: "text/plain",
                partName: "1.1",
                body: "Hello in plain text",
              },
              {
                contentType: "text/html",
                partName: "1.2",
                body: "<p>Hello in <b>HTML</b></p>",
              },
            ],
          },
          {
            contentType: "application/pdf",
            partName: "2",
            name: "doc.pdf",
            size: 12345,
          },
        ],
      },
    ],
    headers: {},
  };
}

function parseResult(result: {
  content: Array<{ type: string; text?: string }>;
}): Record<string, unknown> {
  const firstContent = result.content[0] as { type: string; text: string };
  return JSON.parse(firstContent.text) as Record<string, unknown>;
}

describe("thunderbird_messages_get body conversion", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it("should leave bodies untouched by default (bodyFormat original)", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: makeHtmlOnlyMessage(),
    });

    const result = await handleMessagesGet({ messageId: 1, format: "full" });

    const data = parseResult(result);
    const parts = data.parts as Array<Record<string, unknown>>;
    expect(parts[0].contentType).toBe("text/html");
    expect(parts[0].body).toBe(NEWSLETTER_HTML);
  });

  it("should convert an HTML-only body to readable plain text", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: makeHtmlOnlyMessage(),
    });

    const result = await handleMessagesGet({
      messageId: 1,
      format: "full",
      bodyFormat: "text",
    });

    expect(result.isError).toBeUndefined();
    const data = parseResult(result);
    const parts = data.parts as Array<Record<string, unknown>>;
    const body = parts[0].body as string;

    // Text content preserved, entities decoded
    expect(body).toContain("Bonjour les Guerriers,");
    expect(body).toContain("rapport & bonne lecture !");
    expect(body).toContain("L'analyse du secteur <spatial>.");

    // HTML machinery removed
    expect(body).not.toMatch(/<\s*(p|table|img|a|strong|html|body)\b/i);
    expect(body).not.toContain("font-size");
    expect(body).not.toContain("should not appear");
    expect(body).not.toContain("conditional junk");
    expect(body).not.toContain("tracking.example.com");

    // The converted part is flagged honestly
    expect(parts[0].contentType).toBe("text/plain");
    expect(parts[0].convertedFrom).toBe("text/html");
  });

  it("should prefer the existing text/plain part and drop the HTML alternative", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: makeAlternativeMessage(),
    });

    const result = await handleMessagesGet({
      messageId: 2,
      format: "full",
      bodyFormat: "text",
    });

    const data = parseResult(result);
    const mixed = (data.parts as Array<Record<string, unknown>>)[0];
    const alternative = (mixed.parts as Array<Record<string, unknown>>)[0];
    const altParts = alternative.parts as Array<Record<string, unknown>>;

    expect(altParts).toHaveLength(1);
    expect(altParts[0].contentType).toBe("text/plain");
    expect(altParts[0].body).toBe("Hello in plain text");
  });

  it("should keep attachment metadata without body", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: makeAlternativeMessage(),
    });

    const result = await handleMessagesGet({
      messageId: 2,
      format: "full",
      bodyFormat: "text",
    });

    const data = parseResult(result);
    const mixed = (data.parts as Array<Record<string, unknown>>)[0];
    const attachment = (mixed.parts as Array<Record<string, unknown>>)[1];

    expect(attachment.contentType).toBe("application/pdf");
    expect(attachment.name).toBe("doc.pdf");
    expect(attachment.size).toBe(12345);
    expect(attachment).not.toHaveProperty("body");
  });

  it("should compose with the default header filtering", async () => {
    mockSendRequest.mockResolvedValue({
      success: true,
      data: {
        ...makeHtmlOnlyMessage(),
        headers: {
          references: ["<ref@example.com>"],
          "dkim-signature": ["v=1; b=..."],
        },
      },
    });

    const result = await handleMessagesGet({
      messageId: 1,
      format: "full",
      bodyFormat: "text",
    });

    const data = parseResult(result);
    const headers = data.headers as Record<string, string[]>;
    expect(headers.references).toEqual(["<ref@example.com>"]);
    expect(headers).not.toHaveProperty("dkim-signature");

    const parts = data.parts as Array<Record<string, unknown>>;
    expect(parts[0].contentType).toBe("text/plain");
  });

  it("should reject an invalid bodyFormat value", async () => {
    const result = await handleMessagesGet({
      messageId: 1,
      bodyFormat: "markdown",
    });

    expect(result.isError).toBe(true);
    expect(mockSendRequest).not.toHaveBeenCalled();
  });
});
