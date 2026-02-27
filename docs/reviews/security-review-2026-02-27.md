# Security Review Report - Thunderbird-MCP
Date: 2026-02-27
Scope: Full project (security focus)
Files analyzed: 35+
Reviewer: Claude Opus 4.6 (automated security audit)

---

## Executive Summary

| Category                        | Score   | Grade | Findings          |
|---------------------------------|---------|-------|-------------------|
| Authentication & Authorization  | 82/100  | B+    | 1 err, 2 warn     |
| Input Validation                | 92/100  | A     | 0 err, 2 warn     |
| Transport Security              | 85/100  | A-    | 0 err, 3 warn     |
| Error Handling & Info Leakage   | 95/100  | A+    | 0 err, 1 warn     |
| Docker & Infrastructure         | 90/100  | A     | 0 err, 2 warn     |
| Dependency Security             | 65/100  | C+    | 1 err, 2 warn     |
| Extension Security              | 88/100  | A-    | 0 err, 2 warn     |
| **GLOBAL SCORE**                | **85/100** | **A-** | **2 err, 14 warn** |

**Overall assessment**: The project demonstrates strong security awareness with a well-layered defense model. Most common vulnerability classes are properly addressed. The main concerns are dependency vulnerabilities (especially the MCP SDK advisory), the unused `isLocalAddress` guard on the token endpoint, and a few hardening opportunities.

---

## Detailed Findings

### 1. Authentication & Authorization (82/100)

#### 1.1 [ERROR] /auth/token endpoint does not enforce IP address restriction
- **File**: `server/src/websocket/bridge.ts:231-261`
- **Severity**: HIGH
- **Description**: The `isLocalAddress()` function is defined (line 147) and thoroughly tested (`bridge-auth.test.ts:177-225`), but it is never called in the `/auth/token` HTTP handler. The endpoint relies on CORS origin headers and rate limiting but does not reject requests from non-local IP addresses. While Docker port binding (`127.0.0.1:9876:9876`) mitigates this in containerized deployments, standalone server mode (`node dist/bridge-standalone.js`) listens on `0.0.0.0` by default (`this.httpServer.listen(this.options.port)`), exposing the token to any network client.
- **Impact**: An attacker on the local network could fetch the auth token and gain full WebSocket access.
- **Recommendation**: Add `isLocalAddress` check at the beginning of the `/auth/token` handler:
  ```typescript
  if (!isLocalAddress(remoteAddr)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Forbidden" }));
    return;
  }
  ```

#### 1.2 [WARNING] Rate limiter memory is unbounded
- **File**: `server/src/websocket/bridge.ts:199`
- **Severity**: MEDIUM
- **Description**: The `tokenRequestLog` map grows indefinitely as new IP addresses make requests. Old entries within the window are filtered per-request, but the map keys (IP addresses) are never pruned. In a long-running container, this constitutes a memory leak.
- **Recommendation**: Add periodic cleanup (e.g., in a `setInterval`) or limit the map size to a maximum number of entries.

#### 1.3 [WARNING] Tool permissions trust extension data without schema validation
- **File**: `server/src/websocket/bridge.ts:466-469`
- **Severity**: LOW
- **Description**: When the Thunderbird extension sends "ready" or "permissionsUpdated" notifications, the bridge casts `data.toolPermissions` directly to `Record<string, boolean>` without validating the shape. A compromised or buggy extension could inject unexpected keys or non-boolean values.
- **Recommendation**: Validate the permissions object with a Zod schema before storing it.

#### 1.4 [POSITIVE] Token-based WebSocket authentication is well-implemented
- Token is 32 bytes (64 hex chars) of `crypto.randomBytes` -- sufficient entropy
- Comparison uses `crypto.timingSafeEqual` preventing timing attacks
- Token length check prevents timing oracle via early rejection of wrong-length tokens
- Token is served with `Cache-Control: no-store`

#### 1.5 [POSITIVE] Tool permission tiers (read/modify/destructive) with defaults
- Destructive operations (delete, send) are denied by default
- Permissions are enforced at both MCP server level AND bridge relay level (defense in depth)
- 100% sync verified: TOOL_TIERS covers all 56 registered tools (test: `tool-permissions.test.ts:17-39`)

---

### 2. Input Validation (92/100)

#### 2.1 [WARNING] Resource URI handler lacks input validation
- **File**: `server/src/resources/handlers.ts:47-52, 107-109`
- **Severity**: MEDIUM
- **Description**: Resource handlers extract `accountId` from URI patterns using regex (`/^thunderbird:\/\/folders\/(.+)$/`). The captured group is passed directly to `sendRequest` without length or format validation. While Thunderbird APIs would reject invalid IDs, no Zod schema validates the extracted data.
- **Recommendation**: Add input validation on the extracted accountId/folderId from resource URIs.

#### 2.2 [WARNING] Extension handler has no input validation
- **File**: `extension/native-messaging/handler.js:18-37`
- **Severity**: LOW
- **Description**: The `handleNativeMessage` function in the extension dispatches requests to API handlers without validating `params`. Since the server-side Zod validation occurs before the request reaches the extension (in the MCP tool handlers), this is a secondary concern. However, if the WebSocket bridge were to relay a crafted message bypassing the MCP server, the extension APIs would receive unvalidated input.
- **Recommendation**: The defense-in-depth principle suggests adding basic validation on the extension side as well, at least for critical operations (delete, send).

#### 2.3 [POSITIVE] Comprehensive Zod schema validation on all 56 MCP tools
- All string fields have `.max()` constraints
- All date fields use `.datetime({ offset: true })`
- Email fields use `.email()` validation
- Array lengths are bounded (`.max(200)` for recipients, `.max(1000)` for search)
- Excellent test coverage: 80+ test cases in `schema-hardening.test.ts`

#### 2.4 [POSITIVE] Message payload size limit (5 MiB)
- `MAX_WS_PAYLOAD = 5 * 1024 * 1024` enforced on both WebSocket server instances

---

### 3. Transport Security (85/100)

#### 3.1 [WARNING] WebSocket communication is unencrypted (ws://, not wss://)
- **File**: `server/src/websocket/bridge.ts:346-357`
- **Severity**: MEDIUM
- **Description**: All WebSocket connections use `ws://` (plaintext). While the bridge defaults to localhost binding and the Docker compose maps to `127.0.0.1`, the protocol does not use TLS. Email content traverses this connection in plaintext.
- **Mitigation**: This is acceptable for localhost-only deployments. Document clearly that the bridge must NEVER be exposed to a network without TLS termination.

#### 3.2 [WARNING] HTTP server listens on all interfaces in standalone mode
- **File**: `server/src/websocket/bridge.ts:346`
- **Severity**: MEDIUM
- **Description**: The `httpServer.listen(this.options.port)` call does not specify a host, defaulting to `0.0.0.0` (all interfaces). While Docker compose binds to `127.0.0.1`, running `node dist/bridge-standalone.js` directly exposes the bridge to the network.
- **Recommendation**: Add a `host` option defaulting to `127.0.0.1`:
  ```typescript
  this.httpServer.listen(this.options.port, '127.0.0.1', () => { ... });
  ```

#### 3.3 [WARNING] Auth token transmitted in WebSocket URL query parameter
- **File**: `server/src/websocket/bridge.ts:302`
- **Severity**: LOW
- **Description**: The auth token is passed as `?token=xxx` in the WebSocket upgrade URL. This means the token may appear in server access logs, proxy logs, and browser history. Since the connection is localhost-only and short-lived, the risk is minimal.
- **Note**: This is a standard pattern for WebSocket auth (the WebSocket protocol does not support custom headers in the upgrade request from browsers). The CORS restrictions and token freshness mitigate the risk.

#### 3.4 [POSITIVE] Origin validation is robust
- Allowlist: `localhost`, `127.0.0.1`, `[::1]`, `moz-extension://`
- No origin (CLI, docker exec) is accepted
- 17 test cases in `bridge-origin.test.ts`
- Tricky cases handled: `localhost.evil.com`, `evil.com/localhost`

---

### 4. Error Handling & Information Leakage (95/100)

#### 4.1 [WARNING] Extension logs stack traces to console
- **File**: `extension/background.js:188`
- **Severity**: LOW
- **Description**: `console.warn("[MCP] Request error:", error.stack)` logs the full stack trace. While this is only visible in the extension developer console (not transmitted to clients), it could expose internal paths if the console is shared.
- **Note**: The error response sent over WebSocket (line 195-200) correctly omits the stack trace.

#### 4.2 [POSITIVE] Server-side error sanitization is excellent
- `nativeErrorToJsonRpc()` converts all errors to structured JSON-RPC errors
- Stack traces are never included in responses (verified in `errors.ts:133-136`)
- Logger writes to stderr, never stdout (MCP stdio protocol safety)
- Winston log rotation enabled (10MB, 5 files)

#### 4.3 [POSITIVE] No sensitive data in health endpoint
- Health check returns only `{ status, thunderbird, mcpClients }` -- no config, env, or internal state

---

### 5. Docker & Infrastructure Security (90/100)

#### 5.1 [WARNING] Health check in Dockerfile uses TCP probe, not HTTP
- **File**: `Dockerfile:69-70`
- **Severity**: LOW
- **Description**: The Dockerfile HEALTHCHECK uses a raw TCP socket connection, while docker-compose.yml uses the proper HTTP `/health` endpoint. The TCP probe only verifies the port is open, not that the application is functional.
- **Recommendation**: Align the Dockerfile HEALTHCHECK with docker-compose (use HTTP `/health`).

#### 5.2 [WARNING] Dev service in docker-compose mounts source as read-only but still accessible
- **File**: `docker-compose.yml:100`
- **Severity**: LOW
- **Description**: The dev profile mounts `./server/src:/app/server/src:ro`. While `:ro` prevents writes, source code is accessible inside the container. Ensure the dev profile is never used in production.

#### 5.3 [POSITIVE] Strong Docker security posture
- Multi-stage build (builder + production)
- Non-root user (`mcp:1001`)
- npm cache cleaned after install
- Resource limits (0.5 CPU, 256MB)
- Port bound to `127.0.0.1` in docker-compose
- `alpine` base image (minimal attack surface)

---

### 6. Dependency Security (65/100)

#### 6.1 [ERROR] @modelcontextprotocol/sdk has cross-client data leak vulnerability
- **Advisory**: GHSA-345p-7cg4-v4c7
- **Severity**: HIGH
- **Description**: Versions 1.10.0-1.25.3 have a cross-client data leak via shared server/transport instance reuse. Since this project uses `StdioServerTransport` (single-client by design), the practical risk may be lower, but the advisory applies to the installed version.
- **Recommendation**: Run `npm audit fix` to update to a patched version.

#### 6.2 [WARNING] 11 total npm audit vulnerabilities (3 high, 6 moderate, 2 low)
- **Severity**: MEDIUM
- **Key issues**:
  - `ajv` ReDoS (moderate) -- used by MCP SDK
  - `rollup` arbitrary file write (high) -- dev dependency via vitest
  - `minimatch` ReDoS (high) -- dev dependency
  - `esbuild` development server request leakage (moderate) -- dev dependency
- **Note**: Most high/moderate issues are in dev dependencies (vitest, vite, esbuild) and do not affect production runtime.
- **Recommendation**: Run `npm audit fix` for production dependency patches. For dev dependencies, consider `npm audit fix --force` in a test branch.

#### 6.3 [WARNING] Production dependencies are minimal but version ranges are wide
- **File**: `server/package.json`
- **Severity**: LOW
- **Description**: Using `^1.0.0` for `@modelcontextprotocol/sdk` allows any 1.x version including known-vulnerable ones. Using `npm ci` with `package-lock.json` mitigates this in practice.
- **Recommendation**: Consider pinning exact versions for production dependencies.

---

### 7. Extension Security (88/100)

#### 7.1 [WARNING] CSP allows `ws://localhost:9876` explicitly
- **File**: `extension/manifest.json:38`
- **Severity**: LOW
- **Description**: The CSP connect-src includes `ws://localhost:9876 http://localhost:9876`. This is necessary for functionality but means any code running in extension pages can reach the bridge. With MV3's strict CSP (`script-src 'self'`), the attack surface is limited.

#### 7.2 [WARNING] `console.log` used extensively in extension code
- **File**: `extension/background.js` (throughout)
- **Severity**: LOW
- **Description**: The extension uses `console.log` for debugging. While this does not break MCP stdio (the extension runs separately from the MCP server), it adds noise to the Thunderbird extension console and could expose operational details.
- **Note**: This is acceptable for WebExtension code where `console` is the standard logging mechanism.

#### 7.3 [POSITIVE] Extension permissions are minimal and appropriate
- Only requests permissions actually used (messagesRead, messagesMove, etc.)
- `host_permissions` limited to `ws://localhost:9876/*` and `http://localhost:9876/*`
- No `management`, `tabs`, or broad permissions
- MV3 background page (event-driven, not persistent)

#### 7.4 [POSITIVE] Options page for tool permissions is well-designed
- Permissions stored in `browser.storage.local`
- Changes propagated to bridge via WebSocket notification
- Default: destructive tools disabled
- Bulk actions (enable all, read-only, disable destructive)

---

## Security Architecture Assessment

### Trust Boundaries

```
MCP Client (Claude, etc.)
    |
    | [Trust Boundary 1: MCP stdio protocol]
    |
MCP Server (server.ts)
    | - Zod input validation
    | - Tool permission check (SEC-AUTH-001)
    |
    | [Trust Boundary 2: WebSocket + auth token]
    |
WebSocket Bridge (bridge.ts)
    | - Origin validation
    | - Token auth (timing-safe)
    | - Rate limiting
    | - Tool permission check (bridge-level)
    | - Payload size limit (5 MiB)
    |
    | [Trust Boundary 3: WebSocket to extension]
    |
Thunderbird Extension (background.js)
    | - No input validation (relies on server-side)
    | - API calls to Thunderbird
    |
    | [Trust Boundary 4: WebExtension API sandbox]
    |
Thunderbird (native application)
```

### Defense-in-Depth Analysis

| Layer | Protection | Status |
|-------|-----------|--------|
| Network | localhost binding (docker-compose) | Present |
| Transport | Origin validation | Present |
| Authentication | Token-based (crypto.randomBytes) | Present |
| Authorization | Tool permission tiers (3 levels) | Present (dual enforcement) |
| Input validation | Zod schemas on all 56 tools | Present |
| Input size limits | String max, array max, payload max | Present |
| Error sanitization | nativeErrorToJsonRpc, no stack traces | Present |
| Logging safety | stderr only, no sensitive data | Present |
| Rate limiting | /auth/token endpoint | Present (needs IP check) |
| Container hardening | Non-root, alpine, resource limits | Present |

---

## Top 5 Recommendations (Priority Order)

### 1. [CRITICAL] Add isLocalAddress check to /auth/token endpoint
- **Effort**: Trivial (3 lines)
- **Impact**: HIGH -- closes the primary authentication bypass vector
- **File**: `server/src/websocket/bridge.ts:231`

### 2. [HIGH] Update @modelcontextprotocol/sdk to patch GHSA-345p-7cg4-v4c7
- **Effort**: Trivial (`npm audit fix`)
- **Impact**: HIGH -- resolves cross-client data leak vulnerability

### 3. [MEDIUM] Bind standalone bridge to 127.0.0.1 by default
- **Effort**: Trivial (add host parameter to `listen()`)
- **Impact**: MEDIUM -- prevents accidental network exposure

### 4. [MEDIUM] Add rate limiter cleanup mechanism
- **Effort**: Moderate (periodic cleanup interval)
- **Impact**: LOW-MEDIUM -- prevents memory leak in long-running deployments

### 5. [LOW] Add basic input validation in extension handler
- **Effort**: Moderate
- **Impact**: LOW -- defense-in-depth improvement; server-side validation is primary

---

## Test Coverage Assessment

| Security Feature | Test File | Coverage |
|-----------------|-----------|----------|
| Origin validation | `bridge-origin.test.ts` | 17 test cases |
| Token authentication | `bridge-auth.test.ts` | 10 test cases |
| isLocalAddress | `bridge-auth.test.ts` | 12 test cases |
| Schema hardening | `schema-hardening.test.ts` | 80+ test cases |
| Tool permissions | `tool-permissions.test.ts` | 16 test cases |
| Error handling | `errors.test.ts` | Present |

**Total security-related test cases**: ~135

**Missing test coverage**:
- No test for rate limiter behavior on /auth/token
- No test for resource URI validation
- No integration test for end-to-end permission enforcement

---

## Comparison with OWASP Top 10 (API Security)

| OWASP Category | Status | Notes |
|---------------|--------|-------|
| API1: Broken Object Level Authorization | Mitigated | Tool-level permissions, not object-level (IDs are opaque) |
| API2: Broken Authentication | Mostly Mitigated | Token auth present; IP check missing |
| API3: Broken Object Property Level Auth | N/A | No object property filtering needed |
| API4: Unrestricted Resource Consumption | Mitigated | Rate limiting, payload limits, pagination limits |
| API5: Broken Function Level Authorization | Mitigated | 3-tier tool permissions (read/modify/destructive) |
| API6: Unrestricted Access to Sensitive Business Flows | Partially | No confirmation for permanent delete |
| API7: Server-Side Request Forgery | N/A | No outbound requests from user input |
| API8: Security Misconfiguration | Mostly Good | Docker hardened; standalone mode needs host binding |
| API9: Improper Inventory Management | Good | All tools registered and classified |
| API10: Unsafe Consumption of APIs | Low Risk | Extension trusts Thunderbird APIs |
