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
 * Background Service Worker - Main entry point for Zileo MCP — Thunderbird extension
 * Handles WebSocket communication with MCP server and dispatches API calls
 */

import { handleNativeMessage } from "./routing/handler.js";
import { debugLog } from "./debug.js";

// WebSocket connection state
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const WS_PORT = 9876;

// Reconnection backoff: one-shot alarm (survives MV3 event page suspension,
// unlike setTimeout), exponential delay capped at RECONNECT_MAX_DELAY_MS.
const RECONNECT_ALARM = "ws-reconnect";
const RECONNECT_BASE_DELAY_MS = 3000;
const RECONNECT_MAX_DELAY_MS = 60000;

// Auth token fetch timeout (symmetric with server-side bridge-client.ts)
const TOKEN_FETCH_TIMEOUT_MS = 5000;

// Track last message time for connection health
let lastMessageTime = Date.now();
const CONNECTION_HEALTH_TIMEOUT = 60000; // 60 seconds

// Flag to prevent duplicate reconnection attempts
let isReconnecting = false;
let forcedReconnect = false;
let isConnecting = false; // Prevent concurrent connectWebSocket() calls
let currentWsId = 0; // Track which WebSocket instance we're using

// Flag to prevent multiple initializations
let isInitialized = false;

/**
 * Fetch authentication token from the bridge HTTP endpoint.
 * SEC-WS-001: Token-based WebSocket authentication.
 * @returns {Promise<string>} The auth token
 */
async function fetchAuthToken() {
  // Abort the fetch after TOKEN_FETCH_TIMEOUT_MS: without this, a hung
  // bridge would block connectWebSocket() (and isConnecting) indefinitely.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`http://localhost:${WS_PORT}/auth/token`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Token fetch failed: HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data.token) {
      throw new Error("No token in auth response");
    }
    return data.token;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Connect to the MCP server via WebSocket.
 * Fetches an auth token first, then connects with the token as a query parameter.
 */
async function connectWebSocket() {
  // Prevent multiple simultaneous connections (including during async token fetch)
  if (isConnecting) {
    debugLog("[MCP] Connection already in progress, skipping");
    return;
  }
  if (
    ws &&
    (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)
  ) {
    debugLog("[MCP] WebSocket already connected or connecting, skipping");
    return;
  }

  isConnecting = true;
  try {
    // SEC-WS-001: Fetch auth token before connecting
    const token = await fetchAuthToken();

    const wsUrl = `ws://localhost:${WS_PORT}?token=${token}`;
    debugLog(`[MCP] Connecting to WebSocket server at ws://localhost:${WS_PORT}`);

    const thisWsId = ++currentWsId;
    ws = new WebSocket(wsUrl);

    ws.onopen = handleOpen;
    ws.onmessage = handleMessage;
    ws.onclose = (event) => handleClose(event, thisWsId);
    ws.onerror = handleError;
  } catch (error) {
    console.error("[MCP] Failed to connect (auth or WebSocket):", error);
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }
}

/**
 * Handle WebSocket connection open.
 * SEC-AUTH-001: Loads tool permissions from storage and includes them
 * in the ready notification so the bridge can enforce authorization.
 */
async function handleOpen() {
  debugLog("[MCP] WebSocket connected to MCP server");
  reconnectAttempts = 0;
  isReconnecting = false; // Reset reconnection flag
  lastMessageTime = Date.now(); // Reset connection health timer

  // SEC-AUTH-001: Load tool permissions from storage
  let toolPermissions = null;
  try {
    const stored = await browser.storage.local.get("toolPermissions");
    if (stored.toolPermissions) {
      toolPermissions = stored.toolPermissions;
      debugLog("[MCP] Loaded tool permissions from storage");
    }
  } catch (error) {
    console.warn("[MCP] Failed to load tool permissions:", error);
  }

  // Send ready notification with permissions
  const readyData = {
    version: browser.runtime.getManifest().version,
    capabilities: [
      "messages",
      "folders",
      "contacts",
      "tags",
      "accounts",
      "calendar",
      "tasks",
    ],
  };
  if (toolPermissions) {
    readyData.toolPermissions = toolPermissions;
  }

  sendMessage({
    id: generateId(),
    type: "notification",
    event: "ready",
    data: readyData,
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
    debugLog("[MCP] Received:", message.type, message.id || "");

    // Handle ping from server
    if (message.type === "ping") {
      sendMessage({
        type: "pong",
        id: message.id,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (message.type === "request") {
      await processRequest(message);
    }
  } catch (error) {
    console.error("[MCP] Failed to parse message:", error);
  }
}

/**
 * Process request from MCP server
 * @param {Object} request - Request message
 */
async function processRequest(request) {
  debugLog("[MCP] Processing request:", request.action);

  try {
    const result = await handleNativeMessage(request);

    // Send successful response
    sendMessage({
      id: request.id,
      type: "response",
      success: true,
      data: result.data !== undefined ? result.data : result,
      timestamp: new Date().toISOString(),
    });

    debugLog("[MCP] Request completed:", request.action);
  } catch (error) {
    console.error("[MCP] Request failed:", request.action, error);

    debugLog("[MCP] Request error stack:", error.stack);

    // Send error response (no stack trace leaked to clients)
    sendMessage({
      id: request.id,
      type: "response",
      success: false,
      error: {
        code: -32603,
        message: error.message || "Internal error",
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
  debugLog(
    "[MCP] WebSocket closed:",
    event.code,
    event.reason || "No reason",
    `(ws #${wsId})`,
  );

  // Ignore close events from old WebSocket instances
  if (wsId !== currentWsId) {
    debugLog(
      `[MCP] Ignoring close event from old WebSocket #${wsId} (current is #${currentWsId})`,
    );
    return;
  }

  ws = null;

  // Don't schedule reconnect if we're already handling a forced reconnect
  if (forcedReconnect) {
    debugLog(
      "[MCP] Skipping scheduled reconnect (forced reconnect in progress)",
    );
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
  console.error("[MCP] WebSocket error:", error);
}

/**
 * Schedule a reconnection attempt with exponential backoff.
 * Uses a one-shot alarm instead of setTimeout: MV3 event pages can be
 * suspended at any time and pending timers are lost, while alarms persist
 * and wake the page up (the keep-alive alarms remain as a safety net).
 */
function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error("[MCP] Max reconnection attempts reached. Giving up.");
    isReconnecting = false;
    return;
  }

  reconnectAttempts++;
  isReconnecting = true;
  const delayMs = Math.min(
    RECONNECT_BASE_DELAY_MS * 2 ** (reconnectAttempts - 1),
    RECONNECT_MAX_DELAY_MS,
  );
  debugLog(
    `[MCP] Reconnecting in ${delayMs}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
  );

  // Sub-minute delays are honored by Gecko (implementation behavior, not
  // contractual); if a future version clamps them, the keep-alive alarms
  // still trigger ensureWebSocketConnected() within ~30s.
  browser.alarms.create(RECONNECT_ALARM, { delayInMinutes: delayMs / 60000 });
}

/**
 * Send message through WebSocket
 * @param {Object} message - Message to send
 */
function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    debugLog("[MCP] Sent:", message.type, message.id || "");
  } else {
    console.warn("[MCP] Cannot send - WebSocket not connected");
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
 *
 * Strategy: Use delayInMinutes (not setTimeout) to stagger alarms,
 * as setTimeout is lost when the event page goes idle.
 * Minimum periodInMinutes is 0.5 (30 seconds) in most browsers.
 */
function setupKeepAlive() {
  // Clear any existing alarms first to avoid duplicates on restart
  browser.alarms
    .clearAll()
    .then(() => {
      // Create staggered alarms using delayInMinutes (survives idle)
      // Alarm 0: starts immediately, repeats every 30 seconds
      browser.alarms.create("keepAlive-0", {
        delayInMinutes: 0.1, // First trigger in ~6 seconds
        periodInMinutes: 0.5, // Then every 30 seconds
      });

      // Alarm 1: starts after 10 seconds, repeats every 30 seconds
      browser.alarms.create("keepAlive-1", {
        delayInMinutes: 0.17, // First trigger in ~10 seconds
        periodInMinutes: 0.5,
      });

      // Alarm 2: starts after 20 seconds, repeats every 30 seconds
      browser.alarms.create("keepAlive-2", {
        delayInMinutes: 0.33, // First trigger in ~20 seconds
        periodInMinutes: 0.5,
      });

      debugLog("[MCP] Keep-alive alarms configured (3 alarms, ~10s intervals)");
    })
    .catch((error) => {
      console.error("[MCP] Failed to configure keep-alive alarms:", error);
    });
}

/**
 * Ensure WebSocket is connected and healthy, reconnect if necessary
 */
function ensureWebSocketConnected() {
  // Prevent concurrent reconnection attempts
  if (isReconnecting) {
    debugLog("[MCP] Reconnection already in progress, skipping");
    return;
  }

  const now = Date.now();
  const timeSinceLastMessage = now - lastMessageTime;

  // Check if WebSocket is not connected
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    debugLog("[MCP] WebSocket not connected, reconnecting...");
    isReconnecting = true;
    reconnectAttempts = 0;
    connectWebSocket();
    return;
  }

  // Check for stale connection (no messages received in CONNECTION_HEALTH_TIMEOUT)
  // This detects "zombie" connections where WebSocket appears open but is not receiving
  if (timeSinceLastMessage > CONNECTION_HEALTH_TIMEOUT) {
    debugLog(
      `[MCP] Connection appears stale (${Math.round(timeSinceLastMessage / 1000)}s since last message), forcing reconnect...`,
    );
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
    type: "heartbeat",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Initialize extension on startup
 */
function initialize() {
  // Prevent multiple initializations
  if (isInitialized) {
    debugLog("[MCP] Already initialized, skipping");
    // Just ensure WebSocket is connected
    ensureWebSocketConnected();
    return;
  }
  isInitialized = true;

  debugLog("[MCP] Zileo MCP — Thunderbird extension starting...");
  debugLog("[MCP] Version:", browser.runtime.getManifest().version);

  // Setup keep-alive mechanism to prevent Event Page termination
  setupKeepAlive();

  // Connect to MCP server via WebSocket
  connectWebSocket();
}

// ============================================================
// SEC-AUTH-001: Listen for permission changes from options page
// ============================================================
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.toolPermissions) {
    debugLog("[MCP] Tool permissions updated from options page");
    const newPermissions = changes.toolPermissions.newValue;
    sendMessage({
      id: generateId(),
      type: "notification",
      event: "permissionsUpdated",
      data: { toolPermissions: newPermissions },
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================
// MV3 Event Page Lifecycle - Top-level listeners (REQUIRED)
// These must be at top-level to wake up the event page
// ============================================================

// Alarm dispatcher: keep-alive health checks + one-shot reconnect alarm.
// Registered synchronously at top-level (event page requirement: listeners
// added inside async init paths are not restored after a suspension).
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith("keepAlive")) {
    debugLog("[MCP] Keep-alive alarm triggered:", alarm.name);
    ensureWebSocketConnected();
  } else if (alarm.name === RECONNECT_ALARM) {
    debugLog("[MCP] Reconnect alarm fired");
    connectWebSocket();
  }
});

// Handle extension suspend (cleanup)
browser.runtime.onSuspend.addListener(() => {
  debugLog("[MCP] Extension suspending...");
  if (ws) {
    ws.close();
  }
});

// Handle browser/Thunderbird startup - reconnect WebSocket
browser.runtime.onStartup.addListener(() => {
  debugLog("[MCP] Thunderbird started - initializing extension");
  initialize();
});

// Handle extension install/update - setup alarms and connect
browser.runtime.onInstalled.addListener((details) => {
  debugLog("[MCP] Extension installed/updated:", details.reason);
  initialize();
});

// Also initialize immediately for when the event page wakes up
// This handles the case where the page was terminated and restarted by an alarm
debugLog("[MCP] Event page loaded");
initialize();
