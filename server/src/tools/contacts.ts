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
 * Contact Tool Handlers
 * MCP tools for contact and address book operations
 * @module tools/contacts
 */

import { z } from "zod";
import { executeToolHandler } from "./tool-handler.js";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";

// =============================================================================
// Schemas
// =============================================================================

/** Search contacts by query string across address books */
const contactsSearchSchema = z.object({
  query: z.string().min(1).max(500),
  addressBookId: z.string().max(200).optional(),
  limit: z.number().int().positive().max(500).optional().default(50),
});

/** List contacts in an address book with pagination */
const contactsListSchema = z.object({
  addressBookId: z.string().max(200),
  limit: z.number().int().positive().max(500).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

/** Get contact details by ID */
const contactsGetSchema = z.object({
  contactId: z.string().max(200),
});

/** Create a new contact with properties or vCard data */
const contactsCreateSchema = z
  .object({
    addressBookId: z.string().max(200),
    properties: z.record(z.string().max(5000)).optional(),
    vCard: z.string().max(50000).optional(),
  })
  .refine((data) => data.properties || data.vCard, {
    message: "Either properties or vCard must be provided",
  });

/** Update an existing contact's properties or vCard */
const contactsUpdateSchema = z
  .object({
    contactId: z.string().max(200),
    properties: z.record(z.string().max(5000)).optional(),
    vCard: z.string().max(50000).optional(),
  })
  .refine((data) => data.properties || data.vCard, {
    message: "Either properties or vCard must be provided",
  });

/** Delete a contact by ID */
const contactsDeleteSchema = z.object({
  contactId: z.string().max(200),
});

/** List all address books */
const addressBooksListSchema = z.object({});

/** Create a new address book */
const addressBooksCreateSchema = z.object({
  name: z.string().min(1).max(255),
});

/** Delete an address book by ID */
const addressBooksDeleteSchema = z.object({
  addressBookId: z.string().max(200),
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * Search contacts
 */
export async function handleContactsSearch(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    contactsSearchSchema,
    MessageActions.CONTACTS_SEARCH,
    "handleContactsSearch",
  );
}

/**
 * List contacts in an address book
 */
export async function handleContactsList(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    contactsListSchema,
    MessageActions.CONTACTS_LIST,
    "handleContactsList",
  );
}

/**
 * Get a specific contact
 */
export async function handleContactsGet(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    contactsGetSchema,
    MessageActions.CONTACTS_GET,
    "handleContactsGet",
  );
}

/**
 * Create a new contact
 */
export async function handleContactsCreate(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    contactsCreateSchema,
    MessageActions.CONTACTS_CREATE,
    "handleContactsCreate",
  );
}

/**
 * Update a contact
 */
export async function handleContactsUpdate(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    contactsUpdateSchema,
    MessageActions.CONTACTS_UPDATE,
    "handleContactsUpdate",
  );
}

/**
 * Delete a contact
 */
export async function handleContactsDelete(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    contactsDeleteSchema,
    MessageActions.CONTACTS_DELETE,
    "handleContactsDelete",
  );
}

/**
 * List address books
 */
export async function handleAddressBooksList(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    addressBooksListSchema,
    MessageActions.ADDRESSBOOKS_LIST,
    "handleAddressBooksList",
  );
}

/**
 * Create an address book
 */
export async function handleAddressBooksCreate(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    addressBooksCreateSchema,
    MessageActions.ADDRESSBOOKS_CREATE,
    "handleAddressBooksCreate",
  );
}

/**
 * Delete an address book
 */
export async function handleAddressBooksDelete(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    addressBooksDeleteSchema,
    MessageActions.ADDRESSBOOKS_DELETE,
    "handleAddressBooksDelete",
  );
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const contactTools: McpTool[] = [
  {
    name: "thunderbird_contacts_search",
    description: `Search contacts across address books by display name, email, company, or any other property. Free-text query is matched case-insensitively.

Example:
  Input: { query: "alice", addressBookId: "ab1", limit: 50 }
  Output: { contacts: [{ id: "c1", displayName: "Alice Smith",
           primaryEmail: "alice@example.com", addressBookId: "ab1" }] }

Note: optional addressBookId comes from thunderbird_addressbooks_list. Omit to search every book.`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (name, email, company, etc.)",
        },
        addressBookId: {
          type: "string",
          description: "Optional: limit search to specific address book",
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 50, max: 500)",
          default: 50,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "thunderbird_contacts_list",
    description: `List every contact in one address book with pagination. Returns ID, display name and primary email per contact.

Example:
  Input: { addressBookId: "ab1", limit: 100, offset: 0 }
  Output: { contacts: [{ id: "c1", displayName: "Alice Smith",
           primaryEmail: "alice@example.com" }], total: 312 }

Note: addressBookId comes from thunderbird_addressbooks_list.`,
    inputSchema: {
      type: "object",
      properties: {
        addressBookId: { type: "string", description: "Address book ID" },
        limit: {
          type: "number",
          description: "Maximum results (default: 100, max: 500)",
          default: 100,
        },
        offset: {
          type: "number",
          description: "Number of contacts to skip (default: 0)",
          default: 0,
        },
      },
      required: ["addressBookId"],
    },
  },
  {
    name: "thunderbird_contacts_get",
    description: `Fetch one contact with all properties (name parts, emails, phones, addresses, custom fields) plus its vCard 4.0 representation.

Example:
  Input: { contactId: "c1" }
  Output: { id: "c1", displayName: "Alice Smith",
           primaryEmail: "alice@example.com", phone: "+33...",
           vCard: "BEGIN:VCARD\\nVERSION:4.0\\n..." }

Note: contactId comes from thunderbird_contacts_list or thunderbird_contacts_search.`,
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "Contact ID" },
      },
      required: ["contactId"],
    },
  },
  {
    name: "thunderbird_contacts_create",
    description: `Create a new contact in an address book, either by passing a flat properties object or a full vCard 4.0 string. At least one of properties or vCard is required.

Example:
  Input: { addressBookId: "ab1",
           properties: { DisplayName: "Alice Smith",
           PrimaryEmail: "alice@example.com", FirstName: "Alice" } }
  Output: { id: "c1", success: true }

Note: addressBookId comes from thunderbird_addressbooks_list.`,
    inputSchema: {
      type: "object",
      properties: {
        addressBookId: {
          type: "string",
          description: "Address book ID to add contact to",
        },
        properties: {
          type: "object",
          description:
            "Contact properties (DisplayName, PrimaryEmail, FirstName, LastName, etc.)",
          additionalProperties: { type: "string" },
        },
        vCard: {
          type: "string",
          description: "vCard 4.0 format (alternative to properties)",
        },
      },
      required: ["addressBookId"],
    },
  },
  {
    name: "thunderbird_contacts_update",
    description: `Update properties of an existing contact, or replace its vCard entirely. Partial property updates are supported.

Example:
  Input: { contactId: "c1",
           properties: { PrimaryEmail: "alice@new.example.com" } }
  Output: { id: "c1", success: true }

Note: contactId comes from thunderbird_contacts_list or thunderbird_contacts_search. Passing vCard replaces ALL fields.`,
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "Contact ID to update" },
        properties: {
          type: "object",
          description: "Contact properties to update",
          additionalProperties: { type: "string" },
        },
        vCard: {
          type: "string",
          description: "Complete vCard 4.0 format (replaces all properties)",
        },
      },
      required: ["contactId"],
    },
  },
  {
    name: "thunderbird_contacts_delete",
    description: `Delete one contact permanently. Destructive: removes it from its address book with no undo.

Example:
  Input: { contactId: "c1" }
  Output: { success: true }

Note: contactId comes from thunderbird_contacts_list or thunderbird_contacts_search. No undo.`,
    inputSchema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "Contact ID to delete" },
      },
      required: ["contactId"],
    },
  },
  {
    name: "thunderbird_addressbooks_list",
    description: `List every address book Thunderbird knows about (Personal, Collected Addresses, CardDAV synced books, LDAP, etc.). Entry point for addressBookId discovery.

Example:
  Input: {}
  Output: { addressBooks: [{ id: "ab1", name: "Personal", type: "jsaddrbook",
           readOnly: false }, { id: "ab2", name: "CardDAV", type: "carddav" }] }`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "thunderbird_addressbooks_create",
    description: `Create a new local address book. Remote books (CardDAV/LDAP) must be configured in Thunderbird's UI, not via this tool.

Example:
  Input: { name: "Work Contacts" }
  Output: { id: "ab3", name: "Work Contacts", success: true }`,
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Address book name (1-255 characters)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "thunderbird_addressbooks_delete",
    description: `Delete an entire address book together with every contact it contains. Destructive: no undo, no trash.

Example:
  Input: { addressBookId: "ab3" }
  Output: { deletedContacts: 42, success: true }

Note: addressBookId comes from thunderbird_addressbooks_list. Built-in books (Personal, Collected Addresses) cannot be deleted.`,
    inputSchema: {
      type: "object",
      properties: {
        addressBookId: {
          type: "string",
          description: "Address book ID to delete",
        },
      },
      required: ["addressBookId"],
    },
  },
];
