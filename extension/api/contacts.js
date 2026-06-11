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
 * Contacts API - Wrapper for messenger.addressBooks.* and contacts
 * Provides contact and address book CRUD operations
 */

export const ContactsAPI = {
  /**
   * List all address books
   * @returns {Promise<Array>} Array of address books
   */
  async listAddressBooks() {
    return await messenger.addressBooks.list();
  },

  /**
   * Create a new address book
   * @param {string} name - Address book name
   * @returns {Promise<Object>} Created address book
   */
  async createAddressBook(name) {
    return await messenger.addressBooks.create({ name });
  },

  /**
   * Delete an address book
   * @param {string} id - Address book ID
   * @returns {Promise<void>}
   */
  async deleteAddressBook(id) {
    await messenger.addressBooks.delete(id);
  },

  /**
   * Search contacts across all or specific address book
   * @param {string} query - Search query
   * @param {string} addressBookId - Optional address book ID
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Array of matching contacts
   */
  async searchContacts(searchQuery, addressBookId, limit = 50) {
    // MV3: use query() instead of quickSearch()
    const queryInfo = { searchString: searchQuery };
    if (addressBookId) {
      queryInfo.parentId = addressBookId;
    }

    const contacts = await messenger.addressBooks.contacts.query(queryInfo);
    return contacts.slice(0, limit);
  },

  /**
   * List contacts in an address book
   * @param {string} addressBookId - Address book ID
   * @param {number} limit - Maximum results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Contacts with pagination info
   */
  async listContacts(addressBookId, limit = 50, offset = 0) {
    const contacts = await messenger.addressBooks.contacts.list(addressBookId);
    const paginatedContacts = contacts.slice(offset, offset + limit);

    return {
      contacts: paginatedContacts,
      total: contacts.length,
      limit,
      offset,
      hasMore: offset + limit < contacts.length,
    };
  },

  /**
   * Get contact details
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} Contact details
   */
  async getContact(contactId) {
    return await messenger.addressBooks.contacts.get(contactId);
  },

  /**
   * Create a new contact
   * @param {string} addressBookId - Address book ID
   * @param {Object} properties - Contact properties or vCard
   * @returns {Promise<string>} Created contact ID
   */
  async createContact(addressBookId, properties) {
    if (properties.vCard) {
      return await messenger.addressBooks.contacts.create(
        addressBookId,
        properties.vCard,
      );
    } else {
      const vCard = this._propertiesToVCard(properties);
      return await messenger.addressBooks.contacts.create(addressBookId, vCard);
    }
  },

  /**
   * Update contact
   * @param {string} contactId - Contact ID
   * @param {Object} properties - Properties to update or vCard
   * @returns {Promise<void>}
   */
  async updateContact(contactId, properties) {
    if (properties.vCard) {
      await messenger.addressBooks.contacts.update(contactId, properties.vCard);
    } else {
      const currentContact =
        await messenger.addressBooks.contacts.get(contactId);
      const vCard = this._propertiesToVCard({
        ...currentContact.properties,
        ...properties,
      });
      await messenger.addressBooks.contacts.update(contactId, vCard);
    }
  },

  /**
   * Delete contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<void>}
   */
  async deleteContact(contactId) {
    await messenger.addressBooks.contacts.delete(contactId);
  },

  /**
   * Helper: Convert properties object to vCard string
   * @private
   */
  _propertiesToVCard(properties) {
    const lines = ["BEGIN:VCARD", "VERSION:4.0"];

    if (properties.DisplayName) {
      lines.push(`FN:${properties.DisplayName}`);
    }

    if (properties.FirstName || properties.LastName) {
      const lastName = properties.LastName || "";
      const firstName = properties.FirstName || "";
      lines.push(`N:${lastName};${firstName};;;`);
    }

    if (properties.PrimaryEmail) {
      lines.push(`EMAIL;TYPE=work:${properties.PrimaryEmail}`);
    }

    if (properties.SecondEmail) {
      lines.push(`EMAIL;TYPE=home:${properties.SecondEmail}`);
    }

    if (properties.CellularNumber) {
      lines.push(`TEL;TYPE=cell:${properties.CellularNumber}`);
    }

    if (properties.WorkPhone) {
      lines.push(`TEL;TYPE=work:${properties.WorkPhone}`);
    }

    if (properties.HomePhone) {
      lines.push(`TEL;TYPE=home:${properties.HomePhone}`);
    }

    if (properties.Company) {
      lines.push(`ORG:${properties.Company}`);
    }

    if (properties.JobTitle) {
      lines.push(`TITLE:${properties.JobTitle}`);
    }

    if (properties.WebPage1) {
      lines.push(`URL:${properties.WebPage1}`);
    }

    if (properties.Notes) {
      lines.push(`NOTE:${properties.Notes.replace(/\n/g, "\\n")}`);
    }

    // Address
    if (
      properties.WorkAddress ||
      properties.WorkCity ||
      properties.WorkZipCode ||
      properties.WorkCountry
    ) {
      const address = [
        "",
        "",
        properties.WorkAddress || "",
        properties.WorkCity || "",
        properties.WorkState || "",
        properties.WorkZipCode || "",
        properties.WorkCountry || "",
      ].join(";");
      lines.push(`ADR;TYPE=work:${address}`);
    }

    lines.push("END:VCARD");

    return lines.join("\n");
  },
};
