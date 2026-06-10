/**
 * Tool tiers coherence guard.
 *
 * The extension options page (extension/options.js) maintains its own copy of
 * TOOL_TIERS because WebExtension pages cannot import server TypeScript code.
 * If the two copies drift (tool added/removed on one side, tier changed), the
 * permission UI silently stops matching what the bridge actually enforces.
 *
 * Same parsing technique as contract-coherence.test.ts: read the extension
 * source as text, extract the declared pairs, compare with the server map.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_TIERS } from "../../permissions/tool-permissions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPTIONS_FILE = path.resolve(
  __dirname,
  "../../../../extension/options.js",
);

/**
 * Extracts the TOOL_TIERS object literal declared in extension/options.js
 * and returns it as a name → tier map.
 */
function parseExtensionToolTiers(): Record<string, string> {
  const source = fs.readFileSync(OPTIONS_FILE, "utf8");
  const blockMatch = source.match(/const TOOL_TIERS = \{([\s\S]*?)\n\};/);
  if (!blockMatch) {
    throw new Error(
      `Could not locate "const TOOL_TIERS = {...};" in ${OPTIONS_FILE}. ` +
        "Adjust the extractor if options.js was refactored.",
    );
  }

  const tiers: Record<string, string> = {};
  const entryRe = /(thunderbird_[a-z_]+):\s*"(read|modify|destructive)"/g;
  let match: RegExpExecArray | null;
  while ((match = entryRe.exec(blockMatch[1])) !== null) {
    tiers[match[1]] = match[2];
  }
  return tiers;
}

describe("Tool tiers coherence: server TOOL_TIERS vs extension options.js", () => {
  const extensionTiers = parseExtensionToolTiers();

  it("extension declares the same number of tools as the server", () => {
    expect(Object.keys(extensionTiers).length).toBe(
      Object.keys(TOOL_TIERS).length,
    );
  });

  it("every server tool exists in the extension with the same tier", () => {
    const mismatches: string[] = [];
    for (const [name, tier] of Object.entries(TOOL_TIERS)) {
      const extensionTier = extensionTiers[name];
      if (extensionTier === undefined) {
        mismatches.push(`${name}: missing in extension/options.js`);
      } else if (extensionTier !== tier) {
        mismatches.push(
          `${name}: server="${tier}" extension="${extensionTier}"`,
        );
      }
    }
    expect(
      mismatches,
      `TOOL_TIERS drift between server and extension: ${mismatches.join("; ")}`,
    ).toEqual([]);
  });

  it("no extension tool is unknown to the server", () => {
    const unknown = Object.keys(extensionTiers).filter(
      (name) => !(name in TOOL_TIERS),
    );
    expect(
      unknown,
      `Tools declared in extension/options.js but absent from server TOOL_TIERS: [${unknown.join(", ")}]`,
    ).toEqual([]);
  });
});
