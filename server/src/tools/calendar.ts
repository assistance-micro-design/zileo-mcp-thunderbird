/**
 * Calendar Tool Handlers
 * MCP tools for calendar and event operations (Experimental API)
 * @module tools/calendar
 */

import { z } from "zod";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";
import { executeToolHandler } from "./tool-handler.js";

// =============================================================================
// Schemas
// =============================================================================

const calendarsListSchema = z.object({});

const calendarsGetSchema = z.object({
  calendarId: z.string().max(200),
});

const eventsSearchSchema = z.object({
  query: z.string().optional(),
  calendarId: z.string().max(200).optional(),
  dateFrom: z.string().datetime({ offset: true }),
  dateTo: z.string().datetime({ offset: true }),
  limit: z.number().int().positive().max(500).optional().default(100),
});

const eventsListSchema = z.object({
  calendarId: z.string().max(200),
  dateFrom: z.string().datetime({ offset: true }),
  dateTo: z.string().datetime({ offset: true }),
  limit: z.number().int().positive().max(500).optional().default(100),
});

const eventsGetSchema = z.object({
  eventId: z.string().max(200),
  calendarId: z.string().max(200),
});

const eventsCreateSchema = z.object({
  calendarId: z.string().max(200),
  title: z.string().min(1).max(500),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  location: z.string().max(500).optional(),
  description: z.string().max(10000).optional(),
  attendees: z.array(z.string().email()).max(200).optional(),
  recurrence: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
      interval: z.number().int().positive().optional(),
      until: z.string().datetime({ offset: true }).optional(),
      count: z.number().int().positive().optional(),
    })
    .optional(),
});

const eventsUpdateSchema = z.object({
  eventId: z.string().max(200),
  calendarId: z.string().max(200),
  title: z.string().min(1).max(500).optional(),
  start: z.string().datetime({ offset: true }).optional(),
  end: z.string().datetime({ offset: true }).optional(),
  location: z.string().max(500).optional(),
  description: z.string().max(10000).optional(),
  attendees: z.array(z.string().email()).max(200).optional(),
  scope: z.enum(["this", "all", "future"]).optional().default("this"),
});

const eventsMoveSchema = z.object({
  eventId: z.string().max(200),
  calendarId: z.string().max(200),
  newStart: z.string().datetime({ offset: true }),
  newEnd: z.string().datetime({ offset: true }),
});

const eventsDeleteSchema = z.object({
  eventId: z.string().max(200),
  calendarId: z.string().max(200),
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
  return executeToolHandler(
    args,
    calendarsListSchema,
    MessageActions.CALENDARS_LIST,
    "handleCalendarsList",
  );
}

/**
 * Get calendar details
 */
export async function handleCalendarsGet(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    calendarsGetSchema,
    MessageActions.CALENDARS_GET,
    "handleCalendarsGet",
  );
}

/**
 * Search events
 */
export async function handleEventsSearch(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    eventsSearchSchema,
    MessageActions.EVENTS_SEARCH,
    "handleEventsSearch",
  );
}

/**
 * List events in a calendar
 */
export async function handleEventsList(args: unknown): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    eventsListSchema,
    MessageActions.EVENTS_LIST,
    "handleEventsList",
  );
}

/**
 * Get event details
 */
export async function handleEventsGet(args: unknown): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    eventsGetSchema,
    MessageActions.EVENTS_GET,
    "handleEventsGet",
  );
}

/**
 * Create an event
 */
export async function handleEventsCreate(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    eventsCreateSchema,
    MessageActions.EVENTS_CREATE,
    "handleEventsCreate",
  );
}

/**
 * Update an event
 */
export async function handleEventsUpdate(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    eventsUpdateSchema,
    MessageActions.EVENTS_UPDATE,
    "handleEventsUpdate",
  );
}

/**
 * Move an event (change time)
 */
export async function handleEventsMove(args: unknown): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    eventsMoveSchema,
    MessageActions.EVENTS_MOVE,
    "handleEventsMove",
  );
}

/**
 * Delete an event
 */
export async function handleEventsDelete(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    eventsDeleteSchema,
    MessageActions.EVENTS_DELETE,
    "handleEventsDelete",
  );
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const calendarTools: McpTool[] = [
  {
    name: "thunderbird_calendars_list",
    description: `(EXPERIMENTAL) List every calendar Thunderbird/Lightning knows about (local, CalDAV, ICS subscriptions). Entry point for calendarId discovery.

Example:
  Input: {}
  Output: { calendars: [{ id: "cal1", name: "Personal", type: "storage",
           color: "#3498DB", readOnly: false }] }

Note: experimental — requires the Calendar experiments API in the extension.`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "thunderbird_calendars_get",
    description: `(EXPERIMENTAL) Fetch one calendar's metadata: name, type, color, sync state, read-only flag.

Example:
  Input: { calendarId: "cal1" }
  Output: { id: "cal1", name: "Personal", type: "storage",
           color: "#3498DB", readOnly: false }

Note: calendarId is obtained from thunderbird_calendars_list. Experimental API.`,
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
    description: `(EXPERIMENTAL) Search events across one or every calendar within a required date range. Free-text query matches title, location, description.

Example:
  Input: { query: "meeting", dateFrom: "2026-01-01T00:00:00Z",
           dateTo: "2026-01-31T23:59:59Z", limit: 50 }
  Output: { events: [{ id: "evt1", calendarId: "cal1", title: "Team meeting",
           start: "2026-01-15T10:00:00Z", end: "2026-01-15T11:00:00Z" }] }

Note: optional calendarId comes from thunderbird_calendars_list. Dates must be ISO 8601 with offset. Experimental API.`,
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
    description: `(EXPERIMENTAL) List events in one calendar between two dates. Use this when you already know which calendar to query.

Example:
  Input: { calendarId: "cal1", dateFrom: "2026-01-01T00:00:00Z",
           dateTo: "2026-01-31T23:59:59Z", limit: 100 }
  Output: { events: [{ id: "evt1", title: "Team meeting",
           start: "2026-01-15T10:00:00Z", end: "2026-01-15T11:00:00Z",
           location: "Office" }] }

Note: calendarId comes from thunderbird_calendars_list. Dates ISO 8601 with offset. Experimental API.`,
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
    description: `(EXPERIMENTAL) Fetch one event with full details: title, description, attendees, recurrence rule, organizer, alarms.

Example:
  Input: { eventId: "evt1", calendarId: "cal1" }
  Output: { id: "evt1", title: "Team meeting", description: "Weekly sync",
           start: "2026-01-15T10:00:00Z", end: "2026-01-15T11:00:00Z",
           attendees: ["alice@example.com"], location: "Office" }

Note: eventId comes from thunderbird_events_list or thunderbird_events_search. calendarId from thunderbird_calendars_list. Experimental API.`,
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
    description: `(EXPERIMENTAL) Create a new event in one calendar with title, ISO 8601 start/end, optional location, description, attendees, and a recurrence rule.

Example:
  Input: { calendarId: "cal1", title: "Team meeting",
           start: "2026-01-15T10:00:00Z", end: "2026-01-15T11:00:00Z",
           location: "Office", attendees: ["alice@example.com"] }
  Output: { id: "evt-new", success: true }

Note: calendarId comes from thunderbird_calendars_list. All dates ISO 8601 with offset. Experimental API.`,
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
    description: `(EXPERIMENTAL) Update fields of an existing event. For recurring events the scope chooses between updating this occurrence, all occurrences, or this and future.

Example:
  Input: { eventId: "evt1", calendarId: "cal1", location: "Room 42",
           scope: "this" }
  Output: { id: "evt1", success: true }

Note: eventId comes from thunderbird_events_list or thunderbird_events_search. calendarId from thunderbird_calendars_list. Experimental API.`,
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
    description: `(EXPERIMENTAL) Reschedule an event to a new start/end time without touching other fields.

Example:
  Input: { eventId: "evt1", calendarId: "cal1",
           newStart: "2026-01-16T10:00:00Z", newEnd: "2026-01-16T11:00:00Z" }
  Output: { id: "evt1", success: true }

Note: eventId comes from thunderbird_events_list or thunderbird_events_search. calendarId from thunderbird_calendars_list. Experimental API.`,
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
    description: `(EXPERIMENTAL) Delete an event. For recurring events the scope chooses between this occurrence, all occurrences, or this and future. Destructive: no undo.

Example:
  Input: { eventId: "evt1", calendarId: "cal1", scope: "this" }
  Output: { success: true }

Note: eventId comes from thunderbird_events_list or thunderbird_events_search. calendarId from thunderbird_calendars_list. No undo. Experimental API.`,
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
