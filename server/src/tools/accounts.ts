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
    description: `List every email account configured in Thunderbird. This is the entry point for discovering accountId values used by other tools.

Example:
  Input: {}
  Output: { accounts: [{ id: "account1", name: "Personal", type: "imap",
            identities: [{ id: "id1", email: "user@example.com" }] }] }`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "thunderbird_accounts_get",
    description: `Get the full details of one configured account (server settings, folder hierarchy, identities).

Example:
  Input: { accountId: "account1" }
  Output: { id: "account1", name: "Personal", type: "imap",
           server: "imap.example.com", identities: [...], folders: [...] }

Note: accountId is obtained from thunderbird_accounts_list.`,
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
    description: `List every identity (sender address) declared for one account, including signatures and default flag.

Example:
  Input: { accountId: "account1" }
  Output: { identities: [{ id: "id1", email: "user@example.com",
           name: "Alice", isDefault: true, signature: "..." }] }

Note: accountId is obtained from thunderbird_accounts_list.`,
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string", description: "Account ID" },
      },
      required: ["accountId"],
    },
  },
];
