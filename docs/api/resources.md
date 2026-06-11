# Resources API Documentation

This document describes all MCP resources available in the Zileo MCP — Thunderbird.

## Overview

MCP Resources provide read-only access to contextual data from Thunderbird. Resources are accessed via URI patterns and return JSON-formatted data that LLMs can use for context-aware operations without requiring explicit tool calls.

**Resource Access**: All resources are read-only and automatically updated.

---

## Resource URIs

### thunderbird://accounts

List of all configured email accounts in Thunderbird.

#### Description

Provides account metadata including identities, server information, and folder references. Useful for discovering available accounts before performing account-specific operations.

#### URI Pattern

```
thunderbird://accounts
```

#### Response Format

```json
{
  "uri": "thunderbird://accounts",
  "mimeType": "application/json",
  "text": "[{
    \"id\": \"account-1\",
    \"name\": \"Personal Email\",
    \"type\": \"imap\",
    \"identities\": [{
      \"id\": \"identity-1\",
      \"name\": \"Jean Dupont\",
      \"email\": \"jean.dupont@example.com\",
      \"replyTo\": \"\",
      \"organization\": \"ACME Corp\",
      \"signature\": \"Best regards,\\nJean\"
    }],
    \"incomingServer\": {
      \"type\": \"imap\",
      \"hostname\": \"imap.example.com\",
      \"port\": 993,
      \"username\": \"jean.dupont\",
      \"socketType\": 3
    },
    \"rootFolderId\": \"folder-root-1\",
    \"defaultIdentityId\": \"identity-1\"
  }]"
}
```

#### Account Types

- `imap` - IMAP email account
- `pop3` - POP3 email account
- `nntp` - Newsgroup account
- `none` - Local folders only

#### Socket Types

- `1` - None (plain text)
- `2` - STARTTLS
- `3` - SSL/TLS

#### Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": "req-050",
  "method": "resources/read",
  "params": {
    "uri": "thunderbird://accounts"
  }
}
```

#### Use Cases

- Discovering available email accounts before message operations
- Retrieving account-specific folder IDs
- Identifying default identity for sending emails
- Understanding account configuration

---

### thunderbird://folders/{accountId}

Folder hierarchy for a specific account.

#### Description

Returns the complete folder tree structure for an account including all subfolders, message counts, and folder metadata. Provides a hierarchical view useful for navigation and folder selection.

#### URI Pattern

```
thunderbird://folders/{accountId}
```

#### Parameters

| Parameter   | Description       | Example     |
| ----------- | ----------------- | ----------- |
| `accountId` | ID of the account | `account-1` |

#### Response Format

```json
{
  "uri": "thunderbird://folders/account-1",
  "mimeType": "application/json",
  "text": "{
    \"accountId\": \"account-1\",
    \"accountName\": \"Personal Email\",
    \"rootFolder\": {
      \"id\": \"folder-root-1\",
      \"name\": \"jean.dupont@example.com\",
      \"path\": \"/\",
      \"type\": \"root\",
      \"subFolders\": [{
        \"id\": \"folder-inbox-1\",
        \"name\": \"Inbox\",
        \"path\": \"/Inbox\",
        \"type\": \"inbox\",
        \"totalMessageCount\": 250,
        \"unreadMessageCount\": 15,
        \"subFolders\": [{
          \"id\": \"folder-work-1\",
          \"name\": \"Work\",
          \"path\": \"/Inbox/Work\",
          \"type\": \"folder\",
          \"totalMessageCount\": 89,
          \"unreadMessageCount\": 7,
          \"subFolders\": []
        }]
      }, {
        \"id\": \"folder-sent-1\",
        \"name\": \"Sent\",
        \"path\": \"/Sent\",
        \"type\": \"sent\",
        \"totalMessageCount\": 543,
        \"unreadMessageCount\": 0,
        \"subFolders\": []
      }]
    }
  }"
}
```

#### Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": "req-051",
  "method": "resources/read",
  "params": {
    "uri": "thunderbird://folders/account-1"
  }
}
```

#### Use Cases

- Building folder navigation interfaces
- Displaying folder statistics
- Finding specific folders by type
- Understanding folder organization

---

### thunderbird://inbox/unread

All unread messages across all accounts.

#### Description

Returns a unified list of unread messages from all inbox folders across all configured accounts. Messages are sorted by date descending (newest first).

#### URI Pattern

```
thunderbird://inbox/unread
```

#### Response Format

```json
{
  "uri": "thunderbird://inbox/unread",
  "mimeType": "application/json",
  "text": "[{
    \"id\": \"msg-123\",
    \"accountId\": \"account-1\",
    \"folderId\": \"folder-inbox-1\",
    \"subject\": \"Urgent: Project deadline update\",
    \"from\": {
      \"name\": \"Marie Martin\",
      \"email\": \"marie.martin@example.com\"
    },
    \"to\": [{
      \"name\": \"Jean Dupont\",
      \"email\": \"jean.dupont@example.com\"
    }],
    \"date\": \"2025-03-15T10:30:00Z\",
    \"flagged\": true,
    \"tags\": [\"important\"],
    \"size\": 2048,
    \"snippet\": \"The project deadline has been moved to next Friday...\"
  }]"
}
```

#### Default Limits

- Maximum 100 most recent unread messages
- Only inbox folders included (not subfolders)
- Excludes junk/spam folders

#### Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": "req-052",
  "method": "resources/read",
  "params": {
    "uri": "thunderbird://inbox/unread"
  }
}
```

#### Use Cases

- Dashboard overview of pending emails
- Notification summaries
- Priority inbox display
- Unread count tracking

---

### thunderbird://inbox/unread/{accountId}

Unread messages for a specific account.

#### Description

Returns unread messages from the inbox of a specific account, allowing account-specific unread tracking.

#### URI Pattern

```
thunderbird://inbox/unread/{accountId}
```

#### Parameters

| Parameter   | Description       | Example     |
| ----------- | ----------------- | ----------- |
| `accountId` | ID of the account | `account-2` |

#### Response Format

Same structure as `thunderbird://inbox/unread` but filtered to single account.

#### Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": "req-053",
  "method": "resources/read",
  "params": {
    "uri": "thunderbird://inbox/unread/account-2"
  }
}
```

#### Use Cases

- Account-specific unread summaries
- Multi-account inbox separation
- Account-based notifications
- Focused inbox views

---

### thunderbird://contacts/recent

Recently used or modified contacts.

#### Description

Returns contacts that have been recently created, modified, or used in email correspondence. Useful for quick access to frequently contacted people.

#### URI Pattern

```
thunderbird://contacts/recent
```

#### Response Format

```json
{
  "uri": "thunderbird://contacts/recent",
  "mimeType": "application/json",
  "text": "[{
    \"id\": \"contact-123\",
    \"addressBookId\": \"addressbook-1\",
    \"displayName\": \"Marie Martin\",
    \"primaryEmail\": \"marie.martin@example.com\",
    \"company\": \"TechStart Inc\",
    \"jobTitle\": \"Product Manager\",
    \"lastUsed\": \"2025-03-15T14:22:00Z\",
    \"lastModified\": \"2025-03-10T09:15:00Z\",
    \"useCount\": 47
  }]"
}
```

#### Default Settings

- Maximum 50 contacts
- Sorted by last usage date
- Includes contacts from all address books
- Excludes contacts never used

#### Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": "req-054",
  "method": "resources/read",
  "params": {
    "uri": "thunderbird://contacts/recent"
  }
}
```

#### Use Cases

- Auto-complete suggestions
- Quick contact access
- Frequently contacted people
- Recent communication tracking

---

### thunderbird://calendar/today

Events scheduled for today.

#### Description

Returns all calendar events occurring today across all enabled calendars. Updates automatically at midnight to reflect current day.

> **Note**: Requires experimental calendarProvider API.

#### URI Pattern

```
thunderbird://calendar/today
```

#### Response Format

```json
{
  "uri": "thunderbird://calendar/today",
  "mimeType": "application/json",
  "text": "{
    \"date\": \"2025-03-15\",
    \"events\": [{
      \"id\": \"event-123\",
      \"calendarId\": \"calendar-1\",
      \"calendarName\": \"Personal Calendar\",
      \"title\": \"Team Meeting\",
      \"start\": \"2025-03-15T09:00:00Z\",
      \"end\": \"2025-03-15T10:00:00Z\",
      \"location\": \"Conference Room A\",
      \"isAllDay\": false,
      \"status\": \"CONFIRMED\",
      \"hasAlarm\": true,
      \"attendeeCount\": 5
    }, {
      \"id\": \"event-124\",
      \"calendarId\": \"calendar-1\",
      \"calendarName\": \"Personal Calendar\",
      \"title\": \"Client Presentation\",
      \"start\": \"2025-03-15T14:00:00Z\",
      \"end\": \"2025-03-15T15:30:00Z\",
      \"location\": \"Zoom Meeting\",
      \"isAllDay\": false,
      \"status\": \"CONFIRMED\",
      \"hasAlarm\": true,
      \"attendeeCount\": 3
    }],
    \"totalEvents\": 2,
    \"hasConflicts\": false
  }"
}
```

#### Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": "req-055",
  "method": "resources/read",
  "params": {
    "uri": "thunderbird://calendar/today"
  }
}
```

#### Use Cases

- Daily agenda displays
- Morning briefing summaries
- Schedule overview
- Conflict detection

---

### thunderbird://calendar/upcoming

Events in the next 7 days.

#### Description

Returns upcoming calendar events for the next week, providing a forward-looking view of scheduled activities.

> **Note**: Requires experimental calendarProvider API.

#### URI Pattern

```
thunderbird://calendar/upcoming
```

#### Response Format

```json
{
  "uri": "thunderbird://calendar/upcoming",
  "mimeType": "application/json",
  "text": "{
    \"dateRange\": {
      \"from\": \"2025-03-15\",
      \"to\": \"2025-03-22\"
    },
    \"eventsByDate\": {
      \"2025-03-15\": [{
        \"id\": \"event-123\",
        \"title\": \"Team Meeting\",
        \"start\": \"2025-03-15T09:00:00Z\",
        \"end\": \"2025-03-15T10:00:00Z\",
        \"calendarName\": \"Personal Calendar\"
      }],
      \"2025-03-17\": [{
        \"id\": \"event-125\",
        \"title\": \"Project Review\",
        \"start\": \"2025-03-17T10:00:00Z\",
        \"end\": \"2025-03-17T11:30:00Z\",
        \"calendarName\": \"Work Calendar\"
      }],
      \"2025-03-20\": [{
        \"id\": \"event-126\",
        \"title\": \"Quarterly Planning\",
        \"start\": \"2025-03-20T13:00:00Z\",
        \"end\": \"2025-03-20T16:00:00Z\",
        \"calendarName\": \"Work Calendar\"
      }]
    },
    \"totalEvents\": 12,
    \"busiestDay\": \"2025-03-20\"
  }"
}
```

#### Default Settings

- 7-day lookahead window
- Includes recurring event instances
- Grouped by date
- All enabled calendars

#### Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": "req-056",
  "method": "resources/read",
  "params": {
    "uri": "thunderbird://calendar/upcoming"
  }
}
```

#### Use Cases

- Weekly planning views
- Schedule preparation
- Availability checking
- Workload visualization

---

### thunderbird://tasks/pending

Incomplete tasks across all calendars.

#### Description

Returns all pending (not completed) tasks, optionally filtered by due date and priority.

> **Note**: Requires experimental calendarProvider API.

#### URI Pattern

```
thunderbird://tasks/pending
```

#### Response Format

```json
{
  "uri": "thunderbird://tasks/pending",
  "mimeType": "application/json",
  "text": "{
    \"tasks\": [{
      \"id\": \"task-123\",
      \"calendarId\": \"calendar-1\",
      \"calendarName\": \"Personal Calendar\",
      \"title\": \"Complete project documentation\",
      \"dueDate\": \"2025-03-18T17:00:00Z\",
      \"priority\": 1,
      \"percentComplete\": 60,
      \"status\": \"IN-PROCESS\",
      \"isOverdue\": false,
      \"categories\": [\"Work\"]
    }, {
      \"id\": \"task-124\",
      \"calendarId\": \"calendar-1\",
      \"calendarName\": \"Personal Calendar\",
      \"title\": \"Review pull requests\",
      \"dueDate\": \"2025-03-16T12:00:00Z\",
      \"priority\": 1,
      \"percentComplete\": 0,
      \"status\": \"NEEDS-ACTION\",
      \"isOverdue\": true,
      \"categories\": [\"Work\", \"Code Review\"]
    }],
    \"totalTasks\": 15,
    \"overdueTasks\": 3,
    \"highPriorityTasks\": 8,
    \"summary\": {
      \"byPriority\": {
        \"high\": 8,
        \"medium\": 5,
        \"low\": 2
      },
      \"byStatus\": {
        \"NEEDS-ACTION\": 6,
        \"IN-PROCESS\": 9
      }
    }
  }"
}
```

#### Default Settings

- Maximum 100 tasks
- Sorted by due date (overdue first)
- Only incomplete tasks (percentComplete < 100)
- All enabled calendars

#### Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": "req-057",
  "method": "resources/read",
  "params": {
    "uri": "thunderbird://tasks/pending"
  }
}
```

#### Use Cases

- Task dashboard displays
- To-do list management
- Overdue task tracking
- Priority task identification

---

## Resource Access Protocol

### Reading Resources

Resources are accessed using the MCP `resources/read` method:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "resources/read",
  "params": {
    "uri": "thunderbird://resource-uri"
  }
}
```

### Response Structure

All resource responses follow this structure:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "result": {
    "contents": [
      {
        "uri": "thunderbird://resource-uri",
        "mimeType": "application/json",
        "text": "{...JSON data...}"
      }
    ]
  }
}
```

### Listing Available Resources

Query available resources using `resources/list`:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "resources/list"
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "result": {
    "resources": [
      {
        "uri": "thunderbird://accounts",
        "name": "Thunderbird Accounts",
        "description": "List of all configured email accounts",
        "mimeType": "application/json"
      },
      {
        "uri": "thunderbird://folders/{accountId}",
        "name": "Folder Hierarchy",
        "description": "Folder tree for a specific account",
        "mimeType": "application/json"
      }
    ]
  }
}
```

---

## Common Error Codes

Resource operations may return these error codes:

| Code   | Message                 | Description                                 |
| ------ | ----------------------- | ------------------------------------------- |
| -32000 | Thunderbird not running | Thunderbird application is not active       |
| -32001 | Extension not installed | Zileo MCP — Thunderbird extension not found |
| -32003 | Resource not found      | Invalid URI or resource doesn't exist       |
| -32602 | Invalid params          | Malformed URI or missing parameters         |
| -32603 | Internal error          | Resource generation failed                  |

---

## Best Practices

### Resource Selection

- Use resources for contextual data that updates frequently
- Prefer resources over repeated tool calls for static data
- Cache resource data appropriately based on update frequency

### Performance

- Resources are cached server-side for brief periods
- Avoid excessive resource reads (rate limit: 10/second)
- Some resources (calendar, tasks) may be slower than others

### URI Patterns

- Validate URI format before calling resources/read
- Use proper parameter values in parameterized URIs
- Check resources/list for available URIs

### Data Freshness

Resource update frequencies:

| Resource          | Update Frequency  | Cache Duration |
| ----------------- | ----------------- | -------------- |
| accounts          | Account changes   | 5 minutes      |
| folders           | Folder operations | 2 minutes      |
| inbox/unread      | Message arrival   | 30 seconds     |
| contacts/recent   | Contact usage     | 5 minutes      |
| calendar/today    | Midnight UTC      | Until midnight |
| calendar/upcoming | Event changes     | 5 minutes      |
| tasks/pending     | Task updates      | 2 minutes      |

---

## Use Case Examples

### Morning Briefing

Combine multiple resources for comprehensive briefing:

1. Read `thunderbird://inbox/unread` for pending emails
2. Read `thunderbird://calendar/today` for today's schedule
3. Read `thunderbird://tasks/pending` for outstanding tasks

### Account Setup Verification

1. Read `thunderbird://accounts` to list accounts
2. For each account, read `thunderbird://folders/{accountId}` to verify structure
3. Check `thunderbird://inbox/unread/{accountId}` for per-account unread counts

### Contact Context

When composing email:

1. Read `thunderbird://contacts/recent` for quick recipient suggestions
2. Use contact data to personalize message
3. Track communication frequency

### Schedule Management

1. Read `thunderbird://calendar/today` for current day
2. Read `thunderbird://calendar/upcoming` for week planning
3. Cross-reference with `thunderbird://tasks/pending` for workload

---

## Security Considerations

- Resources provide read-only access to Thunderbird data
- No sensitive data (passwords, tokens) included in resources
- Resources respect Thunderbird privacy settings
- Network calendar data may be cached
- Resource access requires appropriate MCP permissions
- URI parameters are validated to prevent injection attacks

---

## Limitations

### Experimental Features

- Calendar and task resources require experimental API
- Resource availability depends on Thunderbird version
- Some features may change in future releases

### Data Scope

- Resources provide summary/overview data, not complete details
- Use tools for comprehensive data access
- Some resources have item limits (typically 50-100)

### Platform Differences

- Resource formatting may vary slightly by platform
- Some resources may be slower on certain operating systems
- Network calendar resources depend on synchronization status
