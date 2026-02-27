/**
 * Tool Authorization Tiers
 * SEC-AUTH-001, SEC-AUTH-002: Classifies MCP tools by risk level
 * and controls access based on user-defined permissions.
 * @module tools/tool-permissions
 */

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
    return false;
  }

  if (toolName in permissions) {
    return permissions[toolName];
  }

  // Default: read and modify allowed, destructive denied
  return tier !== "destructive";
}
