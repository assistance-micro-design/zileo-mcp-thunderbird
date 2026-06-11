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
 * Debug logging gate for the extension.
 *
 * Project rule: verbose console.log calls must be gated behind this flag;
 * console.warn/console.error for real failures stay ungated. Set DEBUG to
 * true during development (about:debugging console).
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
