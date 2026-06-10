# Messages API Documentation

This document describes all MCP tools for email/message operations in the Thunderbird MCP Server.

## Overview

The Messages API provides comprehensive email management capabilities including search, retrieval, manipulation, and organization of email messages across all Thunderbird accounts.

**Base Permission Required**: `messagesRead`

---

## Tools

### thunderbird_messages_search

Search for messages with advanced filtering criteria.

#### Description

Performs a comprehensive search across email messages with support for multiple filter parameters including subject, sender, recipient, body content, tags, read status, flagged status, and date ranges. The search uses Thunderbird's native query API for efficient filtering.

#### Parameters

| Name        | Type     | Required | Default | Description                                            |
| ----------- | -------- | -------- | ------- | ------------------------------------------------------ |
| `subject`   | string   | No       | -       | Search term to match in email subject                  |
| `from`      | string   | No       | -       | Email address or name of sender to filter by           |
| `to`        | string   | No       | -       | Email address or name of recipient to filter by        |
| `body`      | string   | No       | -       | Search term to match in email body content             |
| `tags`      | string[] | No       | -       | Array of tag keys to filter by (matches any tag)       |
| `unread`    | boolean  | No       | -       | Filter by read/unread status (true = unread only)      |
| `flagged`   | boolean  | No       | -       | Filter by flagged/starred status (true = flagged only) |
| `dateFrom`  | string   | No       | -       | Start date for date range filter (ISO 8601 format)     |
| `dateTo`    | string   | No       | -       | End date for date range filter (ISO 8601 format)       |
| `folderId`  | string   | No       | -       | Specific folder ID to search within                    |
| `accountId` | string   | No       | -       | Specific account ID to search within                   |
| `limit`     | number   | No       | 50      | Maximum number of results to return (max: 1000)        |
| `sortBy`    | string   | No       | `date`  | Sort field: `date`, `subject`, or `author`             |
| `sortOrder` | string   | No       | `desc`  | Sort direction: `asc` or `desc`                        |

#### Response Format

Returns a pagination envelope containing the matching message headers:

```json
{
  "content": [{
    "type": "text",
    "text": "{
      \"messages\": [
        {
          \"id\": 12345,
          \"subject\": \"Project update - Q1 2025\",
          \"author\": \"John Doe <john.doe@example.com>\",
          \"date\": \"2025-03-15T14:30:00Z\",
          \"read\": false,
          \"flagged\": false,
          \"tags\": [\"work\", \"important\"],
          \"folderId\": \"inbox-1\"
        }
      ],
      \"total\": 1,
      \"hasMore\": false,
      \"scanComplete\": true
    }"
  }]
}
```

See [Pagination semantics](#pagination-semantics) for `total`/`hasMore`/`scanComplete`.

#### Example Request

```json
{
  "name": "thunderbird_messages_search",
  "arguments": {
    "subject": "invoice",
    "unread": true,
    "dateFrom": "2025-01-01T00:00:00Z",
    "tags": ["finance"],
    "limit": 20
  }
}
```

#### Permission Required

- `messagesRead`

---

### thunderbird_messages_list

Retrieve a paginated list of messages from a specific folder.

#### Description

Lists all messages in a specified folder with pagination support for efficient retrieval of large message collections. Returns message headers with pagination metadata.

#### Parameters

| Name        | Type   | Required | Default | Description                                        |
| ----------- | ------ | -------- | ------- | -------------------------------------------------- |
| `folderId`  | string | Yes      | -       | ID of the folder to list messages from             |
| `limit`     | number | No       | 100     | Maximum number of messages per page (max: 1000)    |
| `offset`    | number | No       | 0       | Number of messages to skip for pagination (min: 0) |
| `sortBy`    | string | No       | `date`  | Sort field: `date`, `subject`, or `author`         |
| `sortOrder` | string | No       | `desc`  | Sort direction: `asc` or `desc`                    |

#### Response Format

Returns a paginated list with metadata. The whole folder is enumerated
(up to `MAX_SCAN` = 5000 messages) **before** sorting, so `total` is the
real folder count and `offset` paginates globally, not within one
Thunderbird-internal page:

```json
{
  "content": [{
    "type": "text",
    "text": "{
      \"messages\": [...],
      \"total\": 250,
      \"offset\": 0,
      \"limit\": 100,
      \"hasMore\": true,
      \"scanComplete\": true
    }"
  }]
}
```

See [Pagination semantics](#pagination-semantics).

#### Example Request

```json
{
  "name": "thunderbird_messages_list",
  "arguments": {
    "folderId": "inbox-account1",
    "limit": 50,
    "offset": 100
  }
}
```

#### Permission Required

- `messagesRead`

---

### thunderbird_messages_list_unread

List all unread messages across accounts or for a specific account.

#### Description

Retrieves unread messages using a search query with `unread: true` filter. Can be scoped to a specific account or search across all accounts. Results are sorted by date descending (newest first).

#### Parameters

| Name        | Type   | Required | Default | Description                                              |
| ----------- | ------ | -------- | ------- | -------------------------------------------------------- |
| `accountId` | string | No       | -       | Specific account ID to filter by (omit for all accounts) |
| `limit`     | number | No       | 50      | Maximum number of results (max: 1000)                    |
| `sortBy`    | string | No       | `date`  | Sort field: `date`, `subject`, or `author`               |
| `sortOrder` | string | No       | `desc`  | Sort direction: `asc` or `desc`                          |

#### Response Format

Same as `thunderbird_messages_search`: a `{ messages, total, hasMore, scanComplete }` envelope.

#### Example Request

```json
{
  "name": "thunderbird_messages_list_unread",
  "arguments": {
    "accountId": "account1",
    "limit": 30
  }
}
```

#### Permission Required

- `messagesRead`

---

### thunderbird_messages_list_recent

List the most recent messages across all folders.

#### Description

Retrieves the latest messages across all folders using date-based search. Ideal for "show me my latest emails" scenarios without requiring a specific folder ID. Results are sorted by date descending (newest first).

#### Parameters

| Name        | Type   | Required | Default | Description                                              |
| ----------- | ------ | -------- | ------- | -------------------------------------------------------- |
| `accountId` | string | No       | -       | Specific account ID to filter by (omit for all accounts) |
| `limit`     | number | No       | 20      | Maximum number of results (max: 100)                     |
| `hoursAgo`  | number | No       | 24      | How many hours back to search (max: 168 = 7 days)        |
| `sortBy`    | string | No       | `date`  | Sort field: `date`, `subject`, or `author`               |
| `sortOrder` | string | No       | `desc`  | Sort direction: `asc` or `desc`                          |

#### Response Format

Same as `thunderbird_messages_search`: a `{ messages, total, hasMore, scanComplete }` envelope.

#### Example Request

```json
{
  "name": "thunderbird_messages_list_recent",
  "arguments": {
    "limit": 10,
    "hoursAgo": 48
  }
}
```

#### Permission Required

- `messagesRead`

---

### thunderbird_messages_get

Retrieve complete details of a specific message.

#### Description

Fetches a single message with configurable detail level. Three formats are available:

- `headers`: Message metadata only (fast, minimal data)
- `full`: Headers + MIME parts with decoded content
- `raw`: Complete RFC 822 message source

#### Parameters

| Name        | Type   | Required | Default   | Description                                  |
| ----------- | ------ | -------- | --------- | -------------------------------------------- |
| `messageId` | number | Yes      | -         | Unique numeric identifier of the message     |
| `format`    | string | No       | `headers` | Level of detail: `headers`, `full`, or `raw` |

#### Format Options

- **headers**: Message metadata only (subject, from, to, date, flags, size)
- **full**: Headers + MIME parts array with decoded body content
- **raw**: Complete RFC 822 message source as plain text

#### Response Format

**Headers format:**

```json
{
  "content": [{
    "type": "text",
    "text": "{
      \"id\": 12345,
      \"subject\": \"Meeting notes\",
      \"from\": {\"name\": \"...\", \"email\": \"...\"},
      \"to\": [{\"name\": \"...\", \"email\": \"...\"}],
      \"date\": \"2025-03-15T14:30:00Z\",
      \"read\": false,
      \"flagged\": true,
      \"tags\": [\"important\"],
      \"folderId\": \"inbox-1\",
      \"size\": 4096
    }"
  }]
}
```

**Full format:**

```json
{
  "content": [{
    "type": "text",
    "text": "{
      \"id\": 12345,
      \"subject\": \"...\",
      \"parts\": [
        {\"contentType\": \"text/plain\", \"body\": \"...\"},
        {\"contentType\": \"text/html\", \"body\": \"<html>...\"}
      ],
      \"headers\": {
        \"message-id\": \"<...>\",
        \"references\": \"<...>\"
      }
    }"
  }]
}
```

**Raw format:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "\"From: sender@example.com\\r\\nTo: recipient@example.com\\r\\nSubject: Test\\r\\n\\r\\nMessage body...\""
    }
  ]
}
```

#### Example Request

```json
{
  "name": "thunderbird_messages_get",
  "arguments": {
    "messageId": 12345,
    "format": "full"
  }
}
```

#### Permission Required

- `messagesRead`

---

### thunderbird_messages_move

Move one or more messages to a different folder.

#### Description

Moves messages to the specified destination folder. Original messages are removed from the source folder. This is an atomic operation - either all messages are moved or none are moved.

#### Parameters

| Name                  | Type     | Required | Description                                       |
| --------------------- | -------- | -------- | ------------------------------------------------- |
| `messageIds`          | number[] | Yes      | Array of message IDs to move (minimum: 1 message) |
| `destinationFolderId` | string   | Yes      | ID of the destination folder                      |

#### Response Format

```json
{
  "content": [{
    "type": "text",
    "text": "{
      \"success\": true,
      \"movedCount\": 3
    }"
  }]
}
```

#### Example Request

```json
{
  "name": "thunderbird_messages_move",
  "arguments": {
    "messageIds": [12345, 12346, 12347],
    "destinationFolderId": "folder-archive-2025"
  }
}
```

#### Permission Required

- `messagesRead`
- `messagesMove`

---

### thunderbird_messages_copy

Copy one or more messages to a different folder.

#### Description

Creates copies of messages in the destination folder while preserving originals in the source folder. New message IDs are assigned to the copied messages.

#### Parameters

| Name                  | Type     | Required | Description                                       |
| --------------------- | -------- | -------- | ------------------------------------------------- |
| `messageIds`          | number[] | Yes      | Array of message IDs to copy (minimum: 1 message) |
| `destinationFolderId` | string   | Yes      | ID of the destination folder                      |

#### Response Format

```json
{
  "content": [{
    "type": "text",
    "text": "{
      \"success\": true,
      \"copiedCount\": 2
    }"
  }]
}
```

#### Example Request

```json
{
  "name": "thunderbird_messages_copy",
  "arguments": {
    "messageIds": [12345, 12346],
    "destinationFolderId": "folder-backup"
  }
}
```

#### Permission Required

- `messagesRead`
- `messagesMove`

---

### thunderbird_messages_delete

Delete one or more messages from Thunderbird.

#### Description

Deletes messages, either moving them to the Trash folder (soft delete) or permanently removing them (hard delete). Permanent deletion cannot be undone.

#### Parameters

| Name         | Type     | Required | Default | Description                                          |
| ------------ | -------- | -------- | ------- | ---------------------------------------------------- |
| `messageIds` | number[] | Yes      | -       | Array of message IDs to delete (minimum: 1 message)  |
| `permanent`  | boolean  | No       | false   | If true, permanently delete; if false, move to Trash |

#### Response Format

```json
{
  "content": [{
    "type": "text",
    "text": "{
      \"success\": true,
      \"deletedCount\": 5,
      \"permanent\": false
    }"
  }]
}
```

#### Example Request

```json
{
  "name": "thunderbird_messages_delete",
  "arguments": {
    "messageIds": [12345, 12346, 12347],
    "permanent": false
  }
}
```

#### Permission Required

- `messagesRead`
- `messagesMove`

#### Warning

Setting `permanent: true` will bypass the Trash folder and permanently delete messages. This operation cannot be undone.

---

### thunderbird_messages_update

Update message properties and flags.

#### Description

Modifies message metadata including read status, starred/flagged status, junk status, and tags. At least one property must be specified for update. Tags are replaced entirely (not merged).

#### Parameters

| Name        | Type     | Required | Description                                         |
| ----------- | -------- | -------- | --------------------------------------------------- |
| `messageId` | number   | Yes      | ID of the message to update                         |
| `read`      | boolean  | No       | Set read/unread status                              |
| `flagged`   | boolean  | No       | Set starred/flagged status                          |
| `junk`      | boolean  | No       | Mark as junk/spam or not junk                       |
| `tags`      | string[] | No       | Array of tag keys to apply (replaces existing tags) |

#### Response Format

```json
{
  "content": [{
    "type": "text",
    "text": "{
      \"success\": true
    }"
  }]
}
```

#### Example Request

```json
{
  "name": "thunderbird_messages_update",
  "arguments": {
    "messageId": 12345,
    "read": true,
    "flagged": true,
    "tags": ["important", "follow-up"]
  }
}
```

#### Permission Required

- `messagesRead`
- `messagesUpdate`

#### Notes

- At least one optional property must be provided
- Tags are replaced entirely - to add tags, include both existing and new tags
- Tag keys must match existing Thunderbird tags

---

### thunderbird_messages_archive

Archive one or more messages using Thunderbird's archive functionality.

#### Description

Moves messages to the appropriate archive folder based on Thunderbird's archive settings. Archive folder structure is typically organized by year and automatically determined by Thunderbird.

#### Parameters

| Name         | Type     | Required | Description                                          |
| ------------ | -------- | -------- | ---------------------------------------------------- |
| `messageIds` | number[] | Yes      | Array of message IDs to archive (minimum: 1 message) |

#### Response Format

```json
{
  "content": [{
    "type": "text",
    "text": "{
      \"success\": true,
      \"archivedCount\": 10
    }"
  }]
}
```

#### Example Request

```json
{
  "name": "thunderbird_messages_archive",
  "arguments": {
    "messageIds": [12345, 12346, 12347]
  }
}
```

#### Permission Required

- `messagesRead`
- `messagesMove`

#### Notes

- Archive folder location depends on Thunderbird account settings
- Messages are typically organized by year (e.g., Archives/2025)
- Archive structure cannot be customized through this API

---

## Pagination semantics

`messenger.messages.list()`/`query()` return their results in pages of
~100 messages. Since v1.4.0 the extension drains every page
(`messages.continueList()`) before sorting and slicing, bounded by
**`MAX_SCAN` = 5000** accumulated messages per request:

| Field          | Meaning                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------- |
| `total`        | Real number of matching messages when `scanComplete` is `true`; otherwise a **lower bound** (number scanned) |
| `hasMore`      | More results exist beyond `limit`/`offset`, or the scan was incomplete                        |
| `scanComplete` | `false` means the `MAX_SCAN` bound was hit and the enumeration was released (`abortList()`) — narrow the filters (folder, date range) for an exhaustive result |

Sorting (`sortBy`/`sortOrder`) is applied over the **full scan**, before
`offset`/`limit`, so pagination is stable across the whole result set.
Truncation is never silent: an incomplete scan is always flagged.

## Common Error Codes

All message operations may return these JSON-RPC error codes:

| Code   | Message                 | Description                                           |
| ------ | ----------------------- | ----------------------------------------------------- |
| -32000 | Thunderbird not running | Thunderbird application is not active                 |
| -32001 | Extension not installed | Thunderbird MCP extension not found                   |
| -32002 | Permission denied       | Required permission not granted in extension          |
| -32003 | Resource not found      | Message, folder, or account not found                 |
| -32004 | Operation timeout       | Operation exceeded timeout limit                      |
| -32600 | Invalid request         | Malformed JSON-RPC request                            |
| -32601 | Method not found        | Tool name not recognized                              |
| -32602 | Invalid params          | Invalid or missing parameters (Zod validation failed) |
| -32603 | Internal error          | Unexpected internal error                             |

---

## Permissions Summary

Different operations require different permission combinations:

| Tool                               | messagesRead | messagesMove | messagesUpdate |
| ---------------------------------- | ------------ | ------------ | -------------- |
| `thunderbird_messages_search`      | Required     | -            | -              |
| `thunderbird_messages_list`        | Required     | -            | -              |
| `thunderbird_messages_list_unread` | Required     | -            | -              |
| `thunderbird_messages_get`         | Required     | -            | -              |
| `thunderbird_messages_move`        | Required     | Required     | -              |
| `thunderbird_messages_copy`        | Required     | Required     | -              |
| `thunderbird_messages_delete`      | Required     | Required     | -              |
| `thunderbird_messages_update`      | Required     | -            | Required       |
| `thunderbird_messages_archive`     | Required     | Required     | -              |

All permissions must be granted in the Thunderbird extension's `manifest.json`.

---

## Best Practices

### Search Optimization

- Use specific filters to reduce result set size
- Implement pagination for large result sets using `limit`
- Specify `folderId` when possible to limit search scope
- Use date ranges (`dateFrom`/`dateTo`) to improve performance
- Combine multiple filters for precise results

### Batch Operations

- Move/copy/delete/archive operations support multiple message IDs
- Batch operations are more efficient than individual calls
- Recommended batch size: 100 messages per operation
- Maximum batch size: 1000 messages (enforced by Zod validation)

### Format Selection

- Use `format: "headers"` when body content is not needed (faster)
- Use `format: "full"` for MIME parts and decoded content
- Use `format: "raw"` for archival, migration, or debugging
- Body content retrieval may be slower for large messages with attachments

### Read Status Management

- Update read status sparingly to respect user preferences
- Consider user notification settings when marking as read
- Batch read status updates when possible using `thunderbird_messages_update`

### Tag Management

- Tag arrays in `thunderbird_messages_update` replace existing tags
- To add tags, retrieve current tags first and merge with new tags
- Tag keys must match existing Thunderbird tags (case-sensitive)
- Tags are account-specific - verify tag exists before applying

---

## Rate Limiting and Timeouts

The Messages API implements the following timeout constraints:

- **Search operations**: 30 seconds maximum
- **CRUD operations**: 10 seconds maximum per operation
- **Individual message retrieval**: 10 seconds maximum
- **Batch operations**: 30 seconds maximum

Exceeding these limits will return error code `-32004` (Operation timeout).

**Recommendations:**

- Keep search queries focused with specific filters
- Limit batch operations to 100 messages for reliability
- Implement retry logic with fixed delay for timeouts
- Use pagination for large result sets

---

## Security Considerations

### Data Access

- Message bodies are not included in search/list results by default
- Full body content requires explicit `format: "full"` or `format: "raw"`
- Sensitive headers (authentication tokens, etc.) may be filtered by Thunderbird
- All operations require appropriate extension permissions

### Communication Security

- Native Messaging communication is sandboxed by browser security model
- WebSocket connections use localhost-only binding
- No external network access required for message operations
- Extension manifest declares all required permissions explicitly

### Privacy

- Be mindful of accessing message body content
- Consider user privacy when searching across accounts
- Log message operations appropriately (avoid logging sensitive content)
- Respect user folder organization and tagging schemes

---

## Parameter Validation

All parameters are validated using Zod schemas before execution:

| Validation          | Rule                            | Error Code |
| ------------------- | ------------------------------- | ---------- |
| `messageId`         | Integer                         | -32602     |
| `messageIds`        | Non-empty array of integers     | -32602     |
| `limit`             | 1-1000 (1-100 for list_recent)  | -32602     |
| `offset`            | >= 0                            | -32602     |
| `format`            | enum ["headers", "full", "raw"] | -32602     |
| `folderId`          | Non-empty string                | -32602     |
| `accountId`         | Non-empty string                | -32602     |
| `tags`              | Array of strings                | -32602     |
| `dateFrom`/`dateTo` | ISO 8601 string                 | -32602     |

Failed validation returns a JSON-RPC error with detailed parameter information.

---

## Implementation Notes

### Extension API Usage

The Messages API wraps Thunderbird's `messenger.messages.*` WebExtension APIs:

- `messenger.messages.query()` - Used by search/list operations
- `messenger.messages.list()` - Used by folder listing
- `messenger.messages.get()` - Used for headers format
- `messenger.messages.getFull()` - Used for full format
- `messenger.messages.getRaw()` - Used for raw format
- `messenger.messages.update()` - Used for property updates
- `messenger.messages.move()` - Used for move/archive operations
- `messenger.messages.copy()` - Used for copy operations
- `messenger.messages.delete()` - Used for delete operations
- `messenger.messages.archive()` - Used for archive operations

### Native Messaging Actions

Internal message routing uses these action constants:

- `MESSAGES_SEARCH` - Search with filters
- `MESSAGES_LIST` - List folder contents
- `MESSAGES_GET` - Get headers only
- `MESSAGES_GET_FULL` - Get with MIME parts
- `MESSAGES_GET_RAW` - Get RFC 822 source
- `MESSAGES_MOVE` - Move messages
- `MESSAGES_COPY` - Copy messages
- `MESSAGES_DELETE` - Delete messages
- `MESSAGES_UPDATE` - Update properties
- `MESSAGES_ARCHIVE` - Archive messages

---

## Related APIs

- [Folders API](./folders-api.md) - Folder management operations
- [Tags API](./tags-api.md) - Tag creation and management
- [Accounts API](./accounts-api.md) - Account information
