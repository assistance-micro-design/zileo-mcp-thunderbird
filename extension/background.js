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

// Track last message time for connection health
let lastMessageTime = Date.now();
const CONNECTION_HEALTH_TIMEOUT = 60000; // 60 seconds

// Flag to prevent duplicate reconnection attempts
let isReconnecting = false;
let forcedReconnect = false;
let currentWsId = 0; // Track which WebSocket instance we're using

/**
 * Connect to the MCP server via WebSocket
 */
function connectWebSocket() {
  const wsUrl = `ws://localhost:${WS_PORT}`;

  console.log(`[MCP] Connecting to WebSocket server at ${wsUrl}`);

  try {
    const thisWsId = ++currentWsId;
    ws = new WebSocket(wsUrl);

    ws.onopen = handleOpen;
    ws.onmessage = handleMessage;
    ws.onclose = (event) => handleClose(event, thisWsId);
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
  isReconnecting = false; // Reset reconnection flag
  lastMessageTime = Date.now(); // Reset connection health timer

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
  // Update last message time to track connection health
  lastMessageTime = Date.now();

  try {
    const message = JSON.parse(event.data);
    console.log('[MCP] Received:', message);

    // Handle ping from server
    if (message.type === 'ping') {
      sendMessage({ type: 'pong', id: message.id, timestamp: new Date().toISOString() });
      return;
    }

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
 * @param {number} wsId - ID of the WebSocket that closed
 */
function handleClose(event, wsId) {
  console.log('[MCP] WebSocket closed:', event.code, event.reason || 'No reason', `(ws #${wsId})`);
  
  // Ignore close events from old WebSocket instances
  if (wsId !== currentWsId) {
    console.log(`[MCP] Ignoring close event from old WebSocket #${wsId} (current is #${currentWsId})`);
    return;
  }
  
  ws = null;
  
  // Don't schedule reconnect if we're already handling a forced reconnect
  if (forcedReconnect) {
    console.log('[MCP] Skipping scheduled reconnect (forced reconnect in progress)');
    forcedReconnect = false;
    return;
  }
  
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
    isReconnecting = false;
    return;
  }

  reconnectAttempts++;
  isReconnecting = true;
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
 * Setup keep-alive alarms to prevent Event Page termination
 * In MV3, Event Pages are terminated after ~30-90 seconds of inactivity
 * Alarms persist and wake up the extension when triggered
 */
function setupKeepAlive() {
  // Create staggered alarms to wake extension approximately every 20 seconds
  browser.alarms.create('keepAlive-0', { periodInMinutes: 1 });

  // Stagger additional alarms for more frequent wake-ups
  setTimeout(() => {
    browser.alarms.create('keepAlive-1', { periodInMinutes: 1 });
  }, 20000);

  setTimeout(() => {
    browser.alarms.create('keepAlive-2', { periodInMinutes: 1 });
  }, 40000);

  // Listen for alarms to reconnect WebSocket if needed
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith('keepAlive')) {
      console.log('[MCP] Keep-alive alarm triggered:', alarm.name);
      ensureWebSocketConnected();
    }
  });

  console.log('[MCP] Keep-alive alarms configured');
}

/**
 * Ensure WebSocket is connected and healthy, reconnect if necessary
 */
function ensureWebSocketConnected() {
  // Prevent concurrent reconnection attempts
  if (isReconnecting) {
    console.log('[MCP] Reconnection already in progress, skipping');
    return;
  }

  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTime;

  // Check if WebSocket is not connected
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('[MCP] WebSocket not connected, reconnecting...');
    isReconnecting = true;
    reconnectAttempts = 0;
    connectWebSocket();
    return;
  }

  // Check for stale connection (no messages received in CONNECTION_HEALTH_TIMEOUT)
  // This detects "zombie" connections where WebSocket appears open but is not receiving
  if (timeSinceLastMessage > CONNECTION_HEALTH_TIMEOUT) {
    console.log(`[MCP] Connection appears stale (${Math.round(timeSinceLastMessage / 1000)}s since last message), forcing reconnect...`);
    isReconnecting = true;
    forcedReconnect = true; // Prevent handleClose from scheduling another reconnect
    reconnectAttempts = 0;
    if (ws) {
      ws.close();
    }
    ws = null;
    connectWebSocket();
    return;
  }

  // Send heartbeat to verify connection is truly alive
  sendMessage({
    id: generateId(),
    type: 'heartbeat',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Initialize extension on startup
 */
function initialize() {
  console.log('[MCP] Thunderbird MCP Extension starting...');
  console.log('[MCP] Version:', browser.runtime.getManifest().version);

  // Setup keep-alive mechanism to prevent Event Page termination
  setupKeepAlive();

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
