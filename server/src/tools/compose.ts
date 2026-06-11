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
 * Compose Tools - Email Composition MCP Tools
 * Provides tools for creating, editing, and sending emails
 * @module tools/compose
 */

import { z } from "zod";
import { MessageActions } from "../types/native-messaging.js";
import type { McpTool, ToolCallResult } from "../types/mcp.js";
import { executeToolHandler } from "./tool-handler.js";

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for compose begin new parameters
 */
export const composeBeginNewSchema = z.object({
  to: z
    .array(z.email())
    .max(200)
    .optional()
    .describe("Recipient email addresses"),
  cc: z.array(z.email()).max(200).optional().describe("CC email addresses"),
  bcc: z.array(z.email()).max(200).optional().describe("BCC email addresses"),
  subject: z.string().max(1000).optional().describe("Email subject"),
  body: z.string().max(500000).optional().describe("Email body content"),
  isPlainText: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, body is plain text; otherwise HTML"),
  identityId: z.string().max(200).optional().describe("Identity ID to use for sending"),
});

/**
 * Schema for compose begin reply parameters
 */
export const composeBeginReplySchema = z.object({
  messageId: z
    .number()
    .int()
    .nonnegative()
    .describe("ID of the message to reply to"),
  replyType: z
    .enum(["replyToSender", "replyToAll"])
    .optional()
    .default("replyToSender")
    .describe("Reply type"),
});

/**
 * Schema for compose begin forward parameters
 */
export const composeBeginForwardSchema = z.object({
  messageId: z
    .number()
    .int()
    .nonnegative()
    .describe("ID of the message to forward"),
  forwardType: z
    .enum(["forwardInline", "forwardAsAttachment"])
    .optional()
    .describe("Forward type"),
});

/**
 * Schema for compose get details parameters
 */
export const composeGetDetailsSchema = z.object({
  tabId: z.number().int().nonnegative().describe("ID of the compose tab"),
});

/**
 * Schema for compose set details parameters
 */
export const composeSetDetailsSchema = z.object({
  tabId: z.number().int().nonnegative().describe("ID of the compose tab"),
  to: z
    .array(z.email())
    .max(200)
    .optional()
    .describe("New recipient addresses"),
  cc: z.array(z.email()).max(200).optional().describe("New CC addresses"),
  bcc: z.array(z.email()).max(200).optional().describe("New BCC addresses"),
  subject: z.string().max(1000).optional().describe("New subject line"),
  body: z.string().max(500000).optional().describe("New body content"),
});

/**
 * Schema for compose save draft parameters
 */
export const composeSaveDraftSchema = z.object({
  tabId: z.number().int().nonnegative().describe("ID of the compose tab"),
});

/**
 * Schema for compose save template parameters
 */
export const composeSaveTemplateSchema = z.object({
  tabId: z.number().int().nonnegative().describe("ID of the compose tab"),
});

/**
 * Schema for compose send parameters
 */
export const composeSendSchema = z.object({
  tabId: z.number().int().nonnegative().describe("ID of the compose tab"),
  mode: z
    .enum(["default", "sendNow", "sendLater"])
    .optional()
    .default("default")
    .describe("Send mode"),
});

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * Compose tool definitions for MCP
 */
export const composeTools: McpTool[] = [
  {
    name: "thunderbird_compose_begin_new",
    description: `Open a new compose window in Thunderbird, optionally pre-filled with recipients, subject, body, and selected identity. Returns a tabId used by every other compose tool to refer to this draft.

Example:
  Input: { to: ["alice@example.com"], subject: "Hello",
           body: "Hi Alice, ...", isPlainText: false }
  Output: { tabId: 5, success: true }

Note: this is the entry point for the compose workflow. Capture the returned tabId for thunderbird_compose_get_details/set_details/save_draft/save_template/send. Optional identityId comes from thunderbird_identities_list.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        to: {
          type: "array",
          items: { type: "string" },
          description: "Recipient email addresses",
        },
        cc: {
          type: "array",
          items: { type: "string" },
          description: "CC email addresses",
        },
        bcc: {
          type: "array",
          items: { type: "string" },
          description: "BCC email addresses",
        },
        subject: {
          type: "string",
          description: "Email subject",
        },
        body: {
          type: "string",
          description: "Email body content (HTML by default)",
        },
        isPlainText: {
          type: "boolean",
          description: "If true, body is plain text; otherwise HTML",
        },
        identityId: {
          type: "string",
          description: "Identity ID to use for sending",
        },
      },
    },
  },
  {
    name: "thunderbird_compose_begin_reply",
    description: `Open a compose window pre-populated to reply to one existing message. replyType controls whether the reply targets only the sender or every recipient. Returns a tabId.

Example:
  Input: { messageId: 42, replyType: "replyToSender" }
  Output: { tabId: 6, success: true }

Note: messageId comes from thunderbird_messages_list, thunderbird_messages_search, or thunderbird_messages_list_recent. The returned tabId is consumed by thunderbird_compose_send and the other compose tools.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "number",
          description: "ID of the message to reply to",
        },
        replyType: {
          type: "string",
          enum: ["replyToSender", "replyToAll"],
          description: "Reply to sender only or all recipients",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "thunderbird_compose_begin_forward",
    description: `Open a compose window pre-populated to forward one existing message, either inline (quoted in body) or as an .eml attachment. Returns a tabId.

Example:
  Input: { messageId: 42, forwardType: "forwardInline" }
  Output: { tabId: 7, success: true }

Note: messageId comes from thunderbird_messages_list, thunderbird_messages_search, or thunderbird_messages_list_recent. The returned tabId is consumed by thunderbird_compose_send and the other compose tools.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "number",
          description: "ID of the message to forward",
        },
        forwardType: {
          type: "string",
          enum: ["forwardInline", "forwardAsAttachment"],
          description: "Forward inline (in body) or as attachment",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "thunderbird_compose_get_details",
    description: `Inspect the current state of an open compose tab: recipients, subject, body, identity, plain-text flag. Useful before sending or saving.

Example:
  Input: { tabId: 5 }
  Output: { to: ["alice@example.com"], cc: [], subject: "Hello",
           body: "Hi Alice, ...", identityId: "id1", isPlainText: false }

Note: tabId comes from thunderbird_compose_begin_new, thunderbird_compose_begin_reply, or thunderbird_compose_begin_forward.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        tabId: {
          type: "number",
          description: "ID of the compose tab",
        },
      },
      required: ["tabId"],
    },
  },
  {
    name: "thunderbird_compose_set_details",
    description: `Update fields of an open compose tab. Supplied fields replace the current values; omitted fields stay as-is.

Example:
  Input: { tabId: 5, subject: "Updated subject",
           cc: ["bob@example.com"] }
  Output: { success: true }

Note: tabId comes from thunderbird_compose_begin_new, thunderbird_compose_begin_reply, or thunderbird_compose_begin_forward.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        tabId: {
          type: "number",
          description: "ID of the compose tab",
        },
        to: {
          type: "array",
          items: { type: "string" },
          description: "New recipient addresses",
        },
        cc: {
          type: "array",
          items: { type: "string" },
          description: "New CC addresses",
        },
        bcc: {
          type: "array",
          items: { type: "string" },
          description: "New BCC addresses",
        },
        subject: {
          type: "string",
          description: "New subject line",
        },
        body: {
          type: "string",
          description: "New body content",
        },
      },
      required: ["tabId"],
    },
  },
  {
    name: "thunderbird_compose_save_draft",
    description: `Save the current compose tab to the Drafts folder without sending it. The tab stays open after saving.

Example:
  Input: { tabId: 5 }
  Output: { savedMessageId: 99, success: true }

Note: tabId comes from thunderbird_compose_begin_new, thunderbird_compose_begin_reply, or thunderbird_compose_begin_forward.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        tabId: {
          type: "number",
          description: "ID of the compose tab",
        },
      },
      required: ["tabId"],
    },
  },
  {
    name: "thunderbird_compose_save_template",
    description: `Save the current compose tab as a reusable template in the Templates folder. The tab stays open after saving.

Example:
  Input: { tabId: 5 }
  Output: { savedMessageId: 100, success: true }

Note: tabId comes from thunderbird_compose_begin_new, thunderbird_compose_begin_reply, or thunderbird_compose_begin_forward.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        tabId: {
          type: "number",
          description: "ID of the compose tab",
        },
      },
      required: ["tabId"],
    },
  },
  {
    name: "thunderbird_compose_send",
    description: `Send the email currently in a compose tab. mode picks between the account default, immediate send, or send-later queue. Destructive: once sent the message leaves Thunderbird's control.

Example:
  Input: { tabId: 5, mode: "sendNow" }
  Output: { success: true, messageId: 101 }

Note: tabId comes from thunderbird_compose_begin_new, thunderbird_compose_begin_reply, or thunderbird_compose_begin_forward. No undo after sendNow.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        tabId: {
          type: "number",
          description: "ID of the compose tab",
        },
        mode: {
          type: "string",
          enum: ["default", "sendNow", "sendLater"],
          description:
            "Send mode: default uses account settings, sendNow sends immediately, sendLater queues",
        },
      },
      required: ["tabId"],
    },
  },
];

// =============================================================================
// Handlers
// =============================================================================

/**
 * Opens a new compose window (thunderbird_compose_begin_new).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleComposeBeginNew(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    composeBeginNewSchema,
    MessageActions.COMPOSE_BEGIN_NEW,
    "handleComposeBeginNew",
  );
}

/**
 * Opens a reply compose window for a message (thunderbird_compose_begin_reply).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleComposeBeginReply(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    composeBeginReplySchema,
    MessageActions.COMPOSE_BEGIN_REPLY,
    "handleComposeBeginReply",
  );
}

/**
 * Opens a forward compose window for a message (thunderbird_compose_begin_forward).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleComposeBeginForward(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    composeBeginForwardSchema,
    MessageActions.COMPOSE_BEGIN_FORWARD,
    "handleComposeBeginForward",
  );
}

/**
 * Reads the current state of a compose tab (thunderbird_compose_get_details).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleComposeGetDetails(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    composeGetDetailsSchema,
    MessageActions.COMPOSE_GET_DETAILS,
    "handleComposeGetDetails",
  );
}

/**
 * Updates recipients/subject/body of a compose tab (thunderbird_compose_set_details).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleComposeSetDetails(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    composeSetDetailsSchema,
    MessageActions.COMPOSE_SET_DETAILS,
    "handleComposeSetDetails",
    { transformResponse: () => ({ success: true }) },
  );
}

/**
 * Saves a compose tab as draft (thunderbird_compose_save_draft).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleComposeSaveDraft(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    composeSaveDraftSchema,
    MessageActions.COMPOSE_SAVE_DRAFT,
    "handleComposeSaveDraft",
  );
}

/**
 * Saves a compose tab as template (thunderbird_compose_save_template).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleComposeSaveTemplate(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    composeSaveTemplateSchema,
    MessageActions.COMPOSE_SAVE_TEMPLATE,
    "handleComposeSaveTemplate",
  );
}

/**
 * Sends the message of a compose tab (thunderbird_compose_send).
 * @param args - Raw tool arguments, validated against the Zod schema
 * @returns ToolCallResult with the JSON payload, or isError on failure
 */
export async function handleComposeSend(
  args: unknown,
): Promise<ToolCallResult> {
  return executeToolHandler(
    args,
    composeSendSchema,
    MessageActions.COMPOSE_SEND,
    "handleComposeSend",
  );
}
