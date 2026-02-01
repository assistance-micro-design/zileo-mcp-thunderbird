/**
 * Account Tool Handlers
 * MCP tools for account and identity operations
 * @module tools/accounts
 */

import { z } from "zod";
import { getNativeClient } from "../websocket/client-adapter.js";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";
import logger from "../utils/logger.js";
import { nativeErrorToJsonRpc } from "../utils/errors.js";

// =============================================================================
// Schemas
// =============================================================================

const accountsListSchema = z.object({});

const accountsGetSchema = z.object({
  accountId: z.string(),
});

const identitiesListSchema = z.object({
  accountId: z.string(),
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List all accounts
 */
export async function handleAccountsList(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    accountsListSchema.parse(args);
    const client = getNativeClient();

    logger.info("Listing accounts");

    const response = await client.sendRequest(MessageActions.ACCOUNTS_LIST, {});

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleAccountsList:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Get account details
 */
export async function handleAccountsGet(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = accountsGetSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Getting account: ${params.accountId}`);

    const response = await client.sendRequest(
      MessageActions.ACCOUNTS_GET,
      params,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleAccountsGet:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * List identities for an account
 */
export async function handleIdentitiesList(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = identitiesListSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Listing identities for account: ${params.accountId}`);

    const response = await client.sendRequest(
      MessageActions.IDENTITIES_LIST,
      params,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleIdentitiesList:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const accountTools: McpTool[] = [
  {
    name: "thunderbird_accounts_list",
    description: "List all configured email accounts",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "thunderbird_accounts_get",
    description: "Get detailed information about a specific account",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string", description: "Account ID" },
      },
      required: ["accountId"],
    },
  },
  {
    name: "thunderbird_identities_list",
    description: "List all identities (sender addresses) for an account",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string", description: "Account ID" },
      },
      required: ["accountId"],
    },
  },
];
