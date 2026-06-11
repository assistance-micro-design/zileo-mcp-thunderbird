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
 * Shared Tool Handler Utility
 * Eliminates boilerplate across all standard tool handlers
 * @module tools/tool-handler
 */

import { z } from "zod";
import type { ZodType } from "zod";
import { getBridgeClient } from "../websocket/client-adapter.js";
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
  /**
   * Pick the bridge action dynamically based on parsed params.
   * When provided, takes precedence over the static `action` argument.
   */
  resolveAction?: (parsed: Record<string, unknown>) => string;
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
 * @param action - MessageActions action string (default if no resolveAction)
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
    const client = getBridgeClient();

    const params = options?.transformParams
      ? options.transformParams(parsed)
      : parsed;

    const resolvedAction = options?.resolveAction
      ? options.resolveAction(parsed)
      : action;

    const response = await client.sendRequest(resolvedAction, params);

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
    // Zod validation errors are client-input errors, not server errors:
    // log at debug level to avoid stderr noise on legitimate client mistakes.
    if (error instanceof z.ZodError) {
      logger.debug(`Validation error in ${handlerName}`, {
        issues: error.issues,
      });
    } else {
      logger.error(`Error in ${handlerName}:`, error);
    }
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}
