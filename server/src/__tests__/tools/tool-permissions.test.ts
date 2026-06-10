/**
 * Tests for tool-permissions module
 * SEC-AUTH-001, SEC-AUTH-002: Tool authorization tiers
 */

import { describe, it, expect } from "vitest";
import {
  TOOL_TIERS,
  NATIVE_ACTION_TO_MCP_TOOL,
  getDefaultPermissions,
  isToolAllowed,
  getToolTier,
  resolveActionToMcpTool,
  buildToolDeniedResult,
} from "../../permissions/tool-permissions.js";
import { allTools } from "../../tools/index.js";

describe("tool-permissions", () => {
  describe("TOOL_TIERS", () => {
    it("should classify all registered tools", () => {
      const registeredToolNames = allTools.map(
        (t: { name: string }) => t.name,
      );
      for (const toolName of registeredToolNames) {
        expect(
          TOOL_TIERS[toolName],
          `Tool "${toolName}" is not classified in TOOL_TIERS`,
        ).toBeDefined();
      }
    });

    it("should not contain tools that are not registered", () => {
      const registeredToolNames = new Set(
        allTools.map((t: { name: string }) => t.name),
      );
      for (const toolName of Object.keys(TOOL_TIERS)) {
        expect(
          registeredToolNames.has(toolName),
          `TOOL_TIERS contains unknown tool "${toolName}"`,
        ).toBe(true);
      }
    });

    it("should only use valid tier values", () => {
      const validTiers = new Set(["read", "modify", "destructive"]);
      for (const [toolName, tier] of Object.entries(TOOL_TIERS)) {
        expect(
          validTiers.has(tier),
          `Tool "${toolName}" has invalid tier "${tier}"`,
        ).toBe(true);
      }
    });

    it("should classify _list, _get, _search tools as read", () => {
      const readPatterns = ["_list", "_get", "_search"];
      for (const [toolName, tier] of Object.entries(TOOL_TIERS)) {
        if (
          readPatterns.some((p) => toolName.endsWith(p)) &&
          toolName !== "thunderbird_compose_get_details"
        ) {
          expect(
            tier,
            `Tool "${toolName}" should be "read" but is "${tier}"`,
          ).toBe("read");
        }
      }
    });

    it("should classify compose_get_details as read", () => {
      expect(TOOL_TIERS["thunderbird_compose_get_details"]).toBe("read");
    });

    it("should classify _delete tools as destructive", () => {
      for (const [toolName, tier] of Object.entries(TOOL_TIERS)) {
        if (toolName.endsWith("_delete")) {
          expect(
            tier,
            `Tool "${toolName}" should be "destructive" but is "${tier}"`,
          ).toBe("destructive");
        }
      }
    });

    it("should classify compose_send as destructive", () => {
      expect(TOOL_TIERS["thunderbird_compose_send"]).toBe("destructive");
    });
  });

  describe("getToolTier", () => {
    it("should return the correct tier for a known tool", () => {
      expect(getToolTier("thunderbird_messages_list")).toBe("read");
      expect(getToolTier("thunderbird_messages_move")).toBe("modify");
      expect(getToolTier("thunderbird_messages_delete")).toBe("destructive");
    });

    it("should return undefined for an unknown tool", () => {
      expect(getToolTier("unknown_tool")).toBeUndefined();
    });
  });

  describe("getDefaultPermissions", () => {
    it("should allow all read tools by default", () => {
      const permissions = getDefaultPermissions();
      for (const [toolName, tier] of Object.entries(TOOL_TIERS)) {
        if (tier === "read") {
          expect(
            permissions[toolName],
            `Read tool "${toolName}" should be allowed by default`,
          ).toBe(true);
        }
      }
    });

    it("should allow all modify tools by default", () => {
      const permissions = getDefaultPermissions();
      for (const [toolName, tier] of Object.entries(TOOL_TIERS)) {
        if (tier === "modify") {
          expect(
            permissions[toolName],
            `Modify tool "${toolName}" should be allowed by default`,
          ).toBe(true);
        }
      }
    });

    it("should disallow all destructive tools by default", () => {
      const permissions = getDefaultPermissions();
      for (const [toolName, tier] of Object.entries(TOOL_TIERS)) {
        if (tier === "destructive") {
          expect(
            permissions[toolName],
            `Destructive tool "${toolName}" should be disallowed by default`,
          ).toBe(false);
        }
      }
    });

    it("should have an entry for every classified tool", () => {
      const permissions = getDefaultPermissions();
      for (const toolName of Object.keys(TOOL_TIERS)) {
        expect(
          toolName in permissions,
          `Missing permission for "${toolName}"`,
        ).toBe(true);
      }
    });
  });

  describe("NATIVE_ACTION_TO_MCP_TOOL", () => {
    it("should map all entries to tools that exist in TOOL_TIERS", () => {
      for (const [action, mcpTool] of Object.entries(
        NATIVE_ACTION_TO_MCP_TOOL,
      )) {
        expect(
          TOOL_TIERS[mcpTool],
          `Action "${action}" maps to "${mcpTool}" which is not in TOOL_TIERS`,
        ).toBeDefined();
      }
    });
  });

  describe("resolveActionToMcpTool", () => {
    it("should return undefined for system actions", () => {
      expect(resolveActionToMcpTool("ping")).toBeUndefined();
      expect(resolveActionToMcpTool("getVersion")).toBeUndefined();
    });

    it("should resolve sub-actions to their parent MCP tool", () => {
      expect(resolveActionToMcpTool("messages.getFull")).toBe(
        "thunderbird_messages_get",
      );
      expect(resolveActionToMcpTool("messages.getRaw")).toBe(
        "thunderbird_messages_get",
      );
      expect(resolveActionToMcpTool("messages.listAttachments")).toBe(
        "thunderbird_messages_get",
      );
    });

    it("should resolve camelCase actions to snake_case MCP tool names", () => {
      expect(resolveActionToMcpTool("compose.beginNew")).toBe(
        "thunderbird_compose_begin_new",
      );
      expect(resolveActionToMcpTool("compose.beginReply")).toBe(
        "thunderbird_compose_begin_reply",
      );
      expect(resolveActionToMcpTool("compose.beginForward")).toBe(
        "thunderbird_compose_begin_forward",
      );
      expect(resolveActionToMcpTool("compose.getDetails")).toBe(
        "thunderbird_compose_get_details",
      );
      expect(resolveActionToMcpTool("compose.setDetails")).toBe(
        "thunderbird_compose_set_details",
      );
      expect(resolveActionToMcpTool("compose.saveDraft")).toBe(
        "thunderbird_compose_save_draft",
      );
      expect(resolveActionToMcpTool("compose.saveTemplate")).toBe(
        "thunderbird_compose_save_template",
      );
    });

    it("should resolve addressBooks camelCase actions", () => {
      expect(resolveActionToMcpTool("addressBooks.list")).toBe(
        "thunderbird_addressbooks_list",
      );
      expect(resolveActionToMcpTool("addressBooks.create")).toBe(
        "thunderbird_addressbooks_create",
      );
      expect(resolveActionToMcpTool("addressBooks.delete")).toBe(
        "thunderbird_addressbooks_delete",
      );
    });

    it("should resolve folders.markAsRead correctly", () => {
      expect(resolveActionToMcpTool("folders.markAsRead")).toBe(
        "thunderbird_folders_mark_read",
      );
    });

    it("should use default conversion for simple actions", () => {
      expect(resolveActionToMcpTool("messages.list")).toBe(
        "thunderbird_messages_list",
      );
      expect(resolveActionToMcpTool("messages.get")).toBe(
        "thunderbird_messages_get",
      );
      expect(resolveActionToMcpTool("folders.list")).toBe(
        "thunderbird_folders_list",
      );
      expect(resolveActionToMcpTool("contacts.search")).toBe(
        "thunderbird_contacts_search",
      );
      expect(resolveActionToMcpTool("calendars.list")).toBe(
        "thunderbird_calendars_list",
      );
      expect(resolveActionToMcpTool("tasks.create")).toBe(
        "thunderbird_tasks_create",
      );
      expect(resolveActionToMcpTool("compose.send")).toBe(
        "thunderbird_compose_send",
      );
    });

    it("should resolve all native actions to valid TOOL_TIERS entries", () => {
      // All non-system actions from MessageActions should resolve to a known tool
      const allActions = [
        "messages.search",
        "messages.list",
        "messages.get",
        "messages.getFull",
        "messages.getRaw",
        "messages.update",
        "messages.move",
        "messages.copy",
        "messages.delete",
        "messages.archive",
        "messages.listAttachments",
        "folders.list",
        "folders.get",
        "folders.create",
        "folders.rename",
        "folders.delete",
        "folders.move",
        "folders.markAsRead",
        "tags.list",
        "tags.create",
        "tags.update",
        "tags.delete",
        "accounts.list",
        "accounts.get",
        "identities.list",
        "addressBooks.list",
        "addressBooks.get",
        "addressBooks.create",
        "addressBooks.delete",
        "contacts.list",
        "contacts.search",
        "contacts.get",
        "contacts.create",
        "contacts.update",
        "contacts.delete",
        "calendars.list",
        "calendars.get",
        "events.list",
        "events.search",
        "events.get",
        "events.create",
        "events.update",
        "events.move",
        "events.delete",
        "tasks.list",
        "tasks.get",
        "tasks.create",
        "tasks.update",
        "tasks.delete",
        "tasks.complete",
        "compose.beginNew",
        "compose.beginReply",
        "compose.beginForward",
        "compose.getDetails",
        "compose.setDetails",
        "compose.saveDraft",
        "compose.saveTemplate",
        "compose.send",
      ];

      for (const action of allActions) {
        const mcpTool = resolveActionToMcpTool(action);
        expect(
          mcpTool,
          `Action "${action}" resolved to undefined (not a system action)`,
        ).toBeDefined();
        expect(
          TOOL_TIERS[mcpTool!],
          `Action "${action}" resolved to "${mcpTool}" which is not in TOOL_TIERS`,
        ).toBeDefined();
      }
    });
  });

  describe("isToolAllowed", () => {
    it("should allow a tool with explicit true permission", () => {
      const permissions = { thunderbird_messages_list: true };
      expect(isToolAllowed("thunderbird_messages_list", permissions)).toBe(
        true,
      );
    });

    it("should deny a tool with explicit false permission", () => {
      const permissions = { thunderbird_messages_delete: false };
      expect(isToolAllowed("thunderbird_messages_delete", permissions)).toBe(
        false,
      );
    });

    it("should use default permissions when tool is not in permissions map", () => {
      const permissions: Record<string, boolean> = {};
      // Read tool should default to allowed
      expect(isToolAllowed("thunderbird_messages_list", permissions)).toBe(
        true,
      );
      // Destructive tool should default to disallowed
      expect(isToolAllowed("thunderbird_messages_delete", permissions)).toBe(
        false,
      );
    });

    it("should deny an unknown tool", () => {
      const permissions = { unknown_tool: true };
      expect(isToolAllowed("unknown_tool", permissions)).toBe(false);
    });

    it("should work with full default permissions", () => {
      const permissions = getDefaultPermissions();
      expect(isToolAllowed("thunderbird_messages_list", permissions)).toBe(
        true,
      );
      expect(isToolAllowed("thunderbird_messages_move", permissions)).toBe(
        true,
      );
      expect(isToolAllowed("thunderbird_messages_delete", permissions)).toBe(
        false,
      );
    });
  });

  describe("buildToolDeniedResult (audit: typed permission denials)", () => {
    it("should embed the JSON-RPC permission denied code (-32002)", () => {
      const result = buildToolDeniedResult("thunderbird_messages_delete");

      expect(result.isError).toBe(true);
      const text =
        "text" in result.content[0] ? result.content[0].text : "";
      expect(text).toContain("-32002");
      expect(text).toContain("Permission denied");
      expect(text).toContain("thunderbird_messages_delete");
      expect(text).toContain("tier: destructive");
    });

    it("should report unknown tier for unclassified tools", () => {
      const result = buildToolDeniedResult("not_a_real_tool");

      expect(result.isError).toBe(true);
      const text =
        "text" in result.content[0] ? result.content[0].text : "";
      expect(text).toContain("tier: unknown");
    });
  });
});
