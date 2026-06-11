/*
 * Copyright 2025-2026 Assistance Micro Design
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * MCP Types
 * Project-local MCP/JSON-RPC types actually consumed by the server code.
 *
 * Audit 2026-06-10: this file used to mirror most of the MCP SDK type
 * surface (41 exports, 33 unused). The unused duplicates were removed —
 * for protocol-level types beyond these, import from
 * "@modelcontextprotocol/sdk/types.js" instead of re-declaring them here.
 * @module types/mcp
 */

// =============================================================================
// JSON-RPC Error Types
// =============================================================================

/** JSON-RPC 2.0 error object */
export interface JsonRpcError {
  /** Error code */
  code: number;
  /** Error message */
  message: string;
  /** Additional error data */
  data?: unknown;
}

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
// Tool Types
// =============================================================================

/** JSON Schema subset used by tool input schemas */
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

/** Text content */
export interface TextContent {
  type: "text";
  text: string;
}

/** Image content */
export interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

/** Resource content */
export interface ResourceContent {
  type: "resource";
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
  /** Index signature for SDK compatibility */
  [key: string]: unknown;
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
