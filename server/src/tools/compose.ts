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
    .array(z.string().email())
    .max(200)
    .optional()
    .describe("Recipient email addresses"),
  cc: z.array(z.string().email()).max(200).optional().describe("CC email addresses"),
  bcc: z.array(z.string().email()).max(200).optional().describe("BCC email addresses"),
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
  messageId: z.number().describe("ID of the message to reply to"),
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
  messageId: z.number().describe("ID of the message to forward"),
  forwardType: z
    .enum(["forwardInline", "forwardAsAttachment"])
    .optional()
    .describe("Forward type"),
});

/**
 * Schema for compose get details parameters
 */
export const composeGetDetailsSchema = z.object({
  tabId: z.number().describe("ID of the compose tab"),
});

/**
 * Schema for compose set details parameters
 */
export const composeSetDetailsSchema = z.object({
  tabId: z.number().describe("ID of the compose tab"),
  to: z
    .array(z.string().email())
    .max(200)
    .optional()
    .describe("New recipient addresses"),
  cc: z.array(z.string().email()).max(200).optional().describe("New CC addresses"),
  bcc: z.array(z.string().email()).max(200).optional().describe("New BCC addresses"),
  subject: z.string().max(1000).optional().describe("New subject line"),
  body: z.string().max(500000).optional().describe("New body content"),
});

/**
 * Schema for compose save draft parameters
 */
export const composeSaveDraftSchema = z.object({
  tabId: z.number().describe("ID of the compose tab"),
});

/**
 * Schema for compose save template parameters
 */
export const composeSaveTemplateSchema = z.object({
  tabId: z.number().describe("ID of the compose tab"),
});

/**
 * Schema for compose send parameters
 */
export const composeSendSchema = z.object({
  tabId: z.number().describe("ID of the compose tab"),
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
    description:
      "Open a new email composition window with optional pre-filled content (recipients, subject, body)",
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
    description: "Open a compose window to reply to an existing message",
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
    description: "Open a compose window to forward an existing message",
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
    description:
      "Get the current details of a compose window (recipients, subject, body)",
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
    description:
      "Update the content of an existing compose window (recipients, subject, body)",
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
    description: "Save the current composition as a draft in the Drafts folder",
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
    description: "Save the current composition as a reusable template",
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
    description: "Send the email currently being composed",
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
