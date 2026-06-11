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
