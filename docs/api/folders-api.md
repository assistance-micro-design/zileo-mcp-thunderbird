# Folders API Documentation

This document describes all MCP tools for folder/mailbox operations in the Zileo MCP — Thunderbird.

## Overview

The Folders API provides complete folder management capabilities including listing, creation, modification, organization, and bulk operations on email folders across all Thunderbird accounts.

**Base Permission Required**: `accountsRead`

---

## Tools

### thunderbird_folders_list

List all folders for an account or across all accounts.

#### Description

Retrieves the folder hierarchy with optional subfolder inclusion and account filtering.

#### Parameters

| Name                | Type    | Required | Description                                                      |
| ------------------- | ------- | -------- | ---------------------------------------------------------------- |
| `accountId`         | string  | No       | Specific account ID to list folders from (omit for all accounts) |
| `includeSubFolders` | boolean | No       | Include nested subfolders in results (default: true)             |

#### Response Format

```json
{
  "type": "text",
  "text": "[{
    \"id\": \"folder-inbox-1\",
    \"accountId\": \"account-1\",
    \"name\": \"Inbox\",
    \"path\": \"/Inbox\",
    \"type\": \"inbox\",
    \"totalMessageCount\": 150,
    \"unreadMessageCount\": 12,
    \"subFolders\": [{
      \"id\": \"folder-work-1\",
      \"name\": \"Work\",
      \"path\": \"/Inbox/Work\",
      \"type\": \"folder\",
      \"totalMessageCount\": 45,
      \"unreadMessageCount\": 3,
      \"subFolders\": []
    }]
  }]"
}
```

#### Folder Types

- `inbox` - Main inbox folder
- `drafts` - Draft messages
- `sent` - Sent messages
- `trash` - Deleted messages
- `junk` - Spam/junk messages
- `archives` - Archived messages
- `templates` - Message templates
- `folder` - User-created folder

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-010",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_folders_list",
    "arguments": {
      "accountId": "account-1",
      "includeSubFolders": true
    }
  }
}
```

#### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": "req-010",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":\"inbox-1\",\"accountId\":\"account-1\",\"name\":\"Inbox\",\"path\":\"/Inbox\",\"type\":\"inbox\",\"totalMessageCount\":250,\"unreadMessageCount\":15,\"subFolders\":[{\"id\":\"folder-clients-1\",\"name\":\"Clients\",\"path\":\"/Inbox/Clients\",\"type\":\"folder\",\"totalMessageCount\":78,\"unreadMessageCount\":5,\"subFolders\":[]}]}]"
      }
    ]
  }
}
```

---

### thunderbird_folders_get

Get detailed information about a specific folder.

#### Description

Retrieves complete metadata for a single folder including statistics and properties.

#### Parameters

| Name       | Type   | Required | Description                     |
| ---------- | ------ | -------- | ------------------------------- |
| `folderId` | string | Yes      | Unique identifier of the folder |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"id\": \"folder-123\",
    \"accountId\": \"account-1\",
    \"name\": \"Important Projects\",
    \"path\": \"/Inbox/Work/Important Projects\",
    \"type\": \"folder\",
    \"totalMessageCount\": 89,
    \"unreadMessageCount\": 7,
    \"totalSize\": 15728640,
    \"parentFolderId\": \"folder-work-1\",
    \"canAddMessages\": true,
    \"canDeleteMessages\": true,
    \"subFolders\": []
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-011",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_folders_get",
    "arguments": {
      "folderId": "folder-123"
    }
  }
}
```

---

### thunderbird_folders_create

Create a new subfolder within an existing folder.

#### Description

Creates a new folder as a child of the specified parent folder.

**Permission Required**: `accountsFolders`

#### Parameters

| Name             | Type   | Required | Description                                 |
| ---------------- | ------ | -------- | ------------------------------------------- |
| `parentFolderId` | string | Yes      | ID of the parent folder                     |
| `name`           | string | Yes      | Name of the new folder (no path separators) |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"folderId\": \"folder-456\",
    \"name\": \"Q1 2025\",
    \"path\": \"/Inbox/Projects/Q1 2025\",
    \"parentFolderId\": \"folder-projects-1\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-012",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_folders_create",
    "arguments": {
      "parentFolderId": "folder-projects-1",
      "name": "Q1 2025"
    }
  }
}
```

#### Error Codes

| Code   | Message            | Description                                         |
| ------ | ------------------ | --------------------------------------------------- |
| -32602 | Invalid params     | Folder name contains invalid characters or is empty |
| -32003 | Resource not found | Parent folder does not exist                        |
| -32603 | Internal error     | Folder already exists or creation failed            |

---

### thunderbird_folders_rename

Rename an existing folder.

#### Description

Changes the display name of a folder without affecting its contents or hierarchy.

**Permission Required**: `accountsFolders`

#### Parameters

| Name       | Type   | Required | Description                                               |
| ---------- | ------ | -------- | --------------------------------------------------------- |
| `folderId` | string | Yes      | ID of the folder to rename                                |
| `newName`  | string | Yes      | New name for the folder (1-255 chars, no path separators) |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"folderId\": \"folder-123\",
    \"oldName\": \"Old Projects\",
    \"newName\": \"Archive 2024\",
    \"path\": \"/Inbox/Archive 2024\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-013",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_folders_rename",
    "arguments": {
      "folderId": "folder-123",
      "newName": "Archive 2024"
    }
  }
}
```

#### Restrictions

- Cannot rename special folders (Inbox, Sent, Trash, etc.)
- New name must not conflict with existing sibling folders
- Name cannot contain path separators (/, \)

---

### thunderbird_folders_delete

Delete a folder and optionally its contents.

#### Description

Removes a folder from the account. Messages within the folder may be deleted or moved to Trash depending on account settings.

**Permission Required**: `accountsFolders`

#### Parameters

| Name       | Type   | Required | Description                |
| ---------- | ------ | -------- | -------------------------- |
| `folderId` | string | Yes      | ID of the folder to delete |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"folderId\": \"folder-123\",
    \"deletedMessageCount\": 45
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-014",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_folders_delete",
    "arguments": {
      "folderId": "folder-old-project-1"
    }
  }
}
```

#### Restrictions

- Cannot delete special system folders (Inbox, Sent, Trash, etc.)
- Deleting a folder with subfolders will delete the entire hierarchy
- Messages are typically moved to Trash, not permanently deleted

#### Warning

This operation cannot be undone. Messages may be recoverable from Trash unless permanently deleted.

---

### thunderbird_folders_move

Move a folder to a different location in the hierarchy.

#### Description

Relocates a folder and all its contents to become a subfolder of another folder.

**Permission Required**: `accountsFolders`

#### Parameters

| Name                  | Type   | Required | Description                 |
| --------------------- | ------ | -------- | --------------------------- |
| `folderId`            | string | Yes      | ID of the folder to move    |
| `destinationFolderId` | string | Yes      | ID of the new parent folder |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"folderId\": \"folder-123\",
    \"oldPath\": \"/Inbox/Temp\",
    \"newPath\": \"/Archives/2024/Temp\",
    \"destinationFolderId\": \"folder-archives-2024\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-015",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_folders_move",
    "arguments": {
      "folderId": "folder-temp-1",
      "destinationFolderId": "folder-archives-2024"
    }
  }
}
```

#### Restrictions

- Cannot move special system folders
- Cannot move a folder into one of its own subfolders (circular reference)
- Destination must be in the same account

---

### thunderbird_folders_mark_read

Mark all messages in a folder as read.

#### Description

Bulk operation to mark all messages within a folder as read.

**Permission Required**: `messagesUpdate`

#### Parameters

| Name       | Type   | Required | Description                   |
| ---------- | ------ | -------- | ----------------------------- |
| `folderId` | string | Yes      | ID of the folder to mark read |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"folderId\": \"folder-123\",
    \"markedCount\": 87
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-016",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_folders_mark_read",
    "arguments": {
      "folderId": "folder-inbox-1"
    }
  }
}
```

---

## Common Error Codes

All folder operations may return these error codes:

| Code   | Message                 | Description                                                  |
| ------ | ----------------------- | ------------------------------------------------------------ |
| -32000 | Thunderbird not running | Thunderbird application is not active                        |
| -32001 | Extension not installed | Zileo MCP — Thunderbird extension not found                  |
| -32002 | Permission denied       | Required permission not granted                              |
| -32003 | Resource not found      | Folder or account not found                                  |
| -32004 | Operation timeout       | Operation exceeded timeout limit (10s)                       |
| -32602 | Invalid params          | Invalid or missing parameters                                |
| -32603 | Internal error          | Folder operation failed (name conflict, system folder, etc.) |

---

## Best Practices

### Folder Hierarchy

- Keep folder hierarchies reasonably flat (3-4 levels maximum)
- Use descriptive names that indicate folder purpose
- Avoid creating too many top-level folders

### Naming Conventions

- Use consistent naming schemes across accounts
- Avoid special characters and path separators
- Keep names concise but meaningful

### Bulk Operations

- Use `thunderbird_folders_mark_read` for efficient bulk updates on a folder
- Consider folder size when performing operations on large folders
- Test folder operations on small folders before applying to large hierarchies

### Organization Patterns

**By Project**:

```
Inbox/
  ├── Project A/
  ├── Project B/
  └── Project C/
```

**By Date**:

```
Archives/
  ├── 2023/
  ├── 2024/
  └── 2025/
```

**By Client**:

```
Clients/
  ├── ACME Corp/
  ├── TechStart Inc/
  └── Global Solutions/
```

---

## Folder Statistics

Folder objects include useful statistics:

- `totalMessageCount` - Total messages in folder (including read)
- `unreadMessageCount` - Number of unread messages
- `totalSize` - Total size in bytes (when available)

These statistics are updated automatically by Thunderbird and reflect the current state.

---

## Special Folders

Thunderbird maintains several special folders that have restrictions:

| Folder Type | Can Rename | Can Delete | Can Move | Notes                        |
| ----------- | ---------- | ---------- | -------- | ---------------------------- |
| Inbox       | No         | No         | No       | Primary incoming mail folder |
| Sent        | No         | No         | No       | Stores sent messages         |
| Drafts      | No         | No         | No       | Temporary draft storage      |
| Trash       | No         | No         | No       | Deleted messages             |
| Junk        | No         | No         | No       | Spam/junk messages           |
| Archives    | No         | No         | No       | Archive folder               |
| Templates   | No         | No         | No       | Message templates            |
| Custom      | Yes        | Yes        | Yes      | User-created folders         |

---

## Performance Considerations

### Operation Timeouts

- Folder listing: Fast (< 1 second for typical accounts)
- Folder creation/rename: Fast (< 1 second)
- Folder deletion: Moderate (depends on message count)
- Mark all read: Slow for large folders (may take several seconds)

### Large Folder Handling

- Folders with >10,000 messages may have slower operations
- Consider pagination when working with folder contents
- Use specific folder IDs in message operations to improve performance

---

## Security Considerations

- Folder operations require appropriate Thunderbird permissions
- Special system folders are protected from modification
- Deleting folders may permanently remove data
- Folder hierarchy changes affect all applications accessing the account
- Use caution with bulk operations on important folders
