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
  }
};
