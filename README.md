# Thunderbird MCP Server

Model Context Protocol (MCP) server for Thunderbird email client integration. This project enables AI assistants to interact with Thunderbird through a standardized protocol.

## Features

- **Email Management**: Search, read, move, copy, delete, and archive emails (9 tools)
- **Folder Operations**: Create, rename, move, delete folders and mark as read (7 tools)
- **Contact Access**: Full CRUD operations on contacts and address books (9 tools)
- **Calendar Events**: Create, update, move, delete events with recurrence support (9 tools) *
- **Task Management**: Create, update, complete, and delete tasks (6 tools) *
- **Tag Management**: Create, update, delete email tags with colors (4 tools)
- **Account Management**: List accounts and identities (3 tools)
- **Resource Access**: 6 static + 2 parameterized MCP resources

\* *Experimental features using webext-experiments calendar API*

**Total: 47 MCP Tools**

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT MCP                               │
│              (Claude, GPT, Assistant IA, etc.)                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ JSON-RPC 2.0 (stdio)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVEUR MCP                                  │
│                  (Node.js/TypeScript)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Tools     │ │  Resources  │ │  WebSocket  │               │
│  │  Handler    │ │   Handler   │ │   Bridge    │               │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘               │
│         └────────────────┼───────────────┘                      │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │  WebSocket Client     │                          │
│              │  (ws://localhost:9876)│                          │
│              └───────────┬───────────┘                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │ WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 EXTENSION THUNDERBIRD                           │
│                    (MailExtension V3)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Background Script                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Messages │ │ Folders  │ │ Contacts │ │ Calendar │   │   │
│  │  │   API    │ │   API    │ │   API    │ │   API*   │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  * API Expérimentale (webext-experiments)                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      THUNDERBIRD                                │
│           (Emails, Contacts, Calendriers, Tâches)               │
└─────────────────────────────────────────────────────────────────┘
```

This is a monorepo containing two main components:

- **server/**: Node.js MCP server that communicates with Thunderbird via WebSocket
- **extension/**: Thunderbird WebExtension (Manifest V3) that provides native client access

## Installation

### Prerequisites

- Node.js 20.x or higher (or Docker)
- Thunderbird 128.x or higher
- npm package manager

### Option 1: Standard Setup

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
   - Select `dist/thunderbird-mcp-extension-1.1.0.xpi`

### Option 2: Docker Setup

1. Clone and build:
```bash
git clone https://github.com/assistance-micro-design/thunderbird-mcp.git
cd thunderbird-mcp
docker-compose build
```

2. Start the server:
```bash
docker-compose up -d
```

3. Install the Thunderbird extension (same as above)

See [Docker Setup Guide](./docs/docker-setup.md) for detailed Docker configuration.

## Configuration

### MCP Server Configuration (Standard)

Add to your MCP client configuration (e.g., Claude Desktop `~/.config/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "thunderbird": {
      "command": "node",
      "args": ["/path/to/thunderbird-mcp/server/dist/index.js"],
      "env": {
        "THUNDERBIRD_PORT": "9876",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### MCP Server Configuration (Docker)

For Docker deployment, configure your MCP client:

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

Or run Docker directly (without docker-compose):

```json
{
  "mcpServers": {
    "thunderbird": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--network", "host",
        "-e", "THUNDERBIRD_PORT=9876",
        "thunderbird-mcp:latest"
      ]
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `THUNDERBIRD_PORT` | WebSocket port for Thunderbird connection | 9876 |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | info |

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

### Available MCP Tools (47 total)

#### Messages (9 tools)
| Tool | Description |
|------|-------------|
| `thunderbird_messages_search` | Advanced email search with filters (subject, from, to, body, tags, dates) |
| `thunderbird_messages_list` | List messages in a folder with pagination |
| `thunderbird_messages_list_unread` | List unread messages across accounts |
| `thunderbird_messages_get` | Get message details (headers, full, or raw format) |
| `thunderbird_messages_move` | Move messages to another folder |
| `thunderbird_messages_copy` | Copy messages to another folder |
| `thunderbird_messages_delete` | Delete messages (trash or permanent) |
| `thunderbird_messages_update` | Update message properties (read, flagged, tags) |
| `thunderbird_messages_archive` | Archive messages |

#### Folders (7 tools)
| Tool | Description |
|------|-------------|
| `thunderbird_folders_list` | List all folders (hierarchical structure) |
| `thunderbird_folders_get` | Get folder details |
| `thunderbird_folders_create` | Create a new subfolder |
| `thunderbird_folders_rename` | Rename a folder |
| `thunderbird_folders_delete` | Delete a folder |
| `thunderbird_folders_move` | Move a folder |
| `thunderbird_folders_mark_read` | Mark all messages in folder as read |

#### Contacts (9 tools)
| Tool | Description |
|------|-------------|
| `thunderbird_contacts_search` | Search contacts by query |
| `thunderbird_contacts_list` | List contacts with pagination |
| `thunderbird_contacts_get` | Get contact details |
| `thunderbird_contacts_create` | Create a new contact (properties or vCard) |
| `thunderbird_contacts_update` | Update contact properties |
| `thunderbird_contacts_delete` | Delete a contact |
| `thunderbird_addressbooks_list` | List all address books |
| `thunderbird_addressbooks_create` | Create a new address book |
| `thunderbird_addressbooks_delete` | Delete an address book |

#### Tags (4 tools)
| Tool | Description |
|------|-------------|
| `thunderbird_tags_list` | List all message tags |
| `thunderbird_tags_create` | Create a new tag with color |
| `thunderbird_tags_update` | Update tag name or color |
| `thunderbird_tags_delete` | Delete a tag |

#### Accounts (3 tools)
| Tool | Description |
|------|-------------|
| `thunderbird_accounts_list` | List all email accounts |
| `thunderbird_accounts_get` | Get account details |
| `thunderbird_identities_list` | List account identities (sender addresses) |

#### Calendar (9 tools) - *Experimental*
| Tool | Description |
|------|-------------|
| `thunderbird_calendars_list` | List all calendars |
| `thunderbird_calendars_get` | Get calendar details |
| `thunderbird_events_search` | Search events by date range and query |
| `thunderbird_events_list` | List events in a calendar |
| `thunderbird_events_get` | Get event details |
| `thunderbird_events_create` | Create event with attendees and recurrence |
| `thunderbird_events_update` | Update event properties |
| `thunderbird_events_move` | Reschedule an event |
| `thunderbird_events_delete` | Delete an event |

#### Tasks (6 tools) - *Experimental*
| Tool | Description |
|------|-------------|
| `thunderbird_tasks_list` | List tasks with filters |
| `thunderbird_tasks_get` | Get task details |
| `thunderbird_tasks_create` | Create a task with due date and priority |
| `thunderbird_tasks_update` | Update task properties |
| `thunderbird_tasks_delete` | Delete a task |
| `thunderbird_tasks_complete` | Mark task as completed |

### MCP Resources

| URI | Description |
|-----|-------------|
| `thunderbird://accounts` | List of configured email accounts |
| `thunderbird://inbox/unread` | Unread messages (all accounts) |
| `thunderbird://inbox/unread/{accountId}` | Unread messages (specific account) |
| `thunderbird://folders/{accountId}` | Folder tree for an account |
| `thunderbird://contacts/recent` | Recently used contacts |
| `thunderbird://calendar/today` | Today's calendar events |
| `thunderbird://calendar/upcoming` | Events for next 7 days |
| `thunderbird://tasks/pending` | Incomplete tasks |

### Example Usage with Claude

```
User: "Montre-moi mes emails non lus d'aujourd'hui"
Claude: [Uses thunderbird_messages_search with date filter and unread:true]

User: "Est-ce que j'ai un rendez-vous aujourd'hui?"
Claude: [Uses thunderbird_events_search with today's date range]

User: "Crée un rendez-vous demain à 14h pour 1 heure"
Claude: [Uses thunderbird_events_create with appropriate parameters]
```

## Development

### Project Structure

```
thunderbird-mcp/
├── server/                    # MCP server implementation
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── server.ts         # MCP server configuration
│   │   ├── tools/            # 47 MCP tool implementations
│   │   │   ├── messages.ts   # 9 message tools
│   │   │   ├── folders.ts    # 7 folder tools
│   │   │   ├── contacts.ts   # 9 contact tools
│   │   │   ├── tags.ts       # 4 tag tools
│   │   │   ├── accounts.ts   # 3 account tools
│   │   │   ├── calendar.ts   # 9 calendar tools
│   │   │   └── tasks.ts      # 6 task tools
│   │   ├── resources/        # MCP resource handlers
│   │   ├── websocket/        # WebSocket bridge
│   │   ├── types/            # TypeScript definitions
│   │   └── utils/            # Logger, errors
│   └── package.json
├── extension/                 # Thunderbird WebExtension
│   ├── manifest.json         # Manifest V3
│   ├── background.js         # Service worker
│   ├── api/                  # API wrappers
│   │   ├── messages.js
│   │   ├── folders.js
│   │   ├── contacts.js
│   │   ├── accounts.js
│   │   ├── tags.js
│   │   └── calendar.js
│   ├── native-messaging/     # Request handler
│   └── experiments/          # Calendar experimental API
├── docs/                     # Documentation
│   ├── api/                  # API reference
│   └── architecture/         # Architecture docs
├── CAHIER_DES_CHARGES.md     # Project specifications
└── package.json              # Root monorepo config
```

### Running Tests

```bash
npm test
```

### Type Checking

```bash
cd server && npm run build
```

### Linting

```bash
npm run lint
```

## Documentation

- [Cahier des Charges](./CAHIER_DES_CHARGES.md) - Project specifications (French)
- [API Documentation](./docs/api/) - Tool and resource reference
- [Architecture](./docs/architecture/) - System design and diagrams

## Security

- WebSocket communication on localhost only
- Granular Thunderbird permissions model
- No credentials stored in server memory
- Input validation with Zod schemas

## Troubleshooting

### Connection Issues

If the MCP server cannot connect to Thunderbird:

1. Verify Thunderbird extension is installed and enabled
2. Check that Thunderbird is running
3. Ensure port 9876 is not blocked
4. Check extension console for errors (Tools > Developer Tools > Error Console)
5. Review server logs: `LOG_LEVEL=debug npm start`

### Calendar Not Working

The calendar API uses experimental Thunderbird APIs:
1. Ensure you have Thunderbird 128.0 or higher
2. Check that Lightning calendar is enabled
3. Calendar features require experimental API permissions

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/assistance-micro-design/thunderbird-mcp/issues)
- Documentation: [docs/](./docs/)

## Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Thunderbird WebExtension APIs
- [webext-experiments](https://github.com/thunderbird/webext-experiments) for calendar support

---

**Status**: Production Ready | **Version**: 1.1.0 | **Tools**: 47 | **Last Updated**: 2025-12-05
