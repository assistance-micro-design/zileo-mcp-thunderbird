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

// =============================================================================
// Schemas
// =============================================================================

const messageSearchSchema = z.object({
  subject: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  unread: z.boolean().optional(),
  flagged: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  folderId: z.string().optional(),
  accountId: z.string().optional(),
  limit: z.number().int().positive().max(1000).optional().default(50),
});

const messagesListSchema = z.object({
  folderId: z.string(),
  limit: z.number().int().positive().max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

const messagesListUnreadSchema = z.object({
  accountId: z.string().optional(),
  limit: z.number().int().positive().max(1000).optional().default(50),
});

const messagesGetSchema = z.object({
  messageId: z.number().int(),
  format: z.enum(["headers", "full", "raw"]).optional().default("headers"),
});

const messagesMoveSchema = z.object({
  messageIds: z.array(z.number().int()).min(1),
  destinationFolderId: z.string(),
});

const messagesCopySchema = z.object({
  messageIds: z.array(z.number().int()).min(1),
  destinationFolderId: z.string(),
});

const messagesDeleteSchema = z.object({
  messageIds: z.array(z.number().int()).min(1),
  permanent: z.boolean().optional().default(false),
});

const messagesUpdateSchema = z.object({
  messageId: z.number().int(),
  read: z.boolean().optional(),
  flagged: z.boolean().optional(),
  junk: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const messagesArchiveSchema = z.object({
  messageIds: z.array(z.number().int()).min(1),
});

const messagesListRecentSchema = z.object({
  accountId: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  hoursAgo: z.number().int().positive().max(168).optional().default(24), // max 7 days
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * Search messages with advanced filters
 */
export async function handleMessagesSearch(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = messageSearchSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Searching messages with filters: ${JSON.stringify(params)}`);

    const response = await client.sendRequest(
      MessageActions.MESSAGES_SEARCH,
      params,
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
    logger.error("Error in handleMessagesSearch:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * List messages in a folder
 */
export async function handleMessagesList(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = messagesListSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Listing messages in folder: ${params.folderId}`);

    const response = await client.sendRequest(
      MessageActions.MESSAGES_LIST,
      params,
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
    logger.error("Error in handleMessagesList:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * List unread messages
 */
export async function handleMessagesListUnread(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = messagesListUnreadSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Listing unread messages`);

    const response = await client.sendRequest(MessageActions.MESSAGES_SEARCH, {
      unread: true,
      accountId: params.accountId,
      limit: params.limit,
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
    logger.error("Error in handleMessagesListUnread:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Get a specific message
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

/**
 * Move messages to another folder
 */
export async function handleMessagesMove(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = messagesMoveSchema.parse(args);
    const client = getNativeClient();

    logger.info(
      `Moving ${params.messageIds.length} messages to ${params.destinationFolderId}`,
    );

    const response = await client.sendRequest(
      MessageActions.MESSAGES_MOVE,
      params,
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
    logger.error("Error in handleMessagesMove:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Copy messages to another folder
 */
export async function handleMessagesCopy(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = messagesCopySchema.parse(args);
    const client = getNativeClient();

    logger.info(
      `Copying ${params.messageIds.length} messages to ${params.destinationFolderId}`,
    );

    const response = await client.sendRequest(
      MessageActions.MESSAGES_COPY,
      params,
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
    logger.error("Error in handleMessagesCopy:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Delete messages
 */
export async function handleMessagesDelete(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = messagesDeleteSchema.parse(args);
    const client = getNativeClient();

    logger.info(
      `Deleting ${params.messageIds.length} messages (permanent: ${params.permanent})`,
    );

    const response = await client.sendRequest(
      MessageActions.MESSAGES_DELETE,
      params,
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
    logger.error("Error in handleMessagesDelete:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Update message properties
 */
export async function handleMessagesUpdate(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = messagesUpdateSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Updating message: ${params.messageId}`);

    const response = await client.sendRequest(
      MessageActions.MESSAGES_UPDATE,
      params,
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
    logger.error("Error in handleMessagesUpdate:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Archive messages
 */
export async function handleMessagesArchive(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = messagesArchiveSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Archiving ${params.messageIds.length} messages`);

    const response = await client.sendRequest(
      MessageActions.MESSAGES_ARCHIVE,
      params,
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
    logger.error("Error in handleMessagesArchive:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * List recent messages across ALL folders
 * Calculates date range automatically based on hoursAgo parameter
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
    description:
      "Search messages across ALL folders (global search by default). Omit folderId to search everywhere. For recent emails without specific criteria, prefer thunderbird_messages_list_recent.",
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
    description:
      "List messages in a SPECIFIC folder with pagination. Requires folderId. For recent emails across ALL folders, use thunderbird_messages_list_recent instead.",
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
    description:
      "List all unread messages across accounts or for a specific account",
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
    description: "Get a specific message by ID with different detail levels",
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
    description: "Move one or more messages to another folder",
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
    description: "Copy one or more messages to another folder",
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
    description:
      "Delete one or more messages (move to trash or permanent deletion)",
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
    description: "Update message properties (read status, flagged, tags, etc.)",
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
    description: "Archive one or more messages (move to archive folder)",
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
    description:
      'List the most recent messages across ALL folders. Perfect for "show me my latest emails" without specifying a folder. Uses date-based search internally.',
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
