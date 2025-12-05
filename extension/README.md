# Thunderbird MCP Extension

This is the Thunderbird MailExtension component of the Thunderbird MCP Server project.

## Structure

```
extension/
├── manifest.json              # Manifest V3 configuration
├── background.js              # Main service worker (entry point)
├── api/                       # Thunderbird API wrappers
│   ├── messages.js           # Email operations
│   ├── folders.js            # Folder management
│   ├── contacts.js           # Contact management
│   ├── accounts.js           # Account information
│   └── tags.js               # Tag operations
├── native-messaging/
│   └── handler.js            # Native messaging protocol handler
├── _locales/
│   └── en/
│       └── messages.json     # English translations
└── icons/                    # Extension icons (48x48, 96x96)
```

## Features

### Messages API
- **search**: Advanced email search with filters (subject, from, to, body, tags, dates)
- **list**: Paginated message listing for folders
- **list_unread**: Get all unread messages
- **get**: Retrieve message details (headers, full, or raw format)
- **update**: Update message properties (read, flagged, tags)
- **move**: Move messages to different folders
- **copy**: Copy messages to different folders
- **delete**: Delete messages (with optional permanent deletion)
- **archive**: Archive messages

### Folders API
- **list**: List all folders with optional filtering by account
- **get**: Get folder details
- **create**: Create new subfolders
- **rename**: Rename folders
- **delete**: Delete folders
- **move**: Move folders
- **mark_read**: Mark all messages in folder as read

### Contacts API
- **search**: Search contacts across address books
- **list**: List contacts with pagination
- **get**: Get contact details
- **create**: Create new contacts (supports vCard)
- **update**: Update contact information
- **delete**: Delete contacts

### Address Books API
- **list**: List all address books
- **create**: Create new address books
- **delete**: Delete address books

### Accounts API
- **list**: List all configured accounts
- **get**: Get account details
- **listIdentities**: List identities for an account

### Tags API
- **list**: List all tags
- **create**: Create new tags with colors
- **update**: Update tag properties
- **delete**: Delete tags

## Permissions

The extension requires the following permissions:
- `messagesRead`: Read email headers and content
- `messagesMove`: Move, copy, and delete messages
- `messagesUpdate`: Update message flags and tags
- `messagesTags`: Create and manage tags
- `accountsRead`: Access account information
- `accountsFolders`: Manage folder structure
- `addressBooks`: Access and manage contacts
- `nativeMessaging`: Communication with MCP server

## Installation

### Development Mode

1. Open Thunderbird
2. Go to Tools > Developer Tools > Debug Add-ons (about:debugging#/runtime/this-thunderbird)
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this directory

### Production Installation

Package the extension as XPI:
```bash
cd extension
zip -r ../thunderbird-mcp.xpi *
```

Install the XPI file through Thunderbird's Add-ons Manager.

## Native Messaging Setup

The extension communicates with the MCP server through native messaging. You need to:

1. Install the native messaging host manifest
2. Start the MCP server

See the main project README for complete setup instructions.

## Development

### Testing API Calls

The extension logs all operations to the browser console. Open the Browser Console (Ctrl+Shift+J) to see logs.

### Message Format

Messages use JSON-RPC 2.0 format:

**Request:**
```json
{
  "id": "req-123",
  "method": "thunderbird_messages_search",
  "params": {
    "subject": "invoice",
    "unread": true,
    "limit": 10
  }
}
```

**Response:**
```json
{
  "id": "req-123",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":\"msg-1\",\"subject\":\"Invoice March\"}]"
      }
    ]
  }
}
```

**Error:**
```json
{
  "id": "req-123",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": { "reason": "Folder not found" }
  }
}
```

## Troubleshooting

### Extension won't load
- Check manifest.json syntax
- Verify all file paths are correct
- Check browser console for errors

### Native messaging not connecting
- Verify native host manifest is installed
- Check that MCP server is running
- Confirm extension ID matches in manifest

### API calls failing
- Check browser console for errors
- Verify required permissions are granted
- Ensure parameters match API expectations

## License

MIT License - See main project LICENSE file

## Links

- [Project Repository](https://github.com/assistance-micro-design/thunderbird-mcp)
- [Thunderbird WebExtension API](https://webextension-api.thunderbird.net/en/mv3/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
