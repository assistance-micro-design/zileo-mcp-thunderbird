# Thunderbird MCP Guides

User guides for installing and configuring Thunderbird MCP Server.

## Available Guides

| Guide                                                 | Description                    |
| ----------------------------------------------------- | ------------------------------ |
| [Quick Start](./quick-start.md)                       | Get started in 5 minutes       |
| [Docker Setup](./docker-setup.md)                     | Recommended: Docker deployment |
| [Standard Installation](./standard-installation.md)   | Manual Node.js installation    |
| [Extension Installation](./extension-installation.md) | Thunderbird extension setup    |

## Recommended Setup

For most users, we recommend the **Docker setup**:

1. Easier installation (no Node.js required on host)
2. Isolated environment
3. Multi-client support built-in
4. Simple updates via `docker compose pull`

See [Docker Setup Guide](./docker-setup.md) for details.

## Prerequisites

### For Docker Setup

- Docker 20.10+
- Docker Compose v2.0+
- Thunderbird 128+

### For Standard Setup

- Node.js 20+
- npm 10+
- Thunderbird 128+

## Quick Links

- [Tools Reference](../thunderbird-mcp-tools.md) - All 56 MCP tools
- [API Documentation](../api/) - Detailed API reference
- [Architecture](../architecture/) - System design
