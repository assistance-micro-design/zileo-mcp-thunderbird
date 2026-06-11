# Compose API Documentation

This document describes all MCP tools for email composition operations in the Zileo MCP — Thunderbird.

## Overview

The Compose API provides comprehensive email composition capabilities including creating new emails, replying to and forwarding existing messages, editing drafts, and sending emails. All composition operations work with Thunderbird's native compose windows.

**Permission Required**: `compose`

---

## Tools

### thunderbird_compose_begin_new

Open a new email composition window with optional pre-filled content.

#### Description

Creates a new compose window that can be pre-populated with recipients, subject, and body content. Returns the tab ID that can be used for subsequent operations on the composition.

#### Parameters

| Name          | Type     | Required | Default | Description                                   |
| ------------- | -------- | -------- | ------- | --------------------------------------------- |
| `to`          | string[] | No       | -       | Recipient email addresses                     |
| `cc`          | string[] | No       | -       | CC email addresses                            |
| `bcc`         | string[] | No       | -       | BCC email addresses                           |
| `subject`     | string   | No       | -       | Email subject line                            |
| `body`        | string   | No       | -       | Email body content (HTML by default)          |
| `isPlainText` | boolean  | No       | false   | If true, body is treated as plain text        |
| `identityId`  | string   | No       | -       | Identity ID to use for sending (from address) |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"tabId\": 123,
    \"windowId\": 1
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_compose_begin_new",
    "arguments": {
      "to": ["recipient@example.com"],
      "subject": "Meeting Follow-up",
      "body": "<p>Hello,</p><p>Thank you for the meeting today.</p>",
      "isPlainText": false
    }
  }
}
```

---

### thunderbird_compose_begin_reply

Open a compose window to reply to an existing message.

#### Description

Creates a reply composition window for a specified message. The original message content is quoted in the reply body, and recipients are set based on the reply type.

#### Parameters

| Name        | Type   | Required | Default         | Description                                 |
| ----------- | ------ | -------- | --------------- | ------------------------------------------- |
| `messageId` | number | Yes      | -               | ID of the message to reply to               |
| `replyType` | string | No       | `replyToSender` | Reply type: `replyToSender` or `replyToAll` |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"tabId\": 124,
    \"windowId\": 1
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
    "name": "thunderbird_compose_begin_reply",
    "arguments": {
      "messageId": 12345,
      "replyType": "replyToAll"
    }
  }
}
```

#### Reply Types

- `replyToSender` - Reply only to the original sender
- `replyToAll` - Reply to sender and all recipients (To and CC)

---

### thunderbird_compose_begin_forward

Open a compose window to forward an existing message.

#### Description

Creates a forward composition window for a specified message. The original message can be forwarded inline (quoted in body) or as an attachment.

#### Parameters

| Name          | Type   | Required | Default         | Description                                            |
| ------------- | ------ | -------- | --------------- | ------------------------------------------------------ |
| `messageId`   | number | Yes      | -               | ID of the message to forward                           |
| `forwardType` | string | No       | `forwardInline` | Forward type: `forwardInline` or `forwardAsAttachment` |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"tabId\": 125,
    \"windowId\": 1
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
    "name": "thunderbird_compose_begin_forward",
    "arguments": {
      "messageId": 12345,
      "forwardType": "forwardInline"
    }
  }
}
```

#### Forward Types

- `forwardInline` - Original message content is quoted in the body
- `forwardAsAttachment` - Original message is attached as an .eml file

---

### thunderbird_compose_get_details

Get the current details of a compose window.

#### Description

Retrieves the current state of a composition including recipients, subject, body, and other properties. Useful for reviewing or modifying an existing composition.

#### Parameters

| Name    | Type   | Required | Description           |
| ------- | ------ | -------- | --------------------- |
| `tabId` | number | Yes      | ID of the compose tab |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"to\": [{\"email\": \"recipient@example.com\", \"name\": \"Recipient\"}],
    \"cc\": [],
    \"bcc\": [],
    \"subject\": \"Meeting Follow-up\",
    \"body\": \"<p>Hello...</p>\",
    \"isPlainText\": false,
    \"identityId\": \"identity-1\",
    \"attachments\": []
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
    "name": "thunderbird_compose_get_details",
    "arguments": {
      "tabId": 123
    }
  }
}
```

---

### thunderbird_compose_set_details

Update the content of an existing compose window.

#### Description

Modifies the recipients, subject, or body of an open composition. Only the specified fields are updated; others remain unchanged.

#### Parameters

| Name      | Type     | Required | Description             |
| --------- | -------- | -------- | ----------------------- |
| `tabId`   | number   | Yes      | ID of the compose tab   |
| `to`      | string[] | No       | New recipient addresses |
| `cc`      | string[] | No       | New CC addresses        |
| `bcc`     | string[] | No       | New BCC addresses       |
| `subject` | string   | No       | New subject line        |
| `body`    | string   | No       | New body content        |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true
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
    "name": "thunderbird_compose_set_details",
    "arguments": {
      "tabId": 123,
      "subject": "Updated: Meeting Follow-up",
      "cc": ["manager@example.com"]
    }
  }
}
```

---

### thunderbird_compose_save_draft

Save the current composition as a draft.

#### Description

Saves the composition to the Drafts folder without closing the compose window. The draft can be edited later and sent.

#### Parameters

| Name    | Type   | Required | Description           |
| ------- | ------ | -------- | --------------------- |
| `tabId` | number | Yes      | ID of the compose tab |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"messageId\": 67890,
    \"mode\": \"draft\"
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
    "name": "thunderbird_compose_save_draft",
    "arguments": {
      "tabId": 123
    }
  }
}
```

---

### thunderbird_compose_save_template

Save the current composition as a reusable template.

#### Description

Saves the composition to the Templates folder. Templates can be reused to create new emails with pre-filled content.

#### Parameters

| Name    | Type   | Required | Description           |
| ------- | ------ | -------- | --------------------- |
| `tabId` | number | Yes      | ID of the compose tab |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"messageId\": 67891,
    \"mode\": \"template\"
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
    "name": "thunderbird_compose_save_template",
    "arguments": {
      "tabId": 123
    }
  }
}
```

---

### thunderbird_compose_send

Send the email currently being composed.

#### Description

Sends the email from the compose window. Different send modes control whether the email is sent immediately or queued for later delivery.

#### Parameters

| Name    | Type   | Required | Default   | Description                                     |
| ------- | ------ | -------- | --------- | ----------------------------------------------- |
| `tabId` | number | Yes      | -         | ID of the compose tab                           |
| `mode`  | string | No       | `default` | Send mode: `default`, `sendNow`, or `sendLater` |

#### Send Modes

- `default` - Uses account's configured send behavior
- `sendNow` - Sends the email immediately
- `sendLater` - Queues the email in Outbox for later sending

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"mode\": \"sendNow\",
    \"messageId\": 67892
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
    "name": "thunderbird_compose_send",
    "arguments": {
      "tabId": 123,
      "mode": "sendNow"
    }
  }
}
```

#### Warning

Sending an email is irreversible. Ensure the composition is complete and correct before sending.

---

## Common Error Codes

All compose operations may return these error codes:

| Code   | Message                 | Description                                 |
| ------ | ----------------------- | ------------------------------------------- |
| -32000 | Thunderbird not running | Thunderbird application is not active       |
| -32001 | Extension not installed | Zileo MCP — Thunderbird extension not found |
| -32002 | Permission denied       | compose permission not granted              |
| -32003 | Resource not found      | Message, tab, or identity not found         |
| -32004 | Operation timeout       | Operation exceeded timeout limit (10s)      |
| -32602 | Invalid params          | Invalid email addresses or missing tab ID   |
| -32603 | Internal error          | Compose window closed or send failed        |

---

## Workflow Examples

### Compose and Send New Email

```
1. thunderbird_compose_begin_new → Get tabId
2. (Optional) thunderbird_compose_set_details → Modify content
3. thunderbird_compose_send → Send the email
```

### Reply to Email

```
1. thunderbird_messages_get → Read original message
2. thunderbird_compose_begin_reply → Open reply window
3. thunderbird_compose_set_details → Add additional content
4. thunderbird_compose_send → Send reply
```

### Save Draft for Later

```
1. thunderbird_compose_begin_new → Create composition
2. thunderbird_compose_set_details → Fill in content
3. thunderbird_compose_save_draft → Save as draft
4. (Later) Re-open draft from Drafts folder
5. thunderbird_compose_send → Send when ready
```

### Create Reusable Template

```
1. thunderbird_compose_begin_new → Create composition
2. thunderbird_compose_set_details → Define template content
3. thunderbird_compose_save_template → Save as template
```

---

## Best Practices

### Email Addresses

- Always validate email addresses before passing to compose tools
- Use proper email format: `user@domain.com`
- Email arrays can be empty but addresses must be valid when provided

### HTML vs Plain Text

- Default is HTML (`isPlainText: false`)
- Use plain text for simple messages without formatting
- HTML supports `<p>`, `<br>`, `<b>`, `<i>`, `<a>` and other standard tags
- Avoid inline styles; use semantic HTML

### Tab ID Management

- Store the `tabId` returned from `begin_*` operations
- Tab ID is required for all subsequent operations
- Tab becomes invalid when compose window is closed
- Handle cases where user manually closes the window

### Identity Selection

- Use `thunderbird_identities_list` to get available identities
- Specify `identityId` to send from a specific address
- Default identity is used if not specified

### Error Handling

- Check for `isError: true` in responses
- Handle cases where compose window was closed externally
- Implement retry logic for transient failures

---

## Security Considerations

- Compose operations require `compose` permission in extension
- Email content is not logged (privacy)
- BCC recipients are hidden from other recipients
- Templates are stored locally in Thunderbird profile
- No external validation of recipient addresses

---

## Permissions Summary

| Tool                                | compose  |
| ----------------------------------- | -------- |
| `thunderbird_compose_begin_new`     | Required |
| `thunderbird_compose_begin_reply`   | Required |
| `thunderbird_compose_begin_forward` | Required |
| `thunderbird_compose_get_details`   | Required |
| `thunderbird_compose_set_details`   | Required |
| `thunderbird_compose_save_draft`    | Required |
| `thunderbird_compose_save_template` | Required |
| `thunderbird_compose_send`          | Required |

All compose permissions must be granted in the Thunderbird extension's `manifest.json`.
