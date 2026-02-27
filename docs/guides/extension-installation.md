# Extension Installation Guide

Detailed guide for installing and configuring the Thunderbird MCP extension.

## Overview

The Thunderbird extension is a **MailExtension (Manifest V3)** that:

- Connects to the MCP server via WebSocket
- Provides access to Thunderbird APIs (messages, folders, contacts, etc.)
- Handles requests from MCP clients and returns responses

## Requirements

- **Thunderbird** 128.0 or higher
- MCP server running (Docker or standard installation)

## Installation Methods

### Method 1: From Built Package (Recommended)

1. Build the project (if not done):

   ```bash
   npm run build
   ```

2. Locate the extension file:

   ```
   dist/thunderbird-mcp-1.3.1.xpi
   ```

3. Open Thunderbird

4. Navigate to **Tools** > **Add-ons and Themes**

5. Click the gear icon in the top-right corner

6. Select **Install Add-on From File...**

7. Browse to and select the `.xpi` file

8. Click **Add** when prompted

9. Restart Thunderbird if requested

### Method 2: Developer Installation (Debugging)

For development and debugging:

1. Open Thunderbird

2. Navigate to **Tools** > **Developer Tools** > **Debug Add-ons**

3. Click **Load Temporary Add-on...**

4. Navigate to `extension/` folder

5. Select `manifest.json`

The extension loads temporarily and will be removed when Thunderbird restarts.

## Configuration

### Default Settings

The extension connects to the WebSocket bridge at:

```
ws://localhost:9876/thunderbird
```

### Custom Port

If using a custom port, the extension automatically reads the port from the server configuration. No manual configuration is needed.

## Verifying Installation

### Check Extension Status

1. Go to **Tools** > **Add-ons and Themes**
2. Find "Thunderbird MCP" in the list
3. Verify it shows as "Enabled"

### Check Connection

```bash
# Docker
curl http://localhost:9876/health

# Expected when connected:
{"status":"ok","thunderbird":true,"mcpClients":0}
```

### Check Extension Console

1. **Tools** > **Developer Tools** > **Error Console**
2. Look for messages from the MCP extension
3. Successful connection shows: `WebSocket connected to bridge`

## Permissions

The extension requires these permissions:

| Permission            | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `accountsRead`        | Read account information                 |
| `addressBooks`        | Access contacts and address books        |
| `messagesRead`        | Read email messages                      |
| `messagesMove`        | Move and copy messages                   |
| `messagesDelete`      | Delete messages                          |
| `messagesUpdate`      | Update message flags and tags            |
| `messagesImport`      | Import messages                          |
| `messagesTags`        | Manage message tags                      |
| `compose`             | Create and send emails                   |
| `compose.send`        | Send composed emails                     |
| `sensitiveDataUpload` | Access message content for AI processing |

### Experimental Permissions

For calendar and tasks functionality:

| Permission    | Purpose                          |
| ------------- | -------------------------------- |
| `experiments` | Access experimental calendar API |

## Troubleshooting

### Extension Not Connecting

**Symptoms:**

- Health check shows `"thunderbird": false`
- No activity in extension console

**Solutions:**

1. **Check Thunderbird is running**

2. **Verify extension is enabled:**
   - **Tools** > **Add-ons and Themes**
   - Ensure toggle is ON

3. **Check server is running:**

   ```bash
   # Docker
   docker ps | grep thunderbird

   # Standard
   curl http://localhost:9876/health
   ```

4. **Check for port conflicts:**

   ```bash
   lsof -i :9876
   ```

5. **Check firewall:**
   - Ensure localhost:9876 is not blocked

6. **Reinstall extension:**
   - Remove from Add-ons
   - Restart Thunderbird
   - Reinstall

### Connection Drops

**Symptoms:**

- Extension connects then disconnects
- Intermittent functionality

**Solutions:**

1. **Check server logs:**

   ```bash
   docker compose logs -f thunderbird-mcp
   ```

2. **Restart Thunderbird:**
   - Close completely
   - Wait 5 seconds
   - Reopen

3. **Restart server:**
   ```bash
   docker compose restart
   ```

### Calendar/Tasks Not Working

**Symptoms:**

- Calendar tools return errors
- Tasks not accessible

**Solutions:**

1. **Verify Thunderbird version:**
   - Requires Thunderbird 128.0+

2. **Check Lightning calendar:**
   - **Tools** > **Add-ons and Themes**
   - Ensure "Lightning" or built-in calendar is enabled

3. **Calendar API is experimental:**
   - Some features may not work in all configurations

## Updating Extension

### From Built Package

1. Build the new version:

   ```bash
   git pull
   npm run build
   ```

2. In Thunderbird:
   - **Tools** > **Add-ons and Themes**
   - Click the gear icon
   - **Install Add-on From File...**
   - Select new `.xpi` file

3. Thunderbird will update the extension automatically

### Automatic Updates

The extension does not auto-update. Updates must be installed manually.

## Uninstalling

1. Open **Tools** > **Add-ons and Themes**
2. Find "Thunderbird MCP"
3. Click the three-dot menu
4. Select **Remove**
5. Confirm removal
6. Restart Thunderbird

## Extension Structure

```
extension/
├── manifest.json       # Extension manifest (V3)
├── background.js       # Main service worker
├── api/                # Thunderbird API wrappers
│   ├── messages.js     # Message operations
│   ├── folders.js      # Folder operations
│   ├── contacts.js     # Contact operations
│   ├── accounts.js     # Account operations
│   ├── tags.js         # Tag operations
│   ├── compose.js      # Email composition
│   └── calendar.js     # Calendar/tasks (experimental)
└── experiments/        # Experimental calendar API
```

## Next Steps

- [Quick Start](./quick-start.md) - Complete setup guide
- [Docker Setup](./docker-setup.md) - Docker deployment
- [Tools Reference](../thunderbird-mcp-tools.md) - Available tools
