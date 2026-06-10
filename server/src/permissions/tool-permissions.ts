/**
 * Tool Authorization Tiers
 * SEC-AUTH-001, SEC-AUTH-002: Classifies MCP tools by risk level
 * and controls access based on user-defined permissions.
 * @module tools/tool-permissions
 */

import logger from "../utils/logger.js";
import { createPermissionDeniedError } from "../utils/errors.js";
import type { ToolCallResult } from "../types/mcp.js";

/**
 * Tool risk tiers:
 * - read: Safe, read-only operations (list, get, search)
 * - modify: Operations that change data but are recoverable (create, update, move, copy)
 * - destructive: Irreversible operations (delete, send)
 */
export type ToolTier = "read" | "modify" | "destructive";

/**
 * Classification of all 56 MCP tools by risk tier.
 * Maintained in sync with tools/index.ts.
 */
export const TOOL_TIERS: Record<string, ToolTier> = {
  // Messages (10 tools)
  thunderbird_messages_search: "read",
  thunderbird_messages_list: "read",
  thunderbird_messages_list_unread: "read",
  thunderbird_messages_list_recent: "read",
  thunderbird_messages_get: "read",
  thunderbird_messages_move: "modify",
  thunderbird_messages_copy: "modify",
  thunderbird_messages_update: "modify",
  thunderbird_messages_archive: "modify",
  thunderbird_messages_delete: "destructive",

  // Folders (7 tools)
  thunderbird_folders_list: "read",
  thunderbird_folders_get: "read",
  thunderbird_folders_create: "modify",
  thunderbird_folders_rename: "modify",
  thunderbird_folders_move: "modify",
  thunderbird_folders_mark_read: "modify",
  thunderbird_folders_delete: "destructive",

  // Contacts (9 tools)
  thunderbird_contacts_search: "read",
  thunderbird_contacts_list: "read",
  thunderbird_contacts_get: "read",
  thunderbird_contacts_create: "modify",
  thunderbird_contacts_update: "modify",
  thunderbird_contacts_delete: "destructive",
  thunderbird_addressbooks_list: "read",
  thunderbird_addressbooks_create: "modify",
  thunderbird_addressbooks_delete: "destructive",

  // Tags (4 tools)
  thunderbird_tags_list: "read",
  thunderbird_tags_create: "modify",
  thunderbird_tags_update: "modify",
  thunderbird_tags_delete: "destructive",

  // Accounts (3 tools)
  thunderbird_accounts_list: "read",
  thunderbird_accounts_get: "read",
  thunderbird_identities_list: "read",

  // Calendar (9 tools)
  thunderbird_calendars_list: "read",
  thunderbird_calendars_get: "read",
  thunderbird_events_search: "read",
  thunderbird_events_list: "read",
  thunderbird_events_get: "read",
  thunderbird_events_create: "modify",
  thunderbird_events_update: "modify",
  thunderbird_events_move: "modify",
  thunderbird_events_delete: "destructive",

  // Tasks (6 tools)
  thunderbird_tasks_list: "read",
  thunderbird_tasks_get: "read",
  thunderbird_tasks_create: "modify",
  thunderbird_tasks_update: "modify",
  thunderbird_tasks_complete: "modify",
  thunderbird_tasks_delete: "destructive",

  // Compose (8 tools)
  thunderbird_compose_begin_new: "modify",
  thunderbird_compose_begin_reply: "modify",
  thunderbird_compose_begin_forward: "modify",
  thunderbird_compose_get_details: "read",
  thunderbird_compose_set_details: "modify",
  thunderbird_compose_save_draft: "modify",
  thunderbird_compose_save_template: "modify",
  thunderbird_compose_send: "destructive",
};

/**
 * Maps native WebSocket action names to their parent MCP tool names.
 * Some native actions (e.g. "messages.getFull") are sub-actions of a single MCP tool
 * (e.g. "thunderbird_messages_get"), and some use camelCase that doesn't match
 * the snake_case MCP tool names (e.g. "compose.beginForward" → "thunderbird_compose_begin_forward").
 *
 * Actions not listed here use the default conversion: thunderbird_{action with . replaced by _}
 * System actions (ping, getVersion) are allowed unconditionally by the bridge.
 */
export const NATIVE_ACTION_TO_MCP_TOOL: Record<string, string> = {
  // Sub-actions of thunderbird_messages_get
  "messages.getFull": "thunderbird_messages_get",
  "messages.getRaw": "thunderbird_messages_get",
  "messages.listAttachments": "thunderbird_messages_get",

  // camelCase → snake_case mismatches
  "folders.markAsRead": "thunderbird_folders_mark_read",
  "addressBooks.list": "thunderbird_addressbooks_list",
  "addressBooks.get": "thunderbird_addressbooks_list",
  "addressBooks.create": "thunderbird_addressbooks_create",
  "addressBooks.delete": "thunderbird_addressbooks_delete",
  "compose.beginNew": "thunderbird_compose_begin_new",
  "compose.beginReply": "thunderbird_compose_begin_reply",
  "compose.beginForward": "thunderbird_compose_begin_forward",
  "compose.getDetails": "thunderbird_compose_get_details",
  "compose.setDetails": "thunderbird_compose_set_details",
  "compose.saveDraft": "thunderbird_compose_save_draft",
  "compose.saveTemplate": "thunderbird_compose_save_template",
};

/** System actions that bypass permission checks (not MCP tools). */
export const SYSTEM_ACTIONS = new Set(["ping", "getVersion"]);

/**
 * Resolves a native WebSocket action to its MCP tool name for permission lookup.
 * @param action - The native action (e.g. "messages.getFull", "compose.beginForward")
 * @returns The MCP tool name, or undefined for system actions
 */
export function resolveActionToMcpTool(action: string): string | undefined {
  if (SYSTEM_ACTIONS.has(action)) {
    return undefined;
  }
  return (
    NATIVE_ACTION_TO_MCP_TOOL[action] ??
    `thunderbird_${action.replace(/\./g, "_")}`
  );
}

/**
 * Returns the tier for a tool, or undefined if the tool is not classified.
 * @param toolName - The MCP tool name
 * @returns The tier or undefined
 */
export function getToolTier(toolName: string): ToolTier | undefined {
  return TOOL_TIERS[toolName];
}

/**
 * Returns the default permission set: read + modify enabled, destructive disabled.
 * @returns A map of tool name to allowed boolean
 */
export function getDefaultPermissions(): Record<string, boolean> {
  const permissions: Record<string, boolean> = {};
  for (const [toolName, tier] of Object.entries(TOOL_TIERS)) {
    permissions[toolName] = tier !== "destructive";
  }
  return permissions;
}

/**
 * Builds the standard denial result for a tools/call rejected by permissions.
 * Wraps the typed JSON-RPC permission error (-32002) from utils/errors.ts so
 * every denial carries the same code instead of an ad hoc message.
 *
 * @param toolName - The denied MCP tool name
 * @returns A ToolCallResult with isError: true and the -32002 code
 */
export function buildToolDeniedResult(toolName: string): ToolCallResult {
  const tier = getToolTier(toolName) || "unknown";
  const denied = createPermissionDeniedError(toolName);
  return {
    content: [
      {
        type: "text",
        text: `Error ${denied.code}: ${denied.message} — Tool "${toolName}" is disabled (tier: ${tier}). Enable it in the Thunderbird extension options (Add-ons Manager > Thunderbird MCP Server > Options).`,
      },
    ],
    isError: true,
  };
}

/**
 * Checks whether a tool is allowed given a permissions map.
 * - If the tool is not in TOOL_TIERS, it is denied (unknown tool).
 * - If the tool has an explicit entry in permissions, that value is used.
 * - Otherwise, falls back to the default for the tool's tier.
 *
 * @param toolName - The MCP tool name
 * @param permissions - User-defined permission overrides
 * @returns true if the tool is allowed
 */
export function isToolAllowed(
  toolName: string,
  permissions: Record<string, boolean>,
): boolean {
  const tier = TOOL_TIERS[toolName];
  if (!tier) {
    logger.warn(`Permission denied: unknown tool "${toolName}"`);
    return false;
  }

  if (toolName in permissions) {
    const allowed = permissions[toolName];
    if (!allowed) {
      logger.info(`Permission denied by user override: ${toolName} (tier: ${tier})`);
    }
    return allowed;
  }

  // Default: read and modify allowed, destructive denied
  const allowed = tier !== "destructive";
  if (!allowed) {
    logger.info(`Permission denied by default policy: ${toolName} (tier: ${tier})`);
  }
  return allowed;
}
