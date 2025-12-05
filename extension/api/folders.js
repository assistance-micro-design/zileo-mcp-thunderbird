/**
 * Folders API - Wrapper for messenger.folders.*
 * Provides folder list, get, create, rename, delete, move operations
 */

export const FoldersAPI = {
  /**
   * List all folders
   * @param {string} accountId - Optional account ID to filter
   * @param {boolean} includeSubFolders - Include subfolders recursively
   * @returns {Promise<Array>} Array of folders
   */
  async list(accountId, includeSubFolders = true) {
    if (accountId) {
      const account = await messenger.accounts.get(accountId);
      return this._flattenFolders(account.folders, includeSubFolders);
    } else {
      const accounts = await messenger.accounts.list();
      const allFolders = [];

      for (const account of accounts) {
        const folders = this._flattenFolders(account.folders, includeSubFolders);
        allFolders.push(...folders);
      }

      return allFolders;
    }
  },

  /**
   * Get folder details
   * @param {string} folderId - Folder ID
   * @returns {Promise<Object>} Folder details
   */
  async get(folderId) {
    return await messenger.folders.get(folderId);
  },

  /**
   * Create a new subfolder
   * @param {string} parentFolderId - Parent folder ID
   * @param {string} name - Folder name
   * @returns {Promise<Object>} Created folder
   */
  async create(parentFolderId, name) {
    const parentFolder = await messenger.folders.get(parentFolderId);
    return await messenger.folders.create(parentFolder, name);
  },

  /**
   * Rename a folder
   * @param {string} folderId - Folder ID
   * @param {string} newName - New folder name
   * @returns {Promise<Object>} Renamed folder
   */
  async rename(folderId, newName) {
    const folder = await messenger.folders.get(folderId);
    return await messenger.folders.rename(folder, newName);
  },

  /**
   * Delete a folder
   * @param {string} folderId - Folder ID
   * @returns {Promise<void>}
   */
  async delete(folderId) {
    const folder = await messenger.folders.get(folderId);
    await messenger.folders.delete(folder);
  },

  /**
   * Move a folder to new parent
   * @param {string} folderId - Folder ID
   * @param {string} destinationFolderId - Destination parent folder ID
   * @returns {Promise<void>}
   */
  async move(folderId, destinationFolderId) {
    const folder = await messenger.folders.get(folderId);
    const destination = await messenger.folders.get(destinationFolderId);
    await messenger.folders.move(folder, destination);
  },

  /**
   * Mark all messages in folder as read
   * @param {string} folderId - Folder ID
   * @returns {Promise<void>}
   */
  async markAsRead(folderId) {
    const folder = await messenger.folders.get(folderId);
    const messageList = await messenger.messages.list(folder);

    const updatePromises = messageList.messages.map(message =>
      messenger.messages.update(message.id, { read: true })
    );

    await Promise.all(updatePromises);
  },

  /**
   * Helper: Flatten folder tree into array
   * @private
   */
  _flattenFolders(folders, includeSubFolders) {
    const result = [];

    const traverse = (folder) => {
      const { subFolders, ...folderData } = folder;
      result.push(folderData);

      if (includeSubFolders && subFolders && subFolders.length > 0) {
        for (const subFolder of subFolders) {
          traverse(subFolder);
        }
      }
    };

    if (folders) {
      for (const folder of folders) {
        traverse(folder);
      }
    }

    return result;
  }
};
