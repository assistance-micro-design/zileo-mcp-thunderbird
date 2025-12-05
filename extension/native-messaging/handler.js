/**
 * Native Messaging Handler - Routes requests to appropriate API handlers
 */

import { MessagesAPI } from '../api/messages.js';
import { FoldersAPI } from '../api/folders.js';
import { ContactsAPI } from '../api/contacts.js';
import { AccountsAPI } from '../api/accounts.js';
import { TagsAPI } from '../api/tags.js';

/**
 * Handle incoming native message and dispatch to appropriate API
 * @param {Object} message - Native message from MCP server
 * @returns {Promise<Object>} Response object
 */
export async function handleNativeMessage(message) {
  const { id, method, params } = message;

  try {
    // Validate message format
    if (!id || !method) {
      return createErrorResponse(id, -32600, 'Invalid Request', {
        reason: 'Missing id or method'
      });
    }

    // Route to appropriate handler
    const result = await dispatch(method, params || {});

    return {
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      }
    };

  } catch (error) {
    console.error('[Handler] Error processing request:', error);
    return createErrorResponse(id, -32603, 'Internal error', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Dispatch method to appropriate API handler
 * @param {string} method - Method name
 * @param {Object} params - Method parameters
 * @returns {Promise<any>} Method result
 */
async function dispatch(method, params) {
  const [domain, action] = method.split('_').slice(1); // Remove 'thunderbird_' prefix

  switch (domain) {
    case 'messages':
      return await handleMessagesAPI(action, params);

    case 'folders':
      return await handleFoldersAPI(action, params);

    case 'contacts':
      return await handleContactsAPI(action, params);

    case 'addressbooks':
      return await handleAddressBooksAPI(action, params);

    case 'accounts':
      return await handleAccountsAPI(action, params);

    case 'identities':
      return await handleIdentitiesAPI(action, params);

    case 'tags':
      return await handleTagsAPI(action, params);

    default:
      throw new Error(`Unknown domain: ${domain}`);
  }
}

/**
 * Handle Messages API calls
 */
async function handleMessagesAPI(action, params) {
  switch (action) {
    case 'search':
      return await MessagesAPI.search(params);

    case 'list':
      return await MessagesAPI.list(params.folderId, params.limit, params.offset);

    case 'list_unread':
      return await MessagesAPI.listUnread(params.accountId, params.limit);

    case 'get':
      return await MessagesAPI.get(params.messageId, params.format);

    case 'update':
      await MessagesAPI.update(params.messageId, params);
      return { success: true };

    case 'move':
      await MessagesAPI.move(params.messageIds, params.destinationFolderId);
      return { success: true };

    case 'copy':
      await MessagesAPI.copy(params.messageIds, params.destinationFolderId);
      return { success: true };

    case 'delete':
      await MessagesAPI.delete(params.messageIds, params.permanent);
      return { success: true };

    case 'archive':
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
    case 'list':
      return await FoldersAPI.list(params.accountId, params.includeSubFolders);

    case 'get':
      return await FoldersAPI.get(params.folderId);

    case 'create':
      return await FoldersAPI.create(params.parentFolderId, params.name);

    case 'rename':
      return await FoldersAPI.rename(params.folderId, params.newName);

    case 'delete':
      await FoldersAPI.delete(params.folderId);
      return { success: true };

    case 'move':
      await FoldersAPI.move(params.folderId, params.destinationFolderId);
      return { success: true };

    case 'mark_read':
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
    case 'search':
      return await ContactsAPI.searchContacts(params.query, params.addressBookId, params.limit);

    case 'list':
      return await ContactsAPI.listContacts(params.addressBookId, params.limit, params.offset);

    case 'get':
      return await ContactsAPI.getContact(params.contactId);

    case 'create':
      return await ContactsAPI.createContact(params.addressBookId, params.properties);

    case 'update':
      await ContactsAPI.updateContact(params.contactId, params.properties);
      return { success: true };

    case 'delete':
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
    case 'list':
      return await ContactsAPI.listAddressBooks();

    case 'create':
      return await ContactsAPI.createAddressBook(params.name);

    case 'delete':
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
    case 'list':
      return await AccountsAPI.list();

    case 'get':
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
    case 'list':
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
    case 'list':
      return await TagsAPI.list();

    case 'create':
      await TagsAPI.create(params.key, params.tag, params.color);
      return { success: true };

    case 'update':
      await TagsAPI.update(params.key, params);
      return { success: true };

    case 'delete':
      await TagsAPI.delete(params.key);
      return { success: true };

    default:
      throw new Error(`Unknown tags action: ${action}`);
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(id, code, message, data) {
  return {
    id,
    error: {
      code,
      message,
      data
    }
  };
}
