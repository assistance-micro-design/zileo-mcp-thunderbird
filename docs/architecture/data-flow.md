# Data Flow Architecture

## Overview

This document details the data flows through the Thunderbird MCP system, illustrating how requests travel from MCP clients through the server, WebSocket bridge, and Thunderbird extension to access email data.

## MCP Lifecycle Flow

### Initialize Connection

The initialization sequence establishes the MCP server connection and negotiates capabilities.

```mermaid
sequenceDiagram
    participant Client as MCP Client<br/>(Claude)
    participant Server as MCP Server
    participant Bridge as WebSocket Bridge
    participant Ext as Thunderbird<br/>Extension

    Client->>Server: initialize<br/>{protocolVersion, clientInfo}
    Server->>Server: Validate Protocol Version
    Server->>Bridge: Start WebSocket Server (Port 9876)
    Bridge->>Bridge: Listen on localhost:9876

    Ext->>Ext: Extension Startup
    Ext->>Bridge: WebSocket Connect
    Bridge-->>Ext: Connection Established
    Ext->>Bridge: {type:notification, event:ready}
    Bridge-->>Server: Emit 'connected'

    Server-->>Client: initialized<br/>{capabilities, serverInfo}

    Note over Client,Server: Capabilities Negotiated:<br/>- tools: 56 tools across 8 domains<br/>- resources: {listChanged: true}<br/>- prompts: {listChanged: false}

    Client->>Server: Notification: initialized

    Note over Client,Ext: Connection Ready for Requests
```

**Steps**:

1. **Client Initialize**: Client sends `initialize` with protocol version and client info
2. **Server Validation**: Server validates protocol compatibility
3. **WebSocket Bridge Start**: Server starts WebSocket server on port 9876
4. **Extension Connect**: Extension connects to WebSocket on startup
5. **Ready Notification**: Extension sends ready notification with capabilities
6. **Capability Negotiation**: Server responds with supported capabilities
7. **Client Confirmation**: Client sends `initialized` notification
8. **Ready State**: System ready to handle tool and resource requests

**Capabilities Exchanged**:

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    },
    "resources": {
      "listChanged": true
    }
  },
  "serverInfo": {
    "name": "thunderbird-mcp",
    "version": "1.3.1"
  },
  "tools": 56,
  "domains": [
    "messages",
    "folders",
    "contacts",
    "tags",
    "accounts",
    "compose",
    "calendar",
    "tasks"
  ]
}
```

## Tool Call Flow

### Standard Tool Execution

This is the primary data flow for tool invocations like searching messages or creating contacts.

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant Validator as Schema<br/>Validator
    participant Bridge as WebSocket<br/>Bridge
    participant Extension as Extension<br/>Handler
    participant API as Thunderbird<br/>API
    participant TB as Thunderbird<br/>Data

    Client->>Server: tools/call<br/>{name: "thunderbird_messages_search",<br/>arguments: {subject: "invoice"}}

    Server->>Validator: Validate Parameters
    Validator->>Validator: Check Zod Schema
    alt Invalid Parameters
        Validator-->>Server: ValidationError
        Server-->>Client: error<br/>{code: -32602, message: "Invalid params"}
    end

    Validator-->>Server: Valid Parameters

    Server->>Bridge: sendRequest(action, params)
    Bridge->>Bridge: Generate Request ID<br/>(req_{counter}_{timestamp})
    Bridge->>Bridge: Create Pending Promise
    Bridge->>Bridge: Set Timeout (30s)

    Bridge->>Extension: WS Send<br/>{id, type:request, action, params}

    Extension->>Extension: Parse Request
    Extension->>API: messenger.messages.query(params)

    API->>TB: Query Database
    TB-->>API: Return Results

    API-->>Extension: Message List

    Extension->>Extension: Format Response
    Extension->>Bridge: WS Send<br/>{id, type:response, success, data}

    Bridge->>Bridge: Match Request ID
    Bridge->>Bridge: Clear Timeout
    Bridge->>Bridge: Resolve Promise
    Bridge-->>Server: Response Data

    Server->>Server: Format MCP Response
    Server-->>Client: result<br/>{content: [{type: "text", text: "..."}]}

    Note over Client,TB: Total Latency: ~10-50ms
```

**Detailed Steps**:

1. **Client Request**:
   - Client sends `tools/call` with tool name and arguments
   - Request includes unique ID for correlation

2. **Server Validation**:
   - Server routes to appropriate tool handler
   - Zod schema validates all parameters
   - Returns validation error if invalid

3. **WebSocket Request**:
   - Server sends request to WebSocket bridge
   - Bridge generates unique request ID (format: `req_{counter}_{timestamp}`)
   - Creates pending promise for response tracking
   - Sets timeout (default: 30s)
   - Sends JSON message over WebSocket

4. **Extension Processing**:
   - Extension parses incoming WebSocket message
   - Routes to appropriate API wrapper
   - Calls Thunderbird WebExtension API

5. **Thunderbird API**:
   - API accesses local data stores
   - Performs query/operation
   - Returns results

6. **Response Pipeline**:
   - Extension formats response
   - Sends JSON message over WebSocket with matching request ID
   - Bridge correlates response by ID
   - Clears timeout
   - Resolves pending promise
   - Server formats as MCP content
   - Returns to client

**Error Handling**:

- Validation errors: Return immediately with code -32602
- Permission errors: Return code -32002
- Not found errors: Return code -32003
- Timeout errors: Return code -32004 after 30s
- Internal errors: Return code -32603

### Tool Call with Timeout

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant Bridge as WebSocket<br/>Bridge
    participant Extension as Extension

    Client->>Server: tools/call<br/>{name: "thunderbird_messages_search"}

    Server->>Bridge: sendRequest(action, params, timeout: 30000)
    Bridge->>Bridge: Generate ID + Create Promise
    Bridge->>Bridge: Start 30s Timeout Timer
    Bridge->>Extension: WS Send Request

    par Request Processing
        Extension->>Extension: Long-running Query
    and Timeout Monitor
        Bridge->>Bridge: Wait for Response or Timeout
    end

    alt Response Before Timeout
        Extension-->>Bridge: WS Send Response
        Bridge->>Bridge: Match ID + Clear Timeout
        Bridge-->>Server: Result
        Server-->>Client: result
    else Timeout Reached
        Bridge->>Bridge: Timeout Expired
        Bridge->>Bridge: Delete Pending Request
        Bridge-->>Server: TimeoutError
        Server-->>Client: error<br/>{code: -32004, message: "Operation timeout"}
    end
```

**Timeout Values**:

- Message search: 30 seconds
- CRUD operations: 10 seconds
- Resource reads: 15 seconds
- Calendar operations: 10 seconds

## Resource Access Flow

### Resource Read

Resources provide contextual data to AI clients without requiring explicit parameters.

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant ResHandler as Resource<br/>Handler
    participant Bridge as WebSocket<br/>Bridge
    participant Extension as Extension
    participant TB as Thunderbird<br/>Data

    Client->>Server: resources/list
    Server->>ResHandler: Get Available Resources
    ResHandler-->>Server: Resource List
    Server-->>Client: resources<br/>[{uri, name, description, mimeType}]

    Note over Client: User/AI Selects Resource

    Client->>Server: resources/read<br/>{uri: "thunderbird://inbox/unread"}

    Server->>ResHandler: Match URI Pattern
    ResHandler->>ResHandler: Parse URI<br/>(extract accountId if present)

    ResHandler->>Bridge: sendRequest(action, params)
    Bridge->>Extension: WS Send Request
    Extension->>TB: Query Unread Messages
    TB-->>Extension: Message List
    Extension-->>Bridge: WS Send Response
    Bridge-->>ResHandler: Unread Messages Data

    ResHandler->>ResHandler: Format as MCP Resource<br/>{uri, mimeType, text}
    ResHandler-->>Server: Resource Content

    Server-->>Client: contents<br/>[{uri, mimeType, text}]
```

**Resource URI Examples**:

| URI                                      | Data Returned               |
| ---------------------------------------- | --------------------------- |
| `thunderbird://accounts`                 | All configured accounts     |
| `thunderbird://folders/{accountId}`      | Folder tree for account     |
| `thunderbird://inbox/unread`             | All unread messages         |
| `thunderbird://inbox/unread/{accountId}` | Unread for specific account |
| `thunderbird://contacts/recent`          | Recently used contacts      |
| `thunderbird://calendar/today`           | Today's calendar events     |
| `thunderbird://calendar/upcoming`        | Next 7 days events          |
| `thunderbird://tasks/pending`            | Incomplete tasks            |

**Resource Content Format**:

```json
{
  "contents": [
    {
      "uri": "thunderbird://inbox/unread",
      "mimeType": "application/json",
      "text": "[{\"id\":\"msg-1\",\"subject\":\"...\"}]"
    }
  ]
}
```

## Error Handling Flow

### Error Propagation

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant Bridge as WebSocket<br/>Bridge
    participant Extension as Extension
    participant TB as Thunderbird API

    Client->>Server: tools/call<br/>{name: "thunderbird_messages_move"}

    Server->>Bridge: sendRequest(action, params)
    Bridge->>Extension: WS Send Request
    Extension->>TB: messenger.messages.move()

    alt Permission Denied
        TB-->>Extension: Error: Permission Denied
        Extension->>Extension: Map to Error Code
        Extension-->>Bridge: WS Send<br/>{success:false, error:{code:-32002}}
        Bridge->>Bridge: Reject Promise
        Bridge-->>Server: PermissionError
        Server->>Server: Map to MCP Error
        Server-->>Client: error<br/>{code: -32002, message: "Permission denied"}
    else Resource Not Found
        TB-->>Extension: Error: Message Not Found
        Extension-->>Bridge: WS Send<br/>{success:false, error:{code:-32003}}
        Bridge-->>Server: NotFoundError
        Server-->>Client: error<br/>{code: -32003, message: "Resource not found"}
    else Connection Lost
        Bridge--xExtension: Connection Closed
        Bridge->>Bridge: Reject All Pending
        Bridge-->>Server: ConnectionError
        Server-->>Client: error<br/>{code: -32000, message: "Not connected"}
    end
```

**Error Code Mapping**:

| Error Type              | JSON-RPC Code | Description              |
| ----------------------- | ------------- | ------------------------ |
| Parse Error             | -32700        | Invalid JSON             |
| Invalid Request         | -32600        | Malformed request        |
| Method Not Found        | -32601        | Unknown tool/method      |
| Invalid Params          | -32602        | Schema validation failed |
| Internal Error          | -32603        | Unexpected error         |
| Extension Not Connected | -32000        | WebSocket not connected  |
| Permission Denied       | -32002        | Insufficient permissions |
| Resource Not Found      | -32003        | Entity doesn't exist     |
| Operation Timeout       | -32004        | Request exceeded timeout |

### Validation Error Flow

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant Validator as Zod<br/>Validator

    Client->>Server: tools/call<br/>{name: "thunderbird_messages_search",<br/>arguments: {limit: 5000}}

    Server->>Validator: Validate Parameters
    Validator->>Validator: Check Schema<br/>(limit max: 1000)

    Validator-->>Server: ZodError<br/>{path: ["limit"], message: "Max 1000"}

    Server->>Server: Map to ValidationError<br/>{code: -32602}

    Server-->>Client: error<br/>{<br/>  code: -32602,<br/>  message: "Invalid params",<br/>  data: {<br/>    errors: [{<br/>      path: ["limit"],<br/>      message: "Number must be less than or equal to 1000"<br/>    }]<br/>  }<br/>}

    Note over Client: Client displays validation error to user
```

## WebSocket Protocol Flow

### Connection and Reconnection

```mermaid
sequenceDiagram
    participant Extension as Extension
    participant Bridge as WebSocket Bridge

    Note over Extension,Bridge: Initial Connection

    Extension->>Bridge: Connect ws://localhost:9876
    Bridge->>Extension: Connection Accepted (onopen)
    Extension->>Bridge: {type:notification, event:ready}

    Note over Extension,Bridge: Active Communication

    Bridge--xExtension: Connection Lost (Server Restart)

    Extension->>Extension: handleClose() Event
    Extension->>Extension: reconnectAttempts = 1
    Extension->>Extension: Wait 3 seconds

    Extension->>Bridge: Reconnect Attempt 1/10

    alt Reconnect Success
        Bridge->>Extension: Connection Accepted
        Extension->>Extension: Reset reconnectAttempts = 0
        Extension->>Bridge: {type:notification, event:ready}
        Note over Extension,Bridge: Connection Restored
    else Reconnect Failed
        Extension->>Extension: reconnectAttempts = 2
        Extension->>Extension: Wait 3 seconds
        Extension->>Bridge: Reconnect Attempt 2/10

        alt Max Attempts Reached
            Extension->>Extension: After 10 attempts
            Extension->>Extension: Give Up
            Note over Extension: Manual restart required
        end
    end
```

### Message Correlation

```mermaid
sequenceDiagram
    participant Server as MCP Server
    participant Bridge as WebSocket Bridge
    participant Extension as Extension

    Note over Server,Extension: Request Correlation

    Server->>Bridge: sendRequest("messages.search", params)
    Bridge->>Bridge: ID = req_1_1733410000000
    Bridge->>Bridge: pendingRequests.set(ID, promise)
    Bridge->>Extension: WS Send {id: ID, action, params}

    par Multiple Concurrent Requests
        Server->>Bridge: sendRequest("folders.list", {})
        Bridge->>Bridge: ID = req_2_1733410000100
        Bridge->>Bridge: pendingRequests.set(ID, promise)
        Bridge->>Extension: WS Send {id: ID, action, params}
    and
        Server->>Bridge: sendRequest("contacts.search", {})
        Bridge->>Bridge: ID = req_3_1733410000200
        Bridge->>Bridge: pendingRequests.set(ID, promise)
        Bridge->>Extension: WS Send {id: ID, action, params}
    end

    Extension-->>Bridge: WS Send {id: req_2_..., success, data}
    Bridge->>Bridge: Match ID req_2_...
    Bridge->>Bridge: Resolve promise for req_2
    Bridge-->>Server: Response for folders.list

    Extension-->>Bridge: WS Send {id: req_1_..., success, data}
    Bridge->>Bridge: Match ID req_1_...
    Bridge->>Bridge: Resolve promise for req_1
    Bridge-->>Server: Response for messages.search

    Extension-->>Bridge: WS Send {id: req_3_..., success, data}
    Bridge->>Bridge: Match ID req_3_...
    Bridge->>Bridge: Resolve promise for req_3
    Bridge-->>Server: Response for contacts.search

    Note over Server,Extension: Responses can arrive out of order<br/>Correlation by ID ensures correct matching
```

**Request ID Format**:

- Server-generated: `req_{counter}_{timestamp}`
- Extension-generated: `ext_{timestamp}_{random}`
- Unique per request
- Used for response correlation
- Prevents response mismatching

## Batch Operations Flow

### Multiple Message Operations

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant Bridge as WebSocket<br/>Bridge
    participant Extension as Extension

    Client->>Server: tools/call<br/>{name: "thunderbird_messages_move",<br/>arguments: {messageIds: ["1","2","3"], ...}}

    Server->>Bridge: sendRequest(action, params)
    Bridge->>Extension: WS Send Request

    Extension->>Extension: Batch Process

    loop For Each Message
        Extension->>Extension: Move Message
    end

    Extension->>Extension: Collect Results<br/>Success: ["1","2","3"]<br/>Failed: []

    Extension-->>Bridge: WS Send Response<br/>{success:true, data:{moved:["1","2","3"]}}
    Bridge-->>Server: Result
    Server-->>Client: result<br/>{content: [{type: "text", text: "Moved 3 messages"}]}
```

**Batch Operation Benefits**:

- Single WebSocket round-trip for multiple items
- Atomic semantics (all or partial success)
- Detailed error reporting per item
- Better performance than sequential calls

## Performance Characteristics

### Latency Breakdown

```mermaid
gantt
    title Tool Call Latency (thunderbird_messages_search)
    dateFormat X
    axisFormat %L ms

    section MCP Layer
    Schema Validation      :a1, 0, 5

    section WebSocket Bridge
    Generate ID & Promise  :a2, 5, 7
    Serialize JSON         :a3, 7, 9
    WS Send                :a4, 9, 11

    section Network
    Localhost Transfer     :a5, 11, 13

    section Extension
    Parse JSON             :a6, 13, 15
    Route to Handler       :a7, 15, 18

    section Thunderbird API
    Database Query         :a8, 18, 45

    section Response
    Format Response        :a9, 45, 47
    WS Send Back           :a10, 47, 49
    Match & Resolve        :a11, 49, 50
```

**Typical Latencies**:

- Schema validation: 1-5ms
- Request ID generation: 1-2ms
- JSON serialization: 1-2ms
- WebSocket transfer (localhost): 1-2ms each way
- Extension routing: 2-3ms
- Thunderbird API: 10-30ms (varies by operation)
- Total: 10-50ms typical

**Comparison to Native Messaging**:

- Native Messaging: 20-50ms overhead
- WebSocket: 10-20ms overhead
- Improvement: ~2x faster

### Throughput Considerations

**Bottlenecks**:

1. **Single WebSocket Connection**: Full-duplex, but single thread
2. **Extension Processing**: Sequential request handling
3. **Thunderbird API**: Database lock contention
4. **Pending Request Limit**: Max 100 concurrent requests

**Optimization Strategies**:

- Use pagination for large result sets
- Batch operations where possible
- Request correlation enables concurrent requests
- Timeout management prevents queue buildup

## Data Flow Summary

### Request Types Comparison

| Flow Type       | Latency  | Connection | Real-time | Use Case          |
| --------------- | -------- | ---------- | --------- | ----------------- |
| Tool Call       | 10-50ms  | WebSocket  | No        | Action execution  |
| Resource Read   | 15-40ms  | WebSocket  | No        | Context retrieval |
| Notification    | <5ms     | WebSocket  | Yes       | Status updates    |
| Batch Operation | 50-200ms | WebSocket  | No        | Bulk actions      |

### Key Takeaways

1. **WebSocket Provides Better Performance**: ~2x faster than Native Messaging
2. **Request Correlation Enables Concurrency**: Multiple requests in flight simultaneously
3. **Auto-Reconnect Improves Reliability**: Automatic recovery from connection loss
4. **Validation Happens Early**: Client-side and server-side validation before expensive operations
5. **Error Codes Are Consistent**: Standardized JSON-RPC codes across all layers
6. **Timeouts Protect Resources**: All operations have reasonable timeout limits
7. **Batching Improves Performance**: Single request for multiple items reduces overhead
