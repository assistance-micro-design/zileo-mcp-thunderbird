/**
 * Shared Zod Schema Helpers
 * Reusable schema fragments with actionable validation messages
 * @module tools/schema-helpers
 */

import { z } from "zod";

/**
 * Validation message for ISO 8601 datetime params.
 * Surfaced to MCP clients so they can self-correct the format.
 */
export const ISO_DATETIME_MESSAGE =
  "Must be ISO 8601 with timezone offset, e.g. 2026-01-15T10:00:00Z";

/**
 * Schema for ISO 8601 datetime strings with a mandatory timezone
 * offset (Z or +HH:MM). Same validation as
 * `z.string().datetime({ offset: true })`, with an actionable message.
 */
export function isoDatetime(): z.ZodString {
  return z.string().datetime({ offset: true, message: ISO_DATETIME_MESSAGE });
}
