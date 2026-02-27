/**
 * Calendar Tool Handlers
 * MCP tools for calendar and event operations (Experimental API)
 * @module tools/calendar
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

const calendarsListSchema = z.object({});

const calendarsGetSchema = z.object({
  calendarId: z.string(),
});

const eventsSearchSchema = z.object({
  query: z.string().optional(),
  calendarId: z.string().optional(),
  dateFrom: z.string(),
  dateTo: z.string(),
  limit: z.number().int().positive().max(500).optional().default(100),
});

const eventsListSchema = z.object({
  calendarId: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  limit: z.number().int().positive().max(500).optional().default(100),
});

const eventsGetSchema = z.object({
  eventId: z.string(),
  calendarId: z.string(),
});

const eventsCreateSchema = z.object({
  calendarId: z.string(),
  title: z.string().min(1).max(500),
  start: z.string(),
  end: z.string(),
  location: z.string().max(500).optional(),
  description: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  recurrence: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
      interval: z.number().int().positive().optional(),
      until: z.string().optional(),
      count: z.number().int().positive().optional(),
    })
    .optional(),
});

const eventsUpdateSchema = z.object({
  eventId: z.string(),
  calendarId: z.string(),
  title: z.string().min(1).max(500).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  location: z.string().max(500).optional(),
  description: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  scope: z.enum(["this", "all", "future"]).optional().default("this"),
});

const eventsMoveSchema = z.object({
  eventId: z.string(),
  calendarId: z.string(),
  newStart: z.string(),
  newEnd: z.string(),
});

const eventsDeleteSchema = z.object({
  eventId: z.string(),
  calendarId: z.string(),
  scope: z.enum(["this", "all", "future"]).optional().default("this"),
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List calendars
 */
export async function handleCalendarsList(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    calendarsListSchema.parse(args);
    const client = getNativeClient();

    logger.info("Listing calendars");

    const response = await client.sendRequest(
      MessageActions.CALENDARS_LIST,
      {},
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
    logger.error("Error in handleCalendarsList:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Get calendar details
 */
export async function handleCalendarsGet(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = calendarsGetSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Getting calendar: ${params.calendarId}`);

    const response = await client.sendRequest(
      MessageActions.CALENDARS_GET,
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
    logger.error("Error in handleCalendarsGet:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Search events
 */
export async function handleEventsSearch(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = eventsSearchSchema.parse(args);
    const client = getNativeClient();

    logger.debug(`Searching events: ${params.query || "all"}`);

    const response = await client.sendRequest(
      MessageActions.EVENTS_SEARCH,
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
    logger.error("Error in handleEventsSearch:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * List events in a calendar
 */
export async function handleEventsList(args: unknown): Promise<ToolCallResult> {
  try {
    const params = eventsListSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Listing events in calendar: ${params.calendarId}`);

    const response = await client.sendRequest(
      MessageActions.EVENTS_LIST,
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
    logger.error("Error in handleEventsList:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Get event details
 */
export async function handleEventsGet(args: unknown): Promise<ToolCallResult> {
  try {
    const params = eventsGetSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Getting event: ${params.eventId}`);

    const response = await client.sendRequest(
      MessageActions.EVENTS_GET,
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
    logger.error("Error in handleEventsGet:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Create an event
 */
export async function handleEventsCreate(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = eventsCreateSchema.parse(args);
    const client = getNativeClient();

    logger.debug(`Creating event: ${params.title}`);

    const response = await client.sendRequest(
      MessageActions.EVENTS_CREATE,
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
    logger.error("Error in handleEventsCreate:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Update an event
 */
export async function handleEventsUpdate(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = eventsUpdateSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Updating event: ${params.eventId}`);

    const response = await client.sendRequest(
      MessageActions.EVENTS_UPDATE,
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
    logger.error("Error in handleEventsUpdate:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Move an event (change time)
 */
export async function handleEventsMove(args: unknown): Promise<ToolCallResult> {
  try {
    const params = eventsMoveSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Moving event: ${params.eventId}`);

    const response = await client.sendRequest(
      MessageActions.EVENTS_MOVE,
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
    logger.error("Error in handleEventsMove:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Delete an event
 */
export async function handleEventsDelete(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = eventsDeleteSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Deleting event: ${params.eventId} (scope: ${params.scope})`);

    const response = await client.sendRequest(
      MessageActions.EVENTS_DELETE,
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
    logger.error("Error in handleEventsDelete:", error);
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

export const calendarTools: McpTool[] = [
  {
    name: "thunderbird_calendars_list",
    description: "(EXPERIMENTAL) List all available calendars",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "thunderbird_calendars_get",
    description:
      "(EXPERIMENTAL) Get detailed information about a specific calendar",
    inputSchema: {
      type: "object",
      properties: {
        calendarId: { type: "string", description: "Calendar ID" },
      },
      required: ["calendarId"],
    },
  },
  {
    name: "thunderbird_events_search",
    description:
      "(EXPERIMENTAL) Search for events across calendars within a date range",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (title, location, description)",
        },
        calendarId: {
          type: "string",
          description: "Optional: limit to specific calendar",
        },
        dateFrom: { type: "string", description: "Start date (ISO 8601)" },
        dateTo: { type: "string", description: "End date (ISO 8601)" },
        limit: {
          type: "number",
          description: "Maximum results (default: 100, max: 500)",
          default: 100,
        },
      },
      required: ["dateFrom", "dateTo"],
    },
  },
  {
    name: "thunderbird_events_list",
    description:
      "(EXPERIMENTAL) List events in a specific calendar within a date range",
    inputSchema: {
      type: "object",
      properties: {
        calendarId: { type: "string", description: "Calendar ID" },
        dateFrom: { type: "string", description: "Start date (ISO 8601)" },
        dateTo: { type: "string", description: "End date (ISO 8601)" },
        limit: {
          type: "number",
          description: "Maximum results (default: 100, max: 500)",
          default: 100,
        },
      },
      required: ["calendarId", "dateFrom", "dateTo"],
    },
  },
  {
    name: "thunderbird_events_get",
    description:
      "(EXPERIMENTAL) Get detailed information about a specific event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "Event ID" },
        calendarId: { type: "string", description: "Calendar ID" },
      },
      required: ["eventId", "calendarId"],
    },
  },
  {
    name: "thunderbird_events_create",
    description:
      "(EXPERIMENTAL) Create a new calendar event with optional recurrence",
    inputSchema: {
      type: "object",
      properties: {
        calendarId: {
          type: "string",
          description: "Calendar ID to create event in",
        },
        title: {
          type: "string",
          description: "Event title (1-500 characters)",
        },
        start: { type: "string", description: "Start date/time (ISO 8601)" },
        end: { type: "string", description: "End date/time (ISO 8601)" },
        location: {
          type: "string",
          description: "Event location (optional, max 500 chars)",
        },
        description: {
          type: "string",
          description: "Event description (optional)",
        },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "Attendee email addresses (optional)",
        },
        recurrence: {
          type: "object",
          description: "Recurrence rules (optional)",
          properties: {
            frequency: {
              type: "string",
              enum: ["daily", "weekly", "monthly", "yearly"],
            },
            interval: {
              type: "number",
              description: "Interval between occurrences",
            },
            until: { type: "string", description: "End date (ISO 8601)" },
            count: { type: "number", description: "Number of occurrences" },
          },
          required: ["frequency"],
        },
      },
      required: ["calendarId", "title", "start", "end"],
    },
  },
  {
    name: "thunderbird_events_update",
    description: "(EXPERIMENTAL) Update an existing calendar event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "Event ID to update" },
        calendarId: { type: "string", description: "Calendar ID" },
        title: { type: "string", description: "New title (optional)" },
        start: {
          type: "string",
          description: "New start date/time (ISO 8601) (optional)",
        },
        end: {
          type: "string",
          description: "New end date/time (ISO 8601) (optional)",
        },
        location: { type: "string", description: "New location (optional)" },
        description: {
          type: "string",
          description: "New description (optional)",
        },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "New attendee list (optional)",
        },
        scope: {
          type: "string",
          enum: ["this", "all", "future"],
          description:
            "For recurring events: this (single), all (all occurrences), future (this and future)",
          default: "this",
        },
      },
      required: ["eventId", "calendarId"],
    },
  },
  {
    name: "thunderbird_events_move",
    description: "(EXPERIMENTAL) Move an event to a different time",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "Event ID to move" },
        calendarId: { type: "string", description: "Calendar ID" },
        newStart: {
          type: "string",
          description: "New start date/time (ISO 8601)",
        },
        newEnd: { type: "string", description: "New end date/time (ISO 8601)" },
      },
      required: ["eventId", "calendarId", "newStart", "newEnd"],
    },
  },
  {
    name: "thunderbird_events_delete",
    description: "(EXPERIMENTAL) Delete a calendar event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "Event ID to delete" },
        calendarId: { type: "string", description: "Calendar ID" },
        scope: {
          type: "string",
          enum: ["this", "all", "future"],
          description:
            "For recurring events: this (single), all (all occurrences), future (this and future)",
          default: "this",
        },
      },
      required: ["eventId", "calendarId"],
    },
  },
];
