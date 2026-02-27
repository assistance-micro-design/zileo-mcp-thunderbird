# Security Review Report - Thunderbird-MCP
Date: 2026-02-27
Scope: security (all components)
Files analyzed: 35+ (server/, extension/, Docker configs)

## Executive Summary

| Category | Score | Grade | Findings |
|----------|-------|-------|----------|
| WebSocket & Network | 72/100 | B- | 2 HIGH, 1 MEDIUM, 1 LOW |
| Input Validation | 82/100 | B+ | 0 HIGH, 2 MEDIUM, 1 LOW |
| Authentication & Authorization | 78/100 | B | 1 HIGH, 1 MEDIUM, 0 LOW |
| Data Exposure & Logging | 88/100 | A- | 0 HIGH, 1 MEDIUM, 1 LOW |
| Docker & Deployment | 75/100 | B | 1 HIGH, 1 MEDIUM, 1 LOW |
| Extension Security | 85/100 | A- | 0 HIGH, 1 MEDIUM, 1 LOW |
| **GLOBAL SCORE** | **80/100** | **B+** | **4 HIGH, 7 MEDIUM, 5 LOW** |

Overall assessment: The project demonstrates **strong security foundations** with a
well-designed tiered authorization system (SEC-AUTH-001), proper origin validation
(SEC-WS-003), timing-safe token comparison, and comprehensive Zod input validation.
The main risks lie in the **auth token endpoint exposure model** and **Docker default
port binding**. These are addressable with targeted fixes.

---

## Detailed Findings

### 1. WebSocket & Network Security (72/100)

#### SEC-REVIEW-001 [HIGH] Auth token endpoint serves token to any requester — RESOLVED
- **File**: `server/src/websocket/bridge.ts:218-236`
- **Issue**: The `GET /auth/token` endpoint returned the token with `Access-Control-Allow-Origin: *`.
- **Fix applied**: CORS now reflects origin only if `isAllowedOrigin()` passes (localhost, `moz-extension://`); returns `"null"` for all others. Rate limiter added (10 req/min per IP, HTTP 429). Combined with SEC-REVIEW-008 (port bound to 127.0.0.1).

#### SEC-REVIEW-002 [HIGH] Token passed as WebSocket URL query parameter
- **File**: `server/src/websocket/bridge.ts:276`, `extension/background.js:68`
- **Issue**: The auth token is passed as `?token=<hex>` in the WebSocket URL. This
  means the token may appear in:
  - HTTP server access logs
  - Proxy logs (if any intermediate proxy is used)
  - The extension's network tab in developer tools
  - The `request.url` field in Node.js IncomingMessage objects
- **Impact**: Medium - Information leakage of authentication credential
- **Recommendation**: Use a WebSocket sub-protocol header or send the token as the
  first message after connection (handshake authentication pattern). Alternatively,
  use `Sec-WebSocket-Protocol` header for token transport.

#### SEC-REVIEW-003 [MEDIUM] No runtime validation of WebSocket message structure
- **File**: `server/src/websocket/bridge.ts:360, 388`
- **Issue**: Incoming WebSocket messages are parsed from JSON and cast with
  `as WsMessage` type assertion. There is no runtime validation that the message
  conforms to the expected structure (e.g., has required fields like `id`, `type`,
  `timestamp`). A malformed message could cause undefined behavior or crashes.
- **Impact**: Low in practice (connections are already authenticated), but violates
  defense-in-depth principles.
- **Recommendation**: Add a lightweight Zod schema or manual check for required
  message fields before processing.

#### SEC-REVIEW-004 [LOW] WebSocket server binds to all interfaces by default
- **File**: `server/src/websocket/bridge.ts:320`
- **Issue**: `this.httpServer.listen(this.options.port)` without specifying a host
  binds to `0.0.0.0` (all interfaces). In standalone mode (non-Docker), this exposes
  the bridge to the local network.
- **Recommendation**: Bind to `127.0.0.1` by default, allow override via environment
  variable `THUNDERBIRD_BIND_HOST`.

---

### 2. Input Validation (82/100)

#### SEC-REVIEW-005 [MEDIUM] Folder schemas missing .max() on string fields — RESOLVED
- **File**: `server/src/tools/folders.ts`
- **Fix applied**: Added `.max(500)` to all folderId fields, `.max(200)` to accountId, `.max(255)` to folder names. 9 new tests added.

#### SEC-REVIEW-006 [MEDIUM] Tags/Accounts schemas missing .max() constraints — RESOLVED
- **File**: `server/src/tools/tags.ts`, `server/src/tools/accounts.ts`
- **Fix applied**: Added `.max(50)` to tag keys, `.max(200)` to accountId. 4 new tests added.

#### SEC-REVIEW-007 [LOW] Extension handler.js dispatch has no action allowlist
- **File**: `extension/native-messaging/handler.js:46-95`
- **Issue**: The `dispatch()` function uses `method.split("_").slice(1)` or
  `method.split(".")` to extract domain and action, then routes via switch/case.
  While the switch/case acts as an implicit allowlist, the string parsing is fragile:
  - `thunderbird_messages_search` correctly yields `["messages", "search"]`
  - But `thunderbird__search` would yield `["", "search"]`, hitting the default case
  - The `method.split("_").slice(1)` only takes the first two segments, so
    `thunderbird_messages_search_extra` would lose "extra"
- **Impact**: Very low - the switch/case default throws an error, so invalid actions
  are rejected. The concern is correctness rather than security.
- **Recommendation**: Consider regex-based parsing or explicit action mapping.

---

### 3. Authentication & Authorization (78/100)

#### SEC-REVIEW-008 [HIGH] Docker compose exposes port to all interfaces — RESOLVED
- **File**: `docker-compose.yml`
- **Fix applied**: Port binding changed to `"127.0.0.1:${THUNDERBIRD_PORT:-9876}:9876"`. Health check upgraded to HTTP `/health` endpoint.

#### SEC-REVIEW-009 [MEDIUM] Tool permissions are advisory, not enforced at extension level — RESOLVED
- **File**: `server/src/websocket/bridge.ts`
- **Fix applied**: `relayRequestToThunderbird()` now calls `isToolAllowed()` before forwarding. Denied tools return error code -5 with tier info and instructions to enable in extension options.

---

### 4. Data Exposure & Logging (88/100)

#### SEC-REVIEW-010 [MEDIUM] Search parameters logged at DEBUG level — RESOLVED
- **File**: `server/src/tools/messages.ts`, `contacts.ts`, `calendar.ts`, `tasks.ts`
- **Fix applied**: Sensitive fields (body, subject, from, to, query, title) removed from all debug logs. Only metadata (folderId, accountId, limit, calendarId) is logged.

#### SEC-REVIEW-011 [LOW] Log files have no rotation or size limit — RESOLVED
- **File**: `server/src/utils/logger.ts`
- **Fix applied**: Winston file transports now have `maxsize: 10 MiB` and `maxFiles: 5`.

---

### 5. Docker & Deployment (75/100)

#### SEC-REVIEW-012 [HIGH] Combined: unrestricted token + 0.0.0.0 port binding — RESOLVED
- Cross-reference of SEC-REVIEW-001 + SEC-REVIEW-008. Both resolved.

#### SEC-REVIEW-013 [MEDIUM] Health check does not verify service health — RESOLVED
- **Fix applied**: docker-compose.yml health check upgraded to HTTP `/health` endpoint with JSON parsing.

#### SEC-REVIEW-014 [LOW] SECURITY.md version out of date — RESOLVED
- **Fix applied**: Updated to 1.3.x.

---

### 6. Extension Security (85/100)

#### SEC-REVIEW-015 [MEDIUM] Extension uses console.log extensively — RESOLVED
- **File**: `extension/background.js`
- **Fix applied**: `console.log` now logs only message type and id (e.g., `"[MCP] Received: request req_1"`). Full payloads no longer logged.

#### SEC-REVIEW-016 [LOW] Extension CSP allows ws://localhost and http://localhost
- **File**: `extension/manifest.json:37-39`
- **Issue**: CSP includes `connect-src 'self' ws://localhost:9876 http://localhost:9876`.
  This is correctly restrictive (only localhost:9876), but does not account for the
  possibility that a malicious page injected into the extension context could initiate
  connections to localhost:9876. This is a theoretical concern since Thunderbird
  extensions run in a more restricted context than web pages.
- **Impact**: Very low - Thunderbird extension context is already sandboxed.

---

## Strengths (Security Done Well)

1. **Token-based WebSocket authentication** (`crypto.randomBytes(32)`, timing-safe
   comparison) - Solid cryptographic implementation.

2. **Origin validation** with comprehensive allowlist (localhost, 127.0.0.1, ::1,
   moz-extension://) and proper URL parsing - prevents cross-origin WebSocket hijacking.

3. **Tiered tool authorization** (read/modify/destructive) with user-controlled
   permissions from the extension options page - excellent defense against AI misuse.

4. **Comprehensive Zod input validation** on all tool handlers in the server, with
   `.max()` constraints, `.email()` validation on compose tools, and `.datetime()`
   validation on date fields.

5. **Schema hardening tests** that verify Zod rejects oversized inputs.

6. **Sanitized error responses** - `nativeErrorToJsonRpc()` strips stack traces and
   internal details before returning to MCP clients.

7. **Logger writes to stderr** - correctly avoids polluting the MCP stdio transport.

8. **Docker non-root user** (`USER mcp`) in the production Dockerfile.

9. **Multi-stage Docker build** minimizing attack surface in production image.

10. **WebSocket payload limit** (5 MiB `MAX_WS_PAYLOAD`) prevents memory exhaustion
    from oversized messages.

11. **Pending request limit** (`maxPendingRequests: 100`) prevents request-flooding DoS.

---

## Top 5 Priority Recommendations

| # | Finding | Severity | Effort | Action |
|---|---------|----------|--------|--------|
| 1 | SEC-REVIEW-008 + 001: Docker port + token endpoint | HIGH | Trivial | Change `docker-compose.yml` port binding to `127.0.0.1:9876:9876` |
| 2 | SEC-REVIEW-005: Folder schemas missing .max() | MEDIUM | Trivial | Add `.max(500)` to folderId fields, `.max(200)` to accountId |
| 3 | SEC-REVIEW-001: Token endpoint CORS | HIGH | Low | Change `Access-Control-Allow-Origin: *` to restrictive value |
| 4 | SEC-REVIEW-009: Permission enforcement in bridge | MEDIUM | Moderate | Add tool permission check in `relayRequestToThunderbird()` |
| 5 | SEC-REVIEW-011: Log rotation | LOW | Trivial | Add `maxsize` and `maxFiles` to Winston file transports |

---

## Test Coverage for Security Features

| Security Feature | Test File | Status |
|-----------------|-----------|--------|
| Origin validation (SEC-WS-003) | `bridge-origin.test.ts` | Covered (13 tests) |
| Token authentication (SEC-WS-001) | `bridge-auth.test.ts` | Covered (10 tests) |
| isLocalAddress utility | `bridge-auth.test.ts` | Covered (12 tests) |
| Schema hardening (SEC-INPUT-001/002) | `schema-hardening.test.ts` | Covered (40+ tests) |
| Tool permissions (SEC-AUTH-001) | `tool-permissions.test.ts` | Covered |
| Error sanitization | `errors.test.ts` | Covered |
| Folder schema max constraints | `schema-hardening.test.ts` | Covered (9 tests) |
| Tags/Accounts schema constraints | `schema-hardening.test.ts` | Covered (4 tests) |
| **Token endpoint access control** | **Not covered** | **Gap** |

---

## Dependency Note

Dependencies (`@modelcontextprotocol/sdk`, `winston`, `ws`, `zod`) use caret ranges
(`^`) which means minor/patch updates are automatically resolved. An `npm audit`
should be run regularly to check for known vulnerabilities. This review did not perform
a live audit.
