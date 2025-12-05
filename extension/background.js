/**
 * Background Service Worker - Main entry point for Thunderbird MCP Extension
 * Handles WebSocket communication with MCP server and dispatches API calls
 */

import { handleNativeMessage } from './native-messaging/handler.js';

// WebSocket connection state
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;
const WS_PORT = 9876;

/**
 * Connect to the MCP server via WebSocket
 */
function connectWebSocket() {
  const wsUrl = `ws://localhost:${WS_PORT}`;

  console.log(`[MCP] Connecting to WebSocket server at ${wsUrl}`);

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = handleOpen;
    ws.onmessage = handleMessage;
    ws.onclose = handleClose;
    ws.onerror = handleError;
  } catch (error) {
    console.error('[MCP] Failed to create WebSocket:', error);
    scheduleReconnect();
  }
}

/**
 * Handle WebSocket connection open
 */
function handleOpen() {
  console.log('[MCP] WebSocket connected to MCP server');
  reconnectAttempts = 0;

  // Send ready notification
  sendMessage({
    id: generateId(),
    type: 'notification',
    event: 'ready',
    data: {
      version: browser.runtime.getManifest().version,
      capabilities: ['messages', 'folders', 'contacts', 'tags', 'accounts', 'calendar', 'tasks'],
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle incoming WebSocket message
 * @param {MessageEvent} event - WebSocket message event
 */
async function handleMessage(event) {
  try {
    const message = JSON.parse(event.data);
    console.log('[MCP] Received:', message);

    if (message.type === 'request') {
      await processRequest(message);
    }
  } catch (error) {
    console.error('[MCP] Failed to parse message:', error);
  }
}

/**
 * Process request from MCP server
 * @param {Object} request - Request message
 */
async function processRequest(request) {
  console.log('[MCP] Processing request:', request.action);

  try {
    const result = await handleNativeMessage(request);

    // Send successful response
    sendMessage({
      id: request.id,
      type: 'response',
      success: true,
      data: result.data !== undefined ? result.data : result,
      timestamp: new Date().toISOString(),
    });

    console.log('[MCP] Request completed:', request.action);
  } catch (error) {
    console.error('[MCP] Request failed:', request.action, error);

    // Send error response
    sendMessage({
      id: request.id,
      type: 'response',
      success: false,
      error: {
        code: -32603,
        message: error.message || 'Internal error',
        data: { stack: error.stack },
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle WebSocket close
 * @param {CloseEvent} event - Close event
 */
function handleClose(event) {
  console.log('[MCP] WebSocket closed:', event.code, event.reason || 'No reason');
  ws = null;
  scheduleReconnect();
}

/**
 * Handle WebSocket error
 * @param {Event} error - Error event
 */
function handleError(error) {
  console.error('[MCP] WebSocket error:', error);
}

/**
 * Schedule reconnection attempt
 */
function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[MCP] Max reconnection attempts reached. Giving up.');
    return;
  }

  reconnectAttempts++;
  console.log(`[MCP] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

  setTimeout(() => {
    connectWebSocket();
  }, RECONNECT_DELAY);
}

/**
 * Send message through WebSocket
 * @param {Object} message - Message to send
 */
function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    console.log('[MCP] Sent:', message);
  } else {
    console.warn('[MCP] Cannot send - WebSocket not connected');
  }
}

/**
 * Generate unique message ID
 * @returns {string} Unique ID
 */
function generateId() {
  return `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize extension on startup
 */
function initialize() {
  console.log('[MCP] Thunderbird MCP Extension starting...');
  console.log('[MCP] Version:', browser.runtime.getManifest().version);

  // Connect to MCP server via WebSocket
  connectWebSocket();

  // Listen for extension lifecycle events
  browser.runtime.onSuspend.addListener(() => {
    console.log('[MCP] Extension suspending...');
    if (ws) {
      ws.close();
    }
  });
}

// Start the extension
initialize();
