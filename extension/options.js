/**
 * Options Page - Tool Permissions Management
 * SEC-AUTH-001, SEC-AUTH-002: Allows users to control which MCP tools
 * are available to AI assistants.
 */

/**
 * Tool tier classification matching server/src/tools/tool-permissions.ts
 * Must be kept in sync.
 */
const TOOL_TIERS = {
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
 * Domain grouping for display
 */
const DOMAINS = {
  Messages: "thunderbird_messages_",
  Folders: "thunderbird_folders_",
  Contacts: "thunderbird_contacts_",
  "Address Books": "thunderbird_addressbooks_",
  Tags: "thunderbird_tags_",
  Accounts: "thunderbird_accounts_",
  Identities: "thunderbird_identities_",
  Calendar: "thunderbird_calendars_",
  Events: "thunderbird_events_",
  Tasks: "thunderbird_tasks_",
  Compose: "thunderbird_compose_",
};

/** Current permissions state */
let currentPermissions = {};

/** Save debounce timer */
let saveTimer = null;

/**
 * Generate default permissions (read + modify ON, destructive OFF)
 * @returns {Record<string, boolean>}
 */
function getDefaultPermissions() {
  const permissions = {};
  for (const [name, tier] of Object.entries(TOOL_TIERS)) {
    permissions[name] = tier !== "destructive";
  }
  return permissions;
}

/**
 * Format a tool name for display by removing the prefix
 * @param {string} toolName
 * @returns {string}
 */
function formatToolName(toolName) {
  return toolName.replace("thunderbird_", "");
}

/**
 * Create a tool row element
 * @param {string} toolName
 * @param {string} tier
 * @param {boolean} enabled
 * @returns {HTMLElement}
 */
function createToolRow(toolName, tier, enabled) {
  const row = document.createElement("div");
  row.className = `tool-row${enabled ? "" : " disabled"}`;
  row.dataset.tool = toolName;

  const nameSpan = document.createElement("span");
  nameSpan.className = "tool-name";
  nameSpan.textContent = formatToolName(toolName);

  const badge = document.createElement("span");
  badge.className = `tier-badge tier-${tier}`;
  badge.textContent = tier;

  const toggle = document.createElement("label");
  toggle.className = "toggle-switch";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = enabled;
  checkbox.dataset.tool = toolName;
  checkbox.addEventListener("change", handleToggle);

  const slider = document.createElement("span");
  slider.className = "toggle-slider";

  toggle.appendChild(checkbox);
  toggle.appendChild(slider);

  row.appendChild(nameSpan);
  row.appendChild(badge);
  row.appendChild(toggle);

  return row;
}

/**
 * Handle toggle change
 * @param {Event} event
 */
function handleToggle(event) {
  const toolName = event.target.dataset.tool;
  const enabled = event.target.checked;
  currentPermissions[toolName] = enabled;

  const row = event.target.closest(".tool-row");
  if (row) {
    row.classList.toggle("disabled", !enabled);
  }

  debounceSave();
  updateSummary();
}

/**
 * Save permissions to storage with debounce
 */
function debounceSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(savePermissions, 300);
}

/**
 * Save permissions to browser.storage.local
 */
async function savePermissions() {
  try {
    await browser.storage.local.set({ toolPermissions: currentPermissions });
    showSavedIndicator();
  } catch (error) {
    console.error("[MCP Options] Failed to save permissions:", error);
  }
}

/**
 * Flash the "Saved" indicator
 */
function showSavedIndicator() {
  const indicator = document.getElementById("status-saved");
  indicator.classList.add("visible");
  setTimeout(() => {
    indicator.classList.remove("visible");
  }, 1500);
}

/**
 * Update the status summary
 */
function updateSummary() {
  const total = Object.keys(TOOL_TIERS).length;
  const enabled = Object.values(currentPermissions).filter(Boolean).length;
  const destructiveEnabled = Object.entries(currentPermissions).filter(
    ([name, allowed]) => allowed && TOOL_TIERS[name] === "destructive",
  ).length;
  const totalDestructive = Object.values(TOOL_TIERS).filter(
    (t) => t === "destructive",
  ).length;

  let summary = `${enabled}/${total} tools enabled`;
  if (destructiveEnabled > 0) {
    summary += ` (${destructiveEnabled}/${totalDestructive} destructive)`;
  }

  document.getElementById("status-summary").textContent = summary;
}

/**
 * Apply bulk permission changes
 * @param {function} predicate - (toolName, tier) => boolean
 */
function applyBulk(predicate) {
  for (const [toolName, tier] of Object.entries(TOOL_TIERS)) {
    currentPermissions[toolName] = predicate(toolName, tier);
  }
  renderAllToggles();
  debounceSave();
  updateSummary();
}

/**
 * Re-render all toggle states from currentPermissions
 */
function renderAllToggles() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"][data-tool]');
  for (const checkbox of checkboxes) {
    const toolName = checkbox.dataset.tool;
    const enabled = currentPermissions[toolName] ?? false;
    checkbox.checked = enabled;
    const row = checkbox.closest(".tool-row");
    if (row) {
      row.classList.toggle("disabled", !enabled);
    }
  }
}

/**
 * Build the UI: grouped tool sections
 */
function buildUI() {
  const container = document.getElementById("tools-container");

  // Group tools by domain
  const grouped = {};
  for (const [domainLabel, prefix] of Object.entries(DOMAINS)) {
    const tools = Object.entries(TOOL_TIERS).filter(([name]) =>
      name.startsWith(prefix),
    );
    if (tools.length > 0) {
      grouped[domainLabel] = tools;
    }
  }

  for (const [domainLabel, tools] of Object.entries(grouped)) {
    const section = document.createElement("div");
    section.className = "domain-section";

    const header = document.createElement("div");
    header.className = "domain-header";
    header.textContent = domainLabel + " ";
    const countSpan = document.createElement("span");
    countSpan.className = "domain-count";
    countSpan.textContent = `${tools.length} tools`;
    header.appendChild(countSpan);

    const table = document.createElement("div");
    table.className = "tool-table";

    for (const [toolName, tier] of tools) {
      const enabled = currentPermissions[toolName] ?? false;
      table.appendChild(createToolRow(toolName, tier, enabled));
    }

    section.appendChild(header);
    section.appendChild(table);
    container.appendChild(section);
  }
}

/**
 * Setup bulk action buttons
 */
function setupButtons() {
  document.getElementById("btn-enable-all").addEventListener("click", () => {
    applyBulk(() => true);
  });

  document.getElementById("btn-read-only").addEventListener("click", () => {
    applyBulk((_name, tier) => tier === "read");
  });

  document.getElementById("btn-read-modify").addEventListener("click", () => {
    applyBulk((_name, tier) => tier === "read" || tier === "modify");
  });

  document
    .getElementById("btn-disable-destructive")
    .addEventListener("click", () => {
      applyBulk((_name, tier) => tier !== "destructive" && (currentPermissions[_name] ?? true));
    });
}

/**
 * Initialize options page
 */
async function init() {
  try {
    const stored = await browser.storage.local.get("toolPermissions");
    currentPermissions = stored.toolPermissions || getDefaultPermissions();
  } catch {
    currentPermissions = getDefaultPermissions();
  }

  buildUI();
  setupButtons();
  updateSummary();
}

init();
