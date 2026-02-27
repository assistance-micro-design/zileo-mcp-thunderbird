/**
 * Shared Tool Handler Utility
 * Eliminates boilerplate across all standard tool handlers
 * @module tools/tool-handler
 */

import type { ZodType } from "zod";
import { getNativeClient } from "../websocket/client-adapter.js";
import { nativeErrorToJsonRpc } from "../utils/errors.js";
import logger from "../utils/logger.js";
import type { ToolCallResult } from "../types/mcp.js";

/**
 * Options for customizing handler behavior
 */
interface ExecuteToolHandlerOptions {
  /** Transform parsed params before sending to the bridge */
  transformParams?: (parsed: Record<string, unknown>) => Record<string, unknown>;
  /** Transform response data before returning to the client */
  transformResponse?: (data: unknown) => unknown;
}

/**
 * Execute a standard tool handler with shared boilerplate:
 * 1. Parse args with zod schema
 * 2. Get native client
 * 3. Send request to Thunderbird extension
 * 4. Check response.success
 * 5. Format and return JSON response
 * 6. Catch and wrap all errors
 *
 * @param args - Raw tool arguments from MCP client
 * @param schema - Zod schema for input validation
 * @param action - MessageActions action string
 * @param handlerName - Handler function name (for logging)
 * @param options - Optional transform functions
 */
export async function executeToolHandler(
  args: unknown,
  schema: ZodType,
  action: string,
  handlerName: string,
  options?: ExecuteToolHandlerOptions,
): Promise<ToolCallResult> {
  try {
    const parsed = schema.parse(args) as Record<string, unknown>;
    const client = getNativeClient();

    const params = options?.transformParams
      ? options.transformParams(parsed)
      : parsed;

    const response = await client.sendRequest(action, params);

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    const data = options?.transformResponse
      ? options.transformResponse(response.data)
      : response.data;

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    logger.error(`Error in ${handlerName}:`, error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}
