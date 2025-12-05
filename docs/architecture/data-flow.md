# Data Flow Architecture

## Overview

This document details the data flows through the Thunderbird MCP system, illustrating how requests travel from MCP clients through the server, Native Messaging bridge, and Thunderbird extension to access email data.

## MCP Lifecycle Flow

### Initialize Connection

The initialization sequence establishes the MCP server connection and negotiates capabilities.

```mermaid
sequenceDiagram
    participant Client as MCP Client<br/>(Claude)
    participant Server as MCP Server
    participant NM as Native Messaging<br/>Client
    participant Ext as Thunderbird<br/>Extension

    Client->>Server: initialize<br/>{protocolVersion, clientInfo}
    Server->>Server: Validate Protocol Version
    Server->>NM: Connect to Extension
    NM->>Ext: Spawn/Connect Native Host
    Ext-->>NM: Connection Established
    NM-->>Server: Connected

    Server-->>Client: initialized<br/>{capabilities, serverInfo}

    Note over Client,Server: Capabilities Negotiated:<br/>- tools: {listChanged: true}<br/>- resources: {listChanged: true}<br/>- prompts: {listChanged: false}

    Client->>Server: Notification: initialized

    Note over Client,Ext: Connection Ready for Requests
```

**Steps**:
1. **Client Initialize**: Client sends `initialize` with protocol version and client info
2. **Server Validation**: Server validates protocol compatibility
3. **Native Messaging Connection**: Server connects to extension via Native Messaging
4. **Capability Negotiation**: Server responds with supported capabilities
5. **Client Confirmation**: Client sends `initialized` notification
6. **Ready State**: System ready to handle tool and resource requests

**Capabilities Exchanged**:
```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    },
    "resources": {
      "listChanged": true
    },
    "prompts": {
      "listChanged": false
    }
  },
  "serverInfo": {
    "name": "thunderbird-mcp",
    "version": "1.0.0"
  }
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
    participant NMClient as Native<br/>Messaging<br/>Client
    participant Protocol as Native<br/>Messaging<br/>Protocol
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

    Server->>NMClient: Send Request<br/>{method: "messages.search", params: {...}}

    NMClient->>Protocol: Serialize Message<br/>(4-byte length + JSON)
    Protocol->>Extension: Write to stdin

    Extension->>Extension: Parse Request
    Extension->>API: messenger.messages.query(params)

    API->>TB: Query Database
    TB-->>API: Return Results

    API-->>Extension: Message List

    Extension->>Extension: Format Response
    Extension->>Protocol: Write to stdout<br/>(4-byte length + JSON)

    Protocol->>NMClient: Deserialize Message
    NMClient-->>Server: Response Data

    Server->>Server: Format MCP Response
    Server-->>Client: result<br/>{content: [{type: "text", text: "..."}]}

    Note over Client,TB: Total Latency: ~50-200ms
```

**Detailed Steps**:

1. **Client Request**:
   - Client sends `tools/call` with tool name and arguments
   - Request includes unique ID for correlation

2. **Server Validation**:
   - Server routes to appropriate tool handler
   - Zod schema validates all parameters
   - Returns validation error if invalid

3. **Native Messaging Request**:
   - Server sends request to Native Messaging client
   - Client serializes message with length prefix
   - Message written to extension's stdin

4. **Extension Processing**:
   - Extension parses incoming message
   - Routes to appropriate API wrapper
   - Calls Thunderbird WebExtension API

5. **Thunderbird API**:
   - API accesses local data stores
   - Performs query/operation
   - Returns results

6. **Response Pipeline**:
   - Extension formats response
   - Serializes and writes to stdout
   - Server deserializes response
   - Formats as MCP content
   - Returns to client

**Error Handling**:
- Validation errors: Return immediately with code -32602
- Permission errors: Return code -32002
- Not found errors: Return code -32003
- Timeout errors: Return code -32004 after 10-30s
- Internal errors: Return code -32603

### Tool Call with Timeout

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant NMClient as Native<br/>Messaging<br/>Client
    participant Extension as Extension

    Client->>Server: tools/call<br/>{name: "thunderbird_messages_search"}

    Server->>NMClient: send(request, timeout: 30000)
    NMClient->>NMClient: Start 30s Timer
    NMClient->>Extension: Request via Native Messaging

    par Request Processing
        Extension->>Extension: Long-running Query
    and Timeout Monitor
        NMClient->>NMClient: Wait for Response or Timeout
    end

    alt Response Before Timeout
        Extension-->>NMClient: Response
        NMClient->>NMClient: Clear Timer
        NMClient-->>Server: Result
        Server-->>Client: result
    else Timeout Reached
        NMClient->>NMClient: Timeout Expired
        NMClient-->>Server: TimeoutError
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
    participant NMClient as Native<br/>Messaging<br/>Client
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

    ResHandler->>NMClient: Request Data<br/>{method: "messages.listUnread"}
    NMClient->>Extension: Native Messaging Request
    Extension->>TB: Query Unread Messages
    TB-->>Extension: Message List
    Extension-->>NMClient: Response
    NMClient-->>ResHandler: Unread Messages Data

    ResHandler->>ResHandler: Format as MCP Resource<br/>{uri, mimeType, text}
    ResHandler-->>Server: Resource Content

    Server-->>Client: contents<br/>[{uri, mimeType, text}]
```

**Resource URI Examples**:

| URI | Data Returned |
|-----|---------------|
| `thunderbird://accounts` | All configured accounts |
| `thunderbird://folders/{accountId}` | Folder tree for account |
| `thunderbird://inbox/unread` | All unread messages |
| `thunderbird://inbox/unread/{accountId}` | Unread for specific account |
| `thunderbird://contacts/recent` | Recently used contacts |
| `thunderbird://calendar/today` | Today's calendar events |
| `thunderbird://calendar/upcoming` | Next 7 days events |
| `thunderbird://tasks/pending` | Incomplete tasks |

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
    participant NMClient as Native<br/>Messaging
    participant Extension as Extension
    participant TB as Thunderbird API

    Client->>Server: tools/call<br/>{name: "thunderbird_messages_move"}

    Server->>NMClient: Send Request
    NMClient->>Extension: Native Messaging Request
    Extension->>TB: messenger.messages.move()

    alt Permission Denied
        TB-->>Extension: Error: Permission Denied
        Extension->>Extension: Map to Error Code
        Extension-->>NMClient: {error: {code: -32002, message: "Permission denied"}}
        NMClient-->>Server: PermissionError
        Server->>Server: Map to MCP Error
        Server-->>Client: error<br/>{code: -32002, message: "Permission denied"}
    else Resource Not Found
        TB-->>Extension: Error: Message Not Found
        Extension-->>NMClient: {error: {code: -32003, message: "Resource not found"}}
        NMClient-->>Server: NotFoundError
        Server-->>Client: error<br/>{code: -32003, message: "Resource not found"}
    else Internal Error
        TB-->>Extension: Unexpected Error
        Extension-->>NMClient: {error: {code: -32603, message: "Internal error"}}
        NMClient-->>Server: ThunderbirdError
        Server-->>Client: error<br/>{code: -32603, message: "Internal error"}}
    end
```

**Error Code Mapping**:

| Error Type | JSON-RPC Code | Description |
|-----------|---------------|-------------|
| Parse Error | -32700 | Invalid JSON |
| Invalid Request | -32600 | Malformed request |
| Method Not Found | -32601 | Unknown tool/method |
| Invalid Params | -32602 | Schema validation failed |
| Internal Error | -32603 | Unexpected error |
| Thunderbird Not Running | -32000 | Extension unreachable |
| Extension Not Installed | -32001 | Extension missing |
| Permission Denied | -32002 | Insufficient permissions |
| Resource Not Found | -32003 | Entity doesn't exist |
| Operation Timeout | -32004 | Request exceeded timeout |

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

## Native Messaging Protocol Flow

### Message Serialization

The Native Messaging protocol uses length-prefixed JSON messages for bidirectional communication.

```mermaid
sequenceDiagram
    participant Server as MCP Server<br/>Process
    participant Protocol as Protocol<br/>Layer
    participant Stdio as stdin/stdout<br/>Pipes
    participant Extension as Extension<br/>Process

    Note over Server,Extension: Request Flow

    Server->>Protocol: JavaScript Object<br/>{id, method, params}
    Protocol->>Protocol: JSON.stringify()
    Protocol->>Protocol: Create Buffer<br/>4-byte length + JSON
    Protocol->>Stdio: Write to stdin

    Stdio->>Extension: Bytes Stream
    Extension->>Extension: Read 4-byte Length Prefix
    Extension->>Extension: Read N Bytes (JSON)
    Extension->>Extension: JSON.parse()
    Extension->>Extension: Process Request

    Note over Server,Extension: Response Flow

    Extension->>Extension: JSON.stringify(response)
    Extension->>Extension: Create Buffer<br/>4-byte length + JSON
    Extension->>Stdio: Write to stdout

    Stdio->>Protocol: Bytes Stream
    Protocol->>Protocol: Read 4-byte Length Prefix
    Protocol->>Protocol: Read N Bytes (JSON)
    Protocol->>Protocol: JSON.parse()
    Protocol->>Server: JavaScript Object<br/>{id, result/error}
```

**Message Format**:
```
┌─────────────┬──────────────────────────────────┐
│   4 bytes   │         N bytes                  │
│   Length    │       JSON Payload               │
│ (UInt32LE)  │                                  │
└─────────────┴──────────────────────────────────┘
```

**Example Serialization**:
```javascript
// Request object
const request = {
  id: "req-001",
  method: "messages.search",
  params: { subject: "invoice" }
};

// Serialized
// Length: 4 bytes = 0x3E000000 (62 in little-endian)
// JSON: {"id":"req-001","method":"messages.search","params":{"subject":"invoice"}}
```

### Connection Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Disconnected

    Disconnected --> Connecting: server.connect()
    Connecting --> Connected: Extension responds
    Connecting --> Failed: Timeout/Error

    Connected --> Active: First request
    Active --> Active: Ongoing requests
    Active --> Idle: No pending requests
    Idle --> Active: New request

    Connected --> Disconnected: Extension exits
    Active --> Reconnecting: Connection lost
    Idle --> Reconnecting: Connection lost

    Reconnecting --> Connected: Reconnect success
    Reconnecting --> Failed: Reconnect failed

    Failed --> [*]
    Disconnected --> [*]
```

**States**:
- **Disconnected**: No connection to extension
- **Connecting**: Spawning/connecting to native host
- **Connected**: Connection established, idle
- **Active**: Processing requests
- **Idle**: Connected but no active requests
- **Reconnecting**: Attempting to restore connection
- **Failed**: Connection permanently failed

## Batch Operations Flow

### Multiple Message Operations

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant NMClient as Native<br/>Messaging
    participant Extension as Extension

    Client->>Server: tools/call<br/>{name: "thunderbird_messages_move",<br/>arguments: {messageIds: ["1","2","3"], ...}}

    Server->>NMClient: Single Request<br/>{method: "messages.move", params: {...}}
    NMClient->>Extension: Native Messaging

    Extension->>Extension: Batch Process

    loop For Each Message
        Extension->>Extension: Move Message
    end

    Extension->>Extension: Collect Results<br/>Success: ["1","2","3"]<br/>Failed: []

    Extension-->>NMClient: Batch Response<br/>{moved: ["1","2","3"], errors: []}
    NMClient-->>Server: Result
    Server-->>Client: result<br/>{content: [{type: "text", text: "Moved 3 messages"}]}
```

**Batch Operation Benefits**:
- Single round-trip for multiple items
- Atomic semantics (all or partial success)
- Detailed error reporting per item
- Better performance than sequential calls

## Real-Time Event Flow (Future)

### Resource Subscription (Planned)

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant Extension as Extension
    participant TB as Thunderbird

    Client->>Server: resources/subscribe<br/>{uri: "thunderbird://inbox/unread"}
    Server->>Extension: Subscribe to Events
    Extension->>TB: Register onMessageReceived Listener

    TB-->>Extension: Event: New Message
    Extension->>Extension: Check if Unread
    Extension-->>Server: Notification<br/>{resource: "...", updated: true}
    Server-->>Client: notifications/resources/updated<br/>{uri: "thunderbird://inbox/unread"}

    Client->>Server: resources/read<br/>{uri: "thunderbird://inbox/unread"}
    Server-->>Client: Updated Resource Content

    Note over Client,TB: Live updates continue...

    Client->>Server: resources/unsubscribe<br/>{uri: "thunderbird://inbox/unread"}
    Server->>Extension: Unsubscribe
    Extension->>TB: Remove Listener
```

**Planned Event Types**:
- New message received
- Message marked as read/unread
- Message moved/deleted
- Contact updated
- Calendar event created/modified
- Task status changed

## Performance Characteristics

### Latency Breakdown

```mermaid
gantt
    title Tool Call Latency (thunderbird_messages_search)
    dateFormat X
    axisFormat %L ms

    section MCP Layer
    Schema Validation      :a1, 0, 5

    section Native Messaging
    Serialization         :a2, 5, 10
    IPC Transfer          :a3, 10, 20

    section Extension
    Deserialization       :a4, 20, 25
    API Routing           :a5, 25, 30

    section Thunderbird API
    Database Query        :a6, 30, 180

    section Response
    Result Formatting     :a7, 180, 185
    IPC Transfer Back     :a8, 185, 195
    MCP Formatting        :a9, 195, 200
```

**Typical Latencies**:
- Schema validation: 1-5ms
- Serialization: 1-5ms
- IPC transfer: 5-10ms each way
- Extension routing: 5-10ms
- Thunderbird API: 20-150ms (varies by operation)
- Total: 50-200ms typical

### Throughput Considerations

**Bottlenecks**:
1. **Native Messaging Bandwidth**: ~1MB/s theoretical limit
2. **Single-threaded Extension**: Sequential request processing
3. **Thunderbird API**: Database lock contention
4. **IPC Overhead**: Fixed cost per message

**Optimization Strategies**:
- Use pagination for large result sets
- Batch operations where possible
- Cache folder structures
- Minimize full message body retrieval
- Consider parallel connections (future)

## Data Flow Summary

### Request Types Comparison

| Flow Type | Latency | Caching | Real-time | Use Case |
|-----------|---------|---------|-----------|----------|
| Tool Call | 50-200ms | No | No | Action execution |
| Resource Read | 30-100ms | Optional | No | Context retrieval |
| Resource Subscribe | N/A | No | Yes | Live updates (future) |
| Batch Operation | 100-500ms | No | No | Bulk actions |

### Key Takeaways

1. **Validation Happens Early**: Client-side and server-side validation before expensive operations
2. **Error Codes Are Consistent**: Standardized JSON-RPC codes across all layers
3. **Protocol Is Stateless**: Each request is independent (except subscriptions in future)
4. **Timeouts Protect Resources**: All operations have reasonable timeout limits
5. **Batching Improves Performance**: Single request for multiple items reduces overhead
