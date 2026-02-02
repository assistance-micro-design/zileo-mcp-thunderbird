/**
 * Messages API - Wrapper for messenger.messages.*
 * Provides email search, list, get, update, move, copy, delete, archive operations
 */

export const MessagesAPI = {
  /**
   * Search messages with advanced filters
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Array of message headers
   */
  async search(params) {
    const {
      subject,
      from,
      to,
      body,
      tags = [],
      unread,
      dateFrom,
      dateTo,
      folderId,
      limit = 50,
    } = params;

    const query = {};

    if (subject) query.subject = subject;
    if (from) query.author = from;
    if (to) query.recipients = to;
    if (body) query.body = body;
    if (tags.length > 0) query.tags = { tags, mode: "any" };
    if (unread !== undefined) query.read = !unread;
    if (dateFrom) query.fromDate = new Date(dateFrom);
    if (dateTo) query.toDate = new Date(dateTo);
    if (folderId) query.folderId = folderId;

    const messageList = await messenger.messages.query(query);
    return messageList.messages.slice(0, limit);
  },

  /**
   * List messages in a folder with pagination
   * @param {string} folderId - Folder ID
   * @param {number} limit - Maximum messages to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Message list with pagination info
   */
  async list(folderId, limit = 50, offset = 0) {
    // messages.list() takes a folderId string directly, not a MailFolder object
    const messageList = await messenger.messages.list(folderId);

    const messages = messageList.messages || [];
    const paginatedMessages = messages.slice(offset, offset + limit);

    return {
      messages: paginatedMessages,
      total: messages.length,
      limit,
      offset,
      hasMore: offset + limit < messages.length,
    };
  },

  /**
   * List all unread messages
   * @param {string} accountId - Optional account ID to filter
   * @param {number} limit - Maximum messages to return
   * @returns {Promise<Array>} Array of unread messages
   */
  async listUnread(accountId, limit = 100) {
    const query = { read: false };

    if (accountId) {
      const account = await messenger.accounts.get(accountId);
      const folders = await this._getAllFolders(account);

      const allMessages = [];
      for (const folder of folders) {
        const messageList = await messenger.messages.query({
          ...query,
          folderId: folder.id,
        });
        allMessages.push(...messageList.messages);
      }

      return allMessages.slice(0, limit);
    } else {
      const messageList = await messenger.messages.query(query);
      return messageList.messages.slice(0, limit);
    }
  },

  /**
   * Get message details
   * @param {number} messageId - Message ID
   * @param {string} format - Format: 'headers' | 'full' | 'raw'
   * @returns {Promise<Object>} Message details
   */
  async get(messageId, format = "headers") {
    const message = await messenger.messages.get(messageId);

    if (format === "full") {
      return await this.getFull(messageId);
    } else if (format === "raw") {
      // Request BinaryString format for JSON serialization (File format can't be serialized)
      return await messenger.messages.getRaw(messageId, {
        data_format: "BinaryString",
      });
    }

    return message;
  },

  /**
   * Get full message with parts
   * @param {number} messageId - Message ID
   * @returns {Promise<Object>} Full message with parts
   */
  async getFull(messageId) {
    const [message, full] = await Promise.all([
      messenger.messages.get(messageId),
      messenger.messages.getFull(messageId),
    ]);

    return {
      ...message,
      parts: full.parts || [],
      headers: full.headers || {},
    };
  },

  /**
   * Update message properties
   * @param {number} messageId - Message ID
   * @param {Object} properties - Properties to update
   * @returns {Promise<void>}
   */
  async update(messageId, properties) {
    const updateProps = {};

    if (properties.read !== undefined) {
      updateProps.read = properties.read;
    }
    if (properties.flagged !== undefined) {
      updateProps.flagged = properties.flagged;
    }
    if (properties.tags !== undefined) {
      updateProps.tags = properties.tags;
    }
    if (properties.junk !== undefined) {
      updateProps.junk = properties.junk;
    }

    await messenger.messages.update(messageId, updateProps);
  },

  /**
   * Move messages to destination folder
   * @param {Array<number>} messageIds - Array of message IDs
   * @param {string} destinationFolderId - Destination folder ID
   * @returns {Promise<void>}
   */
  async move(messageIds, destinationFolderId) {
    // messenger.messages.move expects a MailFolderId (string), not a MailFolder object
    await messenger.messages.move(messageIds, destinationFolderId);
  },

  /**
   * Copy messages to destination folder
   * @param {Array<number>} messageIds - Array of message IDs
   * @param {string} destinationFolderId - Destination folder ID
   * @returns {Promise<void>}
   */
  async copy(messageIds, destinationFolderId) {
    // messenger.messages.copy expects a MailFolderId (string), not a MailFolder object
    await messenger.messages.copy(messageIds, destinationFolderId);
  },

  /**
   * Delete messages
   * @param {Array<number>} messageIds - Array of message IDs
   * @param {boolean} permanent - If true, skip trash
   * @returns {Promise<void>}
   */
  async delete(messageIds, permanent = false) {
    if (permanent) {
      await messenger.messages.delete(messageIds, true);
    } else {
      await messenger.messages.delete(messageIds, false);
    }
  },

  /**
   * Archive messages
   * @param {Array<number>} messageIds - Array of message IDs
   * @returns {Promise<void>}
   */
  async archive(messageIds) {
    await messenger.messages.archive(messageIds);
  },

  /**
   * Helper: Get all folders recursively for an account
   * @private
   */
  async _getAllFolders(account) {
    const folders = [];

    const traverse = async (folder) => {
      folders.push(folder);
      if (folder.subFolders) {
        for (const subFolder of folder.subFolders) {
          await traverse(subFolder);
        }
      }
    };

    for (const rootFolder of account.folders || []) {
      await traverse(rootFolder);
    }

    return folders;
  },
};
