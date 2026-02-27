# Quick Start Guide

Get Thunderbird MCP running in 5 minutes.

## Option 1: Docker (Recommended)

### Step 1: Clone and Build

```bash
git clone https://github.com/assistance-micro-design/thunderbird-mcp.git
cd thunderbird-mcp
docker compose build
```

### Step 2: Start the Bridge

```bash
docker compose up -d
```

### Step 3: Install Extension

1. Open Thunderbird
2. Go to **Tools** > **Add-ons and Themes**
3. Click gear icon > **Install Add-on From File**
4. Select `dist/thunderbird-mcp-1.3.0.xpi`

### Step 4: Configure Claude Desktop

Edit `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "thunderbird": {
      "command": "docker",
      "args": ["exec", "-i", "thunderbird-mcp-server", "node", "dist/index.js"]
    }
  }
}
```

### Step 5: Verify

```bash
# Check bridge status
curl http://localhost:9876/health
# Should show: {"status":"ok","thunderbird":true,"mcpClients":0}
```

Restart Claude Desktop and start using Thunderbird tools.

---

## Option 2: Standard Installation

### Step 1: Clone and Build

```bash
git clone https://github.com/assistance-micro-design/thunderbird-mcp.git
cd thunderbird-mcp
npm install
npm run build
```

### Step 2: Install Extension

Same as Docker Option Step 3.

### Step 3: Configure Claude Desktop

Edit `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "thunderbird": {
      "command": "node",
      "args": ["/path/to/thunderbird-mcp/server/dist/index.js"],
      "env": {
        "THUNDERBIRD_PORT": "9876"
      }
    }
  }
}
```

### Step 4: Verify

Restart Claude Desktop. The MCP server starts automatically when Claude connects.

---

## Test Your Setup

Ask Claude:

> "List my unread emails"

Claude should use `thunderbird_messages_list_unread` and return your unread messages.

## Next Steps

- [Docker Setup Guide](./docker-setup.md) - Complete Docker documentation
- [Standard Installation](./standard-installation.md) - Manual setup details
- [Tools Reference](../thunderbird-mcp-tools.md) - All 56 available tools

## Troubleshooting

### Extension not connecting

1. Check Thunderbird is running
2. Verify extension is enabled: **Tools** > **Add-ons and Themes**
3. Check extension console: **Tools** > **Developer Tools** > **Error Console**

### Docker container issues

```bash
# Check container status
docker ps | grep thunderbird

# View logs
docker compose logs -f thunderbird-mcp
```

### Claude not finding tools

1. Restart Claude Desktop completely
2. Check config file syntax (valid JSON)
3. Verify path to index.js is correct
