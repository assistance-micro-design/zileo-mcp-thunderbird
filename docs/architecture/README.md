# Architecture Documentation

Comprehensive architecture documentation for the Thunderbird MCP Server project.

## Documents

### [1. Overview](./overview.md)

**High-level system architecture and component descriptions**

Topics covered:

- System architecture diagram (WebSocket-based)
- Three-layer design: MCP Server, WebSocket Bridge, Extension
- Component descriptions (MCP Client, Server, Bridge, Extension, Thunderbird)
- 56 tools across 8 functional domains
- Technology stack summary
- Architectural decisions and trade-offs
- Security model
- Scalability considerations
- Deployment model

Start here for: Understanding the overall system design and how components interact.

### [2. Extension Architecture](./extension.md)

**Thunderbird extension structure and implementation**

Topics covered:

- Extension file structure
- Component architecture (Background script, WebSocket client, API wrappers)
- Service Worker lifecycle
- Auto-reconnect with fixed 3-second delay (10 attempts max)
- API wrapper modules (Messages, Folders, Contacts, Accounts, Tags, Calendar, Tasks)
- Experimental Calendar API integration
- Permission model and security
- Localization strategy
- Testing and performance optimization

Start here for: Understanding how the Thunderbird extension works and implementing new API wrappers.

### [3. Server Architecture](./server.md)

**MCP server structure and implementation**

Topics covered:

- Server file structure
- Entry point and initialization
- WebSocket bridge initialization
- Tool handler implementations (56 tools)
- Resource handler implementations
- Schema validation with Zod
- Error handling and mapping
- Logging configuration
- Performance optimization

Start here for: Understanding the MCP server implementation and adding new tools or resources.

### [4. Data Flow](./data-flow.md)

**Request/response flows and sequence diagrams**

Topics covered:

- MCP lifecycle flow (initialization, connection)
- Tool call flow (standard execution, timeouts)
- Resource access flow
- Error handling and propagation
- WebSocket protocol flow (connection, reconnection, message correlation)
- Batch operations
- Performance characteristics and latency breakdown

Start here for: Understanding how data flows through the system and debugging communication issues.

### [5. WebSocket Bridge](./websocket.md)

**WebSocket protocol and connection management**

Topics covered:

- WebSocket bridge architecture
- Protocol specification (JSON-based message format)
- Request/response correlation with unique IDs
- Connection lifecycle and auto-reconnect
- Server-side implementation (TypeScript)
- Extension-side implementation (JavaScript)
- Manifest configuration
- Security considerations
- Troubleshooting and debugging
- Performance optimization
- Comparison to Native Messaging

Start here for: Understanding WebSocket bridge implementation and connection management.

## Architecture Overview Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Clients                          │
│            (Claude, GPT, Custom Apps)                   │
└────────────────────┬────────────────────────────────────┘
                     │ JSON-RPC 2.0 (stdio)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  MCP Server (Node.js)                   │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐        │
│  │  Tools   │  │ Resources │  │  WebSocket   │        │
│  │ Handler  │  │  Handler  │  │    Bridge    │        │
│  │ 56 tools │  │           │  │  Port 9876   │        │
│  └──────────┘  └───────────┘  └──────────────┘        │
└────────────────────┬───────────────────────────────────┘
                     │ WebSocket (ws://localhost:9876)
                     │ Request/Response Correlation
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Thunderbird Extension (MailExtension)          │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Background Script (Service Worker)             │  │
│  │   WebSocket Client (Auto-Reconnect)              │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │  │
│  │  │Messages │ │ Folders │ │Contacts │ │ Compose│ │  │
│  │  │10 tools │ │ 7 tools │ │ 9 tools │ │ 8 tools│ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └────────┘ │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │  │
│  │  │  Tags   │ │Accounts │ │Calendar │ │ Tasks  │ │  │
│  │  │ 4 tools │ │ 3 tools │ │ 9 tools │ │ 6 tools│ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│  * Calendar API experimental via webext-experiments     │
└────────────────────┬────────────────────────────────────┘
                     │ Thunderbird WebExtension APIs
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Thunderbird                          │
│      (Email, Contacts, Calendars, Tasks)               │
└─────────────────────────────────────────────────────────┘
```

## Key Technologies

| Component        | Technology                | Purpose                     |
| ---------------- | ------------------------- | --------------------------- |
| MCP Server       | Node.js 20+ / TypeScript  | Protocol implementation     |
| SDK              | @modelcontextprotocol/sdk | MCP framework               |
| Validation       | Zod                       | Schema validation           |
| WebSocket Server | ws library                | Bidirectional communication |
| Extension        | Manifest V3 MailExtension | Thunderbird integration     |
| WebSocket Client | Browser WebSocket API     | Real-time connection        |
| Logging          | Winston                   | Structured logging          |

## Key Features

### WebSocket Architecture

- Bidirectional real-time communication
- Auto-reconnect with fixed 3-second delay (10 attempts max)
- Request/response correlation via unique IDs
- Connection state awareness (onopen, onclose, onerror)
- No platform-specific setup required
- Localhost-only binding for security

### Tool Coverage

- **Messages** (10 tools): search, list, list unread, list recent, get, move, copy, delete, update, archive
- **Folders** (7 tools): list, get, create, rename, delete, move, mark read
- **Contacts** (9 tools): search, list, get, create, update, delete + 3 address book tools
- **Tags** (4 tools): list, create, update, delete
- **Accounts** (3 tools): list accounts, get account, list identities
- **Compose** (8 tools): begin new, begin reply, begin forward, get details, set details, save draft, save template, send
- **Calendar** (9 tools): list calendars, get calendar, search/list/get/create/update/move/delete events
- **Tasks** (6 tools): list, get, create, update, delete, complete

### Performance

- Latency: 10-50ms per operation (2x faster than Native Messaging)
- Timeout management: 30s default, configurable per request
- Concurrent requests: Up to 100 pending requests
- Request correlation: Enables out-of-order response handling

## Document Dependencies

```
overview.md
├── References all other docs for details
│
├── extension.md
│   └── Details extension implementation
│
├── server.md
│   └── Details server implementation
│
├── data-flow.md
│   ├── Uses: extension.md (API wrappers)
│   ├── Uses: server.md (tool handlers)
│   └── Uses: websocket.md (protocol)
│
└── websocket.md
    ├── Used by: extension.md (WebSocket client)
    ├── Used by: server.md (WebSocket bridge)
    └── Used by: data-flow.md (protocol flow)
```

## Quick Navigation

**I want to...**

- **Understand the system**: Start with [Overview](./overview.md)
- **Add a new tool**: Read [Server](./server.md) → Tool Handlers section
- **Add a new API**: Read [Extension](./extension.md) → API Wrapper Modules section
- **Debug communication**: Read [Data Flow](./data-flow.md) → Error Handling Flow
- **Understand WebSocket**: Read [WebSocket Bridge](./websocket.md) → Protocol Specification
- **Fix connection issues**: Read [WebSocket Bridge](./websocket.md) → Troubleshooting
- **Understand security**: Read [Overview](./overview.md) → Security Model
- **Optimize performance**: Read [Data Flow](./data-flow.md) → Performance Characteristics

## Additional Resources

### Specifications

- [CAHIER_DES_CHARGES.md](../../CAHIER_DES_CHARGES.md) - Full project specification
- [MCP Specification](https://modelcontextprotocol.io/specification/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)

### API Documentation

- [Thunderbird WebExtension API](https://webextension-api.thunderbird.net/en/mv3/)
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ws Library Documentation](https://github.com/websockets/ws)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### Project Structure

```
Thunderbird-mcp/
├── docs/
│   ├── architecture/          ← You are here
│   ├── api/                   API reference
│   └── guides/                User guides
├── extension/                 Thunderbird extension code
│   ├── background.js          WebSocket client
│   └── native-messaging/      API handlers
├── server/                    MCP server code
│   ├── src/websocket/         WebSocket bridge
│   ├── src/tools/             Tool handlers (56 tools)
│   └── src/resources/         Resource handlers
└── tests/                     Test suites
```

## Contributing

When updating architecture documentation:

1. **Keep diagrams updated**: Use Mermaid for all diagrams
2. **Cross-reference**: Link to related sections in other documents
3. **Include examples**: Provide code examples for key concepts
4. **Document decisions**: Explain trade-offs and rationale
5. **Update this README**: Add new documents to the index
6. **Reflect actual implementation**: Documentation must match code

## Changelog

| Date       | Document     | Changes                                        |
| ---------- | ------------ | ---------------------------------------------- |
| 2025-12-05 | All          | Updated to reflect WebSocket architecture      |
| 2025-12-05 | websocket.md | Created WebSocket bridge documentation         |
| 2025-12-05 | overview.md  | Updated system architecture diagrams and flows |
| 2025-12-05 | data-flow.md | Updated to WebSocket protocol flows            |
| 2025-12-05 | README.md    | Updated navigation and architecture overview   |
