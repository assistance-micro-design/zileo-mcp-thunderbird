/**
 * Version coherence guard.
 *
 * The project version is declared in five places that must never drift:
 * - package.json (monorepo root)
 * - server/package.json
 * - extension/manifest.json
 * - server/src/server.ts (MCP server info reported to clients)
 * - Dockerfile (org.opencontainers.image.version label)
 *
 * This test reads all five sources and asserts they agree, so a release bump
 * that misses one location fails CI instead of shipping inconsistent metadata.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/** Absolute path of the server/ workspace (parent of src/) */
const SERVER_ROOT = path.resolve(__dirname, "../..");

function readJsonVersion(relativePath: string): string {
  const raw = fs.readFileSync(path.join(SERVER_ROOT, relativePath), "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  if (!parsed.version) {
    throw new Error(`No "version" field in ${relativePath}`);
  }
  return parsed.version;
}

/**
 * Extracts the version the MCP server reports to clients.
 * Supports both a literal (`version: "1.2.3"`) and the centralized form
 * introduced by the audit fixes (version read from server/package.json via
 * createRequire) — in the latter case the source of truth IS package.json.
 */
function readServerTsVersion(): string {
  const source = fs.readFileSync(
    path.join(SERVER_ROOT, "src/server.ts"),
    "utf8",
  );
  const literal = source.match(/version:\s*"(\d+\.\d+\.\d+)"/);
  if (literal) {
    return literal[1];
  }
  if (/createRequire/.test(source) && /package\.json/.test(source)) {
    return readJsonVersion("server/package.json");
  }
  throw new Error(
    "Could not determine the version reported by server/src/server.ts " +
      "(neither a literal nor a package.json read was found).",
  );
}

function readDockerfileVersion(): string {
  const source = fs.readFileSync(
    path.join(SERVER_ROOT, "../Dockerfile"),
    "utf8",
  );
  const match = source.match(
    /org\.opencontainers\.image\.version=["']?(\d+\.\d+\.\d+)["']?/,
  );
  if (!match) {
    throw new Error(
      "No org.opencontainers.image.version label found in Dockerfile",
    );
  }
  return match[1];
}

describe("Version coherence across the monorepo", () => {
  const versions: Record<string, string> = {
    "package.json (root)": readJsonVersion("../package.json"),
    "server/package.json": readJsonVersion("package.json"),
    "extension/manifest.json": readJsonVersion("../extension/manifest.json"),
    "server/src/server.ts": readServerTsVersion(),
    Dockerfile: readDockerfileVersion(),
  };

  const reference = versions["package.json (root)"];

  for (const [source, version] of Object.entries(versions)) {
    it(`${source} declares version ${reference}`, () => {
      expect(
        version,
        `Version drift: ${source} declares ${version} but root package.json declares ${reference}`,
      ).toBe(reference);
    });
  }

  it("version follows semver MAJOR.MINOR.PATCH", () => {
    expect(reference).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
