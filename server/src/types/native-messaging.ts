/**
 * Native Messaging Types
 * Types for communication between MCP Server and Thunderbird Extension
 * @module types/native-messaging
 */

// =============================================================================
// Message Types
// =============================================================================

/** Native messaging message types */
export type NativeMessageType =
  | 'request'
  | 'response'
  | 'error'
  | 'notification';

/** Base native message structure */
export interface NativeMessageBase {
  /** Message type */
  type: NativeMessageType;
  /** Unique message ID for request/response correlation */
  id: string;
  /** Timestamp (ISO 8601) */
  timestamp: string;
}

/** Native messaging request */
export interface NativeRequest extends NativeMessageBase {
  type: 'request';
  /** Action to perform */
  action: string;
  /** Action parameters */
  params: Record<string, unknown>;
}

/** Native messaging response */
export interface NativeResponse extends NativeMessageBase {
  type: 'response';
  /** Whether operation was successful */
  success: boolean;
  /** Result data (on success) */
  data?: unknown;
  /** Error details (on failure) */
  error?: NativeError;
}

/** Native messaging error */
export interface NativeError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Additional error details */
  details?: unknown;
}

/** Native messaging notification (one-way, no response expected) */
export interface NativeNotification extends NativeMessageBase {
  type: 'notification';
  /** Notification event name */
  event: string;
  /** Event data */
  data: unknown;
}

/** Union of all native message types */
export type NativeMessage = NativeRequest | NativeResponse | NativeNotification;

// =============================================================================
// Action Types (Server -> Extension)
// =============================================================================

/** Message actions */
export const MessageActions = {
  // Messages
  MESSAGES_SEARCH: 'messages.search',
  MESSAGES_LIST: 'messages.list',
  MESSAGES_GET: 'messages.get',
  MESSAGES_GET_FULL: 'messages.getFull',
  MESSAGES_GET_RAW: 'messages.getRaw',
  MESSAGES_UPDATE: 'messages.update',
  MESSAGES_MOVE: 'messages.move',
  MESSAGES_COPY: 'messages.copy',
  MESSAGES_DELETE: 'messages.delete',
  MESSAGES_ARCHIVE: 'messages.archive',
  MESSAGES_LIST_ATTACHMENTS: 'messages.listAttachments',

  // Folders
  FOLDERS_LIST: 'folders.list',
  FOLDERS_GET: 'folders.get',
  FOLDERS_CREATE: 'folders.create',
  FOLDERS_RENAME: 'folders.rename',
  FOLDERS_DELETE: 'folders.delete',
  FOLDERS_MOVE: 'folders.move',
  FOLDERS_MARK_READ: 'folders.markAsRead',

  // Tags
  TAGS_LIST: 'tags.list',
  TAGS_CREATE: 'tags.create',
  TAGS_UPDATE: 'tags.update',
  TAGS_DELETE: 'tags.delete',

  // Accounts
  ACCOUNTS_LIST: 'accounts.list',
  ACCOUNTS_GET: 'accounts.get',
  IDENTITIES_LIST: 'identities.list',

  // Address Books & Contacts
  ADDRESSBOOKS_LIST: 'addressBooks.list',
  ADDRESSBOOKS_GET: 'addressBooks.get',
  ADDRESSBOOKS_CREATE: 'addressBooks.create',
  ADDRESSBOOKS_DELETE: 'addressBooks.delete',
  CONTACTS_LIST: 'contacts.list',
  CONTACTS_SEARCH: 'contacts.search',
  CONTACTS_GET: 'contacts.get',
  CONTACTS_CREATE: 'contacts.create',
  CONTACTS_UPDATE: 'contacts.update',
  CONTACTS_DELETE: 'contacts.delete',

  // Calendar (Experimental)
  CALENDARS_LIST: 'calendars.list',
  CALENDARS_GET: 'calendars.get',
  EVENTS_LIST: 'events.list',
  EVENTS_SEARCH: 'events.search',
  EVENTS_GET: 'events.get',
  EVENTS_CREATE: 'events.create',
  EVENTS_UPDATE: 'events.update',
  EVENTS_MOVE: 'events.move',
  EVENTS_DELETE: 'events.delete',

  // Tasks (Experimental)
  TASKS_LIST: 'tasks.list',
  TASKS_GET: 'tasks.get',
  TASKS_CREATE: 'tasks.create',
  TASKS_UPDATE: 'tasks.update',
  TASKS_DELETE: 'tasks.delete',
  TASKS_COMPLETE: 'tasks.complete',

  // System
  PING: 'ping',
  GET_VERSION: 'getVersion',
} as const;

export type MessageAction = typeof MessageActions[keyof typeof MessageActions];

// =============================================================================
// Notification Events (Extension -> Server)
// =============================================================================

/** Notification event types */
export const NotificationEvents = {
  // Messages
  MESSAGE_CREATED: 'message.created',
  MESSAGE_UPDATED: 'message.updated',
  MESSAGE_DELETED: 'message.deleted',
  MESSAGE_MOVED: 'message.moved',
  NEW_MAIL_RECEIVED: 'newMail.received',

  // Folders
  FOLDER_CREATED: 'folder.created',
  FOLDER_RENAMED: 'folder.renamed',
  FOLDER_DELETED: 'folder.deleted',
  FOLDER_MOVED: 'folder.moved',

  // Contacts
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',
  CONTACT_DELETED: 'contact.deleted',

  // Calendar
  EVENT_CREATED: 'event.created',
  EVENT_UPDATED: 'event.updated',
  EVENT_DELETED: 'event.deleted',

  // Tasks
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELETED: 'task.deleted',
  TASK_COMPLETED: 'task.completed',

  // Connection
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;

export type NotificationEvent = typeof NotificationEvents[keyof typeof NotificationEvents];

// =============================================================================
// Error Codes
// =============================================================================

/** Native messaging error codes */
export const NativeErrorCodes = {
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_ACTION: 'INVALID_ACTION',
  INVALID_PARAMS: 'INVALID_PARAMS',
  TIMEOUT: 'TIMEOUT',

  // Connection errors
  NOT_CONNECTED: 'NOT_CONNECTED',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_CLOSED: 'CONNECTION_CLOSED',

  // Permission errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  FOLDER_NOT_FOUND: 'FOLDER_NOT_FOUND',
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
  CALENDAR_NOT_FOUND: 'CALENDAR_NOT_FOUND',
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',

  // Operation errors
  OPERATION_FAILED: 'OPERATION_FAILED',
  READ_ONLY: 'READ_ONLY',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INVALID_FOLDER: 'INVALID_FOLDER',
  INVALID_MESSAGE: 'INVALID_MESSAGE',

  // Calendar errors
  CALENDAR_NOT_AVAILABLE: 'CALENDAR_NOT_AVAILABLE',
  EXPERIMENTAL_API_UNAVAILABLE: 'EXPERIMENTAL_API_UNAVAILABLE',
} as const;

export type NativeErrorCode = typeof NativeErrorCodes[keyof typeof NativeErrorCodes];

// =============================================================================
// Protocol Types
// =============================================================================

/** Native messaging host manifest */
export interface NativeHostManifest {
  /** Application name (used in connectNative) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Absolute path to executable */
  path: string;
  /** Connection type (always "stdio") */
  type: 'stdio';
  /** List of allowed extension IDs */
  allowed_extensions: string[];
}

/** Connection options */
export interface ConnectionOptions {
  /** Timeout for operations (ms) */
  timeout?: number;
  /** Reconnection attempts */
  maxRetries?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
}

/** Connection state */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Connection status */
export interface ConnectionStatus {
  /** Current state */
  state: ConnectionState;
  /** Error message if state is 'error' */
  error?: string;
  /** Extension version */
  extensionVersion?: string;
  /** Thunderbird version */
  thunderbirdVersion?: string;
  /** Connected timestamp */
  connectedAt?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/** Create a unique message ID */
export function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Create a native request */
export function createRequest(
  action: MessageAction,
  params: Record<string, unknown> = {}
): NativeRequest {
  return {
    type: 'request',
    id: createMessageId(),
    timestamp: new Date().toISOString(),
    action,
    params,
  };
}

/** Create a native response */
export function createResponse(
  requestId: string,
  success: boolean,
  data?: unknown,
  error?: NativeError
): NativeResponse {
  return {
    type: 'response',
    id: requestId,
    timestamp: new Date().toISOString(),
    success,
    data,
    error,
  };
}

/** Create a native notification */
export function createNotification(
  event: NotificationEvent,
  data: unknown
): NativeNotification {
  return {
    type: 'notification',
    id: createMessageId(),
    timestamp: new Date().toISOString(),
    event,
    data,
  };
}

/** Create a native error */
export function createError(
  code: NativeErrorCode,
  message: string,
  details?: unknown
): NativeError {
  return {
    code,
    message,
    details,
  };
}

