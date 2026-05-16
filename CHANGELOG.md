# Changelog

All notable changes to the Thunderbird MCP Server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **License changed from MIT to Apache License 2.0.** The Apache 2.0
  license adds an explicit patent grant (Section 3) that the MIT license
  lacks, aligning Thunderbird-MCP with the default license of the
  Assistance Micro Design organization. All previous releases
  (v1.0.0 through v1.3.1) remain published under MIT as released; this
  change applies prospectively to new releases. See `LICENSE` for the
  full text and `NOTICE` for required attribution under Apache 2.0
  Section 4.

### Security

- Bump `@modelcontextprotocol/sdk` from `^1.0.0` to `^1.29.0` and add transitive
  overrides (`hono`, `@hono/node-server`, `fast-uri`, `ip-address`,
  `express-rate-limit`) at the workspace root. `npm audit --omit=dev` now
  reports 0 vulnerabilities (was 5).
- Prevent XSS in extension Options UI; tighten MCP rate limiting (df4b20f).
- Resolve native actions to correct MCP tool names for permission checks
  (55dcf64).

### Added

- Permission denial logging with reason and tier (9f0c38f).
- Resource handler test suite covering all 6 resources + 2 templates (8659bce).
- Non-blocking coverage step in the CI validate workflow (b520830).

### Changed

- Rewrote all 56 MCP tool descriptions with a richer LLM-oriented format:
  short action sentence, an `Example:` block (Input/Output), and a `Note:`
  block citing the source tool for every external ID consumed
  (`folderId`, `messageId`, `tagKey`, `tabId`, etc.). `inputSchema.properties`
  unchanged — non-breaking for MCP clients.
- Updated `.claude/rules/mcp.md` reference block to document the new format.
- Synced `CLAUDE.md` and `.claude/registry/inventory.yml` with on-disk reality
  (56 tools in 8 files, 100 TypeScript types in 6 files, 2 utility files).
- JSDoc added on zod schemas for contacts/folders/messages (7acca08).
- Extracted `executeToolHandler()` shared wrapper, eliminating ~1400 lines of
  boilerplate across tool handlers (ebfa7ce).

### Fixed

- `thunderbird_folders_list` now actually honors `includeSubFolders`.
  Previously the parameter was accepted, validated by Zod, and silently
  ignored by `FoldersAPI.list` (extension/api/folders.js). When set to
  `false`, the tool now returns only top-level folders per account
  (direct children of the account root) instead of the full flat
  descendant list. Default behavior (`true`) unchanged.
- TypeScript build now emits `.tsbuildinfo` and ignores it via `.gitignore`;
  test script corrected (942731d).

### Removed

- `scope` parameter dropped from `thunderbird_events_update` and
  `thunderbird_events_delete` schemas and tool descriptions. The param
  was accepted but never honored downstream — the experimental
  `browser.calendar.items.{update,remove}` API exposes no `scope` and
  per-occurrence handling requires iCal manipulation
  (RECURRENCE-ID / recurrenceInfo.modifyException) that is not yet
  wired up. See `docs/specs/2026-05-16_spec-silent-ignored-params.md`
  for the design note covering future reimplementation.
- Empty `server/src/schemas/` directory (no references in source).
- Stale root launcher script `/thunderbird-mcp` (hard-coded path was incorrect).
- Duplicated XPI release: `releases/thunderbird-mcp-1.3.1.xpi` + symlink
  consolidated into a single `releases/thunderbird-mcp-latest.xpi`.
- `scripts/install.sh`, `scripts/package.sh`, and `native-host.json`:
  vestiges of the abandoned Native Messaging architecture (project now
  uses WebSocket via `bridge-standalone.ts` on port 9876). `install.sh`
  would have installed an unused native messaging host with sudo;
  `package.sh` targeted a stale `dist/` location and is superseded by
  the upcoming GitHub Actions release workflow.

### Added

- Contract coherence test (`server/src/__tests__/tools/contract-coherence.test.ts`):
  asserts that every parameter declared in a tool's `inputSchema.properties`
  is referenced by name in the extension code (handler or `api/*.js`).
  Guards against the silent-ignored-param pattern that produced the three
  fixes above. Server-side-consumed params (e.g. `format` dispatched via
  `resolveAction`, `hoursAgo` resolved via `transformParams`) are listed
  in an explicit allowlist with justifications.

### Documentation

- GitHub standards, CI workflow, README sync (9b81760).
- Recommend Docker setup and clarify risk warnings (7a3a462).
- Root files reorganized (685c1f4); 8 documentation inaccuracies corrected
  during audit (219914a).

### Planned

- HTTP+SSE transport option for remote connections
- Resource subscription support
- Additional prompts for common email workflows
- Automated test suite expansion
- Performance optimizations for large mailboxes

---

## [1.3.1] - 2026-02-27

### Security
- Add isLocalAddress() IP check to /auth/token endpoint (SEC-REVIEW-002)
- Patch MCP SDK vulnerability GHSA-345p-7cg4-v4c7 via npm audit fix
- Bind standalone bridge to 127.0.0.1 by default (SEC-REVIEW-002)
- Add periodic cleanup of rate limiter Map to prevent memory leak (SEC-REVIEW-003)
- Add input validation in extension handler.js (SEC-REVIEW-005)

---

## [1.3.0] - 2026-02-27

### Security (Phase 6 - Review Findings)

Implements the top 5 priorities from the security review (score: 80/100 B+):

| # | Finding | Fix |
|---|---------|-----|
| P1 | SEC-REVIEW-008: Docker port 0.0.0.0 | Bind to `127.0.0.1` in docker-compose.yml |
| P2 | SEC-REVIEW-005/006: Missing .max() | Added to folders, tags, accounts schemas |
| P3 | SEC-REVIEW-001: CORS `*` on /auth/token | Dynamic origin reflection (allowed origins only) + rate limiter (10 req/min/IP) |
| P4 | SEC-REVIEW-009: No bridge permission check | `isToolAllowed()` in `relayRequestToThunderbird()`, error code -5 |
| P5 | SEC-REVIEW-010/011: Log exposure + no rotation | Winston `maxsize: 10MiB, maxFiles: 5`, sensitive data removed from logs |

- Extension `console.log` sanitized: logs only message type+id (SEC-REVIEW-015)
- Security review document added: `docs/reviews/security-review-2026-02-27.md`
- 18 new schema hardening tests for folders/tags/accounts (138 total)

### Added

- **Tool Authorization Tiers** (SEC-AUTH-001, SEC-AUTH-002): All 56 MCP tools classified into 3 risk tiers:
  - `read` (23 tools): list, get, search operations - enabled by default
  - `modify` (25 tools): create, update, move, copy, archive - enabled by default
  - `destructive` (8 tools): delete, send - **disabled by default**
- **Extension Options Page** (`options.html`, `options.js`): Full UI in the Thunderbird Add-on Manager to toggle individual tool permissions, grouped by domain with color-coded tier badges (green/orange/red).
- **Bulk Permission Presets**: "Enable All", "Read Only", "Read + Modify", "Disable Destructive" buttons for quick configuration.
- **Real-time Permission Sync**: Permission changes from the options page are immediately propagated to the MCP server via `permissionsUpdated` WebSocket notification.
- **WebSocket Authentication** (SEC-WS-001): Token-based auth on WebSocket upgrade. Bridge generates a `crypto.randomBytes(32)` token at startup, served via `GET /auth/token`. Both extension and bridge-client must present the token via query parameter to connect. Timing-safe comparison prevents timing attacks.
- New `tool-permissions.ts` module: `ToolTier` type, `TOOL_TIERS` map, `getDefaultPermissions()`, `isToolAllowed()`, `getToolTier()`.
- New `getToolPermissions()` method on `BridgeInterface`, `WebSocketBridge`, and `WebSocketBridgeClient`.
- `"storage"` permission and `"options_ui"` declaration in extension manifest.
- 18 unit tests for tool-permissions module (`tool-permissions.test.ts`).
- 33 unit tests for WebSocket authentication (`bridge-auth.test.ts`).

### Changed

- MCP `tools/list` handler now filters tools based on active permissions from the Thunderbird extension.
- MCP `tools/call` handler checks permissions before execution and returns clear error with tier info and instructions to enable the tool in options.
- Extension `handleOpen()` is now async: loads `toolPermissions` from `browser.storage.local` and includes them in the `ready` notification.
- Bridge `handleThunderbirdMessage()` captures `toolPermissions` from `ready` and `permissionsUpdated` notifications.
- Bridge-client `handleMessage()` captures `toolPermissions` from broadcast notifications.
- MCP server version string updated to `1.3.0`.
- Extension fetches auth token via `fetch()` before WebSocket connection.
- Bridge-client fetches auth token via `http.get()` before WebSocket connection.

### Security

Completes the 8-fix security plan (initial score: 72/100 B-, target: ~92/100):

| Phase | Finding | Severity | Fix |
|-------|---------|----------|-----|
| 5 | SEC-AUTH-001 | CRITICAL | Tool authorization tier system |
| 5 | SEC-AUTH-002 | CRITICAL | Per-tool permission toggles in extension options |
| 4 | SEC-WS-001 | HIGH | Token-based WebSocket authentication |
| 1 | SEC-ERR-001 | HIGH | Stack trace removed from responses |
| 1 | SEC-ERR-002 | HIGH | Error details sanitized |
| 3 | SEC-WS-003 | MEDIUM | Origin validation on upgrade |
| 1 | SEC-WS-002 | MEDIUM | 5 MiB maxPayload |
| 1 | SEC-DATA-001/002 | MEDIUM | Sensitive data in DEBUG only |
| 2 | SEC-INPUT-001/002 | LOW | Zod .max() and .datetime() bounds |

---

## [1.2.2] - 2026-02-27

### Security

- **Phase 1 - Quick Wins** (SEC-ERR-001, SEC-ERR-002, SEC-WS-002, SEC-DATA-001, SEC-DATA-002):
  - Remove `error.stack` from WebSocket error responses in extension
  - Sanitize `nativeErrorToJsonRpc` to return message only, no full error objects
  - Set `maxPayload` (5 MiB) on WebSocket servers to prevent memory exhaustion
  - Move sensitive user data logging (search queries, email content) to DEBUG level
- **Phase 2 - Schema Hardening** (SEC-INPUT-001, SEC-INPUT-002):
  - Add `.max()` constraints to all unbounded string fields in Zod schemas
  - Add `.datetime({ offset: true })` validation to all date fields
  - Affects: messages, contacts, calendar, compose, tasks schemas
- **Phase 3 - Bridge Security** (SEC-WS-003):
  - Add origin validation on WebSocket upgrade requests
  - Accept: `undefined/null` (CLI, docker exec), `localhost/127.0.0.1/[::1]`, `moz-extension://`
  - Reject external origins with HTTP 403 Forbidden

### Fixed

- Fix 7 pre-existing ESLint warnings (`explicit-function-return-type`) across 4 files

### Added

- 19 unit tests for WebSocket origin validation (`bridge-origin.test.ts`)
- 56 unit tests for Zod schema hardening (`schema-hardening.test.ts`)

---

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
- 56 MCP tools across 8 domains:
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

- Complete API documentation for all 56 tools
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

---

[Unreleased]: https://github.com/assistance-micro-design/thunderbird-mcp/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/assistance-micro-design/thunderbird-mcp/releases/tag/v1.3.1
[1.3.0]: https://github.com/assistance-micro-design/thunderbird-mcp/releases/tag/v1.3.0
[1.2.2]: https://github.com/assistance-micro-design/thunderbird-mcp/releases/tag/v1.2.2
[1.2.0]: https://github.com/assistance-micro-design/thunderbird-mcp/releases/tag/v1.2.0
[1.1.2]: https://github.com/assistance-micro-design/thunderbird-mcp/releases/tag/v1.1.2
[1.1.1]: https://github.com/assistance-micro-design/thunderbird-mcp/releases/tag/v1.1.1
[1.1.0]: https://github.com/assistance-micro-design/thunderbird-mcp/releases/tag/v1.1.0
[1.0.0]: https://github.com/assistance-micro-design/thunderbird-mcp/releases/tag/v1.0.0
