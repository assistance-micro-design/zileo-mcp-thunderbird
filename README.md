# Thunderbird MCP Server

Model Context Protocol (MCP) server for Thunderbird email client integration. This project enables AI assistants to interact with Thunderbird through a standardized protocol.

## Features

- **Email Management**: Read, compose, send, and manage emails through MCP
- **Folder Operations**: Navigate and organize email folders
- **Contact Access**: Query and manage Thunderbird contacts
- **Search Capabilities**: Advanced email search with filters
- **Account Management**: Multi-account support and configuration
- **Secure Communication**: WebSocket-based secure connection
- **Real-time Updates**: Event-driven notifications for email changes

## Architecture

This is a monorepo containing two main components:

- **server**: Node.js MCP server that communicates with Thunderbird
- **extension**: Thunderbird WebExtension that provides native client access

## Installation

### Prerequisites

- Node.js 20.x or higher
- Thunderbird 115.x or higher
- npm or yarn package manager

### Setup

1. Clone the repository:
```bash
git clone https://github.com/assistance-micro-design/thunderbird-mcp.git
cd thunderbird-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Install the Thunderbird extension:
   - Open Thunderbird
   - Go to Tools > Add-ons and Themes
   - Click the gear icon > Install Add-on From File
   - Select `extension/dist/thunderbird-mcp-extension.xpi`

## Configuration

### MCP Server Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

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

### Environment Variables

- `THUNDERBIRD_PORT`: WebSocket port for Thunderbird connection (default: 9876)
- `LOG_LEVEL`: Logging level (debug, info, warn, error) (default: info)

## Usage

### Starting the Server

```bash
cd server
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### Available MCP Tools

#### `thunderbird_list_folders`
List all email folders across accounts.

#### `thunderbird_read_emails`
Read emails from a specified folder with optional filters.

#### `thunderbird_send_email`
Compose and send an email.

#### `thunderbird_search_emails`
Search emails using advanced filters (sender, subject, date range, etc.).

#### `thunderbird_get_contacts`
Retrieve contacts from Thunderbird address book.

#### `thunderbird_manage_folder`
Create, rename, or delete email folders.

### Example Usage with Claude

```
User: "Show me unread emails from today"
Claude: [Uses thunderbird_read_emails with filters]

User: "Send a reply thanking them"
Claude: [Uses thunderbird_send_email with appropriate content]
```

## Development

### Project Structure

```
thunderbird-mcp/
├── server/               # MCP server implementation
│   ├── src/
│   │   ├── index.ts     # Server entry point
│   │   ├── tools/       # MCP tool implementations
│   │   └── bridge/      # Thunderbird bridge logic
│   └── package.json
├── extension/           # Thunderbird WebExtension
│   ├── src/
│   │   ├── background.js
│   │   └── manifest.json
│   └── package.json
└── package.json         # Root monorepo config
```

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Architecture Overview

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

The system uses a three-layer architecture:

1. **MCP Server**: Exposes standardized tools to AI clients
2. **Bridge Layer**: Manages WebSocket communication
3. **Thunderbird Extension**: Native client API access

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Follow TypeScript best practices
- Maintain test coverage above 80%
- Use meaningful commit messages
- Update documentation for new features

## Security

- All communication uses secure WebSocket connections
- OAuth2 support for email account authentication
- No credentials stored in server memory
- Audit logging for sensitive operations

## Troubleshooting

### Connection Issues

If the MCP server cannot connect to Thunderbird:

1. Verify Thunderbird extension is installed and enabled
2. Check that Thunderbird is running
3. Ensure port 9876 is not blocked by firewall
4. Review logs: `tail -f server.log`

### Performance

For large mailboxes (>10,000 emails):

- Use date range filters to limit search scope
- Enable folder-level caching in extension settings
- Consider indexing for faster search operations

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/assistance-micro-design/thunderbird-mcp/issues)
- Documentation: [Full documentation](https://github.com/assistance-micro-design/thunderbird-mcp/wiki)

## Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol)
- Thunderbird WebExtension APIs
- Community contributors

---

**Status**: Active Development | **Version**: 1.0.0 | **Last Updated**: 2025-12-05
