/**
 * Task Tool Handlers
 * MCP tools for task/todo operations (Experimental API)
 * @module tools/tasks
 */

import { z } from 'zod';
import { getNativeClient } from '../native-messaging/client.js';
import { MessageActions } from '../types/native-messaging.js';
import type { McpTool, ToolCallResult } from '../types/mcp.js';
import logger from '../utils/logger.js';
import { nativeErrorToJsonRpc } from '../utils/errors.js';

// =============================================================================
// Schemas
// =============================================================================

const tasksListSchema = z.object({
  calendarId: z.string().optional(),
  completed: z.boolean().optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
  limit: z.number().int().positive().max(500).optional().default(100),
});

const tasksGetSchema = z.object({
  taskId: z.string(),
  calendarId: z.string(),
});

const tasksCreateSchema = z.object({
  calendarId: z.string(),
  title: z.string().min(1).max(500),
  dueDate: z.string().optional(),
  priority: z.number().int().min(0).max(9).optional(),
  description: z.string().optional(),
});

const tasksUpdateSchema = z.object({
  taskId: z.string(),
  calendarId: z.string(),
  title: z.string().min(1).max(500).optional(),
  dueDate: z.string().optional(),
  priority: z.number().int().min(0).max(9).optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
});

const tasksDeleteSchema = z.object({
  taskId: z.string(),
  calendarId: z.string(),
});

const tasksCompleteSchema = z.object({
  taskId: z.string(),
  calendarId: z.string(),
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List tasks
 */
export async function handleTasksList(args: unknown): Promise<ToolCallResult> {
  try {
    const params = tasksListSchema.parse(args);
    const client = getNativeClient();

    logger.info('Listing tasks');

    const response = await client.sendRequest(MessageActions.TASKS_LIST, params);

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
    logger.error('Error in handleTasksList:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Get task details
 */
export async function handleTasksGet(args: unknown): Promise<ToolCallResult> {
  try {
    const params = tasksGetSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Getting task: ${params.taskId}`);

    const response = await client.sendRequest(MessageActions.TASKS_GET, params);

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
    logger.error('Error in handleTasksGet:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Create a task
 */
export async function handleTasksCreate(args: unknown): Promise<ToolCallResult> {
  try {
    const params = tasksCreateSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Creating task: ${params.title}`);

    const response = await client.sendRequest(MessageActions.TASKS_CREATE, params);

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
    logger.error('Error in handleTasksCreate:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Update a task
 */
export async function handleTasksUpdate(args: unknown): Promise<ToolCallResult> {
  try {
    const params = tasksUpdateSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Updating task: ${params.taskId}`);

    const response = await client.sendRequest(MessageActions.TASKS_UPDATE, params);

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
    logger.error('Error in handleTasksUpdate:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Delete a task
 */
export async function handleTasksDelete(args: unknown): Promise<ToolCallResult> {
  try {
    const params = tasksDeleteSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Deleting task: ${params.taskId}`);

    const response = await client.sendRequest(MessageActions.TASKS_DELETE, params);

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
    logger.error('Error in handleTasksDelete:', error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: 'text', text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Mark task as complete
 */
export async function handleTasksComplete(args: unknown): Promise<ToolCallResult> {
  try {
    const params = tasksCompleteSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Completing task: ${params.taskId}`);

    const response = await client.sendRequest(MessageActions.TASKS_COMPLETE, params);

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
    logger.error('Error in handleTasksComplete:', error);
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

export const taskTools: McpTool[] = [
  {
    name: 'thunderbird_tasks_list',
    description: '(EXPERIMENTAL) List tasks with optional filters (calendar, completion status, due dates)',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'Optional: filter by specific calendar' },
        completed: { type: 'boolean', description: 'Optional: filter by completion status' },
        dueBefore: { type: 'string', description: 'Optional: show tasks due before this date (ISO 8601)' },
        dueAfter: { type: 'string', description: 'Optional: show tasks due after this date (ISO 8601)' },
        limit: { type: 'number', description: 'Maximum results (default: 100, max: 500)', default: 100 },
      },
    },
  },
  {
    name: 'thunderbird_tasks_get',
    description: '(EXPERIMENTAL) Get detailed information about a specific task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID' },
        calendarId: { type: 'string', description: 'Calendar ID' },
      },
      required: ['taskId', 'calendarId'],
    },
  },
  {
    name: 'thunderbird_tasks_create',
    description: '(EXPERIMENTAL) Create a new task with optional due date and priority',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: { type: 'string', description: 'Calendar ID to create task in' },
        title: { type: 'string', description: 'Task title (1-500 characters)' },
        dueDate: { type: 'string', description: 'Due date (ISO 8601) (optional)' },
        priority: { type: 'number', description: 'Priority (0=undefined, 1=high, 5=normal, 9=low) (optional)' },
        description: { type: 'string', description: 'Task description (optional)' },
      },
      required: ['calendarId', 'title'],
    },
  },
  {
    name: 'thunderbird_tasks_update',
    description: '(EXPERIMENTAL) Update an existing task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to update' },
        calendarId: { type: 'string', description: 'Calendar ID' },
        title: { type: 'string', description: 'New title (optional)' },
        dueDate: { type: 'string', description: 'New due date (ISO 8601) (optional)' },
        priority: { type: 'number', description: 'New priority (0-9) (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        completed: { type: 'boolean', description: 'Completion status (optional)' },
      },
      required: ['taskId', 'calendarId'],
    },
  },
  {
    name: 'thunderbird_tasks_delete',
    description: '(EXPERIMENTAL) Delete a task permanently',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to delete' },
        calendarId: { type: 'string', description: 'Calendar ID' },
      },
      required: ['taskId', 'calendarId'],
    },
  },
  {
    name: 'thunderbird_tasks_complete',
    description: '(EXPERIMENTAL) Mark a task as completed',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to complete' },
        calendarId: { type: 'string', description: 'Calendar ID' },
      },
      required: ['taskId', 'calendarId'],
    },
  },
];
