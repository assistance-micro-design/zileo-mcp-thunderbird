/**
 * Tests for logger utilities.
 * Audit fix: structured metadata used to be silently dropped by the printf
 * format; serializeLogMeta() now renders it into the log line.
 */

import { describe, it, expect } from "vitest";
import { serializeLogMeta } from "../../utils/logger.js";

describe("serializeLogMeta", () => {
  it("should serialize plain metadata as a JSON suffix", () => {
    const result = serializeLogMeta({ action: "messages.list", count: 3 });
    expect(result).toBe(' {"action":"messages.list","count":3}');
  });

  it("should return an empty string when there is no metadata", () => {
    expect(serializeLogMeta({})).toBe("");
  });

  it("should skip winston-reserved fields (timestamp, level, message, stack)", () => {
    const result = serializeLogMeta({
      timestamp: "2026-06-10 10:00:00",
      level: "info",
      message: "hello",
      stack: "Error: ...",
    });
    expect(result).toBe("");
  });

  it("should mix reserved and real metadata correctly", () => {
    const result = serializeLogMeta({
      level: "error",
      message: "failed",
      tool: "thunderbird_messages_list",
    });
    expect(result).toBe(' {"tool":"thunderbird_messages_list"}');
  });

  it("should never throw on circular metadata", () => {
    const circular: Record<string, unknown> = { name: "loop" };
    circular.self = circular;

    const result = serializeLogMeta(circular);
    expect(result).toBe(" [unserializable metadata]");
  });
});
