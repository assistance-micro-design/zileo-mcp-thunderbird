/**
 * Error Handling Utilities
 * MCP error codes and error creation helpers
 * @module utils/errors
 */

import { JsonRpcErrorCode, McpErrorCode, JsonRpcError } from '../types/mcp.js';

/**
 * Create a JSON-RPC error object
 */
export function createJsonRpcError(
  code: JsonRpcErrorCode | McpErrorCode,
  message: string,
  data?: unknown
): JsonRpcError {
  const error: JsonRpcError = { code, message };
  if (data !== undefined) {
    error.data = data;
  }
  return error;
}

/**
 * Create a parse error (-32700)
 */
export function createParseError(details?: string): JsonRpcError {
  return createJsonRpcError(
    JsonRpcErrorCode.ParseError,
    'Parse error',
    details
  );
}

/**
 * Create an invalid request error (-32600)
 */
export function createInvalidRequestError(details?: string): JsonRpcError {
  return createJsonRpcError(
    JsonRpcErrorCode.InvalidRequest,
    'Invalid request',
    details
  );
}

/**
 * Create a method not found error (-32601)
 */
export function createMethodNotFoundError(method: string): JsonRpcError {
  return createJsonRpcError(
    JsonRpcErrorCode.MethodNotFound,
    'Method not found',
    { method }
  );
}

/**
 * Create an invalid params error (-32602)
 */
export function createInvalidParamsError(details: unknown): JsonRpcError {
  return createJsonRpcError(
    JsonRpcErrorCode.InvalidParams,
    'Invalid params',
    details
  );
}

/**
 * Create an internal error (-32603)
 */
export function createInternalError(message?: string, details?: unknown): JsonRpcError {
  return createJsonRpcError(
    JsonRpcErrorCode.InternalError,
    message || 'Internal error',
    details
  );
}

/**
 * Create a Thunderbird not running error (-32000)
 */
export function createThunderbirdNotRunningError(): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.ThunderbirdNotRunning,
    'Thunderbird is not running or extension is not connected'
  );
}

/**
 * Create an extension not installed error (-32001)
 */
export function createExtensionNotInstalledError(): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.ExtensionNotInstalled,
    'Thunderbird MCP extension is not installed'
  );
}

/**
 * Create a permission denied error (-32002)
 */
export function createPermissionDeniedError(permission: string): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.PermissionDenied,
    'Permission denied',
    { permission }
  );
}

/**
 * Create a resource not found error (-32003)
 */
export function createResourceNotFoundError(resource: string): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.ResourceNotFound,
    'Resource not found',
    { resource }
  );
}

/**
 * Create an operation timeout error (-32004)
 */
export function createOperationTimeoutError(operation: string, timeout: number): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.OperationTimeout,
    'Operation timeout',
    { operation, timeout }
  );
}

/**
 * Create a request cancelled error (-32800)
 */
export function createRequestCancelledError(reason?: string): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.RequestCancelled,
    'Request cancelled',
    reason
  );
}

/**
 * Create a content too large error (-32801)
 */
export function createContentTooLargeError(size: number, limit: number): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.ContentTooLarge,
    'Content too large',
    { size, limit }
  );
}

/**
 * Convert a native error to JSON-RPC error
 */
export function nativeErrorToJsonRpc(nativeError: unknown): JsonRpcError {
  if (typeof nativeError === 'object' && nativeError !== null) {
    const err = nativeError as Record<string, unknown>;

    // Check if it's a native messaging error
    if (err.code && typeof err.code === 'string') {
      const code = err.code as string;
      const message = (err.message as string) || 'Unknown error';

      // Map native error codes to JSON-RPC codes
      switch (code) {
        case 'NOT_CONNECTED':
        case 'CONNECTION_FAILED':
          return createThunderbirdNotRunningError();
        case 'PERMISSION_DENIED':
          return createPermissionDeniedError(message);
        case 'NOT_FOUND':
        case 'ACCOUNT_NOT_FOUND':
        case 'FOLDER_NOT_FOUND':
        case 'MESSAGE_NOT_FOUND':
        case 'CONTACT_NOT_FOUND':
        case 'CALENDAR_NOT_FOUND':
        case 'EVENT_NOT_FOUND':
        case 'TASK_NOT_FOUND':
          return createResourceNotFoundError(message);
        case 'TIMEOUT':
          return createOperationTimeoutError(message, 0);
        case 'INVALID_PARAMS':
          return createInvalidParamsError(err.details);
        default:
          return createInternalError(message, err.details);
      }
    }
  }

  // Default to internal error
  return createInternalError(
    nativeError instanceof Error ? nativeError.message : 'Unknown error',
    nativeError
  );
}

/**
 * Type guard for JSON-RPC errors
 */
export function isJsonRpcError(value: unknown): value is JsonRpcError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value
  );
}
