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
