# Standard Installation Guide

Manual installation using Node.js (without Docker).

## Prerequisites

- **Node.js** 20.x or higher
- **npm** 10.x or higher
- **Thunderbird** 128.x or higher
- **Git** (for cloning)

### Verify Prerequisites

```bash
node --version   # Should be v20.x or higher
npm --version    # Should be v10.x or higher
```

## Installation Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/assistance-micro-design/thunderbird-mcp.git
cd thunderbird-mcp
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs dependencies for both the server and extension.

### Step 3: Build the Project

```bash
npm run build
```

This compiles the TypeScript server code.

### Step 4: Install Thunderbird Extension

1. Get the extension package:
   - download the latest `thunderbird-mcp-x.y.z.xpi` from [GitHub Releases](https://github.com/assistance-micro-design/thunderbird-mcp/releases), or
   - build it from the sources: `npm run package:extension` (output in `releases/`)
2. Open Thunderbird
3. Navigate to **Tools** > **Add-ons and Themes**
4. Click the gear icon > **Install Add-on From File**
5. Select the `.xpi` file
6. Click **Add** when prompted
7. Restart Thunderbird if requested

### Step 5: Configure MCP Client

#### Claude Desktop (Linux/macOS)

Edit `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "thunderbird": {
      "command": "node",
      "args": ["/absolute/path/to/thunderbird-mcp/server/dist/index.js"],
      "env": {
        "THUNDERBIRD_PORT": "9876",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Claude Desktop (Windows)

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "thunderbird": {
      "command": "node",
      "args": ["C:\\path\\to\\thunderbird-mcp\\server\\dist\\index.js"],
      "env": {
        "THUNDERBIRD_PORT": "9876",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Step 6: Start and Verify

1. Make sure Thunderbird is running
2. Restart Claude Desktop
3. Claude should now have access to Thunderbird tools

## Environment Variables

| Variable           | Description                              | Default |
| ------------------ | ---------------------------------------- | ------- |
| `THUNDERBIRD_PORT` | WebSocket port for extension connection  | `9876`  |
| `LOG_LEVEL`        | Logging level (debug, info, warn, error) | `info`  |

## Manual Server Start (Development)

For testing without an MCP client:

```bash
cd server
npm start
```

Or with development auto-reload:

```bash
npm run dev
```

## Running Tests

```bash
npm test
```

## Updating

```bash
git pull
npm install
npm run build
```

Then reinstall the extension in Thunderbird.

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf node_modules server/dist
npm install
npm run build
```

### Extension Not Connecting

1. Verify Thunderbird is running
2. Check port 9876 is not blocked:
   ```bash
   lsof -i :9876
   ```
3. Check extension console in Thunderbird:
   **Tools** > **Developer Tools** > **Error Console**

### MCP Client Not Connecting

1. Verify path in config is absolute and correct
2. Check JSON syntax is valid
3. Restart Claude Desktop completely
4. Check server logs:
   ```bash
   LOG_LEVEL=debug node server/dist/index.js
   ```

### Permission Issues

```bash
# Ensure executable permissions
chmod +x server/dist/index.js
```

## Uninstallation

1. Remove from Claude Desktop config
2. Uninstall extension from Thunderbird
3. Delete the project folder:
   ```bash
   rm -rf thunderbird-mcp
   ```

## Next Steps

- [Extension Installation](./extension-installation.md) - Detailed extension guide
- [Docker Setup](./docker-setup.md) - Alternative Docker deployment
- [Tools Reference](../thunderbird-mcp-tools.md) - Available MCP tools
