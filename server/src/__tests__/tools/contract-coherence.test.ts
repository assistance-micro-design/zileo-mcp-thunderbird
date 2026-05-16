/**
 * Contract coherence guard.
 *
 * For every MCP tool, every parameter declared in `inputSchema.properties`
 * must be referenced by name somewhere in the extension-side code (either
 * `extension/native-messaging/handler.js` or `extension/api/*.js`).
 *
 * If a Zod-validated parameter never appears in extension code, it means the
 * tool is silently lying to its callers — the param goes through the wire,
 * Zod accepts it, but nothing downstream honors it. This pattern was the
 * source of three real bugs fixed on 2026-05-16 (folders.list/includeSubFolders,
 * events.update/scope, events.delete/scope), tracked in
 * docs/specs/2026-05-16_spec-silent-ignored-params.md.
 *
 * Params that are legitimately consumed server-side (transformParams /
 * resolveAction in tool-handler.ts) never reach the extension and must be
 * listed in SERVER_SIDE_CONSUMED below with the reason.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { allTools } from "../../tools/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_DIR = path.resolve(__dirname, "../../../../extension");

/**
 * Params that never reach the extension because the server transforms or
 * dispatches on them before forwarding. Keys are MCP tool names.
 */
const SERVER_SIDE_CONSUMED: Record<string, readonly string[]> = {
  // dispatched via resolveAction to MESSAGES_GET / _FULL / _RAW;
  // transformParams strips `format` before send.
  thunderbird_messages_get: ["format"],
  // transformParams converts `hoursAgo` into dateFrom/dateTo server-side;
  // the extension only ever sees the resolved date range.
  thunderbird_messages_list_recent: ["hoursAgo"],
};

function loadExtensionCode(): string {
  const apiDir = path.join(EXTENSION_DIR, "api");
  const handlerFile = path.join(
    EXTENSION_DIR,
    "native-messaging",
    "handler.js",
  );

  const apiFiles = fs
    .readdirSync(apiDir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(apiDir, f));

  return [handlerFile, ...apiFiles]
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n\n");
}

const extensionCode = loadExtensionCode();

describe("Contract coherence: Zod inputSchema vs extension code", () => {
  for (const tool of allTools) {
    const properties = (tool.inputSchema?.properties ?? {}) as Record<
      string,
      unknown
    >;
    const params = Object.keys(properties);
    if (params.length === 0) continue;

    const allowed = SERVER_SIDE_CONSUMED[tool.name] ?? [];

    it(`${tool.name} — every declared param is referenced in extension`, () => {
      const orphans: string[] = [];
      for (const param of params) {
        if (allowed.includes(param)) continue;
        const re = new RegExp(`\\b${param}\\b`);
        if (!re.test(extensionCode)) {
          orphans.push(param);
        }
      }

      expect(
        orphans,
        `Params declared in ${tool.name} inputSchema but never referenced in extension code: [${orphans.join(", ")}]. ` +
          `Either wire them through, remove them from the schema, or add them to SERVER_SIDE_CONSUMED with a justification.`,
      ).toEqual([]);
    });
  }
});
