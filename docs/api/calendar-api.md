# Calendar API Documentation

This document describes all MCP tools for calendar and event operations in the Thunderbird MCP Server.

> **EXPERIMENTAL**: This API uses the experimental `calendarProvider` WebExtension API and may change in future Thunderbird versions.

## Overview

The Calendar API provides comprehensive calendar management including events, tasks, and calendar operations. This module enables LLMs to create, read, update, and delete calendar entries and manage multiple calendars.

**Permission Required**: `calendarProvider` (experimental)

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
{
  "type": "text",
  "text": "[{
    \"id\": \"calendar-1\",
    \"name\": \"Personal Calendar\",
    \"type\": \"storage\",
    \"color\": \"#3366CC\",
    \"readOnly\": false,
    \"enabled\": true,
    \"url\": \"moz-storage-calendar://\",
    \"eventCount\": 145,
    \"taskCount\": 23
  }, {
    \"id\": \"calendar-2\",
    \"name\": \"Work Calendar (CalDAV)\",
    \"type\": \"caldav\",
    \"color\": \"#FF6600\",
    \"readOnly\": false,
    \"enabled\": true,
    \"url\": \"https://caldav.example.com/calendars/work\",
    \"eventCount\": 89,
    \"taskCount\": 12
  }]"
}
```

#### Calendar Types

- `storage` - Local storage calendar (default)
- `caldav` - CalDAV network calendar
- `ics` - ICS file-based calendar
- `memory` - Temporary memory-only calendar

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
Retrieves complete metadata for a calendar including capabilities and statistics.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `calendarId` | string | Yes | Unique identifier of the calendar |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"id\": \"calendar-1\",
    \"name\": \"Personal Calendar\",
    \"type\": \"storage\",
    \"color\": \"#3366CC\",
    \"readOnly\": false,
    \"enabled\": true,
    \"url\": \"moz-storage-calendar://\",
    \"capabilities\": {
      \"canCreateEvents\": true,
      \"canModifyEvents\": true,
      \"canDeleteEvents\": true,
      \"canCreateTasks\": true,
      \"supportsAttendees\": true,
      \"supportsRecurrence\": true,
      \"supportsAlarms\": true
    },
    \"eventCount\": 145,
    \"taskCount\": 23,
    \"timezone\": \"Europe/Paris\"
  }"
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
Performs advanced event search with support for text query, date ranges, and calendar filtering.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | No | Search term to match in event title, description, or location |
| `calendarId` | string | No | Specific calendar to search within (omit for all calendars) |
| `dateFrom` | string | Yes | Start of date range (ISO 8601 format) |
| `dateTo` | string | Yes | End of date range (ISO 8601 format) |
| `limit` | number | No | Maximum number of results (default: 100) |

#### Response Format

```json
{
  "type": "text",
  "text": "[{
    \"id\": \"event-123\",
    \"calendarId\": \"calendar-1\",
    \"title\": \"Team Meeting\",
    \"description\": \"Weekly team sync\",
    \"location\": \"Conference Room A\",
    \"start\": \"2025-03-20T14:00:00Z\",
    \"end\": \"2025-03-20T15:00:00Z\",
    \"isAllDay\": false,
    \"status\": \"CONFIRMED\",
    \"organizer\": {
      \"name\": \"Jean Dupont\",
      \"email\": \"jean.dupont@example.com\"
    },
    \"attendees\": [{
      \"name\": \"Marie Martin\",
      \"email\": \"marie.martin@example.com\",
      \"status\": \"ACCEPTED\",
      \"role\": \"REQ-PARTICIPANT\"
    }],
    \"recurrence\": {
      \"frequency\": \"WEEKLY\",
      \"interval\": 1,
      \"until\": \"2025-06-20T14:00:00Z\"
    },
    \"alarms\": [{
      \"trigger\": \"-PT15M\",
      \"action\": \"DISPLAY\"
    }]
  }]"
}
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
Retrieves all events in a calendar for a specified time period, including recurring event instances.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `calendarId` | string | Yes | ID of the calendar to list events from |
| `dateFrom` | string | Yes | Start of date range (ISO 8601 format) |
| `dateTo` | string | Yes | End of date range (ISO 8601 format) |
| `limit` | number | No | Maximum number of events (default: 500) |

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
Retrieves complete event details including all properties, attendees, recurrence rules, and alarms.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | string | Yes | Unique identifier of the event |
| `calendarId` | string | Yes | ID of the calendar containing the event |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"id\": \"event-123\",
    \"calendarId\": \"calendar-1\",
    \"title\": \"Quarterly Review Meeting\",
    \"description\": \"Q1 2025 performance review and planning session\",
    \"location\": \"Main Conference Room\",
    \"start\": \"2025-03-25T09:00:00Z\",
    \"end\": \"2025-03-25T11:00:00Z\",
    \"isAllDay\": false,
    \"status\": \"CONFIRMED\",
    \"transparency\": \"OPAQUE\",
    \"priority\": 5,
    \"organizer\": {
      \"name\": \"Jean Dupont\",
      \"email\": \"jean.dupont@example.com\"
    },
    \"attendees\": [...],
    \"recurrence\": null,
    \"alarms\": [...],
    \"attachments\": [],
    \"categories\": [\"Work\", \"Important\"],
    \"created\": \"2025-02-15T10:30:00Z\",
    \"lastModified\": \"2025-03-01T14:22:00Z\"
  }"
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
Creates a new event with support for attendees, recurrence patterns, and alarms.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `calendarId` | string | Yes | ID of the calendar to create event in |
| `title` | string | Yes | Event title/summary |
| `start` | string | Yes | Start date/time (ISO 8601 format) |
| `end` | string | Yes | End date/time (ISO 8601 format) |
| `location` | string | No | Event location |
| `description` | string | No | Detailed event description |
| `attendees` | object[] | No | Array of attendee objects |
| `recurrence` | object | No | Recurrence rule definition |
| `alarms` | object[] | No | Array of alarm/reminder definitions |
| `isAllDay` | boolean | No | All-day event flag (default: false) |
| `categories` | string[] | No | Event categories/tags |

#### Attendee Object

```json
{
  "name": "Marie Martin",
  "email": "marie.martin@example.com",
  "role": "REQ-PARTICIPANT",
  "status": "NEEDS-ACTION"
}
```

#### Attendee Roles

- `REQ-PARTICIPANT` - Required participant
- `OPT-PARTICIPANT` - Optional participant
- `CHAIR` - Meeting chair/organizer
- `NON-PARTICIPANT` - Informational only

#### Attendee Status

- `NEEDS-ACTION` - No response yet
- `ACCEPTED` - Accepted invitation
- `DECLINED` - Declined invitation
- `TENTATIVE` - Tentatively accepted
- `DELEGATED` - Delegated to another person

#### Recurrence Object

```json
{
  "frequency": "WEEKLY",
  "interval": 1,
  "count": 10,
  "until": "2025-06-20T14:00:00Z",
  "byDay": ["MO", "WE", "FR"],
  "byMonth": [1, 6, 12]
}
```

#### Recurrence Frequencies

- `DAILY` - Daily recurrence
- `WEEKLY` - Weekly recurrence
- `MONTHLY` - Monthly recurrence
- `YEARLY` - Yearly recurrence

#### Alarm Object

```json
{
  "trigger": "-PT15M",
  "action": "DISPLAY",
  "description": "Meeting starts in 15 minutes"
}
```

#### Alarm Actions

- `DISPLAY` - Show notification
- `EMAIL` - Send email reminder
- `AUDIO` - Play sound

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"eventId\": \"event-456\",
    \"calendarId\": \"calendar-1\",
    \"title\": \"Team Meeting\",
    \"start\": \"2025-03-20T14:00:00Z\"
  }"
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
      "description": "Daily standup moved to Monday morning",
      "attendees": [
        {
          "name": "Marie Martin",
          "email": "marie.martin@example.com",
          "role": "REQ-PARTICIPANT"
        },
        {
          "name": "Pierre Durand",
          "email": "pierre.durand@example.com",
          "role": "REQ-PARTICIPANT"
        }
      ],
      "recurrence": {
        "frequency": "WEEKLY",
        "interval": 1,
        "byDay": ["MO"],
        "until": "2025-06-30T09:00:00Z"
      },
      "alarms": [
        {
          "trigger": "-PT10M",
          "action": "DISPLAY"
        }
      ]
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

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | string | Yes | ID of the event to update |
| `calendarId` | string | Yes | ID of the calendar containing the event |
| `modifications` | object | Yes | Object containing fields to update |
| `scope` | string | No | For recurring events: `this`, `all`, or `future` (default: `this`) |

#### Modification Scope

- `this` - Update only this instance of recurring event
- `all` - Update all instances (past and future)
- `future` - Update this and all future instances

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"eventId\": \"event-123\",
    \"scope\": \"this\",
    \"updated\": [\"title\", \"location\", \"start\", \"end\"]
  }"
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
      "modifications": {
        "title": "Updated Meeting Title",
        "location": "Building B, Room 301",
        "start": "2025-03-20T15:00:00Z",
        "end": "2025-03-20T16:00:00Z"
      },
      "scope": "this"
    }
  }
}
```

---

### thunderbird_events_move

Move an event to a different time or date.

#### Description
Reschedules an event by updating its start and end times while preserving duration.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | string | Yes | ID of the event to move |
| `calendarId` | string | Yes | ID of the calendar containing the event |
| `newStart` | string | Yes | New start date/time (ISO 8601 format) |
| `newEnd` | string | Yes | New end date/time (ISO 8601 format) |
| `scope` | string | No | For recurring events: `this`, `all`, or `future` |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"eventId\": \"event-123\",
    \"oldStart\": \"2025-03-20T14:00:00Z\",
    \"newStart\": \"2025-03-21T10:00:00Z\",
    \"scope\": \"this\"
  }"
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

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | string | Yes | ID of the event to delete |
| `calendarId` | string | Yes | ID of the calendar containing the event |
| `scope` | string | No | For recurring events: `this`, `all`, or `future` (default: `this`) |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"eventId\": \"event-123\",
    \"scope\": \"this\",
    \"deletedInstances\": 1
  }"
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
      "calendarId": "calendar-1",
      "scope": "all"
    }
  }
}
```

---

## Task Operations

### thunderbird_tasks_list

List tasks from one or all calendars with filtering options.

#### Description
Retrieves tasks with optional filters for completion status, due date range, and calendar.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `calendarId` | string | No | Specific calendar to list tasks from (omit for all) |
| `completed` | boolean | No | Filter by completion status |
| `dueBefore` | string | No | Include tasks due before this date (ISO 8601) |
| `dueAfter` | string | No | Include tasks due after this date (ISO 8601) |
| `limit` | number | No | Maximum number of results (default: 100) |

#### Response Format

```json
{
  "type": "text",
  "text": "[{
    \"id\": \"task-123\",
    \"calendarId\": \"calendar-1\",
    \"title\": \"Complete project documentation\",
    \"description\": \"Finalize API docs and user guide\",
    \"dueDate\": \"2025-03-25T17:00:00Z\",
    \"priority\": 1,
    \"percentComplete\": 60,
    \"status\": \"IN-PROCESS\",
    \"completed\": null,
    \"categories\": [\"Work\", \"Documentation\"]
  }]"
}
```

#### Task Priority

- `0` - Undefined
- `1` - High priority
- `5` - Medium priority (default)
- `9` - Low priority

#### Task Status

- `NEEDS-ACTION` - Not started
- `IN-PROCESS` - Work in progress
- `COMPLETED` - Finished
- `CANCELLED` - Cancelled

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-040",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_list",
    "arguments": {
      "completed": false,
      "dueBefore": "2025-03-31T23:59:59Z"
    }
  }
}
```

---

### thunderbird_tasks_get

Get detailed information about a specific task.

#### Description
Retrieves complete task details including all properties and metadata.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `taskId` | string | Yes | Unique identifier of the task |
| `calendarId` | string | Yes | ID of the calendar containing the task |

#### Response Format

Same structure as task objects in `thunderbird_tasks_list` with additional metadata.

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-041",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_get",
    "arguments": {
      "taskId": "task-123",
      "calendarId": "calendar-1"
    }
  }
}
```

---

### thunderbird_tasks_create

Create a new task in a calendar.

#### Description
Creates a new task with optional due date, priority, and categorization.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `calendarId` | string | Yes | ID of the calendar to create task in |
| `title` | string | Yes | Task title/summary |
| `dueDate` | string | No | Due date/time (ISO 8601 format) |
| `priority` | number | No | Priority level (0, 1, 5, or 9) |
| `description` | string | No | Detailed task description |
| `categories` | string[] | No | Task categories/tags |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"taskId\": \"task-456\",
    \"calendarId\": \"calendar-1\",
    \"title\": \"Review pull requests\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-042",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_create",
    "arguments": {
      "calendarId": "calendar-1",
      "title": "Prepare presentation slides",
      "dueDate": "2025-03-24T17:00:00Z",
      "priority": 1,
      "description": "Create slides for client meeting on March 25",
      "categories": ["Work", "Presentations"]
    }
  }
}
```

---

### thunderbird_tasks_update

Update an existing task.

#### Description
Modifies task properties including completion status, priority, and other metadata.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `taskId` | string | Yes | ID of the task to update |
| `calendarId` | string | Yes | ID of the calendar containing the task |
| `modifications` | object | Yes | Object containing fields to update |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"taskId\": \"task-123\",
    \"updated\": [\"percentComplete\", \"status\", \"priority\"]
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-043",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_update",
    "arguments": {
      "taskId": "task-123",
      "calendarId": "calendar-1",
      "modifications": {
        "percentComplete": 80,
        "status": "IN-PROCESS",
        "priority": 1
      }
    }
  }
}
```

---

### thunderbird_tasks_delete

Delete a task from a calendar.

#### Description
Permanently removes a task.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `taskId` | string | Yes | ID of the task to delete |
| `calendarId` | string | Yes | ID of the calendar containing the task |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"taskId\": \"task-123\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-044",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_delete",
    "arguments": {
      "taskId": "task-old-456",
      "calendarId": "calendar-1"
    }
  }
}
```

---

### thunderbird_tasks_complete

Mark a task as completed.

#### Description
Convenience method to mark a task as 100% complete with completed timestamp.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `taskId` | string | Yes | ID of the task to complete |
| `calendarId` | string | Yes | ID of the calendar containing the task |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"taskId\": \"task-123\",
    \"completed\": \"2025-03-15T14:30:00Z\",
    \"percentComplete\": 100,
    \"status\": \"COMPLETED\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-045",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_complete",
    "arguments": {
      "taskId": "task-123",
      "calendarId": "calendar-1"
    }
  }
}
```

---

## Common Error Codes

All calendar operations may return these error codes:

| Code | Message | Description |
|------|---------|-------------|
| -32000 | Thunderbird not running | Thunderbird application is not active |
| -32001 | Extension not installed | Thunderbird MCP extension not found |
| -32002 | Permission denied | calendarProvider permission not granted |
| -32003 | Resource not found | Calendar, event, or task not found |
| -32004 | Operation timeout | Operation exceeded timeout limit (10s) |
| -32602 | Invalid params | Invalid date format, recurrence rule, or missing required fields |
| -32603 | Internal error | Read-only calendar, conflicting event, invalid recurrence, etc. |

---

## Best Practices

### Date and Time Handling

- Always use ISO 8601 format: `2025-03-20T14:00:00Z`
- Include timezone information or use UTC (Z suffix)
- For all-day events, use date-only format: `2025-03-20`
- Verify end time is after start time

### Recurrence Patterns

- Test recurrence rules with limited occurrences first
- Use `count` or `until` to prevent infinite recurrence
- Consider timezone effects on recurring events
- Validate `byDay` values: MO, TU, WE, TH, FR, SA, SU

### Attendee Management

- Always include email addresses for attendees
- Set appropriate roles (REQ-PARTICIPANT vs OPT-PARTICIPANT)
- Consider calendar invitation workflow
- Handle attendee responses properly

### Calendar Selection

- Check calendar capabilities before creating events
- Respect read-only calendar status
- Consider calendar synchronization delays for network calendars
- Use local calendars for testing

### Performance

- Limit date ranges in queries to improve performance
- Use specific calendar IDs when possible
- Implement pagination for large result sets
- Cache calendar metadata

---

## Experimental API Notes

The Calendar API uses Thunderbird's experimental WebExtension APIs:

- API may change in future Thunderbird releases
- Some features may not work with all calendar types
- CalDAV synchronization may introduce delays
- Not all calendar servers support all features

### Known Limitations

- Attachment support limited
- Some complex recurrence patterns not supported
- Timezone handling may vary
- Calendar sharing features limited

### Testing Recommendations

- Test with local storage calendars first
- Verify network calendar compatibility
- Handle API changes gracefully
- Implement fallback mechanisms

---

## Security Considerations

- Event and task data stored in calendar databases
- Network calendars may sync over internet
- Attendee email addresses exposed
- Calendar URLs may contain credentials
- All operations require calendarProvider permission
- Experimental API may have security implications
