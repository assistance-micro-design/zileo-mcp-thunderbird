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
