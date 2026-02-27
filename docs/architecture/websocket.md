# WebSocket Bridge Architecture

## Overview

The WebSocket bridge provides bidirectional communication between the MCP server (Node.js process) and the Thunderbird extension (browser context). It replaces the traditional Native Messaging approach with a more robust, real-time WebSocket connection.

## Why WebSocket?

### Technical Rationale

**Problem**: Traditional Native Messaging has limitations

- Complex platform-specific manifest configuration
- No built-in connection state awareness
- Limited error handling and reconnection capabilities
- More complex debugging workflow

**Solution**: WebSocket bridge on localhost

- Bidirectional real-time communication
- Built-in connection state tracking
- Auto-reconnect with fixed 3-second delay (10 attempts max)
- Standard debugging tools (browser devtools, network inspection)
- Simpler cross-platform deployment

### Trade-offs

**Advantages**:

- ✅ Bidirectional real-time communication
- ✅ Connection state awareness (onopen, onclose, onerror)
- ✅ Auto-reconnect capability built-in
- ✅ No platform-specific manifest configuration
- ✅ Better error handling and timeout management
- ✅ Simpler debugging (standard WebSocket tools)
- ✅ Promise-based request/response correlation
- ✅ Single localhost port (9876)

**Limitations**:

- ⚠️ Requires localhost port availability
- ⚠️ Single Thunderbird extension connection (by design)
- ⚠️ Security relies on localhost binding + origin validation + auth token
- ⚠️ No encryption (localhost-only mitigates risk)

## Multi-Client Architecture (Docker)

Starting with version 1.2.0, the WebSocket bridge supports multiple MCP client connections while maintaining a single Thunderbird extension connection. This architecture enables Docker deployments where multiple MCP instances share a common bridge.

### Path-Based Routing

The bridge uses HTTP upgrade path routing to differentiate connection types:

| Path                  | Client Type           | Max Connections | Purpose                   |
| --------------------- | --------------------- | --------------- | ------------------------- |
| `/` or `/thunderbird` | Thunderbird Extension | 1               | Handles API requests      |
| `/mcp`                | MCP Client Instances  | Unlimited       | Sends requests via bridge |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                       Docker Container                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           bridge-standalone.ts (port 9876)                  │  │
│  │                WebSocket Bridge Server                      │  │
│  │                                                             │  │
│  │   HTTP Server with WebSocket Upgrade Routing                │  │
│  │                                                             │  │
│  │   /thunderbird (ou /)        │         /mcp                │  │
│  │   └─ wssThunderbird          │         └─ wssMcp           │  │
│  │   └─ 1 connexion max         │         └─ multi-clients    │  │
│  └────────────────────────────────────────────────────────────┘  │
│              ▲                               ▲                    │
│              │                         ┌─────┴─────┐              │
│   Extension Thunderbird           docker exec   docker exec      │
│   (via host network)              (MCP #1)      (MCP #2)         │
└──────────────────────────────────────────────────────────────────┘

Endpoints:
  - ws://localhost:9876/          → Extension Thunderbird
  - ws://localhost:9876/mcp       → Clients MCP (multiples)
  - http://localhost:9876/health  → Status JSON
  - http://localhost:9876/auth/token → Auth token (SEC-WS-001)
```

### Request Flow (Multi-Client)

```mermaid
sequenceDiagram
    participant MCP1 as MCP Client #1
    participant MCP2 as MCP Client #2
    participant Bridge as WebSocket Bridge
    participant TB as Thunderbird Extension

    Note over Bridge: Listening on port 9876

    TB->>Bridge: GET /auth/token
    Bridge->>TB: {token: "abc..."}
    TB->>Bridge: Connect to /thunderbird?token=abc...
    Bridge->>TB: Accept (single client)

    MCP1->>Bridge: GET /auth/token (via HTTP)
    Bridge->>MCP1: {token: "abc..."}
    MCP1->>Bridge: Connect to /mcp?token=abc...
    Bridge->>MCP1: Accept + Welcome notification

    MCP2->>Bridge: GET /auth/token (via HTTP)
    Bridge->>MCP2: {token: "abc..."}
    MCP2->>Bridge: Connect to /mcp?token=abc...
    Bridge->>MCP2: Accept + Welcome notification

    MCP1->>Bridge: Request (messages.search)
    Bridge->>TB: Relay request
    TB->>Bridge: Response
    Bridge->>MCP1: Relay response

    MCP2->>Bridge: Request (folders.list)
    Bridge->>TB: Relay request
    TB->>Bridge: Response
    Bridge->>MCP2: Relay response
```

### Bridge Client Mode

When the MCP server detects an existing bridge (typically in Docker), it connects as a client instead of creating a server:

```typescript
// Auto-detection in initializeWebSocketBridge()
const client = await tryConnectToExistingBridge(port);
if (client) {
  // Connect as client to /mcp path
  return client;
}
// No bridge found, create server
return new WebSocketBridge(options);
```

### Health Endpoint

The bridge exposes an HTTP health endpoint:

```bash
curl http://localhost:9876/health
```

Response:

```json
{
  "status": "ok",
  "thunderbird": true,
  "mcpClients": 2
}
```

### Auth Token Endpoint (SEC-WS-001)

The bridge generates a random auth token at startup. Clients must fetch this token via HTTP before connecting via WebSocket:

```bash
curl http://localhost:9876/auth/token
```

Response:

```json
{
  "token": "a1b2c3d4..."
}
```

The token (64-character hex string, 32 bytes) must be passed as a query parameter on WebSocket upgrade: `ws://localhost:9876/thunderbird?token=<token>`. Connections without a valid token are rejected with HTTP 401. See [Security Considerations](#security-considerations) for details.

## Protocol Specification

### Message Format

WebSocket bridge uses JSON messages with correlation IDs for request/response matching.

**Message Structure**:

```typescript
interface WsMessage {
  id: string; // Unique message ID
  type: "request" | "response" | "notification";
  action?: string; // Action name for requests
  event?: string; // Event name for notifications
  params?: Record<string, unknown>; // Request parameters
  data?: unknown; // Response data
  success?: boolean; // Response status
  error?: {
    // Error details
    code: number;
    message: string;
    data?: unknown;
  };
  timestamp: string; // ISO 8601 timestamp
}
```

### Message Direction

**Server → Extension (Request)**:

```json
{
  "id": "req_1_1733410000000",
  "type": "request",
  "action": "messages.search",
  "params": {
    "subject": "invoice",
    "unread": true,
    "limit": 20
  },
  "timestamp": "2025-12-05T10:00:00.000Z"
}
```

**Extension → Server (Success Response)**:

```json
{
  "id": "req_1_1733410000000",
  "type": "response",
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-1",
        "subject": "Invoice #12345",
        "from": "billing@example.com",
        "date": "2025-03-15T10:30:00Z"
      }
    ]
  },
  "timestamp": "2025-12-05T10:00:00.150Z"
}
```

**Extension → Server (Error Response)**:

```json
{
  "id": "req_1_1733410000000",
  "type": "response",
  "success": false,
  "error": {
    "code": -32002,
    "message": "Permission denied",
    "data": {
      "operation": "messages.move",
      "reason": "messagesMove permission not granted"
    }
  },
  "timestamp": "2025-12-05T10:00:00.150Z"
}
```

**Extension → Server (Notification)**:

```json
{
  "id": "ext_1733410000000_abc123",
  "type": "notification",
  "event": "ready",
  "data": {
    "version": "1.3.1",
    "capabilities": [
      "messages",
      "folders",
      "contacts",
      "tags",
      "accounts",
      "calendar",
      "tasks"
    ]
  },
  "timestamp": "2025-12-05T10:00:00.000Z"
}
```

## Protocol Flow

### Connection Establishment

```mermaid
sequenceDiagram
    participant Server as MCP Server<br/>(Node.js)
    participant Bridge as WebSocket Bridge<br/>(Port 9876)
    participant Extension as Thunderbird<br/>Extension

    Server->>Bridge: Start WebSocket Server
    Bridge->>Bridge: Listen on localhost:9876
    Note over Bridge: Server Ready

    Extension->>Extension: Initialize on Startup
    Extension->>Bridge: GET /auth/token
    Bridge->>Extension: {token: "abc..."}
    Extension->>Bridge: WebSocket Connect<br/>ws://localhost:9876?token=abc...

    alt Connection Success
        Bridge->>Bridge: Validate token (timing-safe)
        Bridge->>Bridge: Accept Connection
        Bridge->>Extension: Connection Established (onopen)
        Extension->>Bridge: {type:notification, event:ready}
        Bridge->>Server: Emit 'connected' event
        Note over Server,Extension: Communication Ready
    else Invalid/Missing Token
        Bridge-->>Extension: HTTP 401 Unauthorized
        Extension->>Extension: Schedule Reconnect (3s)
    else Connection Failed
        Bridge-->>Extension: Connection Refused
        Extension->>Extension: Schedule Reconnect (3s)
        Extension->>Extension: Attempt 1/10
    end
```

**Steps**:

1. **Server Starts Bridge**: MCP server initializes WebSocket bridge on port 9876, generates auth token
2. **Bridge Listens**: WebSocket server waits for connection on localhost:9876
3. **Token Fetch**: Extension fetches auth token via `GET /auth/token`
4. **Extension Connects**: Extension connects with `?token=xxx` query parameter
5. **Token Validation**: Bridge validates token using timing-safe comparison
6. **Connection Established**: WebSocket handshake completes
7. **Ready Notification**: Extension sends ready notification with capabilities
8. **System Ready**: Both sides can now exchange messages

### Request/Response Cycle

```mermaid
sequenceDiagram
    participant Server as MCP Server
    participant Bridge as WebSocket Bridge
    participant Extension as Extension
    participant API as Thunderbird API

    Server->>Bridge: sendRequest(action, params)
    Bridge->>Bridge: Generate Request ID<br/>(req_{counter}_{timestamp})
    Bridge->>Bridge: Create Pending Promise
    Bridge->>Bridge: Set Timeout (30s)

    Bridge->>Extension: WS Send<br/>{id, type:request, action, params}

    Extension->>Extension: Parse Message
    Extension->>Extension: Route to Handler
    Extension->>API: messenger.* API call
    API-->>Extension: API Response

    Extension->>Extension: Format Response
    Extension->>Bridge: WS Send<br/>{id, type:response, success, data}

    Bridge->>Bridge: Match Request ID
    Bridge->>Bridge: Clear Timeout
    Bridge->>Bridge: Resolve Promise
    Bridge->>Server: Return Response Data

    Note over Server,API: Total Time: ~10-50ms
```

### Auto-Reconnect Flow

```mermaid
sequenceDiagram
    participant Extension as Extension
    participant Bridge as WebSocket Bridge

    Note over Extension,Bridge: Active Connection

    Bridge--xExtension: Connection Lost (Network/Server Restart)

    Extension->>Extension: handleClose() Triggered
    Extension->>Extension: reconnectAttempts = 1
    Extension->>Extension: Wait 3 seconds

    Extension->>Bridge: Reconnect Attempt 1/10

    alt Reconnect Success
        Bridge->>Extension: Connection Accepted
        Extension->>Extension: reconnectAttempts = 0
        Extension->>Bridge: {type:notification, event:ready}
        Note over Extension,Bridge: Connection Restored
    else Reconnect Failed
        Extension->>Extension: reconnectAttempts = 2
        Extension->>Extension: Wait 3 seconds
        Extension->>Bridge: Reconnect Attempt 2/10

        alt Still Failing
            Extension->>Extension: Continue up to 10 attempts
            Extension->>Extension: After 10 failures → Give Up
            Note over Extension: Manual restart required
        end
    end
```

**Reconnect Parameters**:

- Max attempts: 10
- Delay between attempts: 3 seconds (constant)
- Total retry window: 30 seconds
- Reset counter on successful connection

### Keep-Alive Mechanism

Thunderbird MV3 Event Pages are suspended after ~30-90 seconds of inactivity. The extension uses `browser.alarms` to maintain the WebSocket connection.

**Staggered Alarms**:

| Alarm         | Initial Delay | Period     |
| ------------- | ------------- | ---------- |
| `keepAlive-0` | ~6 seconds    | 30 seconds |
| `keepAlive-1` | ~10 seconds   | 30 seconds |
| `keepAlive-2` | ~20 seconds   | 30 seconds |

This staggering ensures at least one alarm fires approximately every 10 seconds, preventing Event Page termination.

**Connection Health Check**:

Each alarm trigger calls `ensureWebSocketConnected()`, which:

1. Skips if a reconnection is already in progress
2. Reconnects if the WebSocket is not in `OPEN` state
3. Detects stale connections via `CONNECTION_HEALTH_TIMEOUT` (60 seconds) - if no message has been received within this window, the connection is considered "zombie" and force-reconnected

**Constants**:

- `CONNECTION_HEALTH_TIMEOUT`: 60000 ms (60 seconds)
- Alarm period: 0.5 minutes (30 seconds, minimum allowed by the Alarms API)
- Alarms survive Event Page suspension (unlike `setTimeout`/`setInterval`)

### Connection Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ServerStarting

    ServerStarting --> Listening: Bridge starts
    Listening --> Connected: Extension connects

    Connected --> Ready: Ready notification
    Ready --> Processing: Request received
    Processing --> Ready: Response sent

    Processing --> Disconnected: Connection lost
    Ready --> Disconnected: Connection closed
    Connected --> Disconnected: Connection error

    Disconnected --> Reconnecting: Extension retry
    Reconnecting --> Connected: Success
    Reconnecting --> Failed: Max attempts

    Failed --> [*]
    Disconnected --> [*]: Manual shutdown
```

**States**:

- **ServerStarting**: Bridge initializing
- **Listening**: Server waiting for connection
- **Connected**: WebSocket connection established
- **Ready**: Extension sent ready notification
- **Processing**: Request in flight
- **Disconnected**: Connection lost
- **Reconnecting**: Extension attempting reconnect
- **Failed**: Reconnect attempts exhausted

## Implementation

### Server-Side Bridge (TypeScript)

**websocket/bridge.ts**:

```typescript
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";

export class WebSocketBridge extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private client: WebSocket | null = null;
  private pendingRequests: Map<string, PendingRequest>;
  private requestCounter: number = 0;

  async start(): Promise<void> {
    this.wss = new WebSocketServer({ port: 9876 });

    this.wss.on("listening", () => {
      console.log("WebSocket bridge listening on port 9876");
    });

    this.wss.on("connection", (ws: WebSocket) => {
      this.handleConnection(ws);
    });
  }

  private handleConnection(ws: WebSocket): void {
    // Only allow one client
    if (this.client) {
      ws.close(1008, "Only one client allowed");
      return;
    }

    this.client = ws;
    this.emit("connected");

    ws.on("message", (data: Buffer) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    });

    ws.on("close", () => {
      this.client = null;
      this.rejectAllPending("Connection closed");
      this.emit("disconnected");
    });
  }

  async sendRequest(
    action: string,
    params: Record<string, unknown>,
    timeout: number = 30000,
  ): Promise<WsMessage> {
    if (!this.client || this.client.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to Thunderbird extension");
    }

    const requestId = `req_${++this.requestCounter}_${Date.now()}`;

    const request: WsMessage = {
      id: requestId,
      type: "request",
      action,
      params,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${action}`));
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        action,
      });

      this.client!.send(JSON.stringify(request));
    });
  }

  isConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }
}
```

### Extension-Side Client (JavaScript)

**extension/background.js**:

```javascript
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;
const WS_PORT = 9876;

async function fetchAuthToken() {
  const response = await fetch(`http://localhost:${WS_PORT}/auth/token`);
  if (!response.ok) throw new Error(`Token fetch failed: HTTP ${response.status}`);
  const data = await response.json();
  if (!data.token) throw new Error("No token in auth response");
  return data.token;
}

async function connectWebSocket() {
  try {
    const token = await fetchAuthToken();
    const wsUrl = `ws://localhost:${WS_PORT}?token=${token}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = handleOpen;
    ws.onmessage = handleMessage;
    ws.onclose = handleClose;
    ws.onerror = handleError;
  } catch (error) {
    console.error("[MCP] Failed to connect:", error);
    scheduleReconnect();
  }
}

function handleOpen() {
  console.log("[MCP] WebSocket connected");
  reconnectAttempts = 0;

  // Send ready notification
  sendMessage({
    id: generateId(),
    type: "notification",
    event: "ready",
    data: {
      version: browser.runtime.getManifest().version,
      capabilities: [
        "messages",
        "folders",
        "contacts",
        "tags",
        "accounts",
        "calendar",
        "tasks",
      ],
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleMessage(event) {
  const message = JSON.parse(event.data);

  if (message.type === "request") {
    await processRequest(message);
  }
}

async function processRequest(request) {
  try {
    const result = await handleNativeMessage(request);

    sendMessage({
      id: request.id,
      type: "response",
      success: true,
      data: result.data !== undefined ? result.data : result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("[MCP] Request error:", error.stack);

    sendMessage({
      id: request.id,
      type: "response",
      success: false,
      error: {
        code: -32603,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

function handleClose(event) {
  console.log("[MCP] WebSocket closed:", event.code);
  ws = null;
  scheduleReconnect();
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error("[MCP] Max reconnection attempts reached");
    return;
  }

  reconnectAttempts++;
  console.log(
    `[MCP] Reconnecting in ${RECONNECT_DELAY}ms (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
  );

  setTimeout(connectWebSocket, RECONNECT_DELAY);
}

function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
```

## Manifest Configuration

### Extension Manifest

**manifest.json**:

```json
{
  "manifest_version": 3,
  "name": "Thunderbird MCP Server",
  "version": "1.3.1",
  "browser_specific_settings": {
    "gecko": {
      "id": "thunderbird-mcp@assistance-micro-design.com",
      "strict_min_version": "128.0"
    }
  },
  "permissions": [
    "messagesRead",
    "messagesMove",
    "accountsRead",
    "addressBooks"
  ],
  "host_permissions": ["ws://localhost:9876/*", "http://localhost:9876/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' ws://localhost:9876 http://localhost:9876"
  }
}
```

**Key Configuration**:

- `host_permissions`: Allow WebSocket and HTTP connections to localhost:9876
- `content_security_policy`: Allow both WebSocket (`ws://`) and HTTP (`http://`) connections in CSP. HTTP is needed for fetching the auth token via `GET /auth/token`
- No platform-specific setup required
- No native messaging manifests needed

### Server Configuration

**Environment Variables**:

```bash
THUNDERBIRD_PORT=9876    # WebSocket port (default: 9876)
LOG_LEVEL=info           # Logging level
```

**No Additional Setup Required**:

- No registry entries (Windows)
- No manifest files in system directories
- No wrapper scripts
- Single port configuration

## Security Considerations

### Network Security

**Localhost Binding**:

- WebSocket server binds to 127.0.0.1 only
- No external network exposure
- Firewall configuration not required
- No TLS needed (localhost traffic)

**Origin Validation (SEC-WS-003)**:

The bridge validates the `Origin` header on every WebSocket upgrade request:

- Allowed: `undefined`/`null`/empty (CLI, `docker exec`, native connections)
- Allowed: `http://localhost`, `http://127.0.0.1`, `http://[::1]` (with any port)
- Allowed: `moz-extension://...` (Thunderbird extension)
- Rejected: all other origins with HTTP 403 Forbidden + `socket.destroy()`

```typescript
// server/src/websocket/bridge.ts
export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (origin === undefined || origin === null || origin === "") return true;
  if (origin.startsWith("moz-extension://")) return true;
  try {
    const url = new URL(origin);
    return ALLOWED_LOCAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
```

This prevents cross-origin WebSocket hijacking from malicious web pages.

**Token Authentication (SEC-WS-001)**:

All WebSocket connections require a valid auth token. The token is generated at bridge startup using `crypto.randomBytes(32)` and served via `GET /auth/token`. Clients must pass the token as a query parameter on upgrade: `?token=xxx`.

```typescript
// Token validation in upgrade handler (bridge.ts)
const token = requestUrl.searchParams.get("token");
if (
  !token ||
  token.length !== this.authToken.length ||
  !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(this.authToken))
) {
  socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
  socket.destroy();
  return;
}
```

Security properties:
- Token is 64-character hex (256-bit entropy)
- Timing-safe comparison prevents timing attacks
- Token rotates on every bridge restart
- `/auth/token` CORS: reflects the request origin only if it passes `isAllowedOrigin()` (localhost, `moz-extension://`); returns `"null"` for all others. Rate-limited to 10 requests/minute per IP (HTTP 429 on exceed)

**Single Client Enforcement**:

- Thunderbird endpoint accepts only one connection (new replaces existing)
- MCP endpoint accepts multiple simultaneous connections
- Prevents unauthorized access attempts

**Permission Model**:

- Extension requires explicit host permissions
- CSP enforces connection restrictions
- User must install extension explicitly

### Data Security

**Message Validation**:

- JSON parsing with error handling
- Request ID validation and correlation
- Timeout enforcement prevents resource exhaustion
- Pending request limit (100 max)
- Maximum WebSocket payload size: 5 MiB (close code 1009 on exceeded)

**Error Handling**:

- Stack traces never sent to clients (logged locally only)
- `nativeErrorToJsonRpc` returns message string only, no full error objects
- Sensitive user data (search queries, email content) logged at DEBUG level only
- Error codes follow JSON-RPC standard

### Attack Surface

**Potential Risks**:

- Port availability conflicts
- Malicious local process attempting connection
- Cross-origin WebSocket hijacking from browser tabs
- Message injection if port is hijacked
- Resource exhaustion via pending requests

**Mitigations**:

- Token authentication on WebSocket upgrade (SEC-WS-001)
- Origin validation on WebSocket upgrade (allowlist: localhost, moz-extension://) (SEC-WS-003)
- Request ID correlation prevents injection
- Timeout and pending request limits (100 max pending, 30s timeout)
- Localhost-only binding prevents remote attacks
- Extension permission model
- WebSocket maxPayload (5 MiB) prevents memory exhaustion (SEC-WS-002)
- Stack traces never sent to clients (SEC-ERR-001, SEC-ERR-002)
- Sensitive data logged at DEBUG level only (SEC-DATA-001, SEC-DATA-002)

## Troubleshooting

### Common Issues

**1. Connection Refused**:

- ✓ Check MCP server is running
- ✓ Verify port 9876 is available
- ✓ Check firewall allows localhost connections
- ✓ Verify extension has host permissions

**2. Auto-Reconnect Failing**:

- ✓ Check WebSocket server is restarted
- ✓ Verify 10 attempts not exhausted
- ✓ Review browser console for errors
- ✓ Check server logs for connection rejections

**3. Request Timeout**:

- ✓ Check server response time
- ✓ Verify Thunderbird API is responsive
- ✓ Review timeout configuration (default 30s)
- ✓ Check for pending request queue overflow

**4. Port Already in Use**:

- ✓ Check for other processes on port 9876
- ✓ Configure alternate port via THUNDERBIRD_PORT
- ✓ Restart both server and extension
- ✓ Update manifest host_permissions if port changed

### Debugging

**Server Side**:

```typescript
// Enable debug logging
process.env.LOG_LEVEL = "debug";

// Monitor connections
bridge.on("connected", () => console.log("Client connected"));
bridge.on("disconnected", () => console.log("Client disconnected"));
```

**Extension Side**:

```javascript
// Open Browser Console in Thunderbird
// Tools → Developer Tools → Browser Console

// Monitor WebSocket state
ws.addEventListener("open", () => console.log("WS Open"));
ws.addEventListener("close", (e) => console.log("WS Close:", e.code));
ws.addEventListener("error", (e) => console.error("WS Error:", e));
```

**Network Inspection**:

```bash
# Monitor WebSocket traffic
wscat -c ws://localhost:9876

# Check port availability
netstat -an | grep 9876

# Test connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  http://localhost:9876
```

## Performance Characteristics

### Latency

**WebSocket Overhead**:

- Connection handshake: ~5-10ms (one-time)
- Message serialization: ~1-2ms
- Network transfer (localhost): ~1-5ms
- Total overhead: ~10-20ms per request

**Comparison to Native Messaging**:

- Native Messaging: ~20-50ms overhead (IPC + serialization)
- WebSocket: ~10-20ms overhead (network + serialization)
- Improvement: ~2x faster for simple operations

### Throughput

**Connection Capacity**:

- Single WebSocket connection
- Full-duplex bidirectional communication
- No theoretical bandwidth limit (localhost)
- Limited by Thunderbird API performance

**Pending Request Management**:

- Max 100 pending requests
- Automatic queue cleanup on timeout
- Per-request timeout enforcement (30s default)
- Prevents resource exhaustion

## Migration from Native Messaging

### Key Differences

| Aspect              | Native Messaging            | WebSocket Bridge          |
| ------------------- | --------------------------- | ------------------------- |
| **Setup**           | Platform-specific manifests | Environment variable only |
| **Connection**      | Process spawn + stdio       | Network socket            |
| **State Awareness** | Manual tracking             | Built-in onopen/onclose   |
| **Reconnect**       | Manual implementation       | Built-in (3s fixed delay) |
| **Debugging**       | Complex (IPC inspection)    | Standard network tools    |
| **Latency**         | ~20-50ms                    | ~10-20ms                  |
| **Security**        | Process isolation           | Localhost binding         |

### Compatibility

**Client Adapter Layer**:

- WebSocket bridge exposes same interface as Native Messaging client
- Tool handlers require no changes
- Drop-in replacement for existing code

**Code Changes Required**:

- ✅ Server: Replace Native Messaging client with WebSocket bridge
- ✅ Extension: Replace message port with WebSocket client
- ❌ Tool handlers: No changes needed (same interface)
- ❌ Schemas: No changes needed
- ❌ MCP protocol: No changes needed

## Future Enhancements

### TLS/SSL Support

**Rationale**: Enable secure remote access

**Implementation**:

```typescript
const server = https.createServer({
  cert: fs.readFileSync("cert.pem"),
  key: fs.readFileSync("key.pem"),
});
const wss = new WebSocketServer({ server });
```

### Authentication (Implemented - SEC-WS-001)

Token-based authentication is implemented since version 1.2.2. A 32-byte random token is generated at bridge startup, served via `GET /auth/token`, and validated on every WebSocket upgrade using timing-safe comparison. See [Security Considerations](#security-considerations) for details.

### Event Streaming

**Rationale**: Real-time notifications

**Server-to-Extension**:

```json
{
  "type": "notification",
  "event": "resource.updated",
  "data": {
    "uri": "thunderbird://inbox/unread"
  }
}
```

### Compression

**Rationale**: Reduce bandwidth for large payloads

**Per-Message Compression**:

```typescript
ws.send(JSON.stringify(message), { compress: true });
```

## References

- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ws Library Documentation](https://github.com/websockets/ws)
- [Thunderbird WebExtension APIs](https://webextension-api.thunderbird.net/)
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)
