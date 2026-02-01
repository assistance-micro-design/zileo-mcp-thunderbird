/**
 * Compose API - Wrapper for messenger.compose.*
 * Provides email composition, drafts, templates, and sending operations
 */

export const ComposeAPI = {
  /**
   * Open a new compose window with optional pre-filled content
   * @param {Object} params - Compose parameters
   * @param {string[]} [params.to] - Recipient email addresses
   * @param {string[]} [params.cc] - CC email addresses
   * @param {string[]} [params.bcc] - BCC email addresses
   * @param {string} [params.subject] - Email subject
   * @param {string} [params.body] - Email body content
   * @param {boolean} [params.isPlainText] - If true, body is plain text
   * @param {string} [params.identityId] - Identity ID to use
   * @returns {Promise<Object>} Tab object with tabId and windowId
   */
  async beginNew(params = {}) {
    const details = {};

    if (params.to) details.to = params.to;
    if (params.cc) details.cc = params.cc;
    if (params.bcc) details.bcc = params.bcc;
    if (params.subject) details.subject = params.subject;
    if (params.body) {
      if (params.isPlainText) {
        details.plainTextBody = params.body;
        details.isPlainText = true;
      } else {
        details.body = params.body;
      }
    }
    if (params.identityId) details.identityId = params.identityId;

    const tab = await messenger.compose.beginNew(details);

    return {
      tabId: tab.id,
      windowId: tab.windowId,
    };
  },

  /**
   * Open a compose window to reply to a message
   * @param {number} messageId - ID of the message to reply to
   * @param {string} [replyType='replyToSender'] - Reply type: replyToSender or replyToAll
   * @returns {Promise<Object>} Tab object with tabId and windowId
   */
  async beginReply(messageId, replyType = "replyToSender") {
    const tab = await messenger.compose.beginReply(messageId, replyType);

    return {
      tabId: tab.id,
      windowId: tab.windowId,
    };
  },

  /**
   * Open a compose window to forward a message
   * @param {number} messageId - ID of the message to forward
   * @param {string} [forwardType='forwardInline'] - Forward type: forwardInline or forwardAsAttachment
   * @returns {Promise<Object>} Tab object with tabId and windowId
   */
  async beginForward(messageId, forwardType = "forwardInline") {
    const tab = await messenger.compose.beginForward(messageId, forwardType);

    return {
      tabId: tab.id,
      windowId: tab.windowId,
    };
  },

  /**
   * Get the current details of a compose window
   * @param {number} tabId - ID of the compose tab
   * @returns {Promise<Object>} Compose details (to, cc, bcc, subject, body, etc.)
   */
  async getDetails(tabId) {
    const details = await messenger.compose.getComposeDetails(tabId);

    return {
      to: details.to || [],
      cc: details.cc || [],
      bcc: details.bcc || [],
      replyTo: details.replyTo || [],
      subject: details.subject || "",
      body: details.body || "",
      plainTextBody: details.plainTextBody || "",
      isPlainText: details.isPlainText || false,
      identityId: details.identityId,
      attachments: (details.attachments || []).map(formatAttachment),
    };
  },

  /**
   * Update the content of an existing compose window
   * @param {number} tabId - ID of the compose tab
   * @param {Object} details - Details to update
   * @param {string[]} [details.to] - New recipient addresses
   * @param {string[]} [details.cc] - New CC addresses
   * @param {string[]} [details.bcc] - New BCC addresses
   * @param {string} [details.subject] - New subject line
   * @param {string} [details.body] - New body content
   * @returns {Promise<void>}
   */
  async setDetails(tabId, details) {
    const updateDetails = {};

    if (details.to !== undefined) updateDetails.to = details.to;
    if (details.cc !== undefined) updateDetails.cc = details.cc;
    if (details.bcc !== undefined) updateDetails.bcc = details.bcc;
    if (details.subject !== undefined) updateDetails.subject = details.subject;
    if (details.body !== undefined) updateDetails.body = details.body;

    await messenger.compose.setComposeDetails(tabId, updateDetails);
  },

  /**
   * Save the composition as a draft
   * @param {number} tabId - ID of the compose tab
   * @returns {Promise<Object>} Save result with messageId and mode
   */
  async saveDraft(tabId) {
    const result = await messenger.compose.saveMessage(tabId, {
      mode: "draft",
    });

    return {
      success: true,
      messageId: result.messages?.[0]?.id,
      mode: "draft",
    };
  },

  /**
   * Save the composition as a template
   * @param {number} tabId - ID of the compose tab
   * @returns {Promise<Object>} Save result with messageId and mode
   */
  async saveTemplate(tabId) {
    const result = await messenger.compose.saveMessage(tabId, {
      mode: "template",
    });

    return {
      success: true,
      messageId: result.messages?.[0]?.id,
      mode: "template",
    };
  },

  /**
   * Send the email being composed
   * @param {number} tabId - ID of the compose tab
   * @param {string} [mode='default'] - Send mode: default, sendNow, or sendLater
   * @returns {Promise<Object>} Send result with success status
   */
  async send(tabId, mode = "default") {
    const options = {};

    if (mode !== "default") {
      options.mode = mode;
    }

    const result = await messenger.compose.sendMessage(tabId, options);

    return {
      success: true,
      mode: result.mode || (mode === "sendLater" ? "sendLater" : "sendNow"),
      messageId: result.messages?.[0]?.id,
    };
  },
};

/**
 * Format attachment for response
 * @param {Object} attachment - Raw attachment object
 * @returns {Object} Formatted attachment
 */
function formatAttachment(attachment) {
  return {
    id: attachment.id,
    name: attachment.name,
    size: attachment.size,
  };
}
