/**
 * Accounts API - Wrapper for messenger.accounts.*
 * Provides account and identity information
 */

export const AccountsAPI = {
  /**
   * List all accounts
   * @returns {Promise<Array>} Array of accounts
   */
  async list() {
    return await messenger.accounts.list();
  },

  /**
   * Get account details
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Account details
   */
  async get(accountId) {
    return await messenger.accounts.get(accountId);
  },

  /**
   * List identities for an account
   * @param {string} accountId - Account ID
   * @returns {Promise<Array>} Array of identities
   */
  async listIdentities(accountId) {
    const account = await messenger.accounts.get(accountId);
    return account.identities || [];
  }
};
