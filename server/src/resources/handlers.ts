/**
 * Resource Handlers
 * MCP resource handlers for read-only contextual data
 * @module resources/handlers
 */

import { getNativeClient } from '../websocket/client-adapter.js';
import { MessageActions } from '../types/native-messaging.js';
import type { ResourceContentsItem } from '../types/mcp.js';
import logger from '../utils/logger.js';

/**
 * Resource handler function type
 */
export type ResourceHandler = (uri: string) => Promise<ResourceContentsItem>;

/**
 * Handle thunderbird://accounts resource
 * Returns all configured accounts
 */
export async function handleAccountsResource(uri: string): Promise<ResourceContentsItem> {
  logger.info('Fetching accounts resource');
  const client = getNativeClient();

  const response = await client.sendRequest(MessageActions.ACCOUNTS_LIST, {});

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch accounts');
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://folders/{accountId} resource
 * Returns folder tree for a specific account
 */
export async function handleFoldersResource(uri: string): Promise<ResourceContentsItem> {
  const match = uri.match(/^thunderbird:\/\/folders\/(.+)$/);
  if (!match) {
    throw new Error('Invalid folder resource URI');
  }

  const accountId = match[1];
  logger.info(`Fetching folders resource for account: ${accountId}`);
  const client = getNativeClient();

  const response = await client.sendRequest(MessageActions.FOLDERS_LIST, {
    accountId,
    includeSubFolders: true,
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch folders');
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://inbox/unread resource
 * Returns all unread messages across all accounts
 */
export async function handleInboxUnreadResource(uri: string): Promise<ResourceContentsItem> {
  logger.info('Fetching all unread messages');
  const client = getNativeClient();

  const response = await client.sendRequest(MessageActions.MESSAGES_SEARCH, {
    unread: true,
    limit: 100,
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch unread messages');
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://inbox/unread/{accountId} resource
 * Returns unread messages for a specific account
 */
export async function handleInboxUnreadAccountResource(uri: string): Promise<ResourceContentsItem> {
  const match = uri.match(/^thunderbird:\/\/inbox\/unread\/(.+)$/);
  if (!match) {
    throw new Error('Invalid inbox unread resource URI');
  }

  const accountId = match[1];
  logger.info(`Fetching unread messages for account: ${accountId}`);
  const client = getNativeClient();

  const response = await client.sendRequest(MessageActions.MESSAGES_SEARCH, {
    unread: true,
    accountId,
    limit: 100,
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch unread messages');
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://contacts/recent resource
 * Returns recently used contacts
 */
export async function handleContactsRecentResource(uri: string): Promise<ResourceContentsItem> {
  logger.info('Fetching recent contacts');
  const client = getNativeClient();

  // Get all address books
  const addressBooksResponse = await client.sendRequest(MessageActions.ADDRESSBOOKS_LIST, {});

  if (!addressBooksResponse.success) {
    throw new Error(addressBooksResponse.error?.message || 'Failed to fetch address books');
  }

  // For now, return contacts from all books (limited)
  // In a real implementation, we'd track "recent" usage
  const addressBooks = addressBooksResponse.data as Array<{ id: string }>;
  const allContacts: unknown[] = [];

  for (const book of addressBooks.slice(0, 3)) { // Limit to first 3 books
    const contactsResponse = await client.sendRequest(MessageActions.CONTACTS_LIST, {
      addressBookId: book.id,
      limit: 10,
    });

    if (contactsResponse.success && Array.isArray(contactsResponse.data)) {
      allContacts.push(...contactsResponse.data);
    }
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(allContacts.slice(0, 20), null, 2),
  };
}

/**
 * Handle thunderbird://calendar/today resource
 * Returns today's calendar events
 */
export async function handleCalendarTodayResource(uri: string): Promise<ResourceContentsItem> {
  logger.info('Fetching today\'s calendar events');
  const client = getNativeClient();

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const response = await client.sendRequest(MessageActions.EVENTS_SEARCH, {
    dateFrom: todayStart.toISOString(),
    dateTo: todayEnd.toISOString(),
    limit: 50,
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch today\'s events');
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://calendar/upcoming resource
 * Returns upcoming calendar events (next 7 days)
 */
export async function handleCalendarUpcomingResource(uri: string): Promise<ResourceContentsItem> {
  logger.info('Fetching upcoming calendar events');
  const client = getNativeClient();

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const response = await client.sendRequest(MessageActions.EVENTS_SEARCH, {
    dateFrom: today.toISOString(),
    dateTo: nextWeek.toISOString(),
    limit: 100,
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch upcoming events');
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Handle thunderbird://tasks/pending resource
 * Returns pending (incomplete) tasks
 */
export async function handleTasksPendingResource(uri: string): Promise<ResourceContentsItem> {
  logger.info('Fetching pending tasks');
  const client = getNativeClient();

  const response = await client.sendRequest(MessageActions.TASKS_LIST, {
    completed: false,
    limit: 100,
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch pending tasks');
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(response.data, null, 2),
  };
}

/**
 * Resource handler map
 */
export const resourceHandlers: Record<string, ResourceHandler> = {
  'thunderbird://accounts': handleAccountsResource,
  'thunderbird://inbox/unread': handleInboxUnreadResource,
  'thunderbird://contacts/recent': handleContactsRecentResource,
  'thunderbird://calendar/today': handleCalendarTodayResource,
  'thunderbird://calendar/upcoming': handleCalendarUpcomingResource,
  'thunderbird://tasks/pending': handleTasksPendingResource,
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
