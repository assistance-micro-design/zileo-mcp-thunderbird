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
 * Message Tool Handlers
 * MCP tools for email message operations
 * @module tools/messages
 */

import { z } from "zod";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";
import { executeToolHandler } from "./tool-handler.js";
import { isoDatetime } from "./schema-helpers.js";

// =============================================================================
// Schemas
// =============================================================================

/**
 * Shared sort options. Applied AFTER filtering, BEFORE truncation to `limit`.
 * Without these, messenger.messages.query() returns results in an undocumented
 * internal order — so `limit: 5` would be a lottery. Defaults match the
 * intuitive "newest first" semantics implied by the tool descriptions.
 */
const sortByEnum = z
  .enum(["date", "subject", "author"])
  .optional()
  .default("date");

const sortOrderEnum = z.enum(["asc", "desc"]).optional().default("desc");

/** Search messages with advanced filters across folders and accounts */
const messageSearchSchema = z.object({
  subject: z.string().max(1000).optional(),
  from: z.string().max(500).optional(),
  to: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
  tags: z.array(z.string().max(50)).max(100).optional(),
  unread: z.boolean().optional(),
  flagged: z.boolean().optional(),
  dateFrom: isoDatetime().optional(),
  dateTo: isoDatetime().optional(),
  folderId: z.string().max(500).optional(),
  accountId: z.string().max(200).optional(),
  limit: z.number().int().positive().max(1000).optional().default(50),
  sortBy: sortByEnum,
  sortOrder: sortOrderEnum,
});

/** List messages in a folder with pagination */
const messagesListSchema = z.object({
  folderId: z.string().max(500),
  limit: z.number().int().positive().max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
  sortBy: sortByEnum,
  sortOrder: sortOrderEnum,
});

/** List all unread messages, optionally filtered by account */
const messagesListUnreadSchema = z.object({
  accountId: z.string().max(200).optional(),
  limit: z.number().int().positive().max(1000).optional().default(50),
  sortBy: sortByEnum,
  sortOrder: sortOrderEnum,
});

/** Get a specific message by ID with configurable detail level */
const messagesGetSchema = z.object({
  messageId: z.number().int(),
  format: z.enum(["headers", "full", "raw"]).optional().default("headers"),
  includeHeaders: z.boolean().optional().default(false),
  bodyFormat: z.enum(["original", "text"]).optional().default("original"),
});

/** Narrowing guard for plain JSON objects */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Best-effort conversion of an HTML e-mail body to readable plain text.
 * Handles the common e-mail HTML shapes (style/script blocks, MSO
 * conditional comments, block-level tags, basic entities); not a full HTML
 * parser.
 */
function htmlToPlainText(html: string): string {
  const text = html
    .replace(/<(style|script|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|blockquote|title)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_m, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_m, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&amp;/gi, "&");

  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t\u00A0]+/g, " ")
        // Inline tags are replaced by a space, which can land before
        // punctuation ("word ,"). Not applied to !/? (French spacing).
        .replace(/ ([,.])/g, "$1")
        .trim(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** True when a part subtree contains a non-empty text/plain body */
function hasPlainTextBody(part: unknown): boolean {
  if (!isRecord(part)) return false;
  const contentType =
    typeof part.contentType === "string" ? part.contentType.toLowerCase() : "";
  if (contentType.startsWith("text/plain")) {
    return typeof part.body === "string" && part.body.trim().length > 0;
  }
  return Array.isArray(part.parts) && part.parts.some(hasPlainTextBody);
}

/**
 * Project one MIME part to text-first content. text/plain parts are kept;
 * text/html parts are dropped when a plain alternative exists elsewhere in
 * the message, otherwise their body is converted to plain text (flagged via
 * convertedFrom). Non-text parts keep their metadata without body. Returns
 * null when the part should be removed.
 */
function partToText(part: unknown, hasPlain: boolean): unknown {
  if (!isRecord(part)) return part;
  const contentType =
    typeof part.contentType === "string" ? part.contentType.toLowerCase() : "";
  const cleaned = { ...part };

  if (Array.isArray(cleaned.parts)) {
    cleaned.parts = cleaned.parts
      .map((p) => partToText(p, hasPlain))
      .filter((p) => p !== null);
  }

  if (contentType.startsWith("text/plain")) {
    return cleaned;
  }
  if (contentType.startsWith("text/html")) {
    if (hasPlain) return null;
    if (typeof cleaned.body === "string") {
      cleaned.body = htmlToPlainText(cleaned.body);
      cleaned.contentType = "text/plain";
      cleaned.convertedFrom = "text/html";
    }
    return cleaned;
  }

  // Containers and non-text leaves (attachments, images): metadata only
  delete cleaned.body;
  return cleaned;
}

/**
 * Apply bodyFormat: "text" to a format "full" payload: prefer existing
 * text/plain parts, convert HTML-only bodies server-side, keep attachment
 * metadata. Root fields are untouched.
 */
function convertFullMessageToText(data: unknown): unknown {
  if (!isRecord(data)) return data;
  const result = { ...data };
  if (Array.isArray(result.parts)) {
    const hasPlain = result.parts.some(hasPlainTextBody);
    result.parts = result.parts
      .map((p) => partToText(p, hasPlain))
      .filter((p) => p !== null);
  }
  return result;
}

/**
 * RFC 822 headers kept by default in format "full" responses. Everything
 * else (DKIM signatures, received chains, spam scores, fields already
 * extracted at the root such as from/to/subject/date) is dropped unless
 * includeHeaders: true is passed.
 */
const THREADING_HEADERS: readonly string[] = [
  "references",
  "in-reply-to",
  "reply-to",
  "list-id",
];

/**
 * Remove the MIME headers of a message part, recursively over nested parts.
 * Content type, body, and attachment metadata are preserved.
 */
function stripPartHeaders(part: unknown): unknown {
  if (typeof part !== "object" || part === null || Array.isArray(part)) {
    return part;
  }
  const cleaned = { ...(part as Record<string, unknown>) };
  delete cleaned.headers;
  if (Array.isArray(cleaned.parts)) {
    cleaned.parts = cleaned.parts.map(stripPartHeaders);
  }
  return cleaned;
}

/**
 * Reduce a format "full" payload to LLM-relevant content: the raw RFC 822
 * header map is filtered down to the threading whitelist and per-part MIME
 * headers are removed. Extracted root fields and part bodies are untouched.
 */
function filterFullMessageResponse(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const message = data as Record<string, unknown>;
  const result: Record<string, unknown> = { ...message };

  const headers = message.headers;
  if (typeof headers === "object" && headers !== null && !Array.isArray(headers)) {
    const filtered: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(headers)) {
      if (THREADING_HEADERS.includes(name.toLowerCase())) {
        filtered[name] = value;
      }
    }
    result.headers = filtered;
  }

  if (Array.isArray(message.parts)) {
    result.parts = message.parts.map(stripPartHeaders);
  }

  return result;
}

/** Upper bound for bulk message operations (move/copy/delete/archive) */
const MAX_MESSAGE_IDS = 1000;

/** Move messages to another folder */
const messagesMoveSchema = z.object({
  messageIds: z.array(z.number().int()).min(1).max(MAX_MESSAGE_IDS),
  destinationFolderId: z.string().max(500),
});

/** Copy messages to another folder */
const messagesCopySchema = z.object({
  messageIds: z.array(z.number().int()).min(1).max(MAX_MESSAGE_IDS),
  destinationFolderId: z.string().max(500),
});

/** Delete messages (trash or permanent) */
const messagesDeleteSchema = z.object({
  messageIds: z.array(z.number().int()).min(1).max(MAX_MESSAGE_IDS),
  permanent: z.boolean().optional().default(false),
});

/** Update message properties (read, flagged, junk, tags) */
const messagesUpdateSchema = z.object({
  messageId: z.number().int(),
  read: z.boolean().optional(),
  flagged: z.boolean().optional(),
  junk: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(100).optional(),
});

/** Archive messages */
const messagesArchiveSchema = z.object({
  messageIds: z.array(z.number().int()).min(1).max(MAX_MESSAGE_IDS),
});

/** List recent messages globally across all accounts */
const messagesListRecentSchema = z.object({
  accountId: z.string().max(200).optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  hoursAgo: z.number().int().positive().max(168).optional().default(24), // max 7 days
  sortBy: sortByEnum,
  sortOrder: sortOrderEnum,
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * Searches messages across folders with filters (thunderbird_messages_search).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleMessagesSearch(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    messageSearchSchema,
    MessageActions.MESSAGES_SEARCH,
    "handleMessagesSearch",
  );
}

/**
 * Lists messages of one folder with global sort and pagination (thunderbird_messages_list).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleMessagesList(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    messagesListSchema,
    MessageActions.MESSAGES_LIST,
    "handleMessagesList",
  );
}

/**
 * List unread messages - uses MESSAGES_SEARCH with unread: true
 */
export async function handleMessagesListUnread(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    messagesListUnreadSchema,
    MessageActions.MESSAGES_SEARCH,
    "handleMessagesListUnread",
    {
      transformParams: (parsed) => ({
        unread: true,
        accountId: parsed.accountId,
        limit: parsed.limit,
        sortBy: parsed.sortBy,
        sortOrder: parsed.sortOrder,
      }),
    },
  );
}

/**
 * Get a specific message - action selected from `format` (headers|full|raw)
 */
export async function handleMessagesGet(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    messagesGetSchema,
    MessageActions.MESSAGES_GET,
    "handleMessagesGet",
    {
      resolveAction: (parsed) =>
        parsed.format === "raw"
          ? MessageActions.MESSAGES_GET_RAW
          : parsed.format === "full"
            ? MessageActions.MESSAGES_GET_FULL
            : MessageActions.MESSAGES_GET,
      transformParams: (parsed) => ({ messageId: parsed.messageId }),
      transformResponse: (data, parsed) => {
        if (parsed.format !== "full") return data;
        let result = data;
        if (parsed.includeHeaders !== true) {
          result = filterFullMessageResponse(result);
        }
        if (parsed.bodyFormat === "text") {
          result = convertFullMessageToText(result);
        }
        return result;
      },
    },
  );
}

/**
 * Moves messages to a destination folder (thunderbird_messages_move).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleMessagesMove(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    messagesMoveSchema,
    MessageActions.MESSAGES_MOVE,
    "handleMessagesMove",
  );
}

/**
 * Copies messages to a destination folder (thunderbird_messages_copy).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleMessagesCopy(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    messagesCopySchema,
    MessageActions.MESSAGES_COPY,
    "handleMessagesCopy",
  );
}

/**
 * Deletes messages, to trash or permanently (thunderbird_messages_delete).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleMessagesDelete(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    messagesDeleteSchema,
    MessageActions.MESSAGES_DELETE,
    "handleMessagesDelete",
  );
}

/**
 * Updates read/flagged/junk/tags of a message (thunderbird_messages_update).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleMessagesUpdate(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    messagesUpdateSchema,
    MessageActions.MESSAGES_UPDATE,
    "handleMessagesUpdate",
  );
}

/**
 * Archives messages via account settings (thunderbird_messages_archive).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleMessagesArchive(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    messagesArchiveSchema,
    MessageActions.MESSAGES_ARCHIVE,
    "handleMessagesArchive",
  );
}

/**
 * List recent messages - translates `hoursAgo` into a date-bounded search
 */
export async function handleMessagesListRecent(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    messagesListRecentSchema,
    MessageActions.MESSAGES_SEARCH,
    "handleMessagesListRecent",
    {
      transformParams: (parsed) => {
        const hoursAgo = parsed.hoursAgo as number;
        const now = new Date();
        const dateFrom = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
        return {
          dateFrom: dateFrom.toISOString(),
          dateTo: now.toISOString(),
          accountId: parsed.accountId,
          limit: parsed.limit,
          sortBy: parsed.sortBy,
          sortOrder: parsed.sortOrder,
        };
      },
    },
  );
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const messageTools: McpTool[] = [
  {
    name: "thunderbird_messages_search",
    description: `Search messages across ALL folders (or scoped to one folder/account) with advanced filters: subject, from/to, body, tags, read/flagged state, date range. Results are sorted by sortBy (date|subject|author, default: date) in sortOrder direction (asc|desc, default: desc); sorting is applied AFTER filtering and BEFORE truncation to limit.

Example:
  Input: { subject: "invoice", from: "billing@", dateFrom: "2026-01-15T00:00:00Z",
           limit: 20, sortBy: "date", sortOrder: "desc" }
  Output: { messages: [{ id: 42, subject: "Invoice #1234",
           author: "billing@example.com", date: "2026-01-15T10:00:00Z",
           folderId: "imap://user@host/INBOX" }],
           total: 1, hasMore: false, scanComplete: true }

Note: optional folderId is obtained from thunderbird_folders_list (full URI, not "INBOX"); accountId from thunderbird_accounts_list. dateFrom/dateTo must be ISO 8601 with offset. For unscoped "show my latest emails", prefer thunderbird_messages_list_recent. scanComplete: false means the scan stopped at the 5000-message bound, so total is a lower bound; narrow the filters for an exhaustive result.`,
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Search in subject" },
        from: { type: "string", description: "Search by sender email/name" },
        to: { type: "string", description: "Search by recipient email/name" },
        body: { type: "string", description: "Search in message body" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
        unread: {
          type: "boolean",
          description: "Filter by read/unread status",
        },
        flagged: { type: "boolean", description: "Filter by flagged status" },
        dateFrom: { type: "string", description: "Start date (ISO 8601 with timezone offset, e.g. 2026-01-15T10:00:00Z)" },
        dateTo: { type: "string", description: "End date (ISO 8601 with timezone offset, e.g. 2026-01-15T10:00:00Z)" },
        folderId: {
          type: "string",
          description:
            'Folder ID from thunderbird_folders_list (NOT a name like "INBOX", use the full path returned by folders_list)',
        },
        accountId: {
          type: "string",
          description: "Account ID from thunderbird_accounts_list",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 50, max: 1000)",
          default: 50,
        },
        sortBy: {
          type: "string",
          enum: ["date", "subject", "author"],
          description: "Field to sort by. Default: date.",
          default: "date",
        },
        sortOrder: {
          type: "string",
          enum: ["asc", "desc"],
          description:
            "Sort direction. Default: desc (newest/Z-A first).",
          default: "desc",
        },
      },
    },
  },
  {
    name: "thunderbird_messages_list",
    description: `List messages in one specific folder with pagination. Returns id, subject, author, date, and read status for each message. Results are sorted by sortBy (date|subject|author, default: date) in sortOrder direction (asc|desc, default: desc); sorting is applied AFTER fetching and BEFORE pagination (offset/limit).

Example:
  Input: { folderId: "imap://user@host/INBOX", limit: 10, offset: 0,
           sortBy: "date", sortOrder: "desc" }
  Output: { messages: [{ id: 42, subject: "Hello",
           author: "alice@example.com", date: "2026-01-15T10:00:00Z",
           read: false }], total: 247, limit: 10, offset: 0,
           hasMore: true, scanComplete: true }

Note: folderId is the full URI obtained from thunderbird_folders_list (not the literal "INBOX"). For recent emails across ALL folders, use thunderbird_messages_list_recent. The whole folder is enumerated (up to 5000 messages) before sorting, so total is the real count and offset paginates globally; scanComplete: false signals the 5000 bound was hit and total is a lower bound.`,
    inputSchema: {
      type: "object",
      properties: {
        folderId: {
          type: "string",
          description:
            'Folder ID from thunderbird_folders_list output (e.g. "imap://user@server/INBOX", NOT just "INBOX")',
        },
        limit: {
          type: "number",
          description: "Maximum results per page (default: 100, max: 1000)",
          default: 100,
        },
        offset: {
          type: "number",
          description: "Number of messages to skip (default: 0)",
          default: 0,
        },
        sortBy: {
          type: "string",
          enum: ["date", "subject", "author"],
          description: "Field to sort by. Default: date.",
          default: "date",
        },
        sortOrder: {
          type: "string",
          enum: ["asc", "desc"],
          description:
            "Sort direction. Default: desc (newest/Z-A first).",
          default: "desc",
        },
      },
      required: ["folderId"],
    },
  },
  {
    name: "thunderbird_messages_list_unread",
    description: `List unread messages across every account (or scoped to one). Implemented internally as a search with unread=true. Results are sorted by sortBy (date|subject|author, default: date) in sortOrder direction (asc|desc, default: desc); sorting is applied AFTER collection across folders.

Example:
  Input: { accountId: "account1", limit: 50, sortBy: "date", sortOrder: "desc" }
  Output: { messages: [{ id: 42, subject: "Please review",
           author: "alice@example.com", date: "2026-01-15T10:00:00Z",
           folderId: "imap://user@host/INBOX", read: false }],
           total: 1, hasMore: false, scanComplete: true }

Note: optional accountId is obtained from thunderbird_accounts_list. Omit to scan all accounts. scanComplete: false means the 5000-message scan bound was hit and total is a lower bound.`,
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "Optional: filter by specific account",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 50, max: 1000)",
          default: 50,
        },
        sortBy: {
          type: "string",
          enum: ["date", "subject", "author"],
          description: "Field to sort by. Default: date.",
          default: "date",
        },
        sortOrder: {
          type: "string",
          enum: ["asc", "desc"],
          description:
            "Sort direction. Default: desc (newest/Z-A first).",
          default: "desc",
        },
      },
    },
  },
  {
    name: "thunderbird_messages_get",
    description: `Fetch one message by ID at a chosen detail level: headers (metadata only), full (with MIME parts and body), or raw (RFC 822 source). With format "full", the raw RFC 822 header map is reduced to threading headers (references, in-reply-to, reply-to, list-id) and per-part MIME headers are dropped; pass includeHeaders: true to get the complete raw header map instead. Prefer bodyFormat: "text" when reading message content: it returns compact plain-text bodies (existing text/plain part preferred, HTML converted server-side otherwise; attachments keep metadata without body). Use the default "original" only when the exact HTML markup matters.

Example:
  Input: { messageId: 42, format: "full", bodyFormat: "text" }
  Output: { id: 42, subject: "Hello", author: "alice@example.com",
           recipients: ["bob@example.com"], date: "2026-01-15T10:00:00Z",
           parts: [{ contentType: "text/plain", body: "Hi Bob, ..." }],
           headers: { references: ["<msg-1@example.com>"] } }

Note: messageId is obtained from thunderbird_messages_list, thunderbird_messages_search, or thunderbird_messages_list_recent.`,
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "number", description: "Message ID" },
        format: {
          type: "string",
          enum: ["headers", "full", "raw"],
          description:
            "Detail level: headers (metadata only), full (with MIME parts), raw (RFC 822 source)",
          default: "headers",
        },
        includeHeaders: {
          type: "boolean",
          description:
            "With format 'full', return the complete raw RFC 822 header map and per-part MIME headers instead of the default threading-headers whitelist",
          default: false,
        },
        bodyFormat: {
          type: "string",
          enum: ["original", "text"],
          description:
            "With format 'full': 'text' (recommended for reading content) returns plain-text bodies (existing text/plain part preferred, HTML converted otherwise; non-text parts keep metadata only). Default: original (bodies as stored), only needed when exact markup matters",
          default: "original",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "thunderbird_messages_move",
    description: `Move one or more messages to a target folder. The messageIds are removed from their current folder and appear in the destination.

Example:
  Input: { messageIds: [42, 43], destinationFolderId: "imap://user@host/Archive" }
  Output: { movedCount: 2, success: true }

Note: messageIds come from thunderbird_messages_list/_search/_list_recent. destinationFolderId is the full URI from thunderbird_folders_list.`,
    inputSchema: {
      type: "object",
      properties: {
        messageIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of message IDs to move",
        },
        destinationFolderId: {
          type: "string",
          description: "Target folder ID",
        },
      },
      required: ["messageIds", "destinationFolderId"],
    },
  },
  {
    name: "thunderbird_messages_copy",
    description: `Copy one or more messages to a target folder. The originals stay in place; duplicates with new IDs are created in the destination.

Example:
  Input: { messageIds: [42, 43], destinationFolderId: "imap://user@host/Backup" }
  Output: { copiedCount: 2, newIds: [101, 102], success: true }

Note: messageIds come from thunderbird_messages_list/_search/_list_recent. destinationFolderId is the full URI from thunderbird_folders_list.`,
    inputSchema: {
      type: "object",
      properties: {
        messageIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of message IDs to copy",
        },
        destinationFolderId: {
          type: "string",
          description: "Target folder ID",
        },
      },
      required: ["messageIds", "destinationFolderId"],
    },
  },
  {
    name: "thunderbird_messages_delete",
    description: `Delete one or more messages. By default they go to Trash; set permanent=true to bypass Trash and lose them irreversibly.

Example:
  Input: { messageIds: [42], permanent: false }
  Output: { deletedCount: 1, success: true }

Note: messageIds come from thunderbird_messages_list/_search/_list_recent. Setting permanent=true has no undo.`,
    inputSchema: {
      type: "object",
      properties: {
        messageIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of message IDs to delete",
        },
        permanent: {
          type: "boolean",
          description:
            "If true, permanently delete; if false, move to trash (default: false)",
          default: false,
        },
      },
      required: ["messageIds"],
    },
  },
  {
    name: "thunderbird_messages_update",
    description: `Update message flags and tags in a single call: read, flagged (star), junk classification, applied tag keys.

Example:
  Input: { messageId: 42, read: true, flagged: true, tags: ["work", "urgent"] }
  Output: { id: 42, success: true }

Note: messageId is obtained from thunderbird_messages_list/_search/_list_recent. tag keys (not display names) come from thunderbird_tags_list.`,
    inputSchema: {
      type: "object",
      properties: {
        messageId: { type: "number", description: "Message ID to update" },
        read: { type: "boolean", description: "Mark as read/unread" },
        flagged: {
          type: "boolean",
          description: "Mark as flagged/unflagged (starred)",
        },
        junk: { type: "boolean", description: "Mark as junk/not junk" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to apply to message",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "thunderbird_messages_archive",
    description: `Archive messages by moving them to the account's Archive hierarchy (typically Archive/YYYY/). Uses Thunderbird's built-in archiving logic.

Example:
  Input: { messageIds: [42, 43] }
  Output: { archivedCount: 2, success: true }

Note: messageIds come from thunderbird_messages_list/_search/_list_recent. The destination Archive folder is selected automatically by Thunderbird account settings.`,
    inputSchema: {
      type: "object",
      properties: {
        messageIds: {
          type: "array",
          items: { type: "number" },
          description: "Array of message IDs to archive",
        },
      },
      required: ["messageIds"],
    },
  },
  {
    name: "thunderbird_messages_list_recent",
    description: `List the most recent messages across ALL folders, optionally scoped to one account. Perfect for "show me my latest emails" without specifying a folder. Results are sorted by sortBy (date|subject|author, default: date) in sortOrder direction (asc|desc, default: desc).

Example:
  Input: { accountId: "account1", hoursAgo: 24, limit: 20,
           sortBy: "date", sortOrder: "desc" }
  Output: { messages: [{ id: 42, subject: "Re: Meeting",
           author: "alice@example.com", date: "2026-01-15T10:00:00Z",
           folderId: "imap://user@host/INBOX", read: false }],
           total: 1, hasMore: false, scanComplete: true }

Note: optional accountId comes from thunderbird_accounts_list. hoursAgo capped at 168 (7 days). Internally translated to a date-bounded thunderbird_messages_search. scanComplete: false means the 5000-message scan bound was hit and total is a lower bound.`,
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "Optional: filter by specific account ID",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 20, max: 100)",
          default: 20,
        },
        hoursAgo: {
          type: "number",
          description:
            "How many hours back to search (default: 24, max: 168 = 7 days)",
          default: 24,
        },
        sortBy: {
          type: "string",
          enum: ["date", "subject", "author"],
          description: "Field to sort by. Default: date.",
          default: "date",
        },
        sortOrder: {
          type: "string",
          enum: ["asc", "desc"],
          description:
            "Sort direction. Default: desc (newest/Z-A first).",
          default: "desc",
        },
      },
    },
  },
];
