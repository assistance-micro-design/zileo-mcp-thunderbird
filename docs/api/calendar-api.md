# Calendar API Documentation

This document describes all MCP tools for calendar and event operations in the Thunderbird MCP Server.

**EXPERIMENTAL**: This API uses the experimental `browser.calendar` WebExtension API (webext-experiments) and may change in future Thunderbird versions.

## Overview

The Calendar API provides comprehensive calendar management including events, tasks, and calendar operations. This module enables LLMs to create, read, update, and delete calendar entries and manage multiple calendars.

**Permission Required**: Experimental calendar API

---

## Calendar Operations

### thunderbird_calendars_list

List all calendars configured in Thunderbird.

#### Description

Retrieves all calendars including local, network (CalDAV), and other calendar sources.

#### Parameters

None

#### Response Format

```json
[
  {
    "id": "calendar-1",
    "name": "Personal Calendar",
    "type": "storage",
    "color": "#3366CC",
    "readOnly": false,
    "enabled": true
  },
  {
    "id": "calendar-2",
    "name": "Work Calendar (CalDAV)",
    "type": "caldav",
    "color": "#FF6600",
    "readOnly": false,
    "enabled": true
  }
]
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-030",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_calendars_list",
    "arguments": {}
  }
}
```

---

### thunderbird_calendars_get

Get detailed information about a specific calendar.

#### Description

Retrieves complete metadata for a calendar.

#### Parameters

| Name         | Type   | Required | Description                       |
| ------------ | ------ | -------- | --------------------------------- |
| `calendarId` | string | Yes      | Unique identifier of the calendar |

#### Response Format

```json
{
  "id": "calendar-1",
  "name": "Personal Calendar",
  "type": "storage",
  "color": "#3366CC",
  "readOnly": false,
  "enabled": true
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-031",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_calendars_get",
    "arguments": {
      "calendarId": "calendar-1"
    }
  }
}
```

---

## Event Operations

### thunderbird_events_search

Search for events across calendars using various criteria.

#### Description

Performs event search with support for text query, date ranges, and calendar filtering.

#### Parameters

| Name         | Type   | Required | Default | Description                                                   |
| ------------ | ------ | -------- | ------- | ------------------------------------------------------------- |
| `query`      | string | No       | -       | Search term to match in event title, description, or location |
| `calendarId` | string | No       | -       | Specific calendar to search within (omit for all calendars)   |
| `dateFrom`   | string | Yes      | -       | Start of date range (ISO 8601 format)                         |
| `dateTo`     | string | Yes      | -       | End of date range (ISO 8601 format)                           |
| `limit`      | number | No       | 100     | Maximum number of results (1-500)                             |

#### Response Format

```json
[
  {
    "id": "event-123",
    "calendarId": "calendar-1",
    "type": "event",
    "title": "Team Meeting",
    "start": "2025-03-20T14:00:00Z",
    "end": "2025-03-20T15:00:00Z",
    "description": "Weekly team sync",
    "location": "Conference Room A",
    "attendees": ["marie.martin@example.com", "pierre.durand@example.com"]
  }
]
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-032",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_events_search",
    "arguments": {
      "query": "meeting",
      "dateFrom": "2025-03-01T00:00:00Z",
      "dateTo": "2025-03-31T23:59:59Z",
      "limit": 50
    }
  }
}
```

---

### thunderbird_events_list

List events from a specific calendar within a date range.

#### Description

Retrieves all events in a calendar for a specified time period.

#### Parameters

| Name         | Type   | Required | Default | Description                            |
| ------------ | ------ | -------- | ------- | -------------------------------------- |
| `calendarId` | string | Yes      | -       | ID of the calendar to list events from |
| `dateFrom`   | string | Yes      | -       | Start of date range (ISO 8601 format)  |
| `dateTo`     | string | Yes      | -       | End of date range (ISO 8601 format)    |
| `limit`      | number | No       | 100     | Maximum number of events (1-500)       |

#### Response Format

Same as `thunderbird_events_search` response format.

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-033",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_events_list",
    "arguments": {
      "calendarId": "calendar-1",
      "dateFrom": "2025-03-01T00:00:00Z",
      "dateTo": "2025-03-07T23:59:59Z"
    }
  }
}
```

---

### thunderbird_events_get

Get detailed information about a specific event.

#### Description

Retrieves complete event details including all properties and attendees.

#### Parameters

| Name         | Type   | Required | Description                             |
| ------------ | ------ | -------- | --------------------------------------- |
| `eventId`    | string | Yes      | Unique identifier of the event          |
| `calendarId` | string | Yes      | ID of the calendar containing the event |

#### Response Format

```json
{
  "id": "event-123",
  "calendarId": "calendar-1",
  "type": "event",
  "title": "Quarterly Review Meeting",
  "start": "2025-03-25T09:00:00Z",
  "end": "2025-03-25T11:00:00Z",
  "description": "Q1 2025 performance review and planning session",
  "location": "Main Conference Room",
  "attendees": ["jean.dupont@example.com", "marie.martin@example.com"]
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-034",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_events_get",
    "arguments": {
      "eventId": "event-123",
      "calendarId": "calendar-1"
    }
  }
}
```

---

### thunderbird_events_create

Create a new calendar event.

#### Description

Creates a new event with support for attendees and recurrence patterns.

#### Parameters

| Name          | Type     | Required | Description                            |
| ------------- | -------- | -------- | -------------------------------------- |
| `calendarId`  | string   | Yes      | ID of the calendar to create event in  |
| `title`       | string   | Yes      | Event title/summary (1-500 characters) |
| `start`       | string   | Yes      | Start date/time (ISO 8601 format)      |
| `end`         | string   | Yes      | End date/time (ISO 8601 format)        |
| `location`    | string   | No       | Event location (max 500 characters)    |
| `description` | string   | No       | Detailed event description             |
| `attendees`   | string[] | No       | Array of attendee email addresses      |
| `recurrence`  | object   | No       | Recurrence rule definition             |

#### Recurrence Object

| Field       | Type   | Required | Description                                                 |
| ----------- | ------ | -------- | ----------------------------------------------------------- |
| `frequency` | string | Yes      | One of: `daily`, `weekly`, `monthly`, `yearly`              |
| `interval`  | number | No       | Interval between occurrences (e.g., 2 for every other week) |
| `until`     | string | No       | End date for recurrence (ISO 8601)                          |
| `count`     | number | No       | Number of occurrences                                       |

**Note**: Use either `until` or `count`, not both.

#### Response Format

```json
{
  "id": "event-456",
  "calendarId": "calendar-1",
  "type": "event",
  "title": "Team Meeting",
  "start": "2025-03-20T14:00:00Z",
  "end": "2025-03-20T15:00:00Z",
  "description": "",
  "location": "",
  "attendees": []
}
```

#### Example Request (Simple Event)

```json
{
  "jsonrpc": "2.0",
  "id": "req-035",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_events_create",
    "arguments": {
      "calendarId": "calendar-1",
      "title": "Client Presentation",
      "start": "2025-03-22T10:00:00Z",
      "end": "2025-03-22T11:30:00Z",
      "location": "Client Office",
      "description": "Q1 results presentation"
    }
  }
}
```

#### Example Request (Recurring Event with Attendees)

```json
{
  "jsonrpc": "2.0",
  "id": "req-036",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_events_create",
    "arguments": {
      "calendarId": "calendar-1",
      "title": "Weekly Team Standup",
      "start": "2025-03-17T09:00:00Z",
      "end": "2025-03-17T09:30:00Z",
      "location": "Zoom Meeting Room",
      "description": "Weekly standup meeting",
      "attendees": ["marie.martin@example.com", "pierre.durand@example.com"],
      "recurrence": {
        "frequency": "weekly",
        "interval": 1,
        "count": 15
      }
    }
  }
}
```

---

### thunderbird_events_update

Update an existing calendar event.

#### Description

Modifies event properties with support for updating single instances or entire recurring series.

#### Parameters

| Name          | Type     | Required | Default | Description                                      |
| ------------- | -------- | -------- | ------- | ------------------------------------------------ |
| `eventId`     | string   | Yes      | -       | ID of the event to update                        |
| `calendarId`  | string   | Yes      | -       | ID of the calendar containing the event          |
| `title`       | string   | No       | -       | New title (1-500 characters)                     |
| `start`       | string   | No       | -       | New start date/time (ISO 8601)                   |
| `end`         | string   | No       | -       | New end date/time (ISO 8601)                     |
| `location`    | string   | No       | -       | New location (max 500 characters)                |
| `description` | string   | No       | -       | New description                                  |
| `attendees`   | string[] | No       | -       | New attendee list (email addresses)              |

> Note: recurring events are updated as a whole. A per-occurrence `scope`
> parameter existed in older versions but was removed on 2026-05-16: the
> experimental `browser.calendar.items.update` API does not expose it.

#### Response Format

```json
{
  "id": "event-123",
  "calendarId": "calendar-1",
  "type": "event",
  "title": "Updated Meeting Title",
  "start": "2025-03-20T15:00:00Z",
  "end": "2025-03-20T16:00:00Z",
  "description": "",
  "location": "Building B, Room 301",
  "attendees": []
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-037",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_events_update",
    "arguments": {
      "eventId": "event-123",
      "calendarId": "calendar-1",
      "title": "Updated Meeting Title",
      "location": "Building B, Room 301",
      "start": "2025-03-20T15:00:00Z",
      "end": "2025-03-20T16:00:00Z"
    }
  }
}
```

---

### thunderbird_events_move

Move an event to a different time or date.

#### Description

Reschedules an event by updating its start and end times.

#### Parameters

| Name         | Type   | Required | Description                             |
| ------------ | ------ | -------- | --------------------------------------- |
| `eventId`    | string | Yes      | ID of the event to move                 |
| `calendarId` | string | Yes      | ID of the calendar containing the event |
| `newStart`   | string | Yes      | New start date/time (ISO 8601 format)   |
| `newEnd`     | string | Yes      | New end date/time (ISO 8601 format)     |

#### Response Format

```json
{
  "id": "event-123",
  "calendarId": "calendar-1",
  "type": "event",
  "title": "Team Meeting",
  "start": "2025-03-21T10:00:00Z",
  "end": "2025-03-21T11:00:00Z",
  "description": "",
  "location": "",
  "attendees": []
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-038",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_events_move",
    "arguments": {
      "eventId": "event-123",
      "calendarId": "calendar-1",
      "newStart": "2025-03-21T10:00:00Z",
      "newEnd": "2025-03-21T11:00:00Z"
    }
  }
}
```

---

### thunderbird_events_delete

Delete a calendar event.

#### Description

Removes an event from the calendar with support for deleting single or multiple instances of recurring events.

#### Parameters

| Name         | Type   | Required | Default | Description                                      |
| ------------ | ------ | -------- | ------- | ------------------------------------------------ |
| `eventId`    | string | Yes      | -       | ID of the event to delete                        |
| `calendarId` | string | Yes      | -       | ID of the calendar containing the event          |

#### Response Format

```json
{
  "success": true
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-039",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_events_delete",
    "arguments": {
      "eventId": "event-old-123",
      "calendarId": "calendar-1"
    }
  }
}
```

---

## Task Operations

For task tools documentation, see [tasks-api.md](tasks-api.md). Tasks use the same experimental calendar API but are documented separately:

- `thunderbird_tasks_list` - List tasks with filters
- `thunderbird_tasks_get` - Get task details
- `thunderbird_tasks_create` - Create a task
- `thunderbird_tasks_update` - Update task properties
- `thunderbird_tasks_delete` - Delete a task
- `thunderbird_tasks_complete` - Mark task as completed

---

## Common Error Codes

All calendar operations may return these error codes:

| Code   | Message                 | Description                                                      |
| ------ | ----------------------- | ---------------------------------------------------------------- |
| -32000 | Thunderbird not running | Thunderbird application is not active                            |
| -32001 | Extension not installed | Thunderbird MCP extension not found                              |
| -32002 | Permission denied       | Calendar permission not granted                                  |
| -32003 | Resource not found      | Calendar, event, or task not found                               |
| -32004 | Operation timeout       | Operation exceeded timeout limit (10s)                           |
| -32602 | Invalid params          | Invalid date format, recurrence rule, or missing required fields |
| -32603 | Internal error          | Read-only calendar, conflicting event, invalid recurrence, etc.  |

---

## Best Practices

### Date and Time Handling

- Always use ISO 8601 format: `2025-03-20T14:00:00Z`
- Include timezone information or use UTC (Z suffix)
- For all-day events, use date-only format: `2025-03-20`
- Verify end time is after start time

### Recurrence Patterns

- Test recurrence rules with limited occurrences first (`count` parameter)
- Use `count` or `until` to prevent infinite recurrence
- Consider timezone effects on recurring events
- Valid frequency values: `daily`, `weekly`, `monthly`, `yearly`

### Attendee Management

- Always provide valid email addresses for attendees
- Attendees array contains email strings only
- Calendar system handles invitation workflow
- Check calendar capabilities for attendee support

### Calendar Selection

- Check calendar read-only status before creating/updating
- Respect calendar permissions and capabilities
- Consider calendar synchronization delays for network calendars (CalDAV)
- Use local calendars for testing

### Performance

- Limit date ranges in queries to improve performance
- Use specific calendar IDs when possible
- Set appropriate `limit` values (max 500)
- Cache calendar metadata to reduce API calls

---

## Experimental API Notes

The Calendar API uses Thunderbird's experimental WebExtension APIs (webext-experiments):

- API is implemented using experimental `browser.calendar` interface
- API may change in future Thunderbird releases
- Some features may not work with all calendar types
- CalDAV synchronization may introduce delays
- Not all calendar servers support all features

### Known Limitations

- Limited support for complex recurrence patterns
- Timezone handling may vary by calendar type
- Some calendar types may have restricted capabilities
- Network calendar synchronization delays

### Testing Recommendations

- Test with local storage calendars first
- Verify network calendar (CalDAV) compatibility separately
- Handle API changes gracefully with error checking
- Implement timeout and retry mechanisms
- Test recurrence patterns thoroughly

---

## Security Considerations

- Event and task data stored in calendar databases
- Network calendars may sync over internet
- Attendee email addresses exposed in API responses
- All operations require calendar API permission
- Experimental API may have security implications
- Consider data privacy when sharing calendar information
