# Accounts API Documentation

This document describes all MCP tools for account and identity operations in the Thunderbird MCP Server.

## Overview

The Accounts API provides read-only access to email account configuration and identities in Thunderbird. This includes account metadata, server settings, and sender identities (from addresses).

**Permission Required**: `accountsRead`

---

## Tools

### thunderbird_accounts_list

List all configured email accounts.

#### Description

Retrieves all email accounts configured in Thunderbird, including their basic properties and root folder references.

#### Parameters

None

#### Response Format

```json
{
  "type": "text",
  "text": "[
    {
      \"id\": \"account1\",
      \"name\": \"Personal Email\",
      \"type\": \"imap\",
      \"rootFolderId\": \"folder-root-1\",
      \"identities\": [
        {
          \"id\": \"identity1\",
          \"name\": \"Jean Dupont\",
          \"email\": \"jean.dupont@example.com\"
        }
      ]
    },
    {
      \"id\": \"account2\",
      \"name\": \"Work Email\",
      \"type\": \"imap\",
      \"rootFolderId\": \"folder-root-2\",
      \"identities\": [
        {
          \"id\": \"identity2\",
          \"name\": \"Jean Dupont\",
          \"email\": \"j.dupont@company.com\"
        }
      ]
    }
  ]"
}
```

#### Account Properties

| Property       | Type     | Description                          |
| -------------- | -------- | ------------------------------------ |
| `id`           | string   | Unique account identifier            |
| `name`         | string   | Account display name                 |
| `type`         | string   | Account type (imap, pop3, nntp, none)|
| `rootFolderId` | string   | ID of the root folder                |
| `identities`   | array    | List of sender identities            |

#### Account Types

- `imap` - IMAP email account
- `pop3` - POP3 email account
- `nntp` - Newsgroup account
- `none` - Local folders only

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-020",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_accounts_list",
    "arguments": {}
  }
}
```

---

### thunderbird_accounts_get

Get detailed information about a specific account.

#### Description

Retrieves complete account details including server configuration, folder structure, and all identities.

#### Parameters

| Name        | Type   | Required | Description                      |
| ----------- | ------ | -------- | -------------------------------- |
| `accountId` | string | Yes      | Unique identifier of the account |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"id\": \"account1\",
    \"name\": \"Personal Email\",
    \"type\": \"imap\",
    \"rootFolderId\": \"folder-root-1\",
    \"incomingServer\": {
      \"type\": \"imap\",
      \"hostName\": \"imap.example.com\",
      \"port\": 993,
      \"username\": \"jean.dupont\",
      \"socketType\": 3,
      \"authMethod\": 3
    },
    \"identities\": [
      {
        \"id\": \"identity1\",
        \"name\": \"Jean Dupont\",
        \"email\": \"jean.dupont@example.com\",
        \"replyTo\": \"\",
        \"organization\": \"ACME Corp\",
        \"signature\": \"Best regards,\\nJean Dupont\",
        \"signatureIsPlainText\": true
      }
    ]
  }"
}
```

#### Server Properties

| Property     | Type   | Description                           |
| ------------ | ------ | ------------------------------------- |
| `type`       | string | Server type (imap, pop3, nntp)        |
| `hostName`   | string | Server hostname                       |
| `port`       | number | Server port                           |
| `username`   | string | Login username                        |
| `socketType` | number | Connection security (see below)       |
| `authMethod` | number | Authentication method                 |

#### Socket Types

| Value | Description     |
| ----- | --------------- |
| 0     | None (insecure) |
| 1     | STARTTLS        |
| 2     | SSL/TLS         |
| 3     | SSL/TLS         |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-021",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_accounts_get",
    "arguments": {
      "accountId": "account1"
    }
  }
}
```

---

### thunderbird_identities_list

List all identities (sender addresses) for an account.

#### Description

Retrieves all configured identities for a specific account. Identities define the "From" address and signature used when sending emails.

#### Parameters

| Name        | Type   | Required | Description                       |
| ----------- | ------ | -------- | --------------------------------- |
| `accountId` | string | Yes      | Account ID to list identities for |

#### Response Format

```json
{
  "type": "text",
  "text": "[
    {
      \"id\": \"identity1\",
      \"accountId\": \"account1\",
      \"name\": \"Jean Dupont\",
      \"email\": \"jean.dupont@example.com\",
      \"replyTo\": \"\",
      \"organization\": \"ACME Corp\",
      \"signature\": \"Best regards,\\nJean Dupont\",
      \"signatureIsPlainText\": true,
      \"composeHtml\": true
    },
    {
      \"id\": \"identity2\",
      \"accountId\": \"account1\",
      \"name\": \"Jean Dupont (Support)\",
      \"email\": \"support@example.com\",
      \"replyTo\": \"support@example.com\",
      \"organization\": \"ACME Corp Support\",
      \"signature\": \"<p>ACME Corp Support Team</p>\",
      \"signatureIsPlainText\": false,
      \"composeHtml\": true
    }
  ]"
}
```

#### Identity Properties

| Property              | Type    | Description                            |
| --------------------- | ------- | -------------------------------------- |
| `id`                  | string  | Unique identity identifier             |
| `accountId`           | string  | Parent account ID                      |
| `name`                | string  | Display name (From name)               |
| `email`               | string  | Email address (From address)           |
| `replyTo`             | string  | Reply-To address (if different)        |
| `organization`        | string  | Organization name                      |
| `signature`           | string  | Email signature content                |
| `signatureIsPlainText`| boolean | True if signature is plain text        |
| `composeHtml`         | boolean | Default to HTML composition            |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-022",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_identities_list",
    "arguments": {
      "accountId": "account1"
    }
  }
}
```

---

## Common Error Codes

All account operations may return these error codes:

| Code   | Message                 | Description                            |
| ------ | ----------------------- | -------------------------------------- |
| -32000 | Thunderbird not running | Thunderbird application is not active  |
| -32001 | Extension not installed | Thunderbird MCP extension not found    |
| -32002 | Permission denied       | accountsRead permission not granted    |
| -32003 | Resource not found      | Account or identity not found          |
| -32602 | Invalid params          | Missing or invalid accountId           |
| -32603 | Internal error          | Unexpected error accessing accounts    |

---

## Use Cases

### Discovering Available Accounts

```json
{
  "name": "thunderbird_accounts_list",
  "arguments": {}
}
```

Use this to:
- Get all account IDs for folder operations
- Find account root folders
- List available sender identities

### Getting Account Details for Configuration

```json
{
  "name": "thunderbird_accounts_get",
  "arguments": {
    "accountId": "account1"
  }
}
```

Use this to:
- Verify account type and server settings
- Check connection security
- Get detailed identity information

### Selecting Identity for Composing

```json
{
  "name": "thunderbird_identities_list",
  "arguments": {
    "accountId": "account1"
  }
}
```

Use this to:
- List available "From" addresses
- Get identity ID for compose operations
- Check signature settings

---

## Integration with Other Tools

### Using Account ID for Folder Operations

```json
{
  "name": "thunderbird_folders_list",
  "arguments": {
    "accountId": "account1"
  }
}
```

### Using Identity for Compose

```json
{
  "name": "thunderbird_compose_begin_new",
  "arguments": {
    "to": ["recipient@example.com"],
    "identityId": "identity1",
    "subject": "Hello"
  }
}
```

### Filtering Messages by Account

```json
{
  "name": "thunderbird_messages_search",
  "arguments": {
    "accountId": "account1",
    "unread": true
  }
}
```

---

## Best Practices

### Account Discovery

- Call `thunderbird_accounts_list` first to discover available accounts
- Cache account IDs for subsequent operations
- Use `rootFolderId` to navigate folder structure

### Identity Selection

- Use default identity when `identityId` not specified in compose
- Match identity email to recipient domain when appropriate
- Respect user's signature preferences

### Error Handling

- Handle missing accounts gracefully (user may delete accounts)
- Check account type before performing type-specific operations
- Validate accountId before using in other tools

---

## Security Considerations

- Account operations are read-only (no modification)
- Server passwords are never exposed via API
- OAuth tokens are not accessible
- Server hostnames and usernames are visible
- Identity email addresses are exposed (expected behavior)

---

## Permissions Summary

| Tool                          | accountsRead |
| ----------------------------- | ------------ |
| `thunderbird_accounts_list`   | Required     |
| `thunderbird_accounts_get`    | Required     |
| `thunderbird_identities_list` | Required     |

All permissions must be granted in the Thunderbird extension's `manifest.json`.

---

## Related Resources

The `thunderbird://accounts` resource provides similar information:

```json
{
  "method": "resources/read",
  "params": {
    "uri": "thunderbird://accounts"
  }
}
```

Use the resource for quick context; use tools for detailed operations.
