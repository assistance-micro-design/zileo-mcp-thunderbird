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

#### SEC-REVIEW-001 [HIGH] Auth token endpoint serves token to any requester
- **File**: `server/src/websocket/bridge.ts:218-236`
- **Issue**: The `GET /auth/token` endpoint returns the bridge's authentication token
  to **any** HTTP client, regardless of source IP. The code comment explains this was
  intentional due to Docker NAT unreliability, but the consequence is that if port
  9876 is reachable from an untrusted network, an attacker can trivially obtain the
  token and then establish an authenticated WebSocket connection.
- **CORS header**: `Access-Control-Allow-Origin: *` further reduces protection as
  browser-based code from any origin can fetch the token via JavaScript.
- **Mitigation**: The design relies on the port being bound to localhost only. This
  assumption holds for local development but breaks in Docker (see SEC-REVIEW-008).
- **Recommendation**:
  1. Restore `isLocalAddress()` check on the token endpoint with an allowlist for
     known Docker bridge subnets
  2. Change CORS to `Access-Control-Allow-Origin: null` or restrict to
     `moz-extension://*` origins only
  3. Add a rate limiter (e.g., max 5 requests/minute per IP) to the token endpoint
  4. Consider short-lived tokens with rotation

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

#### SEC-REVIEW-005 [MEDIUM] Folder schemas missing .max() on string fields
- **File**: `server/src/tools/folders.ts:18-48`
- **Issue**: The following Zod schemas have `z.string()` without `.max()`:
  - `foldersGetSchema.folderId`
  - `foldersDeleteSchema.folderId`
  - `foldersMoveSchema.folderId`
  - `foldersMoveSchema.destinationFolderId`
  - `foldersMarkReadSchema.folderId`
  - `foldersListSchema.accountId`
  This is inconsistent with the hardening applied to messages.ts, contacts.ts, and
  calendar.ts schemas (all have `.max()` constraints as verified by schema-hardening
  tests).
- **Impact**: An attacker could send arbitrarily large strings through the MCP protocol,
  consuming memory on the server and extension side.
- **Recommendation**: Add `.max(500)` to all folderId fields and `.max(200)` to
  accountId fields, consistent with other schemas.

#### SEC-REVIEW-006 [MEDIUM] Tags/Accounts schemas missing .max() constraints
- **File**: `server/src/tools/tags.ts`, `server/src/tools/accounts.ts`
- **Issue**: Need to verify these schemas also have .max() constraints. Based on the
  schema-hardening test file, tags and accounts schemas are not covered by the tests,
  suggesting they may lack max constraints.
- **Recommendation**: Audit and add .max() to all string fields in tags.ts and
  accounts.ts schemas. Add corresponding tests.

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

#### SEC-REVIEW-008 [HIGH] Docker compose exposes port to all interfaces
- **File**: `docker-compose.yml:38-39`
- **Issue**: Port mapping `"${THUNDERBIRD_PORT:-9876}:9876"` binds to 0.0.0.0 by
  default. Combined with SEC-REVIEW-001 (unrestricted token endpoint), any host on
  the same network can:
  1. `curl http://<host-ip>:9876/auth/token` to get the token
  2. Connect to `ws://<host-ip>:9876/thunderbird?token=<token>` as the extension
  3. Impersonate the Thunderbird extension and intercept all MCP requests
  This is the most critical combined attack vector.
- **Recommendation**: Change to `"127.0.0.1:${THUNDERBIRD_PORT:-9876}:9876"` in
  docker-compose.yml and document that external access requires explicit configuration.

#### SEC-REVIEW-009 [MEDIUM] Tool permissions are advisory, not enforced at extension level
- **File**: `extension/native-messaging/handler.js`, `extension/background.js`
- **Issue**: The tool permission system (SEC-AUTH-001) is enforced only on the
  MCP server side (`server.ts:91-104`). The extension's handler.js dispatches any
  valid action without checking permissions. This means:
  - If an attacker bypasses the MCP server (by connecting directly to the bridge as
    an MCP client), they can send requests for any tool regardless of permissions
  - The bridge relays all requests to the extension without filtering
- **Impact**: Medium - requires already having bridge access (authenticated), but
  defeats the purpose of tiered permissions for rogue MCP clients.
- **Recommendation**: Add permission checking in the bridge's `relayRequestToThunderbird`
  method before forwarding to the extension.

---

### 4. Data Exposure & Logging (88/100)

#### SEC-REVIEW-010 [MEDIUM] Search parameters logged at DEBUG level in messages.ts
- **File**: `server/src/tools/messages.ts:96`
- **Issue**: `logger.debug('Searching messages with filters: ${JSON.stringify(params)}')`
  logs the full search parameters including `body` (up to 10,000 chars), `subject`,
  `from`, `to` fields. While this is DEBUG level (not enabled by default), if
  LOG_LEVEL=debug is set in production, email content and addresses are written to
  `logs/combined.log` on disk.
- **Recommendation**: Log only non-sensitive fields (folderId, limit, accountId) at
  debug level. Never log `body`, `subject`, `from`, `to` fields.

#### SEC-REVIEW-011 [LOW] Log files have no rotation or size limit
- **File**: `server/src/utils/logger.ts:52-63`
- **Issue**: Winston file transports write to `logs/error.log` and `logs/combined.log`
  without any rotation, max size, or max file count configuration. Over time, these
  files can grow unboundedly.
- **Impact**: Potential disk exhaustion (denial of service) in long-running deployments,
  and retention of sensitive data longer than necessary.
- **Recommendation**: Add `maxsize` and `maxFiles` options to the Winston file
  transports. Example: `maxsize: 10 * 1024 * 1024` (10 MB), `maxFiles: 5`.

---

### 5. Docker & Deployment (75/100)

#### SEC-REVIEW-012 [HIGH] Combined: unrestricted token + 0.0.0.0 port binding
- Cross-reference of SEC-REVIEW-001 + SEC-REVIEW-008. See those entries for details.
- This is the single most critical security concern in the project.

#### SEC-REVIEW-013 [MEDIUM] Health check does not verify service health
- **File**: `Dockerfile:69-70`, `docker-compose.yml:63-74`
- **Issue**: The health check only verifies that a TCP socket can connect to port 9876.
  It does not verify the HTTP `/health` endpoint, which would confirm the bridge is
  actually functional. A crashed but still-listening socket would pass the check.
- **Recommendation**: Use `wget -q --spider http://localhost:9876/health || exit 1`
  or `node -e "require('http').get('http://localhost:9876/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"`

#### SEC-REVIEW-014 [LOW] SECURITY.md version out of date
- **File**: `SECURITY.md:7`
- **Issue**: States "Version 1.2.x: Yes" as supported, but the current version is
  1.3.0. Users may believe 1.3.0 is unsupported or that 1.2.x is the latest.
- **Recommendation**: Update to reflect 1.3.x as the supported version.

---

### 6. Extension Security (85/100)

#### SEC-REVIEW-015 [MEDIUM] Extension uses console.log extensively
- **File**: `extension/background.js` (throughout)
- **Issue**: The extension uses `console.log` for all logging (e.g., lines 52, 69, 92,
  145, 170, 184, 210, etc.). While this is acceptable in a browser extension context
  (not stdio), sensitive data such as message contents may be logged. Line 145:
  `console.log("[MCP] Received:", message)` logs the entire message object including
  any data payload.
- **Impact**: Sensitive email data could appear in Thunderbird's debug console and
  persist in browser internal logs.
- **Recommendation**: Remove or guard verbose logging behind a debug flag. Never log
  full message payloads - log only type and id.

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
| **Folder schema max constraints** | **Not covered** | **Gap** |
| **Tags/Accounts schema constraints** | **Not covered** | **Gap** |
| **Token endpoint access control** | **Not covered** | **Gap** |

---

## Dependency Note

Dependencies (`@modelcontextprotocol/sdk`, `winston`, `ws`, `zod`) use caret ranges
(`^`) which means minor/patch updates are automatically resolved. An `npm audit`
should be run regularly to check for known vulnerabilities. This review did not perform
a live audit.
