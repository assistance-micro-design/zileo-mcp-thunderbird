# Changelog

All notable changes to the Zileo MCP — Thunderbird project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- HTTP+SSE transport option for remote connections
- Resource subscription support
- Additional prompts for common email workflows
- Performance optimizations for large mailboxes
- Configurable bridge port on the extension side

---

## [1.4.0] - 2026-06-10

First release published under the **Apache License 2.0** (see Changed below) —
this release clarifies the license transition announced after v1.3.1.

Full senior-audit remediation: every critical/high finding fixed with a
tests-first, zero-regression strategy (389 tests, 0 npm audit vulnerability).

### Changed

- **License changed from MIT to Apache License 2.0.** The Apache 2.0
  license adds an explicit patent grant (Section 3) that the MIT license
  lacks, aligning Zileo MCP — Thunderbird with the default license of the
  Assistance Micro Design organization. All previous releases
  (v1.0.0 through v1.3.1) remain published under MIT as released; this
  change applies prospectively from v1.4.0. See `LICENSE` for the
  full text and `NOTICE` for required attribution under Apache 2.0
  Section 4.
- **Message list/search responses are now pagination envelopes.**
  `thunderbird_messages_search`, `_list_unread` and `_list_recent` used to
  return a bare array; they now return `{ messages, total, hasMore,
scanComplete }` (and `_list` additionally echoes `limit`/`offset`).
  `scanComplete: false` signals the 5000-message scan bound (`MAX_SCAN`)
  was reached — truncation is never silent.
- `sortBy`/`sortOrder` parameters added to all 4 message listing tools
  (date|subject|author, asc|desc), with sorting applied JS-side across the
  full result set for predictable behavior on every Thunderbird version.
- All 56 MCP tool descriptions rewritten with a richer LLM-oriented format:
  short action sentence, an `Example:` block (Input/Output), and a `Note:`
  block citing the source tool for every external ID consumed.
- Extracted `executeToolHandler()` shared wrapper (~1400 lines of
  boilerplate removed); JSDoc added on zod schemas (7acca08) and on the
  22 previously undocumented exported handlers.
- Tool permission denials and bridge timeouts now carry typed JSON-RPC
  errors (-32002 Permission denied, -32004 Operation timeout) instead of
  ad hoc strings.
- Structured logger metadata is now serialized into the log line (it was
  silently dropped); log directory configurable via `LOG_DIR` (defaults to
  an absolute, module-anchored path; file logging disables itself with a
  notice when the directory is not writable).
- `tsconfig.build.json` excludes tests from `dist/` (local build now
  matches the Docker image); the MCP server reports its version from
  `server/package.json` (single source of truth, guarded by a version
  coherence test across root/server/extension/manifest/Dockerfile).
- Docker: base image pinned by digest, version label via `ARG APP_VERSION`,
  `LOG_DIR=/app/logs` so the logs volume is actually used; the dev image
  now runs the standalone bridge (same architecture as production) and the
  dev compose service gains healthcheck, `stdin_open` and resource limits.
- Renames for clarity: `extension/native-messaging/` → `extension/routing/`;
  server `getNativeClient()` → `getBridgeClient()` (it has always been the
  WebSocket path since the native messaging transport was abandoned).

### Added

- **Real pagination in the extension**: `messages.list`/`query` results are
  drained page by page via `messages.continueList()` (bounded by
  `MAX_SCAN = 5000`, with `messages.abortList()` on early stop). Before
  this, every message tool silently operated on the first ~100 messages:
  `total` and `hasMore` were wrong and the sort was per-page only.
- **Typed server↔extension contract**: `types/action-results.ts` maps all
  52 routed native actions to the real extension payload shapes;
  `sendRequest<A>()` returns typed responses. A new pagination contract
  guard in `contract-coherence.test.ts` pins the `continueList`/
  `scanComplete` behavior.
- **Bridge-client reconnection**: a bridge restart no longer kills the MCP
  session — exponential backoff (1s/2s/4s, 3 attempts), auth token
  re-fetched per attempt, terminal `reconnect_failed` event.
- **Extension reconnection MV3-safe**: one-shot `ws-reconnect` alarm with
  exponential backoff replaces `setTimeout` (lost on event page
  suspension); `onAlarm` dispatcher registered synchronously at top-level.
- i18n wired: manifest `name`/`description` use
  `__MSG_extensionName__`/`__MSG_extensionDescription__` from `_locales/en`.
- Safety-net test suites: bridge relay (rate limit, pending rejection,
  zombie replacement), bridge-client lifecycle, tool tiers coherence
  (server vs options.js), version coherence, logger metadata.
- `npm run package:extension`: zips the content of `extension/` into
  `releases/zileo-mcp-thunderbird-<version>.xpi` (manifest at the zip root).
- CI: runs on push to main and PRs; blocking coverage step
  (`@vitest/coverage-v8`), blocking `npm audit --audit-level=high`, and a
  `docker compose build` smoke job. Weekly Dependabot (npm +
  github-actions).
- Permission denial logging with reason and tier (9f0c38f); resource
  handler test suite covering all 6 resources + 2 templates (8659bce).
- Contract coherence test (`contract-coherence.test.ts`): every parameter
  declared in a tool's `inputSchema.properties` must be referenced in the
  extension code, with an explicit allowlist for server-side-consumed
  params. Guards against the silent-ignored-param pattern.

### Fixed

- **`thunderbird_messages_delete` never worked**: the `messagesDelete`
  permission was missing from the manifest, so Thunderbird did not inject
  `messenger.messages.delete` and every call threw
  `TypeError: ... is not a function`. Permission added — existing users
  must re-approve the extension on update.
- **Bridge crash (DoS) on malformed upgrade requests**: a 64-character
  multi-byte token made `crypto.timingSafeEqual` throw `RangeError`, and a
  malformed `Host` header made `new URL()` throw `TypeError` — both killed
  the bridge process. Tokens are now compared in byte length and the
  upgrade handler is fully guarded (clean 401/400 instead).
- **Memory leak**: the per-client rate-limit log kept one entry per
  disconnected MCP client forever; purged on close.
- **`bridge.stop()` hang after a zombie connection replacement**:
  `removeAllListeners()` broke the ws client tracking; replaced by
  identity-guarded handlers. `closeIdleConnections()` added so shutdown
  does not wait for idle keep-alive sockets.
- **`thunderbird://contacts/recent` always returned an empty list**: the
  handler tested `Array.isArray` on the `contacts.list` pagination
  envelope (bug surfaced by the new typed contract).
- `thunderbird_messages_search` no longer drops `flagged`/`accountId`
  (e576f28); JS-side sort used everywhere instead of the recent-only
  native `messages.list` options (e379231).
- `thunderbird_folders_list` now actually honors `includeSubFolders`
  (was accepted, validated, and silently ignored).
- TypeScript build emits `.tsbuildinfo` ignored via `.gitignore`; test
  script corrected (942731d).

### Security

- `/auth/token` now validates the `Host` header against
  localhost/127.0.0.1/[::1] (DNS rebinding guard) in addition to the
  source-IP check; CORS reflection and per-IP rate limiting unchanged.
- Zod hardening: `messageIds` bounded to 1000 entries on
  move/copy/delete/archive; calendar search `query` bounded to 1000 chars;
  compose `messageId`/`tabId` must be non-negative integers.
- Options page no longer loads Google Fonts (system font stack — no
  remote asset, ATN-compliant); CSP tightened to `object-src 'none'`.
- `fetchAuthToken` (extension) aborts after 5 s via `AbortController`,
  symmetric with the server-side bridge client.
- Verbose extension logging gated behind a `DEBUG` flag
  (`extension/debug.js`); real failures stay on `console.error`.
- `npm audit`: 0 vulnerability — hono/qs advisories fixed via
  `npm audit fix`, the esbuild/vite chain closed by the vitest 4
  migration.
- Bump `@modelcontextprotocol/sdk` to `^1.29.0` with transitive overrides
  (`hono`, `@hono/node-server`, `fast-uri`, `ip-address`,
  `express-rate-limit`, `ajv-formats`) at the workspace root.
- Prevent XSS in extension Options UI; tighten MCP rate limiting
  (df4b20f); resolve native actions to correct MCP tool names for
  permission checks (55dcf64).

### Removed

- `server/src/native-messaging/` (abandoned stdin/stdout transport, 514
  unreferenced lines with a known framing bug) — the WebSocket bridge is
  the only transport. The action vocabulary (`MessageActions`) is kept in
  `types/native-messaging.ts`.
- 28 unused MCP-SDK-duplicate type exports from `types/mcp.ts`; the
  aspirational calendar/compose models that never matched real extension
  payloads (replaced by `types/action-results.ts`); unrouted actions
  (`messages.listAttachments`, `addressBooks.get`, `ping`, `getVersion`)
  purged from the action map.
- 7 vendored calendar experiment files that were never registered in
  `experiment_apis` (UI/provider extension points unusable by MCP tools);
  provenance documented in `extension/experiments/calendar/VENDORED.md`
  for future re-import.
- `scope` parameter dropped from `thunderbird_events_update` and
  `thunderbird_events_delete` schemas and tool descriptions. The param
  was accepted but never honored downstream — the experimental
  `browser.calendar.items.{update,remove}` API exposes no `scope` and
  per-occurrence handling requires iCal manipulation
  (RECURRENCE-ID / recurrenceInfo.modifyException) that is not yet
  wired up. Reimplementation would require dedicated jCal handling in
  the calendar experiment wrappers.
- Empty `server/src/schemas/` directory; stale root launcher script;
  duplicated XPI in `releases/` (artifacts are now built on demand and
  published as GitHub Release assets; the directory is gitignored).
- `scripts/install.sh`, `scripts/package.sh`, and `native-host.json`:
  vestiges of the abandoned Native Messaging architecture.

### Documentation

- Installation docs fixed end-to-end: the four references to a
  non-existent `releases/zileo-mcp-thunderbird-1.3.1.xpi` now point to GitHub
  Releases, with a documented from-source packaging procedure.
- README gains a tool permission tiers section (read/modify/destructive,
  defaults, options UI) and the `messagesDelete` re-approval note.
- API docs updated: pagination semantics (`scanComplete`, `MAX_SCAN`),
  `sortBy`/`sortOrder`, stale `scope` parameters purged from
  `calendar-api.md`.
- GitHub standards, CI workflow, README sync (9b81760); Docker setup
  recommended with clarified risk warnings (7a3a462); root files
  reorganized (685c1f4); 8 documentation inaccuracies corrected (219914a).

### Upgrade notes

- **Extension update prompts for re-approval** because of the new
  `messagesDelete` permission.
- MCP clients consuming `thunderbird_messages_search`/`_list_unread`/
  `_list_recent` must read the `messages` field of the new response
  envelope instead of a bare array.
- Calls exceeding the new Zod bounds (`messageIds` > 1000, calendar
  `query` > 1000 chars, negative/float `messageId`/`tabId`) are now
  rejected with a validation error.

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

| #   | Finding                                        | Fix                                                                             |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| P1  | SEC-REVIEW-008: Docker port 0.0.0.0            | Bind to `127.0.0.1` in docker-compose.yml                                       |
| P2  | SEC-REVIEW-005/006: Missing .max()             | Added to folders, tags, accounts schemas                                        |
| P3  | SEC-REVIEW-001: CORS `*` on /auth/token        | Dynamic origin reflection (allowed origins only) + rate limiter (10 req/min/IP) |
| P4  | SEC-REVIEW-009: No bridge permission check     | `isToolAllowed()` in `relayRequestToThunderbird()`, error code -5               |
| P5  | SEC-REVIEW-010/011: Log exposure + no rotation | Winston `maxsize: 10MiB, maxFiles: 5`, sensitive data removed from logs         |

- Extension `console.log` sanitized: logs only message type+id (SEC-REVIEW-015)
- Internal security review conducted (2026-02-27, score 80/100 B+)
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

| Phase | Finding           | Severity | Fix                                              |
| ----- | ----------------- | -------- | ------------------------------------------------ |
| 5     | SEC-AUTH-001      | CRITICAL | Tool authorization tier system                   |
| 5     | SEC-AUTH-002      | CRITICAL | Per-tool permission toggles in extension options |
| 4     | SEC-WS-001        | HIGH     | Token-based WebSocket authentication             |
| 1     | SEC-ERR-001       | HIGH     | Stack trace removed from responses               |
| 1     | SEC-ERR-002       | HIGH     | Error details sanitized                          |
| 3     | SEC-WS-003        | MEDIUM   | Origin validation on upgrade                     |
| 1     | SEC-WS-002        | MEDIUM   | 5 MiB maxPayload                                 |
| 1     | SEC-DATA-001/002  | MEDIUM   | Sensitive data in DEBUG only                     |
| 2     | SEC-INPUT-001/002 | LOW      | Zod .max() and .datetime() bounds                |

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

---

[Unreleased]: https://github.com/assistance-micro-design/zileo-mcp-thunderbird/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/assistance-micro-design/zileo-mcp-thunderbird/releases/tag/v1.4.0
[1.3.1]: https://github.com/assistance-micro-design/zileo-mcp-thunderbird/releases/tag/v1.3.1
[1.3.0]: https://github.com/assistance-micro-design/zileo-mcp-thunderbird/releases/tag/v1.3.0
[1.2.2]: https://github.com/assistance-micro-design/zileo-mcp-thunderbird/releases/tag/v1.2.2
[1.2.0]: https://github.com/assistance-micro-design/zileo-mcp-thunderbird/releases/tag/v1.2.0
[1.1.2]: https://github.com/assistance-micro-design/zileo-mcp-thunderbird/releases/tag/v1.1.2
[1.1.1]: https://github.com/assistance-micro-design/zileo-mcp-thunderbird/releases/tag/v1.1.1
[1.1.0]: https://github.com/assistance-micro-design/zileo-mcp-thunderbird/releases/tag/v1.1.0
[1.0.0]: https://github.com/assistance-micro-design/zileo-mcp-thunderbird/releases/tag/v1.0.0
