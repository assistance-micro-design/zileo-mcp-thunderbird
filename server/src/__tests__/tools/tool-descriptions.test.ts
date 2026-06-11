/**
 * Sanity checks on the description format of every MCP tool.
 *
 * Guards the convention introduced in the 2026-05-16 quality upgrade:
 *  - rich action sentence (>= 80 chars)
 *  - `Example:` block with a realistic Input/Output payload
 *  - `Note:` block citing the source tool whenever the tool consumes
 *    an external ID (param ending in `Id`, `Key`, or `tabId`).
 */
import { describe, it, expect } from "vitest";
import { allTools } from "../../tools/index.js";

const MIN_DESCRIPTION_LENGTH = 80;
const ID_SUFFIX_PATTERN = /(Id|Key|tabId)$/;
const TOOL_NAME_PATTERN = /^thunderbird_[a-z]+(?:_[a-z_]+)?$/;

describe("Tool descriptions format", () => {
  it.each(allTools.map((t) => [t.name, t] as const))(
    "%s description >= 80 chars and contains 'Example'",
    (_name, tool) => {
      expect(tool.description.length).toBeGreaterThanOrEqual(
        MIN_DESCRIPTION_LENGTH,
      );
      expect(tool.description).toMatch(/Example/);
    },
  );

  it("all tool names follow thunderbird_<domain>_<action> pattern", () => {
    for (const tool of allTools) {
      expect(tool.name).toMatch(TOOL_NAME_PATTERN);
    }
  });

  it("inputSchema.properties descriptions are non-empty when present", () => {
    for (const tool of allTools) {
      const props = (tool.inputSchema.properties ?? {}) as Record<
        string,
        { description?: unknown }
      >;
      for (const [, propDef] of Object.entries(props)) {
        if (
          typeof propDef === "object" &&
          propDef !== null &&
          "description" in propDef &&
          typeof propDef.description === "string"
        ) {
          expect(propDef.description.length).toBeGreaterThan(5);
        }
      }
    }
  });

  it("property descriptions mentioning ISO 8601 must require the offset", () => {
    const collectDescriptions = (
      node: unknown,
      path: string,
      out: Array<{ path: string; description: string }>,
    ): void => {
      if (typeof node !== "object" || node === null) return;
      const obj = node as Record<string, unknown>;
      if (typeof obj.description === "string") {
        out.push({ path, description: obj.description });
      }
      for (const [key, value] of Object.entries(obj)) {
        if (key === "description") continue;
        collectDescriptions(value, `${path}.${key}`, out);
      }
    };

    for (const tool of allTools) {
      const descriptions: Array<{ path: string; description: string }> = [];
      collectDescriptions(tool.inputSchema, tool.name, descriptions);
      for (const { path, description } of descriptions) {
        if (description.includes("ISO 8601")) {
          expect(description, path).toMatch(/offset/i);
        }
      }
    }
  });

  const toolsConsumingExternalIds = allTools.filter((t) => {
    const required = (t.inputSchema.required ?? []) as string[];
    return required.some((p) => ID_SUFFIX_PATTERN.test(p));
  });

  it.each(toolsConsumingExternalIds.map((t) => [t.name, t] as const))(
    "%s consumes an external ID, must have a Note: block citing a source tool",
    (_name, tool) => {
      expect(tool.description).toMatch(/Note:/);
      const noteSection = tool.description.split("Note:")[1] ?? "";
      expect(noteSection).toMatch(/thunderbird_\w+/);
    },
  );
});
