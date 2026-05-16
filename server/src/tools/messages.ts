/**
 * Message Tool Handlers
 * MCP tools for email message operations
 * @module tools/messages
 */

import { z } from "zod";
import { getNativeClient } from "../websocket/client-adapter.js";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";
import logger from "../utils/logger.js";
import { nativeErrorToJsonRpc } from "../utils/errors.js";
import { executeToolHandler } from "./tool-handler.js";

// =============================================================================
// Schemas
// =============================================================================

/** Search messages with advanced filters across folders and accounts */
const messageSearchSchema = z.object({
  subject: z.string().max(1000).optional(),
  from: z.string().max(500).optional(),
  to: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
  tags: z.array(z.string()).optional(),
  unread: z.boolean().optional(),
  flagged: z.boolean().optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  folderId: z.string().max(500).optional(),
  accountId: z.string().max(200).optional(),
  limit: z.number().int().positive().max(1000).optional().default(50),
});

/** List messages in a folder with pagination */
const messagesListSchema = z.object({
  folderId: z.string().max(500),
  limit: z.number().int().positive().max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

/** List all unread messages, optionally filtered by account */
const messagesListUnreadSchema = z.object({
  accountId: z.string().max(200).optional(),
  limit: z.number().int().positive().max(1000).optional().default(50),
});

/** Get a specific message by ID with configurable detail level */
const messagesGetSchema = z.object({
  messageId: z.number().int(),
  format: z.enum(["headers", "full", "raw"]).optional().default("headers"),
});

/** Move messages to another folder */
const messagesMoveSchema = z.object({
  messageIds: z.array(z.number().int()).min(1),
  destinationFolderId: z.string().max(500),
});

/** Copy messages to another folder */
const messagesCopySchema = z.object({
  messageIds: z.array(z.number().int()).min(1),
  destinationFolderId: z.string().max(500),
});

/** Delete messages (trash or permanent) */
const messagesDeleteSchema = z.object({
  messageIds: z.array(z.number().int()).min(1),
  permanent: z.boolean().optional().default(false),
});

/** Update message properties (read, flagged, junk, tags) */
const messagesUpdateSchema = z.object({
  messageId: z.number().int(),
  read: z.boolean().optional(),
  flagged: z.boolean().optional(),
  junk: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

/** Archive messages */
const messagesArchiveSchema = z.object({
  messageIds: z.array(z.number().int()).min(1),
});

/** List recent messages globally across all accounts */
const messagesListRecentSchema = z.object({
  accountId: z.string().max(200).optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  hoursAgo: z.number().int().positive().max(168).optional().default(24), // max 7 days
});

// =============================================================================
// Tool Handlers
// =============================================================================

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
      }),
    },
  );
}

/**
 * Get a specific message - custom handler for dynamic action selection
 */
export async function handleMessagesGet(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = messagesGetSchema.parse(args);
    const client = getNativeClient();

    logger.info(
      `Getting message: ${params.messageId} (format: ${params.format})`,
    );

    const action =
      params.format === "raw"
        ? MessageActions.MESSAGES_GET_RAW
        : params.format === "full"
          ? MessageActions.MESSAGES_GET_FULL
          : MessageActions.MESSAGES_GET;

    const response = await client.sendRequest(action, {
      messageId: params.messageId,
    });

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleMessagesGet:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

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
 * List recent messages - custom handler for date range computation
 */
export async function handleMessagesListRecent(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = messagesListRecentSchema.parse(args);
    const client = getNativeClient();

    // Calculate date range
    const now = new Date();
    const dateFrom = new Date(now.getTime() - params.hoursAgo * 60 * 60 * 1000);

    logger.info(`Listing recent messages from last ${params.hoursAgo} hours`);

    // Use MESSAGES_SEARCH with date filter for global search
    const searchParams = {
      dateFrom: dateFrom.toISOString(),
      dateTo: now.toISOString(),
      accountId: params.accountId,
      limit: params.limit,
    };

    const response = await client.sendRequest(
      MessageActions.MESSAGES_SEARCH,
      searchParams,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleMessagesListRecent:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const messageTools: McpTool[] = [
  {
    name: "thunderbird_messages_search",
    description: `Search messages across ALL folders (or scoped to one folder/account) with advanced filters: subject, from/to, body, tags, read/flagged state, date range.

Example:
  Input: { subject: "invoice", from: "billing@", dateFrom: "2026-01-15T00:00:00Z",
           limit: 20 }
  Output: { messages: [{ id: 42, subject: "Invoice #1234",
           author: "billing@example.com", date: "2026-01-15T10:00:00Z",
           folderId: "imap://user@host/INBOX" }] }

Note: optional folderId is obtained from thunderbird_folders_list (full URI, not "INBOX"); accountId from thunderbird_accounts_list. For unscoped "show my latest emails", prefer thunderbird_messages_list_recent.`,
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
        dateFrom: { type: "string", description: "Start date (ISO 8601)" },
        dateTo: { type: "string", description: "End date (ISO 8601)" },
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
      },
    },
  },
  {
    name: "thunderbird_messages_list",
    description: `List messages in one specific folder with pagination. Returns id, subject, author, date, and read status for each message.

Example:
  Input: { folderId: "imap://user@host/INBOX", limit: 10, offset: 0 }
  Output: { messages: [{ id: 42, subject: "Hello",
           author: "alice@example.com", date: "2026-01-15T10:00:00Z",
           read: false }], total: 247 }

Note: folderId is the full URI obtained from thunderbird_folders_list (not the literal "INBOX"). For recent emails across ALL folders, use thunderbird_messages_list_recent.`,
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
      },
      required: ["folderId"],
    },
  },
  {
    name: "thunderbird_messages_list_unread",
    description: `List unread messages across every account (or scoped to one). Implemented internally as a search with unread=true.

Example:
  Input: { accountId: "account1", limit: 50 }
  Output: { messages: [{ id: 42, subject: "Please review",
           author: "alice@example.com", date: "2026-01-15T10:00:00Z",
           folderId: "imap://user@host/INBOX", read: false }] }

Note: optional accountId is obtained from thunderbird_accounts_list. Omit to scan all accounts.`,
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
      },
    },
  },
  {
    name: "thunderbird_messages_get",
    description: `Fetch one message by ID at a chosen detail level: headers (metadata only), full (with MIME parts and body), or raw (RFC 822 source).

Example:
  Input: { messageId: 42, format: "full" }
  Output: { id: 42, subject: "Hello", author: "alice@example.com",
           recipients: ["bob@example.com"], date: "2026-01-15T10:00:00Z",
           body: "Hi Bob, ...", attachments: [...] }

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
    description: `List the most recent messages across ALL folders, optionally scoped to one account. Perfect for "show me my latest emails" without specifying a folder.

Example:
  Input: { accountId: "account1", hoursAgo: 24, limit: 20 }
  Output: { messages: [{ id: 42, subject: "Re: Meeting",
           author: "alice@example.com", date: "2026-01-15T10:00:00Z",
           folderId: "imap://user@host/INBOX", read: false }] }

Note: optional accountId comes from thunderbird_accounts_list. hoursAgo capped at 168 (7 days). Internally translated to a date-bounded thunderbird_messages_search.`,
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
      },
    },
  },
];
