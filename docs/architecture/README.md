# Architecture Documentation

Comprehensive architecture documentation for the Thunderbird MCP Server project.

## Documents

### [1. Overview](./overview.md)
**High-level system architecture and component descriptions**

Topics covered:
- System architecture diagram
- Component descriptions (MCP Client, Server, Extension, Thunderbird)
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
- Component architecture (Background script, API wrappers, Native Messaging handler)
- Service Worker lifecycle
- API wrapper modules (Messages, Folders, Contacts, Accounts, Tags)
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
- Tool handler implementations
- Resource handler implementations
- Native Messaging client
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
- Native Messaging protocol flow
- Batch operations
- Performance characteristics and latency breakdown

Start here for: Understanding how data flows through the system and debugging communication issues.

### [5. Native Messaging Integration](./native-messaging.md)
**Native Messaging protocol and platform configuration**

Topics covered:
- Protocol specification (length-prefixed JSON)
- Message format and serialization
- Connection lifecycle
- Server-side implementation (TypeScript)
- Extension-side implementation (JavaScript)
- Manifest configuration (all platforms)
- Platform-specific setup (Linux, macOS, Windows)
- Security considerations
- Troubleshooting and debugging
- Performance optimization

Start here for: Understanding Native Messaging implementation and setting up platform-specific configurations.

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
│  │  Tools   │  │ Resources │  │ Native       │        │
│  │ Handler  │  │  Handler  │  │ Messaging    │        │
│  └──────────┘  └───────────┘  │ Client       │        │
│                                └──────────────┘        │
└────────────────────┬───────────────────────────────────┘
                     │ Native Messaging Protocol
                     │ (length-prefixed JSON)
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Thunderbird Extension (MailExtension)          │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Background Script (Service Worker)      │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │  │
│  │  │Messages │ │ Folders │ │Contacts │ │Calendar│ │  │
│  │  │   API   │ │   API   │ │   API   │ │  API*  │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│  * Experimental API via webext-experiments              │
└────────────────────┬────────────────────────────────────┘
                     │ Thunderbird WebExtension APIs
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Thunderbird                          │
│      (Email, Contacts, Calendars, Tasks)               │
└─────────────────────────────────────────────────────────┘
```

## Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| MCP Server | Node.js 20+ / TypeScript | Protocol implementation |
| SDK | @modelcontextprotocol/sdk | MCP framework |
| Validation | Zod | Schema validation |
| Extension | Manifest V3 MailExtension | Thunderbird integration |
| IPC | Native Messaging | Cross-process communication |
| Logging | Winston | Structured logging |

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
│   └── Uses: native-messaging.md (protocol)
│
└── native-messaging.md
    ├── Used by: extension.md (handler implementation)
    ├── Used by: server.md (client implementation)
    └── Used by: data-flow.md (protocol flow)
```

## Quick Navigation

**I want to...**

- **Understand the system**: Start with [Overview](./overview.md)
- **Add a new tool**: Read [Server](./server.md) → Tool Handlers section
- **Add a new API**: Read [Extension](./extension.md) → API Wrapper Modules section
- **Debug communication**: Read [Data Flow](./data-flow.md) → Error Handling Flow
- **Set up Native Messaging**: Read [Native Messaging](./native-messaging.md) → Platform-Specific Setup
- **Understand security**: Read [Overview](./overview.md) → Security Model
- **Optimize performance**: Read [Data Flow](./data-flow.md) → Performance Characteristics

## Additional Resources

### Specifications
- [CAHIER_DES_CHARGES.md](../../CAHIER_DES_CHARGES.md) - Full project specification
- [MCP Specification](https://modelcontextprotocol.io/specification/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)

### API Documentation
- [Thunderbird WebExtension API](https://webextension-api.thunderbird.net/en/mv3/)
- [Native Messaging (Mozilla)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### Project Structure
```
Thunderbird-mcp/
├── docs/
│   ├── architecture/          ← You are here
│   ├── api/                   API reference (future)
│   └── guides/                User guides (future)
├── extension/                 Thunderbird extension code
├── server/                    MCP server code
└── tests/                     Test suites
```

## Contributing

When updating architecture documentation:

1. **Keep diagrams updated**: Use Mermaid for all diagrams
2. **Cross-reference**: Link to related sections in other documents
3. **Include examples**: Provide code examples for key concepts
4. **Document decisions**: Explain trade-offs and rationale
5. **Update this README**: Add new documents to the index

## Changelog

| Date | Document | Changes |
|------|----------|---------|
| 2025-12-05 | All | Initial architecture documentation created |
