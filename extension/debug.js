/**
 * Debug logging gate for the extension.
 *
 * Rule (see .claude/rules/webextension.md): verbose console.log calls must be
 * gated behind this flag; console.warn/console.error for real failures stay
 * ungated. Set DEBUG to true during development (about:debugging console).
 */
export const DEBUG = false;

/**
 * Verbose log, emitted only when DEBUG is enabled.
 * @param {...unknown} args - Arguments forwarded to console.log
 */
export function debugLog(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}
