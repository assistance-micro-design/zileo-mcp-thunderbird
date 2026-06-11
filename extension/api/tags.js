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
 * Tags API - Wrapper for messenger.messages.tags.*
 * Provides tag CRUD operations
 */

export const TagsAPI = {
  /**
   * List all tags
   * @returns {Promise<Array>} Array of tags
   */
  async list() {
    return await messenger.messages.tags.list();
  },

  /**
   * Create a new tag
   * @param {string} key - Unique tag key
   * @param {string} tag - Tag display name
   * @param {string} color - Tag color (hex format)
   * @returns {Promise<void>}
   */
  async create(key, tag, color) {
    await messenger.messages.tags.create(key, tag, color);
  },

  /**
   * Update tag properties
   * @param {string} key - Tag key
   * @param {Object} properties - Properties to update
   * @returns {Promise<void>}
   */
  async update(key, properties) {
    const updateProps = {};

    if (properties.tag !== undefined) {
      updateProps.tag = properties.tag;
    }
    if (properties.color !== undefined) {
      updateProps.color = properties.color;
    }

    await messenger.messages.tags.update(key, updateProps);
  },

  /**
   * Delete a tag
   * @param {string} key - Tag key
   * @returns {Promise<void>}
   */
  async delete(key) {
    await messenger.messages.tags.delete(key);
  },
};
