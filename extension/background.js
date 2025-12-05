/**
 * Background Service Worker - Main entry point for Thunderbird MCP Extension
 * Handles native messaging communication and dispatches API calls
 */

import { handleNativeMessage } from './native-messaging/handler.js';

// Native messaging port connection
let nativePort = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

/**
 * Initialize native messaging connection
 */
function connectNativeMessaging() {
  try {
    console.log('[MCP] Connecting to native messaging host: thunderbird_mcp');

    nativePort = browser.runtime.connectNative('thunderbird_mcp');

    nativePort.onMessage.addListener(handleIncomingMessage);
    nativePort.onDisconnect.addListener(handleDisconnect);

    reconnectAttempts = 0;
    console.log('[MCP] Native messaging connected successfully');

    // Send ready notification
    sendResponse({
      type: 'ready',
      version: browser.runtime.getManifest().version,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MCP] Failed to connect to native messaging:', error);
    scheduleReconnect();
  }
}

/**
 * Handle incoming messages from native host
 * @param {Object} message - Message from native host
 */
async function handleIncomingMessage(message) {
  console.log('[MCP] Received message:', message);

  try {
    const response = await handleNativeMessage(message);
    sendResponse(response);
  } catch (error) {
    console.error('[MCP] Error handling message:', error);
    sendResponse({
      id: message.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: {
          error: error.message,
          stack: error.stack
        }
      }
    });
  }
}

/**
 * Send response back to native host
 * @param {Object} response - Response object
 */
function sendResponse(response) {
  if (nativePort) {
    try {
      nativePort.postMessage(response);
      console.log('[MCP] Sent response:', response);
    } catch (error) {
      console.error('[MCP] Failed to send response:', error);
    }
  } else {
    console.warn('[MCP] Cannot send response - no native port connection');
  }
}

/**
 * Handle native messaging disconnection
 */
function handleDisconnect() {
  const error = browser.runtime.lastError;

  if (error) {
    console.error('[MCP] Native messaging disconnected with error:', error);
  } else {
    console.log('[MCP] Native messaging disconnected normally');
  }

  nativePort = null;
  scheduleReconnect();
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
  console.log(`[MCP] Scheduling reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY}ms`);

  setTimeout(() => {
    connectNativeMessaging();
  }, RECONNECT_DELAY);
}

/**
 * Initialize extension on startup
 */
function initialize() {
  console.log('[MCP] Thunderbird MCP Extension starting...');
  console.log('[MCP] Version:', browser.runtime.getManifest().version);

  // Connect to native messaging
  connectNativeMessaging();

  // Listen for extension lifecycle events
  browser.runtime.onSuspend.addListener(() => {
    console.log('[MCP] Extension suspending...');
    if (nativePort) {
      nativePort.disconnect();
    }
  });
}

// Start the extension
initialize();
