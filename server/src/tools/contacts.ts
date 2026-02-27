/**
 * Contact Tool Handlers
 * MCP tools for contact and address book operations
 * @module tools/contacts
 */

import { z } from "zod";
import { getNativeClient } from "../websocket/client-adapter.js";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";
import logger from "../utils/logger.js";
import { nativeErrorToJsonRpc } from "../utils/errors.js";

// =============================================================================
// Schemas
// =============================================================================

const contactsSearchSchema = z.object({
  query: z.string().min(1).max(500),
  addressBookId: z.string().max(200).optional(),
  limit: z.number().int().positive().max(500).optional().default(50),
});

const contactsListSchema = z.object({
  addressBookId: z.string().max(200),
  limit: z.number().int().positive().max(500).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

const contactsGetSchema = z.object({
  contactId: z.string().max(200),
});

const contactsCreateSchema = z
  .object({
    addressBookId: z.string().max(200),
    properties: z.record(z.string().max(5000)).optional(),
    vCard: z.string().max(50000).optional(),
  })
  .refine((data) => data.properties || data.vCard, {
    message: "Either properties or vCard must be provided",
  });

const contactsUpdateSchema = z
  .object({
    contactId: z.string().max(200),
    properties: z.record(z.string().max(5000)).optional(),
    vCard: z.string().max(50000).optional(),
  })
  .refine((data) => data.properties || data.vCard, {
    message: "Either properties or vCard must be provided",
  });

const contactsDeleteSchema = z.object({
  contactId: z.string().max(200),
});

const addressBooksListSchema = z.object({});

const addressBooksCreateSchema = z.object({
  name: z.string().min(1).max(255),
});

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
  try {
    const params = contactsSearchSchema.parse(args);
    const client = getNativeClient();

    logger.debug(`Searching contacts: ${params.query}`);

    const response = await client.sendRequest(
      MessageActions.CONTACTS_SEARCH,
      params,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleContactsSearch:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * List contacts in an address book
 */
export async function handleContactsList(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = contactsListSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Listing contacts in address book: ${params.addressBookId}`);

    const response = await client.sendRequest(
      MessageActions.CONTACTS_LIST,
      params,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleContactsList:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Get a specific contact
 */
export async function handleContactsGet(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = contactsGetSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Getting contact: ${params.contactId}`);

    const response = await client.sendRequest(
      MessageActions.CONTACTS_GET,
      params,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleContactsGet:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Create a new contact
 */
export async function handleContactsCreate(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = contactsCreateSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Creating contact in address book: ${params.addressBookId}`);

    const response = await client.sendRequest(
      MessageActions.CONTACTS_CREATE,
      params,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleContactsCreate:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Update a contact
 */
export async function handleContactsUpdate(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = contactsUpdateSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Updating contact: ${params.contactId}`);

    const response = await client.sendRequest(
      MessageActions.CONTACTS_UPDATE,
      params,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleContactsUpdate:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Delete a contact
 */
export async function handleContactsDelete(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = contactsDeleteSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Deleting contact: ${params.contactId}`);

    const response = await client.sendRequest(
      MessageActions.CONTACTS_DELETE,
      params,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleContactsDelete:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * List address books
 */
export async function handleAddressBooksList(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    addressBooksListSchema.parse(args);
    const client = getNativeClient();

    logger.info("Listing address books");

    const response = await client.sendRequest(
      MessageActions.ADDRESSBOOKS_LIST,
      {},
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleAddressBooksList:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Create an address book
 */
export async function handleAddressBooksCreate(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = addressBooksCreateSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Creating address book: ${params.name}`);

    const response = await client.sendRequest(
      MessageActions.ADDRESSBOOKS_CREATE,
      params,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleAddressBooksCreate:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

/**
 * Delete an address book
 */
export async function handleAddressBooksDelete(
  args: unknown,
): Promise<ToolCallResult> {
  try {
    const params = addressBooksDeleteSchema.parse(args);
    const client = getNativeClient();

    logger.info(`Deleting address book: ${params.addressBookId}`);

    const response = await client.sendRequest(
      MessageActions.ADDRESSBOOKS_DELETE,
      params,
    );

    if (!response.success) {
      const error = nativeErrorToJsonRpc(response.error);
      return {
        content: [{ type: "text", text: JSON.stringify(error) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
    };
  } catch (error) {
    logger.error("Error in handleAddressBooksDelete:", error);
    const jsonRpcError = nativeErrorToJsonRpc(error);
    return {
      content: [{ type: "text", text: JSON.stringify(jsonRpcError) }],
      isError: true,
    };
  }
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const contactTools: McpTool[] = [
  {
    name: "thunderbird_contacts_search",
    description:
      "Search for contacts across address books by name, email, or other properties",
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
    description: "List all contacts in a specific address book with pagination",
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
    description: "Get detailed information about a specific contact",
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
    description: "Create a new contact using properties or vCard format",
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
    description: "Update an existing contact using properties or vCard format",
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
    description: "Delete a contact permanently",
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
    description: "List all address books",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "thunderbird_addressbooks_create",
    description: "Create a new address book",
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
    description: "Delete an address book and all its contacts",
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
