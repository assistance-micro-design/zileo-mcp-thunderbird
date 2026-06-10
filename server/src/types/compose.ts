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
