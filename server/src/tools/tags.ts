/**
 * Tag Tool Handlers
 * MCP tools for email tag/label operations
 * @module tools/tags
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

const tagsListSchema = z.object({});

const tagsCreateSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z0-9_]+$/i,
      "Key must contain only letters, numbers, and underscores",
    ),
  tag: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be in hex format (#RRGGBB)"),
});

const tagsUpdateSchema = z
  .object({
    key: z.string().max(50),
    tag: z.string().min(1).max(100).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be in hex format (#RRGGBB)")
      .optional(),
  })
  .refine((data) => data.tag || data.color, {
    message: "At least one of tag or color must be provided",
  });

const tagsDeleteSchema = z.object({
  key: z.string().max(50),
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List all tags
 */
export async function handleTagsList(args: unknown): Promise<ToolCallResult> {
  try {
    tagsListSchema.parse(args);
    const client = getNativeClient();

    logger.info("Listing tags");

    const response = await client.sendRequest(MessageActions.TAGS_LIST, {});

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
    logger.error("Error in handleTagsList:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Create a new tag
 */
export async function handleTagsCreate(args: unknown): Promise<ToolCallResult> {
  try {
    const params = tagsCreateSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Creating tag: ${params.tag} (${params.key})`);

    const response = await client.sendRequest(
      MessageActions.TAGS_CREATE,
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
    logger.error("Error in handleTagsCreate:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Update an existing tag
 */
export async function handleTagsUpdate(args: unknown): Promise<ToolCallResult> {
  try {
    const params = tagsUpdateSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Updating tag: ${params.key}`);

    const response = await client.sendRequest(
      MessageActions.TAGS_UPDATE,
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
    logger.error("Error in handleTagsUpdate:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Delete a tag
 */
export async function handleTagsDelete(args: unknown): Promise<ToolCallResult> {
  try {
    const params = tagsDeleteSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Deleting tag: ${params.key}`);

    const response = await client.sendRequest(
      MessageActions.TAGS_DELETE,
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
    logger.error("Error in handleTagsDelete:", error);
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

export const tagTools: McpTool[] = [
  {
    name: "thunderbird_tags_list",
    description: "List all available message tags/labels",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "thunderbird_tags_create",
    description:
      "Create a new message tag with a specific key, name, and color",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Unique tag identifier (letters, numbers, underscores only, max 50 chars)",
        },
        tag: {
          type: "string",
          description: "Display name for the tag (max 100 chars)",
        },
        color: {
          type: "string",
          description: "Tag color in hex format (#RRGGBB)",
        },
      },
      required: ["key", "tag", "color"],
    },
  },
  {
    name: "thunderbird_tags_update",
    description: "Update an existing tag's display name or color",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Tag key to update",
        },
        tag: {
          type: "string",
          description: "New display name (optional)",
        },
        color: {
          type: "string",
          description: "New color in hex format (#RRGGBB) (optional)",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "thunderbird_tags_delete",
    description: "Delete a tag (removes it from all messages)",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Tag key to delete",
        },
      },
      required: ["key"],
    },
  },
];
