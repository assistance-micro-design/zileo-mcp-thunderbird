# Messages API Documentation

This document describes all MCP tools for email/message operations in the Thunderbird MCP Server.

## Overview

The Messages API provides comprehensive email management capabilities including search, retrieval, manipulation, and organization of email messages across all Thunderbird accounts.

**Base Permission Required**: `messagesRead`

---

## Tools

### thunderbird_messages_search

Search for emails using advanced filtering criteria.

#### Description
Performs a comprehensive search across email messages with support for multiple filter parameters including subject, sender, recipient, body content, tags, read status, and date ranges.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `subject` | string | No | Search term to match in email subject |
| `from` | string | No | Email address or name of sender to filter by |
| `to` | string | No | Email address or name of recipient to filter by |
| `body` | string | No | Search term to match in email body content |
| `tags` | string[] | No | Array of tag keys to filter by |
| `unread` | boolean | No | Filter by read/unread status (true = unread only) |
| `dateFrom` | string | No | Start date for date range filter (ISO 8601 format) |
| `dateTo` | string | No | End date for date range filter (ISO 8601 format) |
| `folderId` | string | No | Specific folder ID to search within |
| `limit` | number | No | Maximum number of results to return (default: 100) |

#### Response Format

```json
{
  "type": "text",
  "text": "[{
    \"id\": \"msg-123\",
    \"subject\": \"Project update - Q1 2025\",
    \"from\": {
      \"name\": \"John Doe\",
      \"email\": \"john.doe@example.com\"
    },
    \"to\": [{
      \"name\": \"Jane Smith\",
      \"email\": \"jane.smith@example.com\"
    }],
    \"date\": \"2025-03-15T14:30:00Z\",
    \"read\": false,
    \"flagged\": false,
    \"tags\": [\"work\", \"important\"],
    \"folderId\": \"folder-inbox-1\",
    \"size\": 2048
  }]"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_messages_search",
    "arguments": {
      "subject": "facture",
      "unread": true,
      "dateFrom": "2025-01-01T00:00:00Z",
      "limit": 10
    }
  }
}
```

#### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "content": [{
      "type": "text",
      "text": "[{\"id\":\"msg-456\",\"subject\":\"Facture Mars 2025\",\"from\":{\"name\":\"Comptabilité\",\"email\":\"compta@acme.fr\"},\"to\":[{\"name\":\"Jean Dupont\",\"email\":\"jean.dupont@example.com\"}],\"date\":\"2025-03-01T09:15:00Z\",\"read\":false,\"flagged\":false,\"tags\":[],\"folderId\":\"inbox-1\",\"size\":1024}]"
    }]
  }
}
```

#### Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32602 | Invalid params | One or more parameters are invalid |
| -32004 | Operation timeout | Search exceeded 30 second timeout |
| -32000 | Thunderbird not running | Thunderbird application is not active |

---

### thunderbird_messages_list

Retrieve a paginated list of messages from a specific folder.

#### Description
Lists messages in a folder with pagination support for efficient retrieval of large message collections.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `folderId` | string | Yes | ID of the folder to list messages from |
| `limit` | number | No | Maximum number of messages to return (default: 100, max: 1000) |
| `offset` | number | No | Number of messages to skip for pagination (default: 0) |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"messages\": [...],
    \"total\": 250,
    \"offset\": 0,
    \"limit\": 100,
    \"hasMore\": true
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
    "name": "thunderbird_messages_list",
    "arguments": {
      "folderId": "inbox-account1",
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

### thunderbird_messages_list_unread

List all unread messages across accounts or for a specific account.

#### Description
Retrieves unread messages, optionally filtered by account, sorted by date descending (newest first).

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `accountId` | string | No | Specific account ID to filter by (omit for all accounts) |
| `limit` | number | No | Maximum number of results (default: 100) |

#### Response Format

Same as `thunderbird_messages_search` response format.

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-003",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_messages_list_unread",
    "arguments": {
      "limit": 20
    }
  }
}
```

---

### thunderbird_messages_get

Retrieve complete details of a specific message.

#### Description
Fetches a single message with configurable detail level.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `messageId` | string | Yes | Unique identifier of the message |
| `format` | string | No | Level of detail: `headers` (default), `full`, or `raw` |

#### Format Options

- **headers**: Message metadata only (subject, from, to, date, flags)
- **full**: Headers + decoded body content (HTML and/or plain text)
- **raw**: Complete RFC 822 message source

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"id\": \"msg-123\",
    \"subject\": \"...\",
    \"from\": {...},
    \"to\": [...],
    \"date\": \"...\",
    \"headers\": {...},
    \"body\": {
      \"html\": \"<html>...\",
      \"plainText\": \"...\"
    },
    \"attachments\": [...]
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
    "name": "thunderbird_messages_get",
    "arguments": {
      "messageId": "msg-123",
      "format": "full"
    }
  }
}
```

---

### thunderbird_messages_move

Move messages to a different folder.

#### Description
Moves one or more messages to the specified destination folder. Original messages are removed from the source folder.

**Permission Required**: `messagesMove`

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `messageIds` | string[] | Yes | Array of message IDs to move |
| `destinationFolderId` | string | Yes | ID of the destination folder |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"movedCount\": 3,
    \"messageIds\": [\"msg-123\", \"msg-124\", \"msg-125\"]
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
    "name": "thunderbird_messages_move",
    "arguments": {
      "messageIds": ["msg-123", "msg-124"],
      "destinationFolderId": "folder-archive-2025"
    }
  }
}
```

---

### thunderbird_messages_copy

Copy messages to a different folder.

#### Description
Creates copies of messages in the destination folder while preserving originals.

**Permission Required**: `messagesMove`

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `messageIds` | string[] | Yes | Array of message IDs to copy |
| `destinationFolderId` | string | Yes | ID of the destination folder |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"copiedCount\": 2,
    \"newMessageIds\": [\"msg-234\", \"msg-235\"]
  }"
}
```

---

### thunderbird_messages_delete

Delete messages from Thunderbird.

#### Description
Deletes messages, either moving them to Trash or permanently removing them.

**Permission Required**: `messagesMove`

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `messageIds` | string[] | Yes | Array of message IDs to delete |
| `permanent` | boolean | No | If true, permanently delete; if false, move to Trash (default: false) |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"deletedCount\": 5,
    \"permanent\": false
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
    "name": "thunderbird_messages_delete",
    "arguments": {
      "messageIds": ["msg-100", "msg-101", "msg-102"],
      "permanent": false
    }
  }
}
```

---

### thunderbird_messages_update

Update message properties and flags.

#### Description
Modifies message metadata including read status, starred/flagged status, and tags.

**Permission Required**: `messagesUpdate`

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `messageId` | string | Yes | ID of the message to update |
| `read` | boolean | No | Set read/unread status |
| `flagged` | boolean | No | Set starred/flagged status |
| `tags` | string[] | No | Array of tag keys to apply (replaces existing tags) |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"messageId\": \"msg-123\",
    \"updated\": {
      \"read\": true,
      \"flagged\": false,
      \"tags\": [\"work\", \"important\"]
    }
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-007",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_messages_update",
    "arguments": {
      "messageId": "msg-123",
      "read": true,
      "flagged": true,
      "tags": ["important", "follow-up"]
    }
  }
}
```

---

### thunderbird_messages_archive

Archive messages using Thunderbird's archive functionality.

#### Description
Moves messages to the appropriate archive folder based on Thunderbird's archive settings (typically organized by year).

**Permission Required**: `messagesMove`

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `messageIds` | string[] | Yes | Array of message IDs to archive |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"archivedCount\": 10,
    \"archiveFolderId\": \"archives-2025\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-008",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_messages_archive",
    "arguments": {
      "messageIds": ["msg-200", "msg-201", "msg-202"]
    }
  }
}
```

---

## Common Error Codes

All message operations may return these error codes:

| Code | Message | Description |
|------|---------|-------------|
| -32000 | Thunderbird not running | Thunderbird application is not active |
| -32001 | Extension not installed | Thunderbird MCP extension not found |
| -32002 | Permission denied | Required permission not granted |
| -32003 | Resource not found | Message, folder, or account not found |
| -32004 | Operation timeout | Operation exceeded timeout limit |
| -32602 | Invalid params | Invalid or missing parameters |
| -32603 | Internal error | Unexpected internal error |

---

## Best Practices

### Search Optimization

- Use specific filters to reduce result set size
- Implement pagination for large result sets
- Specify `folderId` when possible to limit search scope
- Use date ranges to improve performance

### Batch Operations

- Move/copy/delete operations support multiple message IDs
- Batch operations are more efficient than individual calls
- Maximum recommended batch size: 100 messages per operation

### Read Status Management

- Update read status sparingly to respect user preferences
- Consider user notification settings when marking as read

### Body Content Access

- Use `format: headers` when body content is not needed
- Body content retrieval may be slower for large messages
- Consider privacy implications when accessing full message content

---

## Rate Limiting

The Messages API implements the following timeouts:

- **Search operations**: 30 seconds
- **CRUD operations**: 10 seconds
- **Individual message retrieval**: 10 seconds

Exceeding these limits will return error code `-32004` (Operation timeout).

---

## Security Considerations

- Message bodies are not included in search results by default
- Full body content requires explicit `format: full` parameter
- Sensitive headers (authentication tokens, etc.) are filtered
- All operations require appropriate Thunderbird permissions
- Native Messaging communication is sandboxed
