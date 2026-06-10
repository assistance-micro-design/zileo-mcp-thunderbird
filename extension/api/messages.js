/**
 * Messages API - Wrapper for messenger.messages.*
 * Provides email search, list, get, update, move, copy, delete, archive operations
 */

/**
 * Maximum number of messages enumerated per request.
 * messenger.messages.list()/query() return ONE page (~100 messages, a
 * non-contractual pref); every page must be fetched via continueList().
 * MAX_SCAN bounds that enumeration so a huge folder cannot stall a request
 * forever. When the bound is hit, the response carries scanComplete: false
 * (never a silent truncation) and the enumeration is released server-side
 * with abortList().
 */
const MAX_SCAN = 5000;

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
      flagged,
      dateFrom,
      dateTo,
      folderId,
      accountId,
      limit = 50,
      sortBy = "date",
      sortOrder = "desc",
    } = params;

    const query = {};

    if (subject) query.subject = subject;
    if (from) query.author = from;
    if (to) query.recipients = to;
    if (body) query.body = body;
    if (tags.length > 0) query.tags = { tags, mode: "any" };
    if (unread !== undefined) query.read = !unread;
    if (flagged !== undefined) query.flagged = flagged;
    if (dateFrom) query.fromDate = new Date(dateFrom);
    if (dateTo) query.toDate = new Date(dateTo);
    if (folderId) query.folderId = folderId;

    // When accountId is provided without an explicit folderId, scope the
    // search to that account by iterating its folders (messenger.messages.query
    // has no native accountId filter). folderId, if also supplied, wins.
    let collected;
    let scanComplete = true;
    if (accountId && !folderId) {
      const account = await messenger.accounts.get(accountId);
      const folders = await this._getAllFolders(account);

      collected = [];
      for (const folder of folders) {
        const remaining = MAX_SCAN - collected.length;
        if (remaining <= 0) {
          scanComplete = false;
          break;
        }
        const firstPage = await messenger.messages.query({
          ...query,
          folderId: folder.id,
        });
        const drained = await this._drainMessageList(firstPage, remaining);
        collected.push(...drained.messages);
        if (!drained.scanComplete) {
          scanComplete = false;
        }
      }
    } else {
      const firstPage = await messenger.messages.query(query);
      const drained = await this._drainMessageList(firstPage, MAX_SCAN);
      collected = drained.messages;
      scanComplete = drained.scanComplete;
    }

    const sorted = this._sortMessages(collected, sortBy, sortOrder);
    return {
      messages: sorted.slice(0, limit),
      total: sorted.length,
      hasMore: sorted.length > limit || !scanComplete,
      scanComplete,
    };
  },

  /**
   * List messages in a folder with pagination
   * @param {string} folderId - Folder ID
   * @param {number} limit - Maximum messages to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Message list with pagination info
   */
  async list(folderId, limit = 50, offset = 0, sortBy = "date", sortOrder = "desc") {
    // messages.list() takes a folderId string directly, not a MailFolder object.
    // It returns only the FIRST page; _drainMessageList walks the remaining
    // pages via continueList() up to MAX_SCAN. Sort is applied client-side via
    // _sortMessages — same strategy as search() and listUnread() — for
    // predictable behavior across Thunderbird versions (the 2-arg listOptions
    // signature is recent-only). offset/limit are applied AFTER the sort, so
    // pagination is consistent across the whole folder, not within one page.
    const firstPage = await messenger.messages.list(folderId);
    const { messages: raw, scanComplete } = await this._drainMessageList(
      firstPage,
      MAX_SCAN,
    );
    const sorted = this._sortMessages(raw, sortBy, sortOrder);
    const paginatedMessages = sorted.slice(offset, offset + limit);

    return {
      messages: paginatedMessages,
      total: sorted.length,
      limit,
      offset,
      hasMore: offset + limit < sorted.length || !scanComplete,
      scanComplete,
    };
  },

  /**
   * List all unread messages
   * @param {string} accountId - Optional account ID to filter
   * @param {number} limit - Maximum messages to return
   * @returns {Promise<Array>} Array of unread messages
   */
  async listUnread(accountId, limit = 100, sortBy = "date", sortOrder = "desc") {
    const query = { read: false };

    let collected;
    let scanComplete = true;
    if (accountId) {
      const account = await messenger.accounts.get(accountId);
      const folders = await this._getAllFolders(account);

      collected = [];
      for (const folder of folders) {
        const remaining = MAX_SCAN - collected.length;
        if (remaining <= 0) {
          scanComplete = false;
          break;
        }
        const firstPage = await messenger.messages.query({
          ...query,
          folderId: folder.id,
        });
        const drained = await this._drainMessageList(firstPage, remaining);
        collected.push(...drained.messages);
        if (!drained.scanComplete) {
          scanComplete = false;
        }
      }
    } else {
      const firstPage = await messenger.messages.query(query);
      const drained = await this._drainMessageList(firstPage, MAX_SCAN);
      collected = drained.messages;
      scanComplete = drained.scanComplete;
    }

    const sorted = this._sortMessages(collected, sortBy, sortOrder);
    return {
      messages: sorted.slice(0, limit),
      total: sorted.length,
      hasMore: sorted.length > limit || !scanComplete,
      scanComplete,
    };
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
   * Helper: Drain a paginated MessageList up to maxScan messages.
   * messenger.messages.list()/query() return one page; the rest must be
   * pulled with continueList(pageId) until id is null. If the budget is
   * exhausted first, the enumeration is released with abortList() and
   * scanComplete is false.
   * @private
   * @param {Object} firstPage - The MessageList returned by list()/query()
   * @param {number} maxScan - Maximum number of messages to accumulate
   * @returns {Promise<{messages: Array, scanComplete: boolean}>}
   */
  async _drainMessageList(firstPage, maxScan) {
    const messages = [...((firstPage && firstPage.messages) || [])];
    let pageId = (firstPage && firstPage.id) || null;

    while (pageId && messages.length < maxScan) {
      const page = await messenger.messages.continueList(pageId);
      messages.push(...(page.messages || []));
      pageId = page.id || null;
    }

    if (pageId) {
      // Budget exhausted with pages remaining: stop the enumeration early.
      try {
        await messenger.messages.abortList(pageId);
      } catch (error) {
        // abortList is available since TB 121; an unreleased enumeration
        // simply expires server-side, so this is non-fatal.
        console.warn("[MessagesAPI] abortList failed:", error);
      }
    }

    return { messages, scanComplete: pageId === null };
  },

  /**
   * Helper: Sort messages in-place-safe, post-collection, pre-truncation.
   * Falsy keys (undefined subject/author) sort last in both directions.
   * @private
   * @param {Array} messages - Messages to sort
   * @param {"date"|"subject"|"author"} sortBy - Field to sort by
   * @param {"asc"|"desc"} sortOrder - Sort direction
   * @returns {Array} New sorted array
   */
  _sortMessages(messages, sortBy = "date", sortOrder = "desc") {
    const getKey =
      sortBy === "date"
        ? (m) => (m.date ? new Date(m.date).getTime() : null)
        : sortBy === "subject"
          ? (m) => (m.subject ? m.subject.toLowerCase() : null)
          : (m) => (m.author ? m.author.toLowerCase() : null);

    const dir = sortOrder === "asc" ? 1 : -1;

    return [...messages].sort((a, b) => {
      const ka = getKey(a);
      const kb = getKey(b);
      // Falsy keys go last regardless of direction
      if (ka === null && kb === null) return 0;
      if (ka === null) return 1;
      if (kb === null) return -1;
      if (ka < kb) return -1 * dir;
      if (ka > kb) return 1 * dir;
      return 0;
    });
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
