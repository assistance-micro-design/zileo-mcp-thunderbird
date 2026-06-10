/**
 * Native Messaging Handler - Routes requests to appropriate API handlers
 */

import { MessagesAPI } from "../api/messages.js";
import { FoldersAPI } from "../api/folders.js";
import { ContactsAPI } from "../api/contacts.js";
import { AccountsAPI } from "../api/accounts.js";
import { TagsAPI } from "../api/tags.js";
import { CalendarAPI } from "../api/calendar.js";
import { ComposeAPI } from "../api/compose.js";

/**
 * SEC-REVIEW-005: Validate that input is a plain object (not null, not array, not primitive).
 * @param {unknown} value - Value to validate
 * @returns {boolean} true if value is a plain object
 */
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Handle incoming message and dispatch to appropriate API
 * @param {Object} message - Message from MCP server (via WebSocket or native messaging)
 * @returns {Promise<Object>} Response object with data
 */
export async function handleNativeMessage(message) {
  // SEC-REVIEW-005: Validate message is a plain object
  if (!isPlainObject(message)) {
    throw new Error("Invalid message: expected an object");
  }

  // Support both 'action' (WebSocket) and 'method' (legacy) format
  const { action, method, params } = message;
  const requestMethod = action || method;

  try {
    // Validate message format
    if (!requestMethod || typeof requestMethod !== "string") {
      throw new Error("Missing or invalid action/method in request");
    }

    // SEC-REVIEW-005: Validate params is a plain object if provided
    if (params !== undefined && params !== null && !isPlainObject(params)) {
      throw new Error("Invalid params: expected an object");
    }

    // Route to appropriate handler
    const result = await dispatch(requestMethod, params || {});

    // Return data directly for WebSocket format
    return { data: result };
  } catch (error) {
    console.error("[Handler] Error processing request:", error);
    throw error;
  }
}

/**
 * Dispatch method to appropriate API handler
 * @param {string} method - Method name (formats: 'messages.search' or 'thunderbird_messages_search')
 * @param {Object} params - Method parameters
 * @returns {Promise<any>} Method result
 */
async function dispatch(method, params) {
  let domain, action;

  // Support both formats: 'messages.search' and 'thunderbird_messages_search'
  if (method.includes(".")) {
    // New format: 'messages.search'
    [domain, action] = method.split(".");
  } else {
    // Legacy format: 'thunderbird_messages_search'
    [domain, action] = method.split("_").slice(1);
  }

  // SEC-REVIEW-005: Validate extracted domain and action
  if (!domain || !action) {
    throw new Error(`Invalid method format: "${method}". Expected "domain.action" or "thunderbird_domain_action"`);
  }

  switch (domain) {
    case "messages":
      return await handleMessagesAPI(action, params);

    case "folders":
      return await handleFoldersAPI(action, params);

    case "contacts":
      return await handleContactsAPI(action, params);

    case "addressBooks":
      return await handleAddressBooksAPI(action, params);

    case "accounts":
      return await handleAccountsAPI(action, params);

    case "identities":
      return await handleIdentitiesAPI(action, params);

    case "tags":
      return await handleTagsAPI(action, params);

    case "calendars":
      return await handleCalendarsAPI(action, params);

    case "events":
      return await handleEventsAPI(action, params);

    case "tasks":
      return await handleTasksAPI(action, params);

    case "compose":
      return await handleComposeAPI(action, params);

    default:
      throw new Error(`Unknown domain: ${domain}`);
  }
}

/**
 * Handle Messages API calls
 */
async function handleMessagesAPI(action, params) {
  switch (action) {
    case "search":
      return await MessagesAPI.search(params);

    case "list":
      return await MessagesAPI.list(
        params.folderId,
        params.limit,
        params.offset,
        params.sortBy,
        params.sortOrder,
      );

    case "list_unread":
      return await MessagesAPI.listUnread(
        params.accountId,
        params.limit,
        params.sortBy,
        params.sortOrder,
      );

    case "get":
      return await MessagesAPI.get(params.messageId, "headers");

    case "getFull":
      return await MessagesAPI.get(params.messageId, "full");

    case "getRaw":
      return await MessagesAPI.get(params.messageId, "raw");

    case "update":
      await MessagesAPI.update(params.messageId, params);
      return { success: true };

    case "move":
      await MessagesAPI.move(params.messageIds, params.destinationFolderId);
      return { success: true };

    case "copy":
      await MessagesAPI.copy(params.messageIds, params.destinationFolderId);
      return { success: true };

    case "delete":
      await MessagesAPI.delete(params.messageIds, params.permanent);
      return { success: true };

    case "archive":
      await MessagesAPI.archive(params.messageIds);
      return { success: true };

    default:
      throw new Error(`Unknown messages action: ${action}`);
  }
}

/**
 * Handle Folders API calls
 */
async function handleFoldersAPI(action, params) {
  switch (action) {
    case "list":
      return await FoldersAPI.list(params.accountId, params.includeSubFolders);

    case "get":
      return await FoldersAPI.get(params.folderId);

    case "create":
      return await FoldersAPI.create(params.parentFolderId, params.name);

    case "rename":
      return await FoldersAPI.rename(params.folderId, params.newName);

    case "delete":
      await FoldersAPI.delete(params.folderId);
      return { success: true };

    case "move":
      await FoldersAPI.move(params.folderId, params.destinationFolderId);
      return { success: true };

    case "markAsRead":
      await FoldersAPI.markAsRead(params.folderId);
      return { success: true };

    default:
      throw new Error(`Unknown folders action: ${action}`);
  }
}

/**
 * Handle Contacts API calls
 */
async function handleContactsAPI(action, params) {
  switch (action) {
    case "search":
      return await ContactsAPI.searchContacts(
        params.query,
        params.addressBookId,
        params.limit,
      );

    case "list":
      return await ContactsAPI.listContacts(
        params.addressBookId,
        params.limit,
        params.offset,
      );

    case "get":
      return await ContactsAPI.getContact(params.contactId);

    case "create":
      return await ContactsAPI.createContact(
        params.addressBookId,
        params.properties,
      );

    case "update":
      await ContactsAPI.updateContact(params.contactId, params.properties);
      return { success: true };

    case "delete":
      await ContactsAPI.deleteContact(params.contactId);
      return { success: true };

    default:
      throw new Error(`Unknown contacts action: ${action}`);
  }
}

/**
 * Handle AddressBooks API calls
 */
async function handleAddressBooksAPI(action, params) {
  switch (action) {
    case "list":
      return await ContactsAPI.listAddressBooks();

    case "create":
      return await ContactsAPI.createAddressBook(params.name);

    case "delete":
      await ContactsAPI.deleteAddressBook(params.addressBookId);
      return { success: true };

    default:
      throw new Error(`Unknown addressbooks action: ${action}`);
  }
}

/**
 * Handle Accounts API calls
 */
async function handleAccountsAPI(action, params) {
  switch (action) {
    case "list":
      return await AccountsAPI.list();

    case "get":
      return await AccountsAPI.get(params.accountId);

    default:
      throw new Error(`Unknown accounts action: ${action}`);
  }
}

/**
 * Handle Identities API calls
 */
async function handleIdentitiesAPI(action, params) {
  switch (action) {
    case "list":
      return await AccountsAPI.listIdentities(params.accountId);

    default:
      throw new Error(`Unknown identities action: ${action}`);
  }
}

/**
 * Handle Tags API calls
 */
async function handleTagsAPI(action, params) {
  switch (action) {
    case "list":
      return await TagsAPI.list();

    case "create":
      await TagsAPI.create(params.key, params.tag, params.color);
      return { success: true };

    case "update":
      await TagsAPI.update(params.key, params);
      return { success: true };

    case "delete":
      await TagsAPI.delete(params.key);
      return { success: true };

    default:
      throw new Error(`Unknown tags action: ${action}`);
  }
}

/**
 * Handle Calendars API calls
 */
async function handleCalendarsAPI(action, params) {
  switch (action) {
    case "list":
      return await CalendarAPI.listCalendars();

    case "get":
      return await CalendarAPI.getCalendar(params.calendarId);

    default:
      throw new Error(`Unknown calendars action: ${action}`);
  }
}

/**
 * Handle Events API calls
 */
async function handleEventsAPI(action, params) {
  switch (action) {
    case "search":
      return await CalendarAPI.searchEvents(params);

    case "list":
      return await CalendarAPI.listEvents(
        params.calendarId,
        params.dateFrom,
        params.dateTo,
        params.limit,
      );

    case "get":
      return await CalendarAPI.getEvent(params.calendarId, params.eventId);

    case "create":
      return await CalendarAPI.createEvent(params.calendarId, params);

    case "update":
      return await CalendarAPI.updateEvent(
        params.calendarId,
        params.eventId,
        params,
      );

    case "move":
      return await CalendarAPI.moveEvent(
        params.calendarId,
        params.eventId,
        params.newStart,
        params.newEnd,
      );

    case "delete":
      await CalendarAPI.deleteEvent(params.calendarId, params.eventId);
      return { success: true };

    default:
      throw new Error(`Unknown events action: ${action}`);
  }
}

/**
 * Handle Tasks API calls
 */
async function handleTasksAPI(action, params) {
  switch (action) {
    case "list":
      return await CalendarAPI.listTasks(params);

    case "get":
      return await CalendarAPI.getTask(params.calendarId, params.taskId);

    case "create":
      return await CalendarAPI.createTask(params.calendarId, params);

    case "update":
      return await CalendarAPI.updateTask(
        params.calendarId,
        params.taskId,
        params,
      );

    case "complete":
      return await CalendarAPI.completeTask(params.calendarId, params.taskId);

    case "delete":
      await CalendarAPI.deleteTask(params.calendarId, params.taskId);
      return { success: true };

    default:
      throw new Error(`Unknown tasks action: ${action}`);
  }
}

/**
 * Handle Compose API calls
 */
async function handleComposeAPI(action, params) {
  switch (action) {
    case "beginNew":
      return await ComposeAPI.beginNew(params);

    case "beginReply":
      return await ComposeAPI.beginReply(params.messageId, params.replyType);

    case "beginForward":
      return await ComposeAPI.beginForward(
        params.messageId,
        params.forwardType,
      );

    case "getDetails":
      return await ComposeAPI.getDetails(params.tabId);

    case "setDetails":
      await ComposeAPI.setDetails(params.tabId, params);
      return { success: true };

    case "saveDraft":
      return await ComposeAPI.saveDraft(params.tabId);

    case "saveTemplate":
      return await ComposeAPI.saveTemplate(params.tabId);

    case "send":
      return await ComposeAPI.send(params.tabId, params.mode);

    default:
      throw new Error(`Unknown compose action: ${action}`);
  }
}
