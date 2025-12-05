# Workflow Implementation - Thunderbird MCP

## Objectif
Implementer les composants du projet selon les specifications, en utilisant des sub-agents specialises avec orchestration intelligente parallele/sequentielle.

---

## Variables de Configuration

```
USER_PROMPT: $ARGUMENTS

IMPL_TARGET: [all|extension|server|types|tests|native-messaging]
  - all: Implementation complete
  - extension: Extension Thunderbird uniquement
  - server: Serveur MCP uniquement
  - types: Types TypeScript uniquement
  - tests: Tests uniquement
  - native-messaging: Configuration Native Messaging

IMPL_PHASE: [1|2|3|4|auto]
  - 1: MVP (Messages, Folders, Tags)
  - 2: Contacts (AddressBooks, Contacts)
  - 3: Calendar (Events, Tasks) - Experimental
  - 4: Polish (Optimization, E2E)
  - auto: Detecter depuis etat projet

CODE_STYLE: [strict|standard]
  - strict: TypeScript strict, tous checks
  - standard: Configuration standard
```

---

## Matrice Dependances Implementation

```
┌─────────────────────────────────────────────────────────────┐
│ Component           │ Depend de           │ Mode           │
├─────────────────────┼─────────────────────┼────────────────┤
│ Types Thunderbird   │ Specs               │ SEQUENTIAL     │
│ Types MCP           │ Specs               │ PARALLEL*      │
│ Types Native Msg    │ -                   │ PARALLEL*      │
│ Extension Manifest  │ Types               │ SEQUENTIAL     │
│ Extension APIs      │ Manifest            │ PARALLEL**     │
│ Extension NM Handler│ APIs                │ SEQUENTIAL     │
│ Server Entry        │ Types               │ SEQUENTIAL     │
│ Server Tools        │ Server Entry        │ PARALLEL***    │
│ Server Resources    │ Server Entry        │ PARALLEL***    │
│ Server NM Client    │ Server Entry        │ PARALLEL***    │
│ Native Host Config  │ Ext + Server        │ SEQUENTIAL     │
│ Unit Tests          │ Implementation      │ PARALLEL****   │
│ Integration Tests   │ Unit Tests          │ SEQUENTIAL     │
│ E2E Tests           │ Integration         │ SEQUENTIAL     │
└─────────────────────────────────────────────────────────────┘
*    Types peuvent etre generes en parallele (fichiers distincts)
**   APIs Extension paralleles (messages.js, folders.js, etc.)
***  Tools/Resources/NM paralleles (modules independants)
**** Tests par module en parallele
```

---

## Workflow d'Execution

### Phase 0: Pre-Implementation Check

```
VERIFICATIONS:
1. Documentation existe?
   ├─ CAHIER_DES_CHARGES.md present
   ├─ docs/api/*.md presents
   └─ Si manquant: Suggerer /docs d'abord

2. Structure projet existe?
   ├─ extension/ directory
   ├─ server/ directory
   └─ Si manquant: Creer structure

3. Dependances installees?
   ├─ npm install (si package.json existe)
   └─ Si non: Installer

4. Determiner IMPL_PHASE si auto
   ├─ Analyser fichiers existants
   ├─ Detecter phase actuelle
   └─ Proposer prochaine phase
```

### Phase 1: Types Generation (MIXED)

```
DEPENDS_ON: Specifications (CAHIER_DES_CHARGES.md)

┌─────────────────────────────────────────────────────────────┐
│ PARALLEL BATCH: TYPES                                       │
├─────────────────────────────────────────────────────────────┤

Agent 1: Thunderbird Types Generator
Task(subagent_type="python-expert", prompt="""
Generer types TypeScript pour APIs Thunderbird.

REFERENCE: CAHIER_DES_CHARGES.md Section 3 (Specifications)

FICHIER: src/types/thunderbird.ts

TYPES A GENERER:

// ===== Messages =====
interface MessageHeader {
  id: string;
  date: Date;
  author: string;
  recipients: string[];
  subject: string;
  read: boolean;
  flagged: boolean;
  tags: string[];
  folder: FolderInfo;
}

interface MessageFull extends MessageHeader {
  body: {
    contentType: string;
    content: string;
  };
  attachments: Attachment[];
}

interface MessageSearchQuery {
  subject?: string;
  from?: string;
  to?: string;
  body?: string;
  tags?: string[];
  unread?: boolean;
  dateFrom?: string;
  dateTo?: string;
  folderId?: string;
  limit?: number;
}

// ===== Folders =====
interface Folder {
  id: string;
  accountId: string;
  name: string;
  path: string;
  type: FolderType;
  unreadCount: number;
  totalCount: number;
  subFolders?: Folder[];
}

type FolderType = 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'junk' | 'custom';

// ===== Contacts =====
interface Contact {
  id: string;
  addressBookId: string;
  properties: ContactProperties;
  vCard?: string;
}

interface ContactProperties {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  secondEmail?: string;
  phone?: string;
  mobile?: string;
  organization?: string;
  jobTitle?: string;
  notes?: string;
}

// ===== Address Books =====
interface AddressBook {
  id: string;
  name: string;
  type: 'local' | 'remote' | 'carddav';
  readOnly: boolean;
}

// ===== Accounts =====
interface Account {
  id: string;
  name: string;
  type: AccountType;
  identities: Identity[];
  folders: Folder[];
}

type AccountType = 'imap' | 'pop3' | 'nntp' | 'local';

interface Identity {
  id: string;
  accountId: string;
  name: string;
  email: string;
  replyTo?: string;
  signature?: string;
}

// ===== Tags =====
interface Tag {
  key: string;
  tag: string;
  color: string;
  ordinal: string;
}

[Continuer avec Calendar types si Phase 3]

EXPORT: Export tous les types
""")

Agent 2: MCP Types Generator
Task(subagent_type="python-expert", prompt="""
Generer types TypeScript pour protocole MCP.

REFERENCE: docs/api/mcp-protocol.md

FICHIER: src/types/mcp.ts

TYPES A GENERER:

// ===== JSON-RPC 2.0 =====
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// ===== MCP Tools =====
interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface McpToolResult {
  content: McpContent[];
  isError?: boolean;
}

type McpContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: McpResource };

// ===== MCP Resources =====
interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// ===== MCP Capabilities =====
interface McpServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
}

interface McpServerInfo {
  name: string;
  version: string;
}

// ===== Error Codes =====
enum McpErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ThunderbirdNotRunning = -32000,
  ExtensionNotInstalled = -32001,
  PermissionDenied = -32002,
  ResourceNotFound = -32003,
  OperationTimeout = -32004,
}

EXPORT: Export tous les types
""")

Agent 3: Native Messaging Types Generator
Task(subagent_type="python-expert", prompt="""
Generer types pour Native Messaging.

FICHIER: src/types/native-messaging.ts

TYPES:

// ===== Native Messaging Protocol =====
interface NativeMessage {
  id: string;
  type: NativeMessageType;
  payload: unknown;
  timestamp: number;
}

type NativeMessageType =
  | 'request'
  | 'response'
  | 'error'
  | 'notification';

interface NativeRequest extends NativeMessage {
  type: 'request';
  payload: {
    action: string;
    params: Record<string, unknown>;
  };
}

interface NativeResponse extends NativeMessage {
  type: 'response';
  payload: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
}

// ===== Connection State =====
interface NativeConnectionState {
  connected: boolean;
  extensionId: string;
  lastPing: number;
}

EXPORT: Export tous les types
""")

└─────────────────────────────────────────────────────────────┘
WAIT: Tous types generes

SEQUENTIAL: Index Types
Task(subagent_type="python-expert", prompt="""
Creer index des types.

FICHIER: src/types/index.ts

CONTENU:
// Thunderbird Types
export * from './thunderbird';

// MCP Types
export * from './mcp';

// Native Messaging Types
export * from './native-messaging';

// Calendar Types (if exists)
export * from './calendar';
""")

CHECKPOINT: tsc --noEmit (validation types)
```

### Phase 2: Extension Implementation (MIXED)

```
DEPENDS_ON: Types (Phase 1)

SEQUENTIAL: Manifest
Task(subagent_type="frontend-architect", prompt="""
Creer manifest.json extension.

FICHIER: extension/manifest.json

{
  "manifest_version": 3,
  "name": "Thunderbird MCP",
  "version": "1.0.0",
  "description": "MCP Server integration for Thunderbird",
  "author": "Assistance Micro Design",

  "browser_specific_settings": {
    "gecko": {
      "id": "thunderbird-mcp@assistance-micro-design.com",
      "strict_min_version": "128.0"
    }
  },

  "permissions": [
    "messagesRead",
    "messagesMove",
    "messagesUpdate",
    "messagesTags",
    "accountsRead",
    "accountsFolders",
    "addressBooks",
    "nativeMessaging"
  ],

  "background": {
    "scripts": ["background.js"],
    "type": "module"
  },

  "experiment_apis": {
    "calendar": {
      "schema": "experiments/calendar/schema.json",
      "parent": {
        "scopes": ["addon_parent"],
        "paths": [["calendar"]],
        "script": "experiments/calendar/api.js"
      }
    }
  }
}
""")

WAIT: Manifest cree

┌─────────────────────────────────────────────────────────────┐
│ PARALLEL BATCH: EXTENSION APIs                              │
├─────────────────────────────────────────────────────────────┤

Agent 4: Messages API Wrapper
Task(subagent_type="frontend-architect", prompt="""
Implementer wrapper API Messages.

FICHIER: extension/api/messages.js

IMPLEMENTATION:
/**
 * Messages API Wrapper
 * Wraps messenger.messages.* for Native Messaging
 */

export const MessagesAPI = {
  /**
   * Search messages with query
   */
  async search(query) {
    const results = await messenger.messages.query(query);
    return results.messages.map(formatMessageHeader);
  },

  /**
   * List messages in folder
   */
  async list(folderId, options = {}) {
    const folder = await messenger.folders.get(folderId);
    const page = await messenger.messages.list(folder);
    return {
      messages: page.messages.map(formatMessageHeader),
      hasMore: page.id !== null
    };
  },

  /**
   * Get message by ID
   */
  async get(messageId, format = 'headers') {
    const msg = await messenger.messages.get(messageId);
    if (format === 'full') {
      const full = await messenger.messages.getFull(messageId);
      return { ...formatMessageHeader(msg), body: extractBody(full) };
    }
    if (format === 'raw') {
      const raw = await messenger.messages.getRaw(messageId);
      return { raw };
    }
    return formatMessageHeader(msg);
  },

  // ... move, copy, delete, update, archive

  /**
   * List unread messages
   */
  async listUnread(accountId, limit = 50) {
    return this.search({ unread: true, accountId, limit });
  }
};

// Helper functions
function formatMessageHeader(msg) {
  return {
    id: msg.id,
    date: msg.date,
    author: msg.author,
    recipients: msg.recipients,
    subject: msg.subject,
    read: msg.read,
    flagged: msg.flagged,
    tags: msg.tags,
    folder: msg.folder
  };
}

function extractBody(fullMessage) {
  // Extract text/plain or text/html body
}
""")

Agent 5: Folders API Wrapper
Task(subagent_type="frontend-architect", prompt="""
Implementer wrapper API Folders.

FICHIER: extension/api/folders.js

[Implementation complete pour:]
- list(accountId, includeSubFolders)
- get(folderId)
- create(parentId, name)
- rename(folderId, newName)
- delete(folderId)
- move(folderId, destinationId)
- markAsRead(folderId)
""")

Agent 6: Contacts API Wrapper
Task(subagent_type="frontend-architect", prompt="""
Implementer wrapper API Contacts.

FICHIER: extension/api/contacts.js

[Implementation complete pour:]
- search(query, addressBookId)
- list(addressBookId, options)
- get(contactId)
- create(addressBookId, properties)
- update(contactId, properties)
- delete(contactId)
- addressBooks.list()
- addressBooks.create(name)
- addressBooks.delete(id)
""")

Agent 7: Accounts API Wrapper
Task(subagent_type="frontend-architect", prompt="""
Implementer wrapper API Accounts.

FICHIER: extension/api/accounts.js

[Implementation complete pour:]
- list()
- get(accountId)
- getIdentities(accountId)
""")

Agent 8: Tags API Wrapper
Task(subagent_type="frontend-architect", prompt="""
Implementer wrapper API Tags.

FICHIER: extension/api/tags.js

[Implementation complete pour:]
- list()
- create(key, tag, color)
- update(key, changes)
- delete(key)
""")

└─────────────────────────────────────────────────────────────┘
WAIT: Toutes APIs implementees

SEQUENTIAL: Background Script
Task(subagent_type="frontend-architect", prompt="""
Implementer background.js principal.

FICHIER: extension/background.js

import { MessagesAPI } from './api/messages.js';
import { FoldersAPI } from './api/folders.js';
import { ContactsAPI } from './api/contacts.js';
import { AccountsAPI } from './api/accounts.js';
import { TagsAPI } from './api/tags.js';

// API Registry
const apis = {
  messages: MessagesAPI,
  folders: FoldersAPI,
  contacts: ContactsAPI,
  accounts: AccountsAPI,
  tags: TagsAPI
};

// Native Messaging Handler
let nativePort = null;

browser.runtime.onConnectNative.addListener((port) => {
  nativePort = port;
  console.log('Native messaging connected');

  port.onMessage.addListener(handleNativeMessage);
  port.onDisconnect.addListener(() => {
    console.log('Native messaging disconnected');
    nativePort = null;
  });
});

async function handleNativeMessage(message) {
  const { id, type, payload } = message;

  if (type !== 'request') return;

  try {
    const { action, params } = payload;
    const [apiName, methodName] = action.split('_');

    if (!apis[apiName] || !apis[apiName][methodName]) {
      throw new Error(`Unknown action: ${action}`);
    }

    const result = await apis[apiName][methodName](...Object.values(params));

    sendNativeResponse(id, { success: true, data: result });
  } catch (error) {
    sendNativeResponse(id, { success: false, error: error.message });
  }
}

function sendNativeResponse(id, payload) {
  if (nativePort) {
    nativePort.postMessage({
      id,
      type: 'response',
      payload,
      timestamp: Date.now()
    });
  }
}

// Initialize
console.log('Thunderbird MCP Extension loaded');
""")

CHECKPOINT: Extension structure complete
```

### Phase 3: Server Implementation (MIXED)

```
DEPENDS_ON: Types (Phase 1)

SEQUENTIAL: Package.json & Config
Task(subagent_type="backend-architect", prompt="""
Creer configuration serveur.

FICHIER: server/package.json

{
  "name": "thunderbird-mcp-server",
  "version": "1.0.0",
  "description": "MCP Server for Thunderbird",
  "author": "Assistance Micro Design",
  "license": "MIT",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "vitest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0",
    "winston": "^3.14.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0",
    "vitest": "^2.0.0",
    "tsx": "^4.0.0"
  }
}

FICHIER: server/tsconfig.json

{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"]
}
""")

SEQUENTIAL: Server Entry Point
Task(subagent_type="backend-architect", prompt="""
Implementer point d'entree serveur.

FICHIER: server/src/index.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { NativeMessagingClient } from './native-messaging/client.js';
import { logger } from './utils/logger.js';

async function main() {
  logger.info('Starting Thunderbird MCP Server...');

  // Initialize Native Messaging client
  const nmClient = new NativeMessagingClient();
  await nmClient.connect();

  // Create MCP Server
  const server = new Server(
    {
      name: 'thunderbird-mcp',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: false, listChanged: true }
      }
    }
  );

  // Register tools and resources
  registerTools(server, nmClient);
  registerResources(server, nmClient);

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Thunderbird MCP Server ready');
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
""")

WAIT: Entry point cree

┌─────────────────────────────────────────────────────────────┐
│ PARALLEL BATCH: SERVER MODULES                              │
├─────────────────────────────────────────────────────────────┤

Agent 9: Tools - Messages
Task(subagent_type="backend-architect", prompt="""
Implementer tools Messages MCP.

FICHIER: server/src/tools/messages.ts

import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { NativeMessagingClient } from '../native-messaging/client.js';

// Schemas
const searchSchema = z.object({
  subject: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  unread: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  folderId: z.string().optional(),
  limit: z.number().default(50)
});

export function registerMessageTools(server: Server, nm: NativeMessagingClient) {

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'thunderbird_messages_search': {
        const params = searchSchema.parse(args);
        const result = await nm.request('messages_search', params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }]
        };
      }

      case 'thunderbird_messages_list': {
        // Implementation
      }

      case 'thunderbird_messages_get': {
        // Implementation
      }

      // ... autres tools messages
    }
  });
}

export const messageTools = [
  {
    name: 'thunderbird_messages_search',
    description: 'Search emails with advanced filters',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Subject contains' },
        from: { type: 'string', description: 'From address contains' },
        // ... autres props
      }
    }
  },
  // ... autres tools
];
""")

Agent 10: Tools - Folders
Task(subagent_type="backend-architect", prompt="""
Implementer tools Folders MCP.

FICHIER: server/src/tools/folders.ts

[Implementation complete pour tous les outils folders]
""")

Agent 11: Tools - Contacts
Task(subagent_type="backend-architect", prompt="""
Implementer tools Contacts MCP.

FICHIER: server/src/tools/contacts.ts

[Implementation complete pour tous les outils contacts]
""")

Agent 12: Tools - Tags
Task(subagent_type="backend-architect", prompt="""
Implementer tools Tags MCP.

FICHIER: server/src/tools/tags.ts

[Implementation complete pour tous les outils tags]
""")

Agent 13: Resources Handler
Task(subagent_type="backend-architect", prompt="""
Implementer resources MCP.

FICHIER: server/src/resources/handlers.ts

export function registerResources(server: Server, nm: NativeMessagingClient) {

  server.setRequestHandler('resources/list', async () => {
    return {
      resources: [
        {
          uri: 'thunderbird://accounts',
          name: 'Mail Accounts',
          description: 'List of configured mail accounts'
        },
        {
          uri: 'thunderbird://inbox/unread',
          name: 'Unread Messages',
          description: 'All unread messages'
        },
        // ... autres resources
      ]
    };
  });

  server.setRequestHandler('resources/read', async (request) => {
    const { uri } = request.params;

    // Parse URI and fetch data
    const data = await fetchResourceData(uri, nm);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data)
      }]
    };
  });
}
""")

Agent 14: Native Messaging Client
Task(subagent_type="backend-architect", prompt="""
Implementer client Native Messaging.

FICHIER: server/src/native-messaging/client.ts

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export class NativeMessagingClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();

  async connect(): Promise<void> {
    // Find native host executable
    const hostPath = this.findNativeHost();

    this.process = spawn(hostPath, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.process.stdout?.on('data', (data) => {
      this.handleMessage(data);
    });

    this.process.on('error', (error) => {
      logger.error('Native messaging error:', error);
      this.emit('error', error);
    });

    this.process.on('close', () => {
      logger.info('Native messaging closed');
      this.emit('close');
    });
  }

  async request(action: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();

      this.pendingRequests.set(id, { resolve, reject });

      const message = {
        id,
        type: 'request',
        payload: { action, params },
        timestamp: Date.now()
      };

      this.sendMessage(message);

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private sendMessage(message: unknown): void {
    if (!this.process?.stdin) return;

    const json = JSON.stringify(message);
    const length = Buffer.byteLength(json);
    const header = Buffer.alloc(4);
    header.writeUInt32LE(length, 0);

    this.process.stdin.write(header);
    this.process.stdin.write(json);
  }

  private handleMessage(data: Buffer): void {
    // Parse length-prefixed message
    const length = data.readUInt32LE(0);
    const json = data.subarray(4, 4 + length).toString();
    const message = JSON.parse(json);

    if (message.type === 'response') {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.payload.success) {
          pending.resolve(message.payload.data);
        } else {
          pending.reject(new Error(message.payload.error));
        }
      }
    }
  }

  private findNativeHost(): string {
    // Platform-specific paths
    // ...
  }
}
""")

└─────────────────────────────────────────────────────────────┘
WAIT: Tous modules serveur implementes

SEQUENTIAL: Tools Index
Task(subagent_type="backend-architect", prompt="""
Creer index tools.

FICHIER: server/src/tools/index.ts

import { registerMessageTools, messageTools } from './messages.js';
import { registerFolderTools, folderTools } from './folders.js';
import { registerContactTools, contactTools } from './contacts.js';
import { registerTagTools, tagTools } from './tags.js';

export function registerTools(server, nm) {
  // Register all tool handlers
  registerMessageTools(server, nm);
  registerFolderTools(server, nm);
  registerContactTools(server, nm);
  registerTagTools(server, nm);

  // Register tools/list handler
  server.setRequestHandler('tools/list', async () => ({
    tools: [
      ...messageTools,
      ...folderTools,
      ...contactTools,
      ...tagTools
    ]
  }));
}
""")

CHECKPOINT: npm run build success
```

### Phase 4: Native Messaging Configuration (SEQUENTIAL)

```
DEPENDS_ON: Extension + Server

Task(subagent_type="devops-architect", prompt="""
Configurer Native Messaging.

FICHIERS:

1. server/native-host.json (Linux/macOS)
{
  "name": "thunderbird_mcp",
  "description": "Thunderbird MCP Server Native Host",
  "path": "/usr/local/bin/thunderbird-mcp-host",
  "type": "stdio",
  "allowed_extensions": ["thunderbird-mcp@assistance-micro-design.com"]
}

2. scripts/install-native-host.sh
#!/bin/bash

# Detect OS
OS=$(uname -s)

# Set paths
if [ "$OS" = "Darwin" ]; then
  MANIFEST_DIR="$HOME/Library/Mozilla/NativeMessagingHosts"
elif [ "$OS" = "Linux" ]; then
  MANIFEST_DIR="$HOME/.mozilla/native-messaging-hosts"
fi

# Create directory
mkdir -p "$MANIFEST_DIR"

# Copy manifest
cp native-host.json "$MANIFEST_DIR/thunderbird_mcp.json"

# Make host executable
chmod +x /usr/local/bin/thunderbird-mcp-host

echo "Native messaging host installed"

3. scripts/install-native-host.ps1 (Windows)
# Windows installation script
""")

CHECKPOINT: Native Messaging configure
```

### Phase 5: Tests (PARALLEL puis SEQUENTIAL)

```
DEPENDS_ON: Implementation complete

┌─────────────────────────────────────────────────────────────┐
│ PARALLEL BATCH: UNIT TESTS                                  │
├─────────────────────────────────────────────────────────────┤

Agent 15: Tests Tools Messages
Task(subagent_type="quality-engineer", prompt="""
Ecrire tests unitaires tools messages.

FICHIER: server/tests/unit/tools/messages.test.ts

import { describe, it, expect, vi } from 'vitest';
// Tests complets
""")

Agent 16: Tests Tools Folders
[Tests folders]

Agent 17: Tests Tools Contacts
[Tests contacts]

Agent 18: Tests Native Messaging
[Tests NM client]

└─────────────────────────────────────────────────────────────┘
WAIT: Tests unitaires ecrits

SEQUENTIAL: Integration Tests
Task(subagent_type="quality-engineer", prompt="""
Ecrire tests integration.

FICHIER: server/tests/integration/mcp-server.test.ts

// Test cycle complet MCP
""")

RUN: npm test
GATE: Tests PASS requis
```

---

## Usage

```bash
# Implementation complete
/implement all

# Implementation ciblee
/implement types
/implement extension
/implement server

# Phase specifique
/implement all --phase=1  # MVP
/implement all --phase=2  # Contacts
/implement all --phase=3  # Calendar
```

---

## Checklist Completion

```
[ ] Types TypeScript compiles
[ ] Extension manifest valide
[ ] Extension APIs implementees
[ ] Server build success
[ ] Server tools implementes (47)
[ ] Server resources implementes (8)
[ ] Native Messaging configure
[ ] Tests unitaires passes
[ ] Tests integration passes
```
