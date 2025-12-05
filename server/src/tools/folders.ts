/**
 * Folder Tool Handlers
 * MCP tools for folder operations
 * @module tools/folders
 */

import { z } from 'zod';
import { getNativeClient } from '../websocket/client-adapter.js';
import { MessageActions } from '../types/native-messaging.js';
import type { McpTool, ToolCallResult } from '../types/mcp.js';
import logger from '../utils/logger.js';
import { nativeErrorToJsonRpc } from '../utils/errors.js';

// =============================================================================
// Schemas
// =============================================================================

const foldersListSchema = z.object({
  accountId: z.string().optional(),
  includeSubFolders: z.boolean().optional().default(true),
});

const foldersGetSchema = z.object({
  folderId: z.string(),
});

const foldersCreateSchema = z.object({
  parentFolderId: z.string(),
  name: z.string().min(1).max(255),
});

const foldersRenameSchema = z.object({
  folderId: z.string(),
  newName: z.string().min(1).max(255),
});

const foldersDeleteSchema = z.object({
  folderId: z.string(),
});

const foldersMoveSchema = z.object({
  folderId: z.string(),
  destinationFolderId: z.string(),
});

const foldersMarkReadSchema = z.object({
  folderId: z.string(),
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List all folders
 */
export async function handleFoldersList(args: unknown): Promise<ToolCallResult> {
  try {
    const params = foldersListSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Listing folders (accountId: ${params.accountId || 'all'})`);

    const response = await client.sendRequest(MessageActions.FOLDERS_LIST, params);

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: 'text', text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error('Error in handleFoldersList:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Get folder details
 */
export async function handleFoldersGet(args: unknown): Promise<ToolCallResult> {
  try {
    const params = foldersGetSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Getting folder: ${params.folderId}`);

    const response = await client.sendRequest(MessageActions.FOLDERS_GET, params);

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: 'text', text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error('Error in handleFoldersGet:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Create a new folder
 */
export async function handleFoldersCreate(args: unknown): Promise<ToolCallResult> {
  try {
    const params = foldersCreateSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Creating folder: ${params.name} under ${params.parentFolderId}`);

    const response = await client.sendRequest(MessageActions.FOLDERS_CREATE, params);

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: 'text', text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error('Error in handleFoldersCreate:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Rename a folder
 */
export async function handleFoldersRename(args: unknown): Promise<ToolCallResult> {
  try {
    const params = foldersRenameSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Renaming folder: ${params.folderId} to ${params.newName}`);

    const response = await client.sendRequest(MessageActions.FOLDERS_RENAME, params);

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: 'text', text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error('Error in handleFoldersRename:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Delete a folder
 */
export async function handleFoldersDelete(args: unknown): Promise<ToolCallResult> {
  try {
    const params = foldersDeleteSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Deleting folder: ${params.folderId}`);

    const response = await client.sendRequest(MessageActions.FOLDERS_DELETE, params);

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: 'text', text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error('Error in handleFoldersDelete:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Move a folder
 */
export async function handleFoldersMove(args: unknown): Promise<ToolCallResult> {
  try {
    const params = foldersMoveSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Moving folder: ${params.folderId} to ${params.destinationFolderId}`);

    const response = await client.sendRequest(MessageActions.FOLDERS_MOVE, params);

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: 'text', text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error('Error in handleFoldersMove:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Mark all messages in a folder as read
 */
export async function handleFoldersMarkRead(args: unknown): Promise<ToolCallResult> {
  try {
    const params = foldersMarkReadSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Marking all messages as read in folder: ${params.folderId}`);

    const response = await client.sendRequest(MessageActions.FOLDERS_MARK_READ, params);

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: 'text', text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error('Error in handleFoldersMarkRead:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const folderTools: McpTool[] = [
  {
    name: 'thunderbird_folders_list',
    description: 'List all folders in an account or all accounts with hierarchical structure',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Optional: filter by specific account' },
        includeSubFolders: { type: 'boolean', description: 'Include nested subfolders (default: true)', default: true },
      },
    },
  },
  {
    name: 'thunderbird_folders_get',
    description: 'Get detailed information about a specific folder',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID' },
      },
      required: ['folderId'],
    },
  },
  {
    name: 'thunderbird_folders_create',
    description: 'Create a new subfolder under a parent folder',
    inputSchema: {
      type: 'object',
      properties: {
        parentFolderId: { type: 'string', description: 'Parent folder ID' },
        name: { type: 'string', description: 'New folder name (1-255 characters)' },
      },
      required: ['parentFolderId', 'name'],
    },
  },
  {
    name: 'thunderbird_folders_rename',
    description: 'Rename an existing folder',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID to rename' },
        newName: { type: 'string', description: 'New folder name (1-255 characters)' },
      },
      required: ['folderId', 'newName'],
    },
  },
  {
    name: 'thunderbird_folders_delete',
    description: 'Delete a folder and all its contents (use with caution)',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID to delete' },
      },
      required: ['folderId'],
    },
  },
  {
    name: 'thunderbird_folders_move',
    description: 'Move a folder to become a subfolder of another folder',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID to move' },
        destinationFolderId: { type: 'string', description: 'New parent folder ID' },
      },
      required: ['folderId', 'destinationFolderId'],
    },
  },
  {
    name: 'thunderbird_folders_mark_read',
    description: 'Mark all messages in a folder as read',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID' },
      },
      required: ['folderId'],
    },
  },
];
