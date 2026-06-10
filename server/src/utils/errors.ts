/**
 * Error Handling Utilities
 * MCP error codes and error creation helpers
 * @module utils/errors
 */

import { JsonRpcErrorCode, McpErrorCode, JsonRpcError } from "../types/mcp.js";

/**
 * Create a JSON-RPC error object
 */
export function createJsonRpcError(
  code: JsonRpcErrorCode | McpErrorCode,
  message: string,
  data?: unknown,
): JsonRpcError {
  const error: JsonRpcError = { code, message };
  if (data !== undefined) {
    error.data = data;
  }
  return error;
}

/**
 * Create an invalid params error (-32602)
 */
export function createInvalidParamsError(details: unknown): JsonRpcError {
  return createJsonRpcError(
    JsonRpcErrorCode.InvalidParams,
    "Invalid params",
    details,
  );
}

/**
 * Create an internal error (-32603)
 */
export function createInternalError(
  message?: string,
  details?: unknown,
): JsonRpcError {
  return createJsonRpcError(
    JsonRpcErrorCode.InternalError,
    message || "Internal error",
    details,
  );
}

/**
 * Create a Thunderbird not running error (-32000)
 */
export function createThunderbirdNotRunningError(): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.ThunderbirdNotRunning,
    "Thunderbird is not running or extension is not connected",
  );
}

/**
 * Create a permission denied error (-32002)
 */
export function createPermissionDeniedError(permission: string): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.PermissionDenied,
    "Permission denied",
    { permission },
  );
}

/**
 * Create a resource not found error (-32003)
 */
export function createResourceNotFoundError(resource: string): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.ResourceNotFound,
    "Resource not found",
    { resource },
  );
}

/**
 * Create an operation timeout error (-32004)
 */
export function createOperationTimeoutError(
  operation: string,
  timeout: number,
): JsonRpcError {
  return createJsonRpcError(
    McpErrorCode.OperationTimeout,
    "Operation timeout",
    { operation, timeout },
  );
}

/**
 * Error thrown when a bridge request times out.
 * Carries the native code "TIMEOUT" so nativeErrorToJsonRpc() maps it to
 * McpErrorCode.OperationTimeout (-32004), and exposes the typed JSON-RPC
 * error built by createOperationTimeoutError().
 */
export class OperationTimeoutError extends Error {
  /** Native error code recognized by nativeErrorToJsonRpc() */
  readonly code = "TIMEOUT";
  /** Typed JSON-RPC error (-32004) for this timeout */
  readonly jsonRpc: JsonRpcError;

  constructor(operation: string, timeoutMs: number) {
    super(`Request timeout: ${operation} (${timeoutMs}ms)`);
    this.name = "OperationTimeoutError";
    this.jsonRpc = createOperationTimeoutError(operation, timeoutMs);
  }
}

/**
 * Convert a native error to JSON-RPC error
 */
export function nativeErrorToJsonRpc(nativeError: unknown): JsonRpcError {
  if (typeof nativeError === "object" && nativeError !== null) {
    const err = nativeError as Record<string, unknown>;

    // Check if it's a native messaging error
    if (err.code && typeof err.code === "string") {
      const code = err.code as string;
      const message = (err.message as string) || "Unknown error";

      // Map native error codes to JSON-RPC codes
      switch (code) {
        case "NOT_CONNECTED":
        case "CONNECTION_FAILED":
          return createThunderbirdNotRunningError();
        case "PERMISSION_DENIED":
          return createPermissionDeniedError(message);
        case "NOT_FOUND":
        case "ACCOUNT_NOT_FOUND":
        case "FOLDER_NOT_FOUND":
        case "MESSAGE_NOT_FOUND":
        case "CONTACT_NOT_FOUND":
        case "CALENDAR_NOT_FOUND":
        case "EVENT_NOT_FOUND":
        case "TASK_NOT_FOUND":
          return createResourceNotFoundError(message);
        case "TIMEOUT":
          return createOperationTimeoutError(message, 0);
        case "INVALID_PARAMS":
          return createInvalidParamsError(err.details);
        default:
          return createInternalError(message, err.details);
      }
    }
  }

  // Default to internal error (no leak of full error object or stack trace)
  return createInternalError(
    nativeError instanceof Error ? nativeError.message : "Unknown error",
  );
}
