# Tasks API Documentation

This document describes all MCP tools for task management operations in the Thunderbird MCP Server.

## Overview

The Tasks API provides management of tasks (todos) in Thunderbird's calendar system. Tasks can be created, updated, completed, and deleted. Each task belongs to a calendar and can have due dates, priorities, and descriptions.

**Status**: EXPERIMENTAL (uses webext-experiments calendar API)

**Permission Required**: `calendar` (experimental)

---

## Tools

### thunderbird_tasks_list

List tasks with optional filters.

#### Description

Retrieves tasks from Thunderbird calendars with optional filtering by calendar, completion status, and due date range.

#### Parameters

| Parameter  | Type    | Required | Description                                |
| ---------- | ------- | -------- | ------------------------------------------ |
| calendarId | string  | No       | Filter by specific calendar                |
| completed  | boolean | No       | Filter by completion status                |
| dueBefore  | string  | No       | Show tasks due before this date (ISO 8601) |
| dueAfter   | string  | No       | Show tasks due after this date (ISO 8601)  |
| limit      | number  | No       | Maximum results (default: 100, max: 500)   |

#### Response Format

```json
{
  "type": "text",
  "text": "[
    {
      \"id\": \"task-uuid-123\",
      \"calendarId\": \"calendar-uuid-456\",
      \"title\": \"Review project proposal\",
      \"description\": \"Check the budget section\",
      \"dueDate\": \"2026-02-05T17:00:00.000Z\",
      \"priority\": 1,
      \"completed\": false,
      \"completedDate\": null
    },
    {
      \"id\": \"task-uuid-789\",
      \"calendarId\": \"calendar-uuid-456\",
      \"title\": \"Send weekly report\",
      \"description\": \"\",
      \"dueDate\": \"2026-02-07T12:00:00.000Z\",
      \"priority\": 5,
      \"completed\": false,
      \"completedDate\": null
    }
  ]"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_list",
    "arguments": {
      "completed": false,
      "limit": 50
    }
  }
}
```

---

### thunderbird_tasks_get

Get detailed information about a specific task.

#### Description

Retrieves full details of a task including title, description, due date, priority, and completion status.

#### Parameters

| Parameter  | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| taskId     | string | Yes      | Task ID     |
| calendarId | string | Yes      | Calendar ID |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"id\": \"task-uuid-123\",
    \"calendarId\": \"calendar-uuid-456\",
    \"title\": \"Review project proposal\",
    \"description\": \"Check the budget section and timeline\",
    \"dueDate\": \"2026-02-05T17:00:00.000Z\",
    \"priority\": 1,
    \"completed\": false,
    \"completedDate\": null,
    \"createdDate\": \"2026-01-28T10:00:00.000Z\",
    \"lastModifiedDate\": \"2026-01-30T14:30:00.000Z\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-002",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_get",
    "arguments": {
      "taskId": "task-uuid-123",
      "calendarId": "calendar-uuid-456"
    }
  }
}
```

---

### thunderbird_tasks_create

Create a new task with optional due date and priority.

#### Description

Creates a new task in the specified calendar. The task can include a due date, priority level, and description.

#### Parameters

| Parameter   | Type   | Required | Description                                     |
| ----------- | ------ | -------- | ----------------------------------------------- |
| calendarId  | string | Yes      | Calendar ID to create task in                   |
| title       | string | Yes      | Task title (1-500 characters)                   |
| dueDate     | string | No       | Due date (ISO 8601)                             |
| priority    | number | No       | Priority (0=undefined, 1=high, 5=normal, 9=low) |
| description | string | No       | Task description                                |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"taskId\": \"task-uuid-new\",
    \"calendarId\": \"calendar-uuid-456\",
    \"title\": \"New task created\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-003",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_create",
    "arguments": {
      "calendarId": "calendar-uuid-456",
      "title": "Prepare presentation",
      "dueDate": "2026-02-10T09:00:00.000Z",
      "priority": 1,
      "description": "Q1 review slides"
    }
  }
}
```

#### Priority Values

| Value | Meaning   |
| ----- | --------- |
| 0     | Undefined |
| 1     | High      |
| 5     | Normal    |
| 9     | Low       |

---

### thunderbird_tasks_update

Update an existing task.

#### Description

Updates properties of an existing task. Only provided fields are updated; others remain unchanged.

#### Parameters

| Parameter   | Type    | Required | Description             |
| ----------- | ------- | -------- | ----------------------- |
| taskId      | string  | Yes      | Task ID to update       |
| calendarId  | string  | Yes      | Calendar ID             |
| title       | string  | No       | New title               |
| dueDate     | string  | No       | New due date (ISO 8601) |
| priority    | number  | No       | New priority (0-9)      |
| description | string  | No       | New description         |
| completed   | boolean | No       | Completion status       |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"taskId\": \"task-uuid-123\",
    \"updated\": [\"title\", \"dueDate\"]
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-004",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_update",
    "arguments": {
      "taskId": "task-uuid-123",
      "calendarId": "calendar-uuid-456",
      "title": "Updated task title",
      "priority": 5
    }
  }
}
```

---

### thunderbird_tasks_delete

Delete a task permanently.

#### Description

Permanently deletes a task from the calendar. This action cannot be undone.

#### Parameters

| Parameter  | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| taskId     | string | Yes      | Task ID to delete |
| calendarId | string | Yes      | Calendar ID       |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"taskId\": \"task-uuid-123\",
    \"deleted\": true
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-005",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_delete",
    "arguments": {
      "taskId": "task-uuid-123",
      "calendarId": "calendar-uuid-456"
    }
  }
}
```

---

### thunderbird_tasks_complete

Mark a task as completed.

#### Description

Convenience method to mark a task as completed. Sets the completed status to true and records the completion date.

#### Parameters

| Parameter  | Type   | Required | Description         |
| ---------- | ------ | -------- | ------------------- |
| taskId     | string | Yes      | Task ID to complete |
| calendarId | string | Yes      | Calendar ID         |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"taskId\": \"task-uuid-123\",
    \"completed\": true,
    \"completedDate\": \"2026-02-01T15:30:00.000Z\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-006",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tasks_complete",
    "arguments": {
      "taskId": "task-uuid-123",
      "calendarId": "calendar-uuid-456"
    }
  }
}
```

---

## Error Handling

### Common Errors

| Error Code | Description                  | Resolution                             |
| ---------- | ---------------------------- | -------------------------------------- |
| -32602     | Invalid params               | Check required parameters              |
| -32603     | Calendar not found           | Verify calendarId exists               |
| -32603     | Task not found               | Verify taskId and calendarId           |
| -32603     | Calendar API not available   | Ensure Thunderbird 128+ with Lightning |
| -32603     | Experimental API not enabled | Check extension permissions            |

### Error Response Example

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Task not found: task-uuid-invalid"
    }
  ],
  "isError": true
}
```

---

## Requirements

### Thunderbird Version

Tasks API requires Thunderbird 128.0 or higher with Lightning calendar enabled.

### Experimental API

This API uses the experimental webext-experiments calendar API. The extension must be installed with experimental permissions.

---

## Related APIs

- [Calendar API](./calendar-api.md) - Calendar and event management
- [Resources](./resources.md) - `thunderbird://tasks/pending` resource

---

## Summary

| Tool                         | Description                              |
| ---------------------------- | ---------------------------------------- |
| `thunderbird_tasks_list`     | List tasks with filters                  |
| `thunderbird_tasks_get`      | Get task details                         |
| `thunderbird_tasks_create`   | Create a task with due date and priority |
| `thunderbird_tasks_update`   | Update task properties                   |
| `thunderbird_tasks_delete`   | Delete a task                            |
| `thunderbird_tasks_complete` | Mark task as completed                   |

**Total: 6 tools**
