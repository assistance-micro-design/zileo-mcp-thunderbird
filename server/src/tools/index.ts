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
 * Tool Registry
 * Central export for all MCP tool handlers
 * @module tools
 */

// Import tool definitions
import {
  messageTools,
  handleMessagesSearch,
  handleMessagesList,
  handleMessagesListUnread,
  handleMessagesListRecent,
  handleMessagesGet,
  handleMessagesMove,
  handleMessagesCopy,
  handleMessagesDelete,
  handleMessagesUpdate,
  handleMessagesArchive,
} from "./messages.js";
import {
  folderTools,
  handleFoldersList,
  handleFoldersGet,
  handleFoldersCreate,
  handleFoldersRename,
  handleFoldersDelete,
  handleFoldersMove,
  handleFoldersMarkRead,
} from "./folders.js";
import {
  contactTools,
  handleContactsSearch,
  handleContactsList,
  handleContactsGet,
  handleContactsCreate,
  handleContactsUpdate,
  handleContactsDelete,
  handleAddressBooksList,
  handleAddressBooksCreate,
  handleAddressBooksDelete,
} from "./contacts.js";
import {
  tagTools,
  handleTagsList,
  handleTagsCreate,
  handleTagsUpdate,
  handleTagsDelete,
} from "./tags.js";
import {
  accountTools,
  handleAccountsList,
  handleAccountsGet,
  handleIdentitiesList,
} from "./accounts.js";
import {
  calendarTools,
  handleCalendarsList,
  handleCalendarsGet,
  handleEventsSearch,
  handleEventsList,
  handleEventsGet,
  handleEventsCreate,
  handleEventsUpdate,
  handleEventsMove,
  handleEventsDelete,
} from "./calendar.js";
import {
  taskTools,
  handleTasksList,
  handleTasksGet,
  handleTasksCreate,
  handleTasksUpdate,
  handleTasksDelete,
  handleTasksComplete,
} from "./tasks.js";
import {
  composeTools,
  handleComposeBeginNew,
  handleComposeBeginReply,
  handleComposeBeginForward,
  handleComposeGetDetails,
  handleComposeSetDetails,
  handleComposeSaveDraft,
  handleComposeSaveTemplate,
  handleComposeSend,
} from "./compose.js";

import type { McpTool, ToolCallResult } from "../types/mcp.js";

/**
 * Tool handler function type
 */
export type ToolHandler = (args: unknown) => Promise<ToolCallResult>;

/**
 * Tool handler map
 */
export const toolHandlers: Record<string, ToolHandler> = {
  // Message tools
  thunderbird_messages_search: handleMessagesSearch,
  thunderbird_messages_list: handleMessagesList,
  thunderbird_messages_list_unread: handleMessagesListUnread,
  thunderbird_messages_get: handleMessagesGet,
  thunderbird_messages_move: handleMessagesMove,
  thunderbird_messages_copy: handleMessagesCopy,
  thunderbird_messages_delete: handleMessagesDelete,
  thunderbird_messages_update: handleMessagesUpdate,
  thunderbird_messages_archive: handleMessagesArchive,
  thunderbird_messages_list_recent: handleMessagesListRecent,

  // Folder tools
  thunderbird_folders_list: handleFoldersList,
  thunderbird_folders_get: handleFoldersGet,
  thunderbird_folders_create: handleFoldersCreate,
  thunderbird_folders_rename: handleFoldersRename,
  thunderbird_folders_delete: handleFoldersDelete,
  thunderbird_folders_move: handleFoldersMove,
  thunderbird_folders_mark_read: handleFoldersMarkRead,

  // Contact tools
  thunderbird_contacts_search: handleContactsSearch,
  thunderbird_contacts_list: handleContactsList,
  thunderbird_contacts_get: handleContactsGet,
  thunderbird_contacts_create: handleContactsCreate,
  thunderbird_contacts_update: handleContactsUpdate,
  thunderbird_contacts_delete: handleContactsDelete,
  thunderbird_addressbooks_list: handleAddressBooksList,
  thunderbird_addressbooks_create: handleAddressBooksCreate,
  thunderbird_addressbooks_delete: handleAddressBooksDelete,

  // Tag tools
  thunderbird_tags_list: handleTagsList,
  thunderbird_tags_create: handleTagsCreate,
  thunderbird_tags_update: handleTagsUpdate,
  thunderbird_tags_delete: handleTagsDelete,

  // Account tools
  thunderbird_accounts_list: handleAccountsList,
  thunderbird_accounts_get: handleAccountsGet,
  thunderbird_identities_list: handleIdentitiesList,

  // Calendar tools
  thunderbird_calendars_list: handleCalendarsList,
  thunderbird_calendars_get: handleCalendarsGet,
  thunderbird_events_search: handleEventsSearch,
  thunderbird_events_list: handleEventsList,
  thunderbird_events_get: handleEventsGet,
  thunderbird_events_create: handleEventsCreate,
  thunderbird_events_update: handleEventsUpdate,
  thunderbird_events_move: handleEventsMove,
  thunderbird_events_delete: handleEventsDelete,

  // Task tools
  thunderbird_tasks_list: handleTasksList,
  thunderbird_tasks_get: handleTasksGet,
  thunderbird_tasks_create: handleTasksCreate,
  thunderbird_tasks_update: handleTasksUpdate,
  thunderbird_tasks_delete: handleTasksDelete,
  thunderbird_tasks_complete: handleTasksComplete,

  // Compose tools
  thunderbird_compose_begin_new: handleComposeBeginNew,
  thunderbird_compose_begin_reply: handleComposeBeginReply,
  thunderbird_compose_begin_forward: handleComposeBeginForward,
  thunderbird_compose_get_details: handleComposeGetDetails,
  thunderbird_compose_set_details: handleComposeSetDetails,
  thunderbird_compose_save_draft: handleComposeSaveDraft,
  thunderbird_compose_save_template: handleComposeSaveTemplate,
  thunderbird_compose_send: handleComposeSend,
};

/**
 * All tool definitions
 */
export const allTools: McpTool[] = [
  ...messageTools,
  ...folderTools,
  ...contactTools,
  ...tagTools,
  ...accountTools,
  ...calendarTools,
  ...taskTools,
  ...composeTools,
];

/**
 * Get tool handler by name
 */
export function getToolHandler(name: string): ToolHandler | undefined {
  return toolHandlers[name];
}

/**
 * Check if tool exists
 */
export function toolExists(name: string): boolean {
  return name in toolHandlers;
}

/**
 * Export tool definitions and handlers
 */
export {
  messageTools,
  folderTools,
  contactTools,
  tagTools,
  accountTools,
  calendarTools,
  taskTools,
  composeTools,
};
