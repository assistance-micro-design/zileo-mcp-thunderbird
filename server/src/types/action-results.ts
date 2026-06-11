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
 * Action Result Types
 * Compile-time contract between the MCP server and the Thunderbird extension:
 * maps every native action (MessageActions) to the REAL payload shape returned
 * by the extension wrappers (extension/api/*.js via handler.js).
 *
 * These types describe the extension reality, verified against the wrapper
 * sources on 2026-06-10 — when a wrapper changes its response shape, update
 * the map here (contract-coherence.test.ts guards the parameter direction;
 * this module guards the response direction at compile time).
 * @module types/action-results
 */

import type {
  MailAccount,
  MailIdentity,
  MailFolder,
  MessageHeader,
  MessagePart,
  MessageTag,
  AddressBookNode,
  ContactNode,
  ComposeDetails,
} from "./thunderbird.js";
import type { Calendar } from "./calendar.js";
import type {
  ComposeTabResult,
  ComposeSaveResult,
  ComposeSendResult,
} from "./compose.js";

// =============================================================================
// Shared result shapes
// =============================================================================

/** Result of a mutation action that returns no data ({ success: true }) */
export interface OperationSuccess {
  success: true;
}

/**
 * Paginated message response (messages.search, and messages.list_unread /
 * list_recent which route through messages.search). The scan is bounded by
 * MAX_SCAN (5000) in the extension; scanComplete: false means total is a
 * lower bound, never a silent truncation.
 */
export interface MessagesPage {
  messages: MessageHeader[];
  total: number;
  hasMore: boolean;
  scanComplete: boolean;
}

/** messages.list adds the echoed pagination window to MessagesPage */
export interface FolderMessagesPage extends MessagesPage {
  limit: number;
  offset: number;
}

/** messages.getFull: MessageHeader merged with MIME parts and raw headers */
export interface FullMessage extends MessageHeader {
  parts: MessagePart[];
  headers: Record<string, string[]>;
}

/** contacts.list pagination envelope */
export interface ContactsPage {
  contacts: ContactNode[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Calendar event/item as formatted by the extension (_formatCalendarItem):
 * a flat projection of the jCal payload, NOT the full iCalendar model.
 */
export interface CalendarItemResult {
  id: string;
  calendarId: string;
  /** Item type reported by the calendar experiment (e.g. "event") */
  type: string;
  title: string | null;
  start: string | null;
  end: string | null;
  description: string | null;
  location: string | null;
  /** Attendee email addresses (mailto: prefix stripped) */
  attendees: string[];
}

/** Task as formatted by the extension (_formatTask) */
export interface TaskItemResult {
  id: string;
  calendarId: string;
  type: "task";
  title: string | null;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  priority: number | null;
}

// =============================================================================
// Action → result map
// =============================================================================

/**
 * Map of native action names to the payload type carried in the `data`
 * field of the extension response. Keys mirror MessageActions values.
 */
export interface ActionResultMap {
  // Messages
  "messages.search": MessagesPage;
  "messages.list": FolderMessagesPage;
  "messages.get": MessageHeader;
  "messages.getFull": FullMessage;
  "messages.getRaw": string;
  "messages.update": OperationSuccess;
  "messages.move": OperationSuccess;
  "messages.copy": OperationSuccess;
  "messages.delete": OperationSuccess;
  "messages.archive": OperationSuccess;

  // Folders
  "folders.list": MailFolder[];
  "folders.get": MailFolder;
  "folders.create": MailFolder;
  "folders.rename": MailFolder;
  "folders.delete": OperationSuccess;
  "folders.move": MailFolder | undefined;
  "folders.markAsRead": OperationSuccess;

  // Tags
  "tags.list": MessageTag[];
  "tags.create": OperationSuccess;
  "tags.update": OperationSuccess;
  "tags.delete": OperationSuccess;

  // Accounts
  "accounts.list": MailAccount[];
  "accounts.get": MailAccount;
  "identities.list": MailIdentity[];

  // Address books & contacts
  "addressBooks.list": AddressBookNode[];
  "addressBooks.create": AddressBookNode;
  "addressBooks.delete": OperationSuccess;
  "contacts.list": ContactsPage;
  "contacts.search": ContactNode[];
  "contacts.get": ContactNode;
  "contacts.create": string;
  "contacts.update": OperationSuccess;
  "contacts.delete": OperationSuccess;

  // Calendar (experimental)
  "calendars.list": Calendar[];
  "calendars.get": Calendar;
  "events.list": CalendarItemResult[];
  "events.search": CalendarItemResult[];
  "events.get": CalendarItemResult;
  "events.create": CalendarItemResult;
  "events.update": CalendarItemResult;
  "events.move": CalendarItemResult;
  "events.delete": OperationSuccess;

  // Tasks (experimental)
  "tasks.list": TaskItemResult[];
  "tasks.get": TaskItemResult;
  "tasks.create": TaskItemResult;
  "tasks.update": TaskItemResult;
  "tasks.complete": TaskItemResult;
  "tasks.delete": OperationSuccess;

  // Compose
  "compose.beginNew": ComposeTabResult;
  "compose.beginReply": ComposeTabResult;
  "compose.beginForward": ComposeTabResult;
  "compose.getDetails": ComposeDetails;
  "compose.setDetails": OperationSuccess;
  "compose.saveDraft": ComposeSaveResult;
  "compose.saveTemplate": ComposeSaveResult;
  "compose.send": ComposeSendResult;
}

/**
 * Resolves the result type for an action. Unmapped/dynamic action strings
 * (e.g. resolved at runtime by tool-handler) fall back to `unknown`.
 */
export type ActionResult<A extends string> = A extends keyof ActionResultMap
  ? ActionResultMap[A]
  : unknown;
