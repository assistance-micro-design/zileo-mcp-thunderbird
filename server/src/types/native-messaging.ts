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
 * Native Messaging Types
 * Action vocabulary shared between the MCP server and the Thunderbird
 * extension (extension/routing/handler.js routes on these names).
 *
 * Audit 2026-06-10: the native messaging *transport* (stdin/stdout framing)
 * was removed with server/src/native-messaging/ — the WebSocket bridge is the
 * only transport. This module keeps the protocol *vocabulary*, which is
 * transport-independent. Message envelope types live in websocket/types.ts;
 * response payload types live in types/action-results.ts. Unrouted actions
 * (messages.listAttachments, addressBooks.get, ping, getVersion) were purged:
 * the extension handler has no case for them.
 * @module types/native-messaging
 */

/** Message actions (Server -> Extension) */
export const MessageActions = {
  // Messages
  MESSAGES_SEARCH: "messages.search",
  MESSAGES_LIST: "messages.list",
  MESSAGES_GET: "messages.get",
  MESSAGES_GET_FULL: "messages.getFull",
  MESSAGES_GET_RAW: "messages.getRaw",
  MESSAGES_UPDATE: "messages.update",
  MESSAGES_MOVE: "messages.move",
  MESSAGES_COPY: "messages.copy",
  MESSAGES_DELETE: "messages.delete",
  MESSAGES_ARCHIVE: "messages.archive",

  // Folders
  FOLDERS_LIST: "folders.list",
  FOLDERS_GET: "folders.get",
  FOLDERS_CREATE: "folders.create",
  FOLDERS_RENAME: "folders.rename",
  FOLDERS_DELETE: "folders.delete",
  FOLDERS_MOVE: "folders.move",
  FOLDERS_MARK_READ: "folders.markAsRead",

  // Tags
  TAGS_LIST: "tags.list",
  TAGS_CREATE: "tags.create",
  TAGS_UPDATE: "tags.update",
  TAGS_DELETE: "tags.delete",

  // Accounts
  ACCOUNTS_LIST: "accounts.list",
  ACCOUNTS_GET: "accounts.get",
  IDENTITIES_LIST: "identities.list",

  // Address Books & Contacts
  ADDRESSBOOKS_LIST: "addressBooks.list",
  ADDRESSBOOKS_CREATE: "addressBooks.create",
  ADDRESSBOOKS_DELETE: "addressBooks.delete",
  CONTACTS_LIST: "contacts.list",
  CONTACTS_SEARCH: "contacts.search",
  CONTACTS_GET: "contacts.get",
  CONTACTS_CREATE: "contacts.create",
  CONTACTS_UPDATE: "contacts.update",
  CONTACTS_DELETE: "contacts.delete",

  // Calendar (Experimental)
  CALENDARS_LIST: "calendars.list",
  CALENDARS_GET: "calendars.get",
  EVENTS_LIST: "events.list",
  EVENTS_SEARCH: "events.search",
  EVENTS_GET: "events.get",
  EVENTS_CREATE: "events.create",
  EVENTS_UPDATE: "events.update",
  EVENTS_MOVE: "events.move",
  EVENTS_DELETE: "events.delete",

  // Tasks (Experimental)
  TASKS_LIST: "tasks.list",
  TASKS_GET: "tasks.get",
  TASKS_CREATE: "tasks.create",
  TASKS_UPDATE: "tasks.update",
  TASKS_DELETE: "tasks.delete",
  TASKS_COMPLETE: "tasks.complete",

  // Compose
  COMPOSE_BEGIN_NEW: "compose.beginNew",
  COMPOSE_BEGIN_REPLY: "compose.beginReply",
  COMPOSE_BEGIN_FORWARD: "compose.beginForward",
  COMPOSE_GET_DETAILS: "compose.getDetails",
  COMPOSE_SET_DETAILS: "compose.setDetails",
  COMPOSE_SAVE_DRAFT: "compose.saveDraft",
  COMPOSE_SAVE_TEMPLATE: "compose.saveTemplate",
  COMPOSE_SEND: "compose.send",
} as const;

/** Union of all action string literals */
export type MessageAction =
  (typeof MessageActions)[keyof typeof MessageActions];
