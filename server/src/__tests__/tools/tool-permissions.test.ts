/**
 * Tests for tool-permissions module
 * SEC-AUTH-001, SEC-AUTH-002: Tool authorization tiers
 */

import { describe, it, expect } from "vitest";
import {
  TOOL_TIERS,
  getDefaultPermissions,
  isToolAllowed,
  getToolTier,
} from "../../tools/tool-permissions.js";
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
});
