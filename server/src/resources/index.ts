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
 * Resource Registry
 * Central export for MCP resource handlers
 * @module resources
 */

import type { McpResource, McpResourceTemplate } from "../types/mcp.js";

/**
 * Static resource definitions
 */
export const resources: McpResource[] = [
  {
    uri: "thunderbird://accounts",
    name: "Thunderbird Accounts",
    description: "List of all configured email accounts",
    mimeType: "application/json",
  },
  {
    uri: "thunderbird://inbox/unread",
    name: "Unread Messages (All Accounts)",
    description: "All unread messages across all accounts",
    mimeType: "application/json",
  },
  {
    uri: "thunderbird://contacts/recent",
    name: "Recent Contacts",
    description: "Recently used or modified contacts",
    mimeType: "application/json",
  },
  {
    uri: "thunderbird://calendar/today",
    name: "Today's Events",
    description: "Calendar events for today",
    mimeType: "application/json",
  },
  {
    uri: "thunderbird://calendar/upcoming",
    name: "Upcoming Events",
    description: "Calendar events for the next 7 days",
    mimeType: "application/json",
  },
  {
    uri: "thunderbird://tasks/pending",
    name: "Pending Tasks",
    description: "Incomplete tasks from all calendars",
    mimeType: "application/json",
  },
];

/**
 * Resource templates (with parameters)
 */
export const resourceTemplates: McpResourceTemplate[] = [
  {
    uriTemplate: "thunderbird://folders/{accountId}",
    name: "Account Folder Tree",
    description: "Hierarchical folder structure for a specific account",
    mimeType: "application/json",
  },
  {
    uriTemplate: "thunderbird://inbox/unread/{accountId}",
    name: "Unread Messages (Specific Account)",
    description: "Unread messages for a specific account",
    mimeType: "application/json",
  },
];

/**
 * Export handler functions
 */
export { getResourceHandler } from "./handlers.js";
