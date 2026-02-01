# Changelog

All notable changes to the Thunderbird MCP Server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-01-21

### Added

- **Multi-client Docker architecture**: Complete redesign of WebSocket bridge to support multiple MCP clients
  - New `bridge-client.ts`: WebSocket client that connects to existing bridge via `/mcp` path
  - New `bridge-standalone.ts`: Standalone bridge server script for Docker containers
  - Path-based WebSocket routing: `/thunderbird` for extension, `/mcp` for MCP clients
  - HTTP health endpoint at `/health` returning JSON status
  - Bridge now tracks and manages multiple simultaneous MCP connections

### Changed

- **Docker architecture**: Container now runs standalone bridge, MCP instances connect via `docker exec`
  - Dockerfile updated to use `bridge-standalone.js` as default entry point
  - docker-compose.yml updated with improved health checks and documentation
  - Multiple MCP clients can now share the same bridge simultaneously

### Technical Details

- `WebSocketBridge` class now uses HTTP server with WebSocket upgrade routing
- Two WebSocket servers: one for Thunderbird (single client), one for MCP (multi-client)
- MCP clients connect to `ws://localhost:9876/mcp` path
- Thunderbird extension connects to `ws://localhost:9876/` or `/thunderbird`
- Requests from MCP clients are relayed to Thunderbird and responses routed back
- `initializeWebSocketBridge()` auto-detects if bridge exists and connects as client

---

## [1.1.2] - 2025-12-06

### Fixed

- **Action routing bugs**: Fixed several mismatches between server actions and extension handler
  - Fixed `folders.markAsRead` action - handler case was `mark_read` instead of `markAsRead`
  - Fixed `addressBooks` domain routing - case-sensitive mismatch (was `addressbooks`)
  - Added missing `getFull` and `getRaw` message handlers for full/raw message retrieval

---

## [1.1.1] - 2025-12-05

### Fixed

- **Event Page Keep-Alive**: Fixed extension becoming unresponsive after idle period
  - Added `browser.alarms` API to prevent Manifest V3 Event Page termination
  - Implemented staggered keep-alive alarms (3 alarms at 20-second intervals)
  - WebSocket automatically reconnects when extension wakes from idle
  - Added `alarms` permission to manifest.json

### Technical Details

- In Manifest V3, Event Pages are terminated after ~30-90 seconds of inactivity
- `setTimeout()` is not honored when Event Page terminates
- Solution uses `browser.alarms.create()` with `periodInMinutes: 1` to wake extension
- New functions: `setupKeepAlive()`, `ensureWebSocketConnected()`

---

## [1.1.0] - 2025-12-05

### Added

- Docker support for containerized deployment
- Docker Compose configuration for easy setup

### Fixed

- Logger output redirected to stderr for MCP stdio compatibility
- Improved tool descriptions for better LLM understanding
- Fixed `folders.list` tool response format

---

## [1.0.0] - 2025-12-05

### Added

#### MCP Server

- Initial release of the MCP server component
- 47 MCP tools across 7 domains:
  - **Messages** (9 tools): search, list, list_unread, get, move, copy, delete, update, archive
  - **Folders** (7 tools): list, get, create, rename, delete, move, mark_read
  - **Contacts** (9 tools): search, list, get, create, update, delete, addressbooks_list, addressbooks_create, addressbooks_delete
  - **Tags** (4 tools): list, create, update, delete
  - **Accounts** (3 tools): accounts_list, accounts_get, identities_list
  - **Calendar** (9 tools): calendars_list, calendars_get, events_search, events_list, events_get, events_create, events_update, events_move, events_delete
  - **Tasks** (6 tools): tasks_list, tasks_get, tasks_create, tasks_update, tasks_delete, tasks_complete
- 8 MCP resources for contextual data access
- Full JSON-RPC 2.0 compliance
- Native Messaging bridge to Thunderbird extension
- Comprehensive TypeScript type definitions
- Zod schema validation for all tool inputs

#### Thunderbird Extension

- Manifest V3 MailExtension
- Native Messaging handler for MCP server communication
- API wrappers for all Thunderbird WebExtension APIs:
  - messenger.messages.\*
  - messenger.folders.\*
  - messenger.accounts.\*
  - messenger.addressBooks.\*
  - messenger.tags.\*
- Support for experimental Calendar API via webext-experiments

#### Documentation

- Complete API documentation for all 47 tools
- Architecture documentation with Mermaid diagrams
- Installation guides for Linux, macOS, and Windows
- Quick start guide for developers
- Cahier des charges (technical specification)

#### Infrastructure

- Monorepo structure with npm workspaces
- TypeScript 5.5+ configuration
- Vitest test framework setup
- Winston logging
- Installation and packaging scripts

### Notes

- Calendar and Tasks tools are marked as EXPERIMENTAL and require the calendar experiment API
- The extension requires Thunderbird 128.0 or later
- Native Messaging must be configured for the server to communicate with Thunderbird

## [Unreleased]

### Planned

- HTTP+SSE transport option for remote connections
- Resource subscription support
- Additional prompts for common email workflows
- Automated test suite expansion
- Performance optimizations for large mailboxes
