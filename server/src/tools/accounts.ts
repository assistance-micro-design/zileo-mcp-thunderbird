/**
 * Account Tool Handlers
 * MCP tools for account and identity operations
 * @module tools/accounts
 */

import { z } from "zod";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";
import { executeToolHandler } from "./tool-handler.js";

// =============================================================================
// Schemas
// =============================================================================

const accountsListSchema = z.object({});

const accountsGetSchema = z.object({
  accountId: z.string().max(200),
});

const identitiesListSchema = z.object({
  accountId: z.string().max(200),
});

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handleAccountsList(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    accountsListSchema,
    MessageActions.ACCOUNTS_LIST,
    "handleAccountsList",
  );
}

export async function handleAccountsGet(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    accountsGetSchema,
    MessageActions.ACCOUNTS_GET,
    "handleAccountsGet",
  );
}

export async function handleIdentitiesList(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    identitiesListSchema,
    MessageActions.IDENTITIES_LIST,
    "handleIdentitiesList",
  );
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
