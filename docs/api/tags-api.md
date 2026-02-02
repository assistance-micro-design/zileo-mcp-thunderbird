# Tags API Documentation

This document describes all MCP tools for email tag/label operations in the Thunderbird MCP Server.

## Overview

The Tags API provides management of email tags (also known as labels) in Thunderbird. Tags can be applied to messages to categorize and organize them. Each tag has a unique key, a display name, and a color.

**Permission Required**: `messagesRead`, `messagesTags`

---

## Tools

### thunderbird_tags_list

List all available message tags.

#### Description

Retrieves all tags configured in Thunderbird, including built-in tags (Important, Work, Personal, etc.) and user-created tags.

#### Parameters

None

#### Response Format

```json
{
  "type": "text",
  "text": "[
    {
      \"key\": \"$label1\",
      \"tag\": \"Important\",
      \"color\": \"#FF0000\",
      \"ordinal\": \"\"
    },
    {
      \"key\": \"$label2\",
      \"tag\": \"Work\",
      \"color\": \"#FF9900\",
      \"ordinal\": \"\"
    },
    {
      \"key\": \"$label3\",
      \"tag\": \"Personal\",
      \"color\": \"#009900\",
      \"ordinal\": \"\"
    },
    {
      \"key\": \"$label4\",
      \"tag\": \"To Do\",
      \"color\": \"#3333FF\",
      \"ordinal\": \"\"
    },
    {
      \"key\": \"$label5\",
      \"tag\": \"Later\",
      \"color\": \"#993399\",
      \"ordinal\": \"\"
    },
    {
      \"key\": \"project_alpha\",
      \"tag\": \"Project Alpha\",
      \"color\": \"#00CCFF\",
      \"ordinal\": \"\"
    }
  ]"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-010",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_tags_list",
    "arguments": {}
  }
}
```

#### Built-in Tags

Thunderbird includes 5 default tags with reserved keys:

| Key       | Default Name | Default Color    |
| --------- | ------------ | ---------------- |
| `$label1` | Important    | #FF0000 (Red)    |
| `$label2` | Work         | #FF9900 (Orange) |
| `$label3` | Personal     | #009900 (Green)  |
| `$label4` | To Do        | #3333FF (Blue)   |
| `$label5` | Later        | #993399 (Purple) |

---

### thunderbird_tags_create

Create a new message tag with a specific key, name, and color.

#### Description

Creates a new tag that can be applied to messages. The key must be unique and follow naming constraints.

#### Parameters

| Name    | Type   | Required | Description                                                 |
| ------- | ------ | -------- | ----------------------------------------------------------- |
| `key`   | string | Yes      | Unique identifier (1-50 chars, letters/numbers/underscores) |
| `tag`   | string | Yes      | Display name for the tag (1-100 chars)                      |
| `color` | string | Yes      | Tag color in hex format (#RRGGBB)                           |

#### Key Constraints

- Minimum 1 character, maximum 50 characters
- Only alphanumeric characters and underscores allowed
- Case-insensitive (stored as provided)
- Must not conflict with existing tag keys

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"key\": \"project_beta\",
    \"tag\": \"Project Beta\",
    \"color\": \"#FF6600\"
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
    "name": "thunderbird_tags_create",
    "arguments": {
      "key": "project_beta",
      "tag": "Project Beta",
      "color": "#FF6600"
    }
  }
}
```

#### Error Cases

| Condition            | Error               |
| -------------------- | ------------------- |
| Key already exists   | Duplicate key error |
| Invalid key format   | Validation error    |
| Invalid color format | Validation error    |

---

### thunderbird_tags_update

Update an existing tag's display name or color.

#### Description

Modifies the display name and/or color of an existing tag. At least one of `tag` or `color` must be provided.

#### Parameters

| Name    | Type   | Required | Description                       |
| ------- | ------ | -------- | --------------------------------- |
| `key`   | string | Yes      | Key of the tag to update          |
| `tag`   | string | No       | New display name (1-100 chars)    |
| `color` | string | No       | New color in hex format (#RRGGBB) |

**Note**: At least one of `tag` or `color` must be provided.

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"key\": \"project_beta\",
    \"tag\": \"Project Beta - Active\",
    \"color\": \"#00FF00\"
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
    "name": "thunderbird_tags_update",
    "arguments": {
      "key": "project_beta",
      "tag": "Project Beta - Active",
      "color": "#00FF00"
    }
  }
}
```

#### Example: Update Color Only

```json
{
  "name": "thunderbird_tags_update",
  "arguments": {
    "key": "$label1",
    "color": "#CC0000"
  }
}
```

#### Example: Update Name Only

```json
{
  "name": "thunderbird_tags_update",
  "arguments": {
    "key": "$label2",
    "tag": "Work Priority"
  }
}
```

---

### thunderbird_tags_delete

Delete a tag from Thunderbird.

#### Description

Permanently removes a tag. The tag is also removed from all messages that had it applied.

#### Parameters

| Name  | Type   | Required | Description              |
| ----- | ------ | -------- | ------------------------ |
| `key` | string | Yes      | Key of the tag to delete |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"key\": \"project_beta\"
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
    "name": "thunderbird_tags_delete",
    "arguments": {
      "key": "project_beta"
    }
  }
}
```

#### Warning

- Deleting a tag removes it from all messages
- This operation cannot be undone
- Built-in tags ($label1-$label5) can be deleted but may be recreated by Thunderbird

---

## Common Error Codes

All tag operations may return these error codes:

| Code   | Message                 | Description                                     |
| ------ | ----------------------- | ----------------------------------------------- |
| -32000 | Thunderbird not running | Thunderbird application is not active           |
| -32001 | Extension not installed | Thunderbird MCP extension not found             |
| -32002 | Permission denied       | messagesTags permission not granted             |
| -32003 | Resource not found      | Tag key does not exist                          |
| -32602 | Invalid params          | Invalid key format, color format, or empty name |
| -32603 | Internal error          | Tag already exists or deletion failed           |

---

## Applying Tags to Messages

Tags are applied to messages using the `thunderbird_messages_update` tool:

```json
{
  "name": "thunderbird_messages_update",
  "arguments": {
    "messageId": 12345,
    "tags": ["$label1", "project_beta"]
  }
}
```

**Note**: The tags array replaces existing tags. To add a tag, include all existing tags plus the new one.

---

## Color Reference

### Recommended Color Palette

| Color Name | Hex Code | Use Case         |
| ---------- | -------- | ---------------- |
| Red        | #FF0000  | Urgent/Important |
| Orange     | #FF9900  | Work-related     |
| Yellow     | #FFCC00  | Pending/Review   |
| Green      | #009900  | Personal/Done    |
| Blue       | #3333FF  | To Do            |
| Purple     | #993399  | Later/Defer      |
| Cyan       | #00CCFF  | Projects         |
| Pink       | #FF66CC  | Social           |
| Gray       | #666666  | Archive          |

### Color Format

- Must be exactly 7 characters: `#RRGGBB`
- Hex digits: 0-9, A-F (case-insensitive)
- Examples: `#FF0000`, `#00ff00`, `#0066CC`

---

## Best Practices

### Tag Key Naming

- Use descriptive, lowercase keys: `project_alpha`, `client_acme`
- Avoid spaces and special characters
- Use underscores for word separation
- Keep keys concise but meaningful

### Tag Organization

- Create a consistent tagging taxonomy
- Use prefixes for related tags: `client_`, `project_`, `status_`
- Limit total tags to manageable number (10-20 recommended)
- Review and clean up unused tags periodically

### Color Usage

- Use consistent colors for tag categories
- High-contrast colors improve visibility
- Avoid very light colors (hard to see)
- Consider color blindness (avoid red/green only distinctions)

### Performance

- Tag operations are fast and lightweight
- Tags are stored locally in Thunderbird profile
- No synchronization delays for local tags
- IMAP keywords may have server-specific limitations

---

## Integration with Messages

### Search by Tag

```json
{
  "name": "thunderbird_messages_search",
  "arguments": {
    "tags": ["$label1", "project_beta"],
    "limit": 50
  }
}
```

### Update Message Tags

```json
{
  "name": "thunderbird_messages_update",
  "arguments": {
    "messageId": 12345,
    "tags": ["$label1", "project_beta", "urgent"]
  }
}
```

### Remove All Tags

```json
{
  "name": "thunderbird_messages_update",
  "arguments": {
    "messageId": 12345,
    "tags": []
  }
}
```

---

## Security Considerations

- Tags are stored locally in Thunderbird profile
- Tag keys may be visible in IMAP keywords
- No sensitive data should be stored in tag names
- Tag operations do not require network access

---

## Permissions Summary

| Tool                      | messagesRead | messagesTags |
| ------------------------- | ------------ | ------------ |
| `thunderbird_tags_list`   | Required     | -            |
| `thunderbird_tags_create` | -            | Required     |
| `thunderbird_tags_update` | -            | Required     |
| `thunderbird_tags_delete` | -            | Required     |

All permissions must be granted in the Thunderbird extension's `manifest.json`.
