/**
 * Compose Types - Email Composition API Types
 * @module types/compose
 */

// =============================================================================
// Begin/Create Types
// =============================================================================

/**
 * Parameters for creating a new compose window
 */
export interface ComposeBeginNewParams {
  /** Recipient email addresses */
  to?: string[];
  /** CC email addresses */
  cc?: string[];
  /** BCC email addresses */
  bcc?: string[];
  /** Email subject */
  subject?: string;
  /** Email body content */
  body?: string;
  /** Whether body is plain text (default: false for HTML) */
  isPlainText?: boolean;
  /** Identity ID to use for sending */
  identityId?: string;
}

/**
 * Parameters for replying to a message
 */
export interface ComposeBeginReplyParams {
  /** ID of the message to reply to */
  messageId: number;
  /** Reply type: replyToSender or replyToAll */
  replyType?: "replyToSender" | "replyToAll";
}

/**
 * Parameters for forwarding a message
 */
export interface ComposeBeginForwardParams {
  /** ID of the message to forward */
  messageId: number;
  /** Forward type: inline or as attachment */
  forwardType?: "forwardInline" | "forwardAsAttachment";
}

// =============================================================================
// Get/Set Details Types
// =============================================================================

/**
 * Parameters for getting compose window details
 */
export interface ComposeGetDetailsParams {
  /** ID of the compose tab */
  tabId: number;
}

/**
 * Parameters for updating compose window content
 */
export interface ComposeSetDetailsParams {
  /** ID of the compose tab */
  tabId: number;
  /** New recipient addresses */
  to?: string[];
  /** New CC addresses */
  cc?: string[];
  /** New BCC addresses */
  bcc?: string[];
  /** New subject line */
  subject?: string;
  /** New body content */
  body?: string;
}

// =============================================================================
// Save/Send Types
// =============================================================================

/**
 * Parameters for saving as draft
 */
export interface ComposeSaveDraftParams {
  /** ID of the compose tab */
  tabId: number;
}

/**
 * Parameters for saving as template
 */
export interface ComposeSaveTemplateParams {
  /** ID of the compose tab */
  tabId: number;
}

/**
 * Parameters for sending an email
 */
export interface ComposeSendParams {
  /** ID of the compose tab */
  tabId: number;
  /** Send mode: default uses account settings, sendNow sends immediately, sendLater queues */
  mode?: "default" | "sendNow" | "sendLater";
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result from compose begin operations (new, reply, forward)
 */
export interface ComposeTabResult {
  /** ID of the created compose tab */
  tabId: number;
  /** ID of the window containing the tab */
  windowId?: number;
}

/**
 * Result from save operations (draft, template)
 */
export interface ComposeSaveResult {
  /** Whether save was successful */
  success: boolean;
  /** ID of the saved message */
  messageId?: number;
  /** Save mode */
  mode: "draft" | "template";
}

/**
 * Result from send operation
 */
export interface ComposeSendResult {
  /** Whether send was successful */
  success: boolean;
  /** ID of the sent message (if available) */
  messageId?: number;
  /** Send mode used */
  mode: "sendNow" | "sendLater";
}
