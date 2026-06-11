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
 * Compose Types - Email Composition API Types
 *
 * Audit 2026-06-10: the Compose*Params interfaces were removed — they
 * duplicated the Zod schemas in tools/compose.ts (single source of truth
 * for inputs). Only the result types, mapped to actions in
 * types/action-results.ts, remain.
 * @module types/compose
 */

/**
 * Result from compose begin operations (new, reply, forward)
 */
export interface ComposeTabResult {
  /** ID of the created compose tab */
  tabId: number;
  /** ID of the window containing the tab */
  windowId?: number;
}

/**
 * Result from save operations (draft, template)
 */
export interface ComposeSaveResult {
  /** Whether save was successful */
  success: boolean;
  /** ID of the saved message */
  messageId?: number;
  /** Save mode */
  mode: "draft" | "template";
}

/**
 * Result from send operation
 */
export interface ComposeSendResult {
  /** Whether send was successful */
  success: boolean;
  /** ID of the sent message (if available) */
  messageId?: number;
  /** Send mode used */
  mode: "sendNow" | "sendLater";
}
