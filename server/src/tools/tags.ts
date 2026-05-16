/**
 * Tag Tool Handlers
 * MCP tools for email tag/label operations
 * @module tools/tags
 */

import { z } from "zod";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";
import { executeToolHandler } from "./tool-handler.js";

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

export async function handleTagsList(args: unknown): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    tagsListSchema,
    MessageActions.TAGS_LIST,
    "handleTagsList",
  );
}

export async function handleTagsCreate(args: unknown): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    tagsCreateSchema,
    MessageActions.TAGS_CREATE,
    "handleTagsCreate",
  );
}

export async function handleTagsUpdate(args: unknown): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    tagsUpdateSchema,
    MessageActions.TAGS_UPDATE,
    "handleTagsUpdate",
  );
}

export async function handleTagsDelete(args: unknown): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    tagsDeleteSchema,
    MessageActions.TAGS_DELETE,
    "handleTagsDelete",
  );
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const tagTools: McpTool[] = [
  {
    name: "thunderbird_tags_list",
    description: `List every message tag/label defined in Thunderbird with its key, display name and color. Entry point for tag key discovery.

Example:
  Input: {}
  Output: { tags: [{ key: "important", tag: "Important", color: "#FF5733" },
           { key: "later", tag: "Later", color: "#3498DB" }] }`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "thunderbird_tags_create",
    description: `Create a new message tag with a user-chosen key, display name and hex color.

Example:
  Input: { key: "urgent", tag: "Urgent", color: "#FF0000" }
  Output: { key: "urgent", success: true }

Note: key is user-defined and must be unique. The created tag will appear in thunderbird_tags_list output.`,
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
    description: `Update the display name and/or color of an existing tag. The key itself is immutable. At least one of tag or color must be supplied.

Example:
  Input: { key: "urgent", color: "#CC0000" }
  Output: { key: "urgent", success: true }

Note: key is obtained from thunderbird_tags_list.`,
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
    description: `Delete a tag and remove it from every message it was applied to. Destructive: no undo.

Example:
  Input: { key: "urgent" }
  Output: { success: true, removedFromMessages: 17 }

Note: key is obtained from thunderbird_tags_list. No undo.`,
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
