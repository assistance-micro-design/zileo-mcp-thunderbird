# Docker Setup Guide

This guide explains how to run the Thunderbird MCP Server using Docker.

## Prerequisites

- Docker 20.10 or higher
- Docker Compose v2.0 or higher
- Thunderbird with the MCP extension installed

## Quick Start

### Build and Run

```bash
# Build the Docker image
docker-compose build

# Start the server in background
docker-compose up -d

# View logs
docker-compose logs -f thunderbird-mcp

# Stop the server
docker-compose down
```

### Development Mode

For development with hot-reload:

```bash
# Start development container
docker-compose --profile dev up thunderbird-mcp-dev
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `THUNDERBIRD_PORT` | WebSocket port for Thunderbird extension | `9876` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `NODE_ENV` | Node environment | `production` |

### Using .env File

Create a `.env` file in the project root:

```env
THUNDERBIRD_PORT=9876
LOG_LEVEL=info
```

## MCP Client Configuration

### Claude Desktop (Docker stdio)

For Claude Desktop with Docker, you have two options:

#### Option 1: Run container in background (Recommended)

Run the container with WebSocket bridge:

```bash
docker-compose up -d
```

Then configure Claude Desktop (`~/.config/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "thunderbird": {
      "command": "docker",
      "args": [
        "exec", "-i", "thunderbird-mcp-server",
        "node", "/app/server/dist/index.js"
      ],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Option 2: Direct Docker run (stdio)

Configure Claude Desktop to run Docker directly:

```json
{
  "mcpServers": {
    "thunderbird": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--network", "host",
        "-e", "THUNDERBIRD_PORT=9876",
        "-e", "LOG_LEVEL=info",
        "thunderbird-mcp:latest"
      ]
    }
  }
}
```

### Other MCP Clients

For other MCP clients that support stdio transport, use similar Docker command patterns.

## Network Configuration

### Host Network Mode

If you need the container to access host services:

```yaml
services:
  thunderbird-mcp:
    network_mode: host
```

### Custom Port

To use a different port:

```bash
THUNDERBIRD_PORT=9999 docker-compose up -d
```

## Volume Mounts

### Logs

Logs are stored in a Docker volume:

```bash
# View log volume
docker volume inspect thunderbird-mcp_thunderbird-mcp-logs

# Access logs
docker-compose exec thunderbird-mcp cat /app/logs/combined.log
```

### Development Mounts

In development mode, source files are mounted for hot-reload:

```yaml
volumes:
  - ./server/src:/app/server/src:ro
```

## Health Checks

The container includes a health check:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' thunderbird-mcp-server

# View health check history
docker inspect --format='{{json .State.Health}}' thunderbird-mcp-server | jq
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs thunderbird-mcp

# Check if port is in use
lsof -i :9876
```

### WebSocket connection issues

Ensure Thunderbird extension can reach the Docker container:

```bash
# Test WebSocket connection from host
websocat ws://localhost:9876

# Or with curl
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  http://localhost:9876
```

### Permission issues

If you encounter permission errors:

```bash
# Fix log directory permissions
docker-compose exec thunderbird-mcp chmod -R 755 /app/logs
```

## Building for Production

### Build optimized image

```bash
# Build production image
docker build -t thunderbird-mcp:latest .

# Build with specific tag
docker build -t thunderbird-mcp:v1.0.0 .
```

### Push to registry

```bash
# Tag for registry
docker tag thunderbird-mcp:latest your-registry/thunderbird-mcp:latest

# Push
docker push your-registry/thunderbird-mcp:latest
```

## Resource Limits

Default resource limits (can be adjusted in docker-compose.yml):

- CPU: 0.5 cores (limit), 0.1 cores (reservation)
- Memory: 256MB (limit), 64MB (reservation)

## Security Considerations

1. **Non-root user**: Container runs as non-root user `mcp`
2. **Read-only filesystem**: Consider using `read_only: true` in production
3. **Network isolation**: Uses dedicated bridge network
4. **No privileged mode**: Container doesn't require privileged access

## Integration with Thunderbird Extension

The Thunderbird extension connects to the MCP server via WebSocket on port 9876. Ensure:

1. Port 9876 is accessible from the host (where Thunderbird runs)
2. No firewall blocking the connection
3. Extension is properly configured

## Commands Reference

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Shell access
docker-compose exec thunderbird-mcp sh

# Restart
docker-compose restart

# Rebuild and start
docker-compose up -d --build

# Remove volumes
docker-compose down -v
```
