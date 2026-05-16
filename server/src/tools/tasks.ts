/**
 * Task Tool Handlers
 * MCP tools for task/todo operations (Experimental API)
 * @module tools/tasks
 */

import { z } from "zod";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";
import { executeToolHandler } from "./tool-handler.js";

// =============================================================================
// Schemas
// =============================================================================

const tasksListSchema = z.object({
  calendarId: z.string().max(200).optional(),
  completed: z.boolean().optional(),
  dueBefore: z.string().datetime({ offset: true }).optional(),
  dueAfter: z.string().datetime({ offset: true }).optional(),
  limit: z.number().int().positive().max(500).optional().default(100),
});

const tasksGetSchema = z.object({
  taskId: z.string().max(200),
  calendarId: z.string().max(200),
});

const tasksCreateSchema = z.object({
  calendarId: z.string().max(200),
  title: z.string().min(1).max(500),
  dueDate: z.string().datetime({ offset: true }).optional(),
  priority: z.number().int().min(0).max(9).optional(),
  description: z.string().max(10000).optional(),
});

const tasksUpdateSchema = z.object({
  taskId: z.string().max(200),
  calendarId: z.string().max(200),
  title: z.string().min(1).max(500).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  priority: z.number().int().min(0).max(9).optional(),
  description: z.string().max(10000).optional(),
  completed: z.boolean().optional(),
});

const tasksDeleteSchema = z.object({
  taskId: z.string().max(200),
  calendarId: z.string().max(200),
});

const tasksCompleteSchema = z.object({
  taskId: z.string().max(200),
  calendarId: z.string().max(200),
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List tasks
 */
export async function handleTasksList(args: unknown): Promise<ToolCallResult> {
  return executeToolHandler(args, tasksListSchema, MessageActions.TASKS_LIST, "handleTasksList");
}

/**
 * Get task details
 */
export async function handleTasksGet(args: unknown): Promise<ToolCallResult> {
  return executeToolHandler(args, tasksGetSchema, MessageActions.TASKS_GET, "handleTasksGet");
}

/**
 * Create a task
 */
export async function handleTasksCreate(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(args, tasksCreateSchema, MessageActions.TASKS_CREATE, "handleTasksCreate");
}

/**
 * Update a task
 */
export async function handleTasksUpdate(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(args, tasksUpdateSchema, MessageActions.TASKS_UPDATE, "handleTasksUpdate");
}

/**
 * Delete a task
 */
export async function handleTasksDelete(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(args, tasksDeleteSchema, MessageActions.TASKS_DELETE, "handleTasksDelete");
}

/**
 * Mark task as complete
 */
export async function handleTasksComplete(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(args, tasksCompleteSchema, MessageActions.TASKS_COMPLETE, "handleTasksComplete");
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const taskTools: McpTool[] = [
  {
    name: "thunderbird_tasks_list",
    description: `(EXPERIMENTAL) List tasks (VTODO) across one or every calendar with optional filters: completion status and due-date range.

Example:
  Input: { calendarId: "cal1", completed: false,
           dueBefore: "2026-01-31T23:59:59Z", limit: 100 }
  Output: { tasks: [{ id: "task1", title: "Finish report",
           dueDate: "2026-01-20T17:00:00Z", priority: 1, completed: false }] }

Note: optional calendarId comes from thunderbird_calendars_list. Experimental API.`,
    inputSchema: {
      type: "object",
      properties: {
        calendarId: {
          type: "string",
          description: "Optional: filter by specific calendar",
        },
        completed: {
          type: "boolean",
          description: "Optional: filter by completion status",
        },
        dueBefore: {
          type: "string",
          description: "Optional: show tasks due before this date (ISO 8601)",
        },
        dueAfter: {
          type: "string",
          description: "Optional: show tasks due after this date (ISO 8601)",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 100, max: 500)",
          default: 100,
        },
      },
    },
  },
  {
    name: "thunderbird_tasks_get",
    description: `(EXPERIMENTAL) Fetch one task with title, due date, priority (0=undefined, 1=high, 5=normal, 9=low), description, completion state.

Example:
  Input: { taskId: "task1", calendarId: "cal1" }
  Output: { id: "task1", title: "Finish report",
           dueDate: "2026-01-20T17:00:00Z", priority: 1,
           description: "Q4 sales report", completed: false }

Note: taskId comes from thunderbird_tasks_list. calendarId from thunderbird_calendars_list. Experimental API.`,
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task ID" },
        calendarId: { type: "string", description: "Calendar ID" },
      },
      required: ["taskId", "calendarId"],
    },
  },
  {
    name: "thunderbird_tasks_create",
    description: `(EXPERIMENTAL) Create a new task in a calendar with title, optional due date, priority (0-9), and description.

Example:
  Input: { calendarId: "cal1", title: "Finish report",
           dueDate: "2026-01-20T17:00:00Z", priority: 1,
           description: "Q4 sales report" }
  Output: { id: "task-new", success: true }

Note: calendarId comes from thunderbird_calendars_list. dueDate ISO 8601 with offset. Experimental API.`,
    inputSchema: {
      type: "object",
      properties: {
        calendarId: {
          type: "string",
          description: "Calendar ID to create task in",
        },
        title: { type: "string", description: "Task title (1-500 characters)" },
        dueDate: {
          type: "string",
          description: "Due date (ISO 8601) (optional)",
        },
        priority: {
          type: "number",
          description:
            "Priority (0=undefined, 1=high, 5=normal, 9=low) (optional)",
        },
        description: {
          type: "string",
          description: "Task description (optional)",
        },
      },
      required: ["calendarId", "title"],
    },
  },
  {
    name: "thunderbird_tasks_update",
    description: `(EXPERIMENTAL) Update one or more fields of an existing task: title, due date, priority, description, completed.

Example:
  Input: { taskId: "task1", calendarId: "cal1",
           dueDate: "2026-01-22T17:00:00Z", priority: 5 }
  Output: { id: "task1", success: true }

Note: taskId comes from thunderbird_tasks_list. calendarId from thunderbird_calendars_list. Experimental API.`,
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task ID to update" },
        calendarId: { type: "string", description: "Calendar ID" },
        title: { type: "string", description: "New title (optional)" },
        dueDate: {
          type: "string",
          description: "New due date (ISO 8601) (optional)",
        },
        priority: {
          type: "number",
          description: "New priority (0-9) (optional)",
        },
        description: {
          type: "string",
          description: "New description (optional)",
        },
        completed: {
          type: "boolean",
          description: "Completion status (optional)",
        },
      },
      required: ["taskId", "calendarId"],
    },
  },
  {
    name: "thunderbird_tasks_delete",
    description: `(EXPERIMENTAL) Delete a task permanently. Destructive: no undo, no trash.

Example:
  Input: { taskId: "task1", calendarId: "cal1" }
  Output: { success: true }

Note: taskId comes from thunderbird_tasks_list. calendarId from thunderbird_calendars_list. No undo. Experimental API.`,
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task ID to delete" },
        calendarId: { type: "string", description: "Calendar ID" },
      },
      required: ["taskId", "calendarId"],
    },
  },
  {
    name: "thunderbird_tasks_complete",
    description: `(EXPERIMENTAL) Mark a task as completed. Shorthand for tasks_update with completed=true and PERCENT-COMPLETE=100.

Example:
  Input: { taskId: "task1", calendarId: "cal1" }
  Output: { id: "task1", completed: true, success: true }

Note: taskId comes from thunderbird_tasks_list. calendarId from thunderbird_calendars_list. To re-open a task use thunderbird_tasks_update with completed=false. Experimental API.`,
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task ID to complete" },
        calendarId: { type: "string", description: "Calendar ID" },
      },
      required: ["taskId", "calendarId"],
    },
  },
];
