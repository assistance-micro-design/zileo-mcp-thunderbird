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
    description: `List Thunderbird folders across one or all accounts, returning the full URI used by every other folder/message tool. Entry point for folderId discovery.

Example:
  Input: { accountId: "account1", includeSubFolders: true }
  Output: { folders: [{ id: "imap://user@host/INBOX", name: "Inbox",
           type: "inbox", unreadCount: 3, totalCount: 247, subFolders: [...] }] }`,
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
    description: `Get one folder's metadata: name, type (inbox/sent/...), unread count, total count, parent and sub-folders.

Example:
  Input: { folderId: "imap://user@host/INBOX" }
  Output: { id: "imap://user@host/INBOX", name: "Inbox", type: "inbox",
           unreadCount: 3, totalCount: 247 }

Note: folderId is the full URI obtained from thunderbird_folders_list (not the literal "INBOX").`,
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
    description: `Create a new sub-folder under an existing parent folder.

Example:
  Input: { parentFolderId: "imap://user@host/", name: "Archive 2026" }
  Output: { id: "imap://user@host/Archive%202026", name: "Archive 2026",
           success: true }

Note: parentFolderId is the full URI obtained from thunderbird_folders_list.`,
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
    description: `Rename an existing folder. The folder URI changes after rename, so callers must refresh their folderId references.

Example:
  Input: { folderId: "imap://user@host/Archive", newName: "Archive-2026" }
  Output: { id: "imap://user@host/Archive-2026", success: true }

Note: folderId is the full URI obtained from thunderbird_folders_list. System folders (Inbox/Sent/Trash) cannot be renamed.`,
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
    description: `Delete a folder and all messages it contains. Destructive: contents are moved to Trash (or permanently lost for IMAP servers without trash).

Example:
  Input: { folderId: "imap://user@host/Old%20Project" }
  Output: { success: true }

Note: folderId is the full URI obtained from thunderbird_folders_list. System folders cannot be deleted. No undo.`,
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
    description: `Move a folder so that it becomes a sub-folder of another folder. The folder URI changes after move.

Example:
  Input: { folderId: "imap://user@host/Project",
           destinationFolderId: "imap://user@host/Archive" }
  Output: { id: "imap://user@host/Archive/Project", success: true }

Note: both folderId and destinationFolderId are full URIs obtained from thunderbird_folders_list.`,
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
    description: `Mark every unread message in a folder as read in a single operation. Useful for bulk inbox cleanup.

Example:
  Input: { folderId: "imap://user@host/Newsletters" }
  Output: { markedCount: 42, success: true }

Note: folderId is the full URI obtained from thunderbird_folders_list.`,
    inputSchema: {
      type: "object",
      properties: {
        folderId: { type: "string", description: "Folder ID" },
      },
      required: ["folderId"],
    },
  },
];
