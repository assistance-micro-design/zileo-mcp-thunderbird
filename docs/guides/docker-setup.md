# Docker Setup Guide

This guide explains how to run the Thunderbird MCP Server using Docker.

## Architecture Overview

Starting with version 1.2.0, the Docker deployment uses a **multi-client architecture**:

```
┌─────────────────────────────────────────────────────┐
│              Docker Container                        │
│  ┌───────────────────────────────────────────────┐  │
│  │     bridge-standalone (port 9876)             │  │
│  │                                               │  │
│  │  /thunderbird → Extension (1 client)          │  │
│  │  /mcp → MCP instances (multi-client)          │  │
│  │  /health → HTTP status endpoint               │  │
│  └───────────────────────────────────────────────┘  │
│              ▲                    ▲                  │
│   Thunderbird Extension    docker exec (MCP)        │
└─────────────────────────────────────────────────────┘
```

**Key Components:**

- **bridge-standalone.ts**: Runs only the WebSocket bridge server (no MCP server)
- **MCP instances**: Connect via `docker exec` as clients to the bridge
- **Thunderbird extension**: Connects to the bridge to handle requests

This architecture allows **multiple MCP clients** to share a single bridge simultaneously.

## Prerequisites

- Docker 20.10 or higher
- Docker Compose v2.0 or higher (use `docker compose` not `docker-compose`)
- Thunderbird with the MCP extension installed

## Quick Start

### Build and Run

```bash
# Build the Docker image
docker compose build

# Start the bridge server in background
docker compose up -d

# Verify the bridge is running
curl http://localhost:9876/health
# Returns: {"status":"ok","thunderbird":false,"mcpClients":0}

# View logs
docker compose logs -f thunderbird-mcp

# Stop the server
docker compose down
```

### Test MCP Connection

Once the container is running, test an MCP connection:

```bash
# Send an MCP initialize request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
  docker exec -i thunderbird-mcp-server node dist/index.js
```

Expected output includes:

- `Connected to existing bridge in client mode`
- JSON-RPC response with server info

## Configuration

### Environment Variables

| Variable           | Description                              | Default      |
| ------------------ | ---------------------------------------- | ------------ |
| `THUNDERBIRD_PORT` | WebSocket port for bridge                | `9876`       |
| `LOG_LEVEL`        | Logging level (debug, info, warn, error) | `info`       |
| `NODE_ENV`         | Node environment                         | `production` |

### Using .env File

Create a `.env` file in the project root:

```env
THUNDERBIRD_PORT=9876
LOG_LEVEL=info
```

## MCP Client Configuration

### Claude Desktop Configuration

Configure Claude Desktop (`~/.config/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "thunderbird": {
      "command": "docker",
      "args": ["exec", "-i", "thunderbird-mcp-server", "node", "dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important:** The container must be running (`docker compose up -d`) before Claude Desktop starts.

### How It Works

1. Claude Desktop spawns `docker exec -i thunderbird-mcp-server node dist/index.js`
2. The MCP server inside the container detects the running bridge
3. It fetches an auth token via `GET http://127.0.0.1:9876/auth/token`
4. It connects to `ws://127.0.0.1:9876/mcp?token=xxx` as a client
5. Requests are relayed through the bridge to Thunderbird
6. Multiple Claude instances can connect simultaneously

## Endpoints

| Endpoint                          | Protocol  | Purpose                        |
| --------------------------------- | --------- | ------------------------------ |
| `ws://localhost:9876/`            | WebSocket | Thunderbird extension (single) |
| `ws://localhost:9876/thunderbird` | WebSocket | Thunderbird extension (alias)  |
| `ws://localhost:9876/mcp`         | WebSocket | MCP clients (multiple)         |
| `http://localhost:9876/health`    | HTTP      | Health check endpoint          |
| `http://localhost:9876/auth/token`| HTTP      | Auth token for WebSocket auth  |

All WebSocket endpoints require a valid auth token as query parameter (`?token=xxx`). The token is fetched from `GET /auth/token` and validated on every upgrade request.

### Health Check

```bash
# Check bridge status
curl http://localhost:9876/health

# Example response
{
  "status": "ok",
  "thunderbird": true,    # Extension connected
  "mcpClients": 2         # Number of MCP clients
}
```

## Network Configuration

### Default Bridge Network

The container uses a bridge network. The Thunderbird extension connects from the host:

```yaml
ports:
  - "127.0.0.1:9876:9876" # Expose WebSocket port (localhost only)
```

### Host Network Mode (Alternative)

If you need the container to share the host network:

```yaml
services:
  thunderbird-mcp:
    network_mode: host
```

### Custom Port

To use a different port:

```bash
THUNDERBIRD_PORT=9999 docker compose up -d
```

Update extension configuration if using a custom port.

## Volume Mounts

### Logs

Logs are stored in a Docker volume:

```bash
# View log volume
docker volume inspect thunderbird-mcp_thunderbird-mcp-logs

# Access logs inside container
docker compose exec thunderbird-mcp cat /app/logs/combined.log
```

### Development Mounts

In development mode (`--profile dev`), source files are mounted:

```yaml
volumes:
  - ./server/src:/app/server/src:ro
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs thunderbird-mcp

# Common issues:
# - Port 9876 already in use
# - Build failed
```

### Port already in use

```bash
# Check what's using port 9876
lsof -i :9876

# Or use a different port
THUNDERBIRD_PORT=9999 docker compose up -d
```

### WebSocket connection issues

```bash
# Test WebSocket connection
websocat ws://localhost:9876/health 2>/dev/null || echo "Not a WebSocket endpoint"

# Test HTTP health endpoint
curl -v http://localhost:9876/health

# Check bridge logs
docker compose logs --tail=50 thunderbird-mcp
```

### MCP client can't connect

1. Verify container is running: `docker ps | grep thunderbird`
2. Check health endpoint: `curl http://localhost:9876/health`
3. Verify extension is connected (`"thunderbird": true`)
4. Check MCP client logs for connection errors

### Thunderbird extension not connecting

1. Verify extension is installed and enabled in Thunderbird
2. Check extension console: Tools → Developer Tools → Error Console
3. Verify port 9876 is accessible from host
4. Check for firewall blocking localhost connections

## Building for Production

### Build optimized image

```bash
# Build production image
docker build -t thunderbird-mcp:latest .

# Build with specific version tag
docker build -t thunderbird-mcp:1.3.0 .
```

### Push to registry

```bash
# Tag for registry
docker tag thunderbird-mcp:latest your-registry/thunderbird-mcp:latest

# Push
docker push your-registry/thunderbird-mcp:latest
```

## Resource Limits

Default limits in docker-compose.yml:

- CPU: 0.5 cores (limit), 0.1 cores (reservation)
- Memory: 256MB (limit), 64MB (reservation)

Adjust in `docker-compose.yml` if needed:

```yaml
deploy:
  resources:
    limits:
      cpus: "1.0"
      memory: 512M
```

## Security Considerations

1. **Non-root user**: Container runs as non-root user `mcp` (UID 1001)
2. **Network isolation**: Uses dedicated bridge network by default
3. **No privileged mode**: Container doesn't require privileged access
4. **Localhost binding**: Docker port bound to `127.0.0.1` only (not `0.0.0.0`)
5. **Single Thunderbird client**: Only one extension can connect
6. **Token authentication**: WebSocket connections require a valid auth token (generated at startup, validated with timing-safe comparison)
7. **Origin validation**: WebSocket upgrade requests are validated against an allowlist (localhost, moz-extension://)
8. **Rate limiting**: `/auth/token` endpoint limited to 10 requests/minute per IP
9. **Bridge permission enforcement**: Tool permissions checked before relaying requests to extension

## Commands Reference

```bash
# Build
docker compose build

# Start (background)
docker compose up -d

# Start (foreground with logs)
docker compose up

# Stop
docker compose down

# View logs
docker compose logs -f

# Shell access
docker compose exec thunderbird-mcp sh

# Run MCP command
docker exec -i thunderbird-mcp-server node dist/index.js

# Restart
docker compose restart

# Rebuild and start
docker compose up -d --build

# Remove volumes
docker compose down -v

# Check health
curl http://localhost:9876/health
```

## Migration from v1.1.x

If upgrading from version 1.1.x:

1. **Rebuild the image**: `docker compose build`
2. **Update MCP client config**: Use `docker exec` instead of `docker run`
3. **Restart container**: `docker compose down && docker compose up -d`

The new architecture automatically handles multiple MCP connections.
