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
  },
};
