/*
 * Copyright 2025-2026 Assistance Micro Design
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Contract coherence guard.
 *
 * For every MCP tool, every parameter declared in `inputSchema.properties`
 * must be referenced by name somewhere in the extension-side code (either
 * `extension/routing/handler.js` or `extension/api/*.js`).
 *
 * If a Zod-validated parameter never appears in extension code, it means the
 * tool is silently lying to its callers — the param goes through the wire,
 * Zod accepts it, but nothing downstream honors it. This pattern was the
 * source of three real bugs fixed on 2026-05-16 (folders.list/includeSubFolders,
 * events.update/scope, events.delete/scope).
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
  const handlerFile = path.join(EXTENSION_DIR, "routing", "handler.js");

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

/**
 * Function-scoped coherence guard.
 *
 * The aggregated-code check above is necessary but not sufficient: a param
 * may appear *somewhere* in the extension while still being silently
 * dropped by the specific wrapper that handles a given action. Example:
 * `flagged` was declared on thunderbird_messages_search yet ignored by
 * MessagesAPI.search() — it slipped through the aggregated check because
 * MessagesAPI.update() referenced `flagged` for a different purpose.
 *
 * Each entry below pins a tool's schema params to the exact wrapper
 * function body that must reference them.
 */
const FUNCTION_SCOPED_CHECKS: ReadonlyArray<{
  tool: string;
  apiFile: string;
  /** Regex capturing the wrapper function body */
  bodyExtractor: RegExp;
  /** Params that must appear inside that body */
  requiredParams: readonly string[];
}> = [
  {
    tool: "thunderbird_messages_search",
    apiFile: "messages.js",
    bodyExtractor: /async search\(params\)\s*\{([\s\S]*?)\n\s{2}\}/,
    requiredParams: ["flagged", "accountId", "sortBy", "sortOrder"],
  },
  {
    tool: "thunderbird_messages_list",
    apiFile: "messages.js",
    bodyExtractor: /async list\([^)]*\)\s*\{([\s\S]*?)\n\s{2}\}/,
    requiredParams: ["sortBy", "sortOrder"],
  },
  {
    tool: "thunderbird_messages_list_unread",
    apiFile: "messages.js",
    bodyExtractor: /async listUnread\([^)]*\)\s*\{([\s\S]*?)\n\s{2}\}/,
    requiredParams: ["sortBy", "sortOrder"],
  },
];

describe("Wrapper-function coherence: per-action params land in the right function", () => {
  for (const check of FUNCTION_SCOPED_CHECKS) {
    it(`${check.tool} — wrapper in ${check.apiFile} references [${check.requiredParams.join(", ")}]`, () => {
      const filePath = path.join(EXTENSION_DIR, "api", check.apiFile);
      const source = fs.readFileSync(filePath, "utf8");
      const match = source.match(check.bodyExtractor);
      expect(
        match,
        `Could not locate wrapper function body in ${check.apiFile} ` +
          `(extractor: ${check.bodyExtractor}). Adjust the regex when refactoring.`,
      ).not.toBeNull();
      const body = match![1];

      const missing = check.requiredParams.filter(
        (param) => !new RegExp(`\\b${param}\\b`).test(body),
      );

      expect(
        missing,
        `${check.tool}: params [${missing.join(", ")}] are declared in the Zod schema ` +
          `but never referenced inside the wrapper function body in ${check.apiFile}. ` +
          `They are being silently dropped before reaching messenger.*.query().`,
      ).toEqual([]);
    });
  }
});

/**
 * Pagination contract guard (audit fix 2026-06-10).
 *
 * messenger.messages.list()/query() return ONE page of ~100 messages; the
 * wrappers must drain the remaining pages via continueList() (bounded by
 * MAX_SCAN) and expose `scanComplete` so truncation is never silent. This
 * guard pins that behavior: if a wrapper regresses to reading only
 * `messageList.messages`, these assertions fail.
 */
describe("Pagination contract: message wrappers drain MessageList pages", () => {
  const messagesSource = fs.readFileSync(
    path.join(EXTENSION_DIR, "api", "messages.js"),
    "utf8",
  );

  it("messages.js declares MAX_SCAN and a continueList/abortList drain helper", () => {
    expect(messagesSource).toMatch(/const MAX_SCAN = \d+/);
    expect(messagesSource).toMatch(/messenger\.messages\.continueList\(/);
    expect(messagesSource).toMatch(/messenger\.messages\.abortList\(/);
  });

  const paginatedWrappers: ReadonlyArray<{
    name: string;
    bodyExtractor: RegExp;
  }> = [
    {
      name: "list",
      bodyExtractor: /async list\([^)]*\)\s*\{([\s\S]*?)\n\s{2}\}/,
    },
    {
      name: "search",
      bodyExtractor: /async search\(params\)\s*\{([\s\S]*?)\n\s{2}\}/,
    },
    {
      name: "listUnread",
      bodyExtractor: /async listUnread\([^)]*\)\s*\{([\s\S]*?)\n\s{2}\}/,
    },
  ];

  for (const wrapper of paginatedWrappers) {
    it(`MessagesAPI.${wrapper.name}() drains pages and exposes scanComplete`, () => {
      const match = messagesSource.match(wrapper.bodyExtractor);
      expect(
        match,
        `Could not locate ${wrapper.name}() body in messages.js. Adjust the regex when refactoring.`,
      ).not.toBeNull();
      const body = match![1];

      expect(body).toMatch(/_drainMessageList\(/);
      expect(body).toMatch(/\bscanComplete\b/);
    });
  }
});
