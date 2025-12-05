/**
 * MCP Protocol Types
 * Types for Model Context Protocol (JSON-RPC 2.0)
 * @module types/mcp
 */

// =============================================================================
// JSON-RPC 2.0 Base Types
// =============================================================================

/** JSON-RPC request ID */
export type JsonRpcId = string | number;

/** JSON-RPC 2.0 request */
export interface JsonRpcRequest {
  /** JSON-RPC version (always "2.0") */
  jsonrpc: '2.0';
  /** Request ID (must be present for requests, absent for notifications) */
  id?: JsonRpcId;
  /** Method name */
  method: string;
  /** Method parameters */
  params?: Record<string, unknown>;
}

/** JSON-RPC 2.0 success response */
export interface JsonRpcSuccessResponse {
  /** JSON-RPC version (always "2.0") */
  jsonrpc: '2.0';
  /** Request ID (same as request) */
  id: JsonRpcId;
  /** Result data */
  result: unknown;
}

/** JSON-RPC 2.0 error object */
export interface JsonRpcError {
  /** Error code */
  code: number;
  /** Error message */
  message: string;
  /** Additional error data */
  data?: unknown;
}

/** JSON-RPC 2.0 error response */
export interface JsonRpcErrorResponse {
  /** JSON-RPC version (always "2.0") */
  jsonrpc: '2.0';
  /** Request ID (same as request) */
  id: JsonRpcId | null;
  /** Error details */
  error: JsonRpcError;
}

/** JSON-RPC response (success or error) */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

// =============================================================================
// JSON-RPC Error Codes
// =============================================================================

/** Standard JSON-RPC 2.0 error codes */
export enum JsonRpcErrorCode {
  /** Parse error - Invalid JSON */
  ParseError = -32700,
  /** Invalid Request - Not a valid JSON-RPC request */
  InvalidRequest = -32600,
  /** Method not found */
  MethodNotFound = -32601,
  /** Invalid params */
  InvalidParams = -32602,
  /** Internal error */
  InternalError = -32603,
}

/** MCP-specific error codes */
export enum McpErrorCode {
  /** Thunderbird not running */
  ThunderbirdNotRunning = -32000,
  /** Extension not installed */
  ExtensionNotInstalled = -32001,
  /** Permission denied */
  PermissionDenied = -32002,
  /** Resource not found */
  ResourceNotFound = -32003,
  /** Operation timeout */
  OperationTimeout = -32004,
  /** Request cancelled */
  RequestCancelled = -32800,
  /** Content too large */
  ContentTooLarge = -32801,
}

// =============================================================================
// MCP Protocol Types
// =============================================================================

/** MCP server info */
export interface McpServerInfo {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
}

/** MCP client info */
export interface McpClientInfo {
  /** Client name */
  name: string;
  /** Client version */
  version: string;
}

/** MCP server capabilities */
export interface McpServerCapabilities {
  /** Tool capabilities */
  tools?: {
    /** Whether tool list can change */
    listChanged?: boolean;
  };
  /** Resource capabilities */
  resources?: {
    /** Whether resources support subscription */
    subscribe?: boolean;
    /** Whether resource list can change */
    listChanged?: boolean;
  };
  /** Prompt capabilities */
  prompts?: {
    /** Whether prompt list can change */
    listChanged?: boolean;
  };
}

/** MCP client capabilities */
export interface McpClientCapabilities {
  /** Sampling capabilities */
  sampling?: Record<string, unknown>;
}

/** Initialize request params */
export interface InitializeParams {
  /** Protocol version */
  protocolVersion: string;
  /** Client capabilities */
  capabilities: McpClientCapabilities;
  /** Client info */
  clientInfo: McpClientInfo;
}

/** Initialize response */
export interface InitializeResult {
  /** Protocol version */
  protocolVersion: string;
  /** Server capabilities */
  capabilities: McpServerCapabilities;
  /** Server info */
  serverInfo: McpServerInfo;
}

// =============================================================================
// Tool Types
// =============================================================================

/** JSON Schema type */
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  enum?: unknown[];
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
}

/** MCP tool definition */
export interface McpTool {
  /** Tool name (unique identifier) */
  name: string;
  /** Tool description */
  description: string;
  /** Input parameter schema */
  inputSchema: JsonSchema;
}

/** Tools list response */
export interface ToolsListResult {
  /** Available tools */
  tools: McpTool[];
}

/** Tool call params */
export interface ToolCallParams {
  /** Tool name */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
}

/** Content types */
export type ContentType = 'text' | 'image' | 'resource';

/** Text content */
export interface TextContent {
  type: 'text';
  text: string;
}

/** Image content */
export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

/** Resource content */
export interface ResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    text?: string;
    blob?: string;
    mimeType?: string;
  };
}

/** Tool call result content */
export type ToolResultContent = TextContent | ImageContent | ResourceContent;

/** Tool call result */
export interface ToolCallResult {
  /** Result content */
  content: ToolResultContent[];
  /** Whether this is an error result */
  isError?: boolean;
}

// =============================================================================
// Resource Types
// =============================================================================

/** MCP resource definition */
export interface McpResource {
  /** Resource URI */
  uri: string;
  /** Resource name */
  name: string;
  /** Resource description */
  description?: string;
  /** MIME type */
  mimeType?: string;
}

/** MCP resource template */
export interface McpResourceTemplate {
  /** URI template */
  uriTemplate: string;
  /** Resource name */
  name: string;
  /** Resource description */
  description?: string;
  /** MIME type */
  mimeType?: string;
}

/** Resources list response */
export interface ResourcesListResult {
  /** Available resources */
  resources: McpResource[];
  /** Resource templates */
  resourceTemplates?: McpResourceTemplate[];
}

/** Resource read params */
export interface ResourceReadParams {
  /** Resource URI */
  uri: string;
}

/** Resource contents item */
export interface ResourceContentsItem {
  /** Resource URI */
  uri: string;
  /** MIME type */
  mimeType?: string;
  /** Text content */
  text?: string;
  /** Binary content (base64) */
  blob?: string;
}

/** Resource read result */
export interface ResourceReadResult {
  /** Resource contents */
  contents: ResourceContentsItem[];
}

// =============================================================================
// Prompt Types
// =============================================================================

/** Prompt argument definition */
export interface PromptArgument {
  /** Argument name */
  name: string;
  /** Argument description */
  description?: string;
  /** Whether argument is required */
  required?: boolean;
}

/** MCP prompt definition */
export interface McpPrompt {
  /** Prompt name */
  name: string;
  /** Prompt description */
  description?: string;
  /** Prompt arguments */
  arguments?: PromptArgument[];
}

/** Prompts list response */
export interface PromptsListResult {
  /** Available prompts */
  prompts: McpPrompt[];
}

/** Prompt get params */
export interface PromptGetParams {
  /** Prompt name */
  name: string;
  /** Prompt arguments */
  arguments?: Record<string, string>;
}

/** Prompt message role */
export type PromptMessageRole = 'user' | 'assistant';

/** Prompt message content */
export interface PromptMessageContent {
  type: 'text';
  text: string;
}

/** Prompt message */
export interface PromptMessage {
  /** Message role */
  role: PromptMessageRole;
  /** Message content */
  content: PromptMessageContent;
}

/** Prompt get result */
export interface PromptGetResult {
  /** Prompt messages */
  messages: PromptMessage[];
  /** Description (optional) */
  description?: string;
}

// =============================================================================
// Notification Types
// =============================================================================

/** MCP notification (no id, no response expected) */
export interface McpNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

/** Notifications */
export const McpNotifications = {
  /** Client has been initialized */
  INITIALIZED: 'notifications/initialized',
  /** Tools list has changed */
  TOOLS_LIST_CHANGED: 'notifications/tools/listChanged',
  /** Resources list has changed */
  RESOURCES_LIST_CHANGED: 'notifications/resources/listChanged',
  /** Prompts list has changed */
  PROMPTS_LIST_CHANGED: 'notifications/prompts/listChanged',
} as const;

/** MCP methods */
export const McpMethods = {
  /** Initialize connection */
  INITIALIZE: 'initialize',
  /** List available tools */
  TOOLS_LIST: 'tools/list',
  /** Call a tool */
  TOOLS_CALL: 'tools/call',
  /** List available resources */
  RESOURCES_LIST: 'resources/list',
  /** Read a resource */
  RESOURCES_READ: 'resources/read',
  /** List available prompts */
  PROMPTS_LIST: 'prompts/list',
  /** Get a prompt */
  PROMPTS_GET: 'prompts/get',
  /** Ping (health check) */
  PING: 'ping',
} as const;

// =============================================================================
// Export All Types
// =============================================================================

export type {
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcSuccessResponse,
  JsonRpcError,
  JsonRpcErrorResponse,
  JsonRpcResponse,
  McpServerInfo,
  McpClientInfo,
  McpServerCapabilities,
  McpClientCapabilities,
  InitializeParams,
  InitializeResult,
  JsonSchema,
  McpTool,
  ToolsListResult,
  ToolCallParams,
  TextContent,
  ImageContent,
  ResourceContent,
  ToolResultContent,
  ToolCallResult,
  McpResource,
  McpResourceTemplate,
  ResourcesListResult,
  ResourceReadParams,
  ResourceContentsItem,
  ResourceReadResult,
  PromptArgument,
  McpPrompt,
  PromptsListResult,
  PromptGetParams,
  PromptMessageRole,
  PromptMessageContent,
  PromptMessage,
  PromptGetResult,
  McpNotification,
};
