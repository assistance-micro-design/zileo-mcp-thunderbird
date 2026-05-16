/**
 * Folder Tool Handlers
 * MCP tools for folder operations
 * @module tools/folders
 */

import { z } from "zod";
import { executeToolHandler } from "./tool-handler.js";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";

// =============================================================================
// Schemas
// =============================================================================

/** List all folders, optionally filtered by account */
const foldersListSchema = z.object({
  accountId: z.string().max(200).optional(),
  includeSubFolders: z.boolean().optional().default(true),
});

/** Get folder details by ID */
const foldersGetSchema = z.object({
  folderId: z.string().max(500),
});

/** Create a new subfolder under a parent folder */
const foldersCreateSchema = z.object({
  parentFolderId: z.string().max(500),
  name: z.string().min(1).max(255),
});

/** Rename an existing folder */
const foldersRenameSchema = z.object({
  folderId: z.string().max(500),
  newName: z.string().min(1).max(255),
});

/** Delete a folder */
const foldersDeleteSchema = z.object({
  folderId: z.string().max(500),
});

/** Move a folder to a new destination */
const foldersMoveSchema = z.object({
  folderId: z.string().max(500),
  destinationFolderId: z.string().max(500),
});

/** Mark all messages in a folder as read */
const foldersMarkReadSchema = z.object({
  folderId: z.string().max(500),
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List all folders
 */
export async function handleFoldersList(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(args, foldersListSchema, MessageActions.FOLDERS_LIST, "handleFoldersList");
}

/**
 * Get folder details
 */
export async function handleFoldersGet(args: unknown): Promise<ToolCallResult> {
  return executeToolHandler(args, foldersGetSchema, MessageActions.FOLDERS_GET, "handleFoldersGet");
}

/**
 * Create a new folder
 */
export async function handleFoldersCreate(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(args, foldersCreateSchema, MessageActions.FOLDERS_CREATE, "handleFoldersCreate");
}

/**
 * Rename a folder
 */
export async function handleFoldersRename(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(args, foldersRenameSchema, MessageActions.FOLDERS_RENAME, "handleFoldersRename");
}

/**
 * Delete a folder
 */
export async function handleFoldersDelete(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(args, foldersDeleteSchema, MessageActions.FOLDERS_DELETE, "handleFoldersDelete");
}

/**
 * Move a folder
 */
export async function handleFoldersMove(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(args, foldersMoveSchema, MessageActions.FOLDERS_MOVE, "handleFoldersMove");
}

/**
 * Mark all messages in a folder as read
 */
export async function handleFoldersMarkRead(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(args, foldersMarkReadSchema, MessageActions.FOLDERS_MARK_READ, "handleFoldersMarkRead");
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const folderTools: McpTool[] = [
  {
    name: "thunderbird_folders_list",
    description:
      "List all folders in an account or all accounts with hierarchical structure",
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "Optional: filter by specific account",
        },
        includeSubFolders: {
          type: "boolean",
          description: "Include nested subfolders (default: true)",
          default: true,
        },
      },
    },
  },
  {
    name: "thunderbird_folders_get",
    description: "Get detailed information about a specific folder",
    inputSchema: {
      type: "object",
      properties: {
        folderId: { type: "string", description: "Folder ID" },
      },
      required: ["folderId"],
    },
  },
  {
    name: "thunderbird_folders_create",
    description: "Create a new subfolder under a parent folder",
    inputSchema: {
      type: "object",
      properties: {
        parentFolderId: { type: "string", description: "Parent folder ID" },
        name: {
          type: "string",
          description: "New folder name (1-255 characters)",
        },
      },
      required: ["parentFolderId", "name"],
    },
  },
  {
    name: "thunderbird_folders_rename",
    description: "Rename an existing folder",
    inputSchema: {
      type: "object",
      properties: {
        folderId: { type: "string", description: "Folder ID to rename" },
        newName: {
          type: "string",
          description: "New folder name (1-255 characters)",
        },
      },
      required: ["folderId", "newName"],
    },
  },
  {
    name: "thunderbird_folders_delete",
    description: "Delete a folder and all its contents (use with caution)",
    inputSchema: {
      type: "object",
      properties: {
        folderId: { type: "string", description: "Folder ID to delete" },
      },
      required: ["folderId"],
    },
  },
  {
    name: "thunderbird_folders_move",
    description: "Move a folder to become a subfolder of another folder",
    inputSchema: {
      type: "object",
      properties: {
        folderId: { type: "string", description: "Folder ID to move" },
        destinationFolderId: {
          type: "string",
          description: "New parent folder ID",
        },
      },
      required: ["folderId", "destinationFolderId"],
    },
  },
  {
    name: "thunderbird_folders_mark_read",
    description: "Mark all messages in a folder as read",
    inputSchema: {
      type: "object",
      properties: {
        folderId: { type: "string", description: "Folder ID" },
      },
      required: ["folderId"],
    },
  },
];
