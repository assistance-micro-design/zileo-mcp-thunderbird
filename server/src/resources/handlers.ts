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
 * Resource Handlers
 * MCP resource handlers for read-only contextual data
 * @module resources/handlers
 */

import { getBridgeClient } from "../websocket/client-adapter.js";
import { MessageActions } from "../types/native-messaging.js";
import type { ResourceContentsItem } from "../types/mcp.js";
import type { ContactNode } from "../types/thunderbird.js";
import logger from "../utils/logger.js";

/**
 * Resource handler function type
 */
export type ResourceHandler = (uri: string) => Promise<ResourceContentsItem>;

/**
 * Handle thunderbird://accounts resource
 * Returns all configured accounts
 */
export async function handleAccountsResource(
  uri: string,
): Promise<ResourceContentsItem> {
  logger.info("Fetching accounts resource");
  const client = getBridgeClient();

  const response = await client.sendRequest(MessageActions.ACCOUNTS_LIST, {});

  if (!response.success) {
    throw new Error(response.error?.message || "Failed to fetch accounts");
  }

  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://folders/{accountId} resource
 * Returns folder tree for a specific account
 */
export async function handleFoldersResource(
  uri: string,
): Promise<ResourceContentsItem> {
  const match = uri.match(/^thunderbird:\/\/folders\/(.+)$/);
  if (!match) {
    throw new Error("Invalid folder resource URI");
  }

  const accountId = match[1];
  logger.info(`Fetching folders resource for account: ${accountId}`);
  const client = getBridgeClient();

  const response = await client.sendRequest(MessageActions.FOLDERS_LIST, {
    accountId,
    includeSubFolders: true,
  });

  if (!response.success) {
    throw new Error(response.error?.message || "Failed to fetch folders");
  }

  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://inbox/unread resource
 * Returns all unread messages across all accounts
 */
export async function handleInboxUnreadResource(
  uri: string,
): Promise<ResourceContentsItem> {
  logger.info("Fetching all unread messages");
  const client = getBridgeClient();

  const response = await client.sendRequest(MessageActions.MESSAGES_SEARCH, {
    unread: true,
    limit: 100,
  });

  if (!response.success) {
    throw new Error(
      response.error?.message || "Failed to fetch unread messages",
    );
  }

  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://inbox/unread/{accountId} resource
 * Returns unread messages for a specific account
 */
export async function handleInboxUnreadAccountResource(
  uri: string,
): Promise<ResourceContentsItem> {
  const match = uri.match(/^thunderbird:\/\/inbox\/unread\/(.+)$/);
  if (!match) {
    throw new Error("Invalid inbox unread resource URI");
  }

  const accountId = match[1];
  logger.info(`Fetching unread messages for account: ${accountId}`);
  const client = getBridgeClient();

  const response = await client.sendRequest(MessageActions.MESSAGES_SEARCH, {
    unread: true,
    accountId,
    limit: 100,
  });

  if (!response.success) {
    throw new Error(
      response.error?.message || "Failed to fetch unread messages",
    );
  }

  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://contacts/recent resource
 * Returns recently used contacts
 */
export async function handleContactsRecentResource(
  uri: string,
): Promise<ResourceContentsItem> {
  logger.info("Fetching recent contacts");
  const client = getBridgeClient();

  // Get all address books
  const addressBooksResponse = await client.sendRequest(
    MessageActions.ADDRESSBOOKS_LIST,
    {},
  );

  if (!addressBooksResponse.success) {
    throw new Error(
      addressBooksResponse.error?.message || "Failed to fetch address books",
    );
  }

  // For now, return contacts from all books (limited)
  // In a real implementation, we'd track "recent" usage.
  // data is typed AddressBookNode[] via the ActionResultMap contract.
  const addressBooks = addressBooksResponse.data ?? [];
  const allContacts: ContactNode[] = [];

  for (const book of addressBooks.slice(0, 3)) {
    // Limit to first 3 books
    const contactsResponse = await client.sendRequest(
      MessageActions.CONTACTS_LIST,
      {
        addressBookId: book.id,
        limit: 10,
      },
    );

    // contacts.list returns a pagination envelope { contacts, total, ... } —
    // the previous Array.isArray(data) check never matched, so this resource
    // silently returned an empty list (bug surfaced by the typed contract).
    if (
      contactsResponse.success &&
      Array.isArray(contactsResponse.data?.contacts)
    ) {
      allContacts.push(...contactsResponse.data.contacts);
    }
  }

  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(allContacts.slice(0, 20), null, 2),
  };
}

/**
 * Handle thunderbird://calendar/today resource
 * Returns today's calendar events
 */
export async function handleCalendarTodayResource(
  uri: string,
): Promise<ResourceContentsItem> {
  logger.info("Fetching today's calendar events");
  const client = getBridgeClient();

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const todayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
  );

  const response = await client.sendRequest(MessageActions.EVENTS_SEARCH, {
    dateFrom: todayStart.toISOString(),
    dateTo: todayEnd.toISOString(),
    limit: 50,
  });

  if (!response.success) {
    throw new Error(
      response.error?.message || "Failed to fetch today's events",
    );
  }

  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://calendar/upcoming resource
 * Returns upcoming calendar events (next 7 days)
 */
export async function handleCalendarUpcomingResource(
  uri: string,
): Promise<ResourceContentsItem> {
  logger.info("Fetching upcoming calendar events");
  const client = getBridgeClient();

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const response = await client.sendRequest(MessageActions.EVENTS_SEARCH, {
    dateFrom: today.toISOString(),
    dateTo: nextWeek.toISOString(),
    limit: 100,
  });

  if (!response.success) {
    throw new Error(
      response.error?.message || "Failed to fetch upcoming events",
    );
  }

  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://tasks/pending resource
 * Returns pending (incomplete) tasks
 */
export async function handleTasksPendingResource(
  uri: string,
): Promise<ResourceContentsItem> {
  logger.info("Fetching pending tasks");
  const client = getBridgeClient();

  const response = await client.sendRequest(MessageActions.TASKS_LIST, {
    completed: false,
    limit: 100,
  });

  if (!response.success) {
    throw new Error(response.error?.message || "Failed to fetch pending tasks");
  }

  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Resource handler map
 */
export const resourceHandlers: Record<string, ResourceHandler> = {
  "thunderbird://accounts": handleAccountsResource,
  "thunderbird://inbox/unread": handleInboxUnreadResource,
  "thunderbird://contacts/recent": handleContactsRecentResource,
  "thunderbird://calendar/today": handleCalendarTodayResource,
  "thunderbird://calendar/upcoming": handleCalendarUpcomingResource,
  "thunderbird://tasks/pending": handleTasksPendingResource,
};

/**
 * Resource URI patterns with handlers
 */
export const resourcePatterns: Array<{
  pattern: RegExp;
  handler: ResourceHandler;
}> = [
  {
    pattern: /^thunderbird:\/\/folders\/[^/]+$/,
    handler: handleFoldersResource,
  },
  {
    pattern: /^thunderbird:\/\/inbox\/unread\/[^/]+$/,
    handler: handleInboxUnreadAccountResource,
  },
];

/**
 * Get resource handler for URI
 */
export function getResourceHandler(uri: string): ResourceHandler | undefined {
  // Check exact matches first
  if (uri in resourceHandlers) {
    return resourceHandlers[uri];
  }

  // Check pattern matches
  for (const { pattern, handler } of resourcePatterns) {
    if (pattern.test(uri)) {
      return handler;
    }
  }

  return undefined;
}
