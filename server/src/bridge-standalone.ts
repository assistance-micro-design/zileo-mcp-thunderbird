#!/usr/bin/env node

/**
 * Standalone WebSocket Bridge Server
 * Runs only the WebSocket bridge without the MCP server
 * Used by Docker container to provide a shared bridge for multiple MCP clients
 * @module bridge-standalone
 */

import type { EventEmitter } from "events";
import {
  initializeWebSocketBridgeServer,
  stopWebSocketBridge,
} from "./websocket/bridge.js";
import logger from "./utils/logger.js";

/**
 * Load configuration from environment variables
 */
function loadConfiguration(): { wsPort: number; wsHost: string } {
  const wsPort = parseInt(process.env.THUNDERBIRD_PORT || "9876", 10);
  // SEC-REVIEW-002: In Docker containers, bind to 0.0.0.0 for port forwarding;
  // outside Docker, default to 127.0.0.1 for security
  const wsHost = process.env.BRIDGE_HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
  return { wsPort, wsHost };
}

/**
 * Attach event handlers to the bridge instance
 */
function attachBridgeEventHandlers(bridge: EventEmitter): void {
  bridge.on("connected", () => {
    logger.info("Thunderbird extension connected to bridge");
  });

  bridge.on("disconnected", () => {
    logger.info("Thunderbird extension disconnected from bridge");
  });

  bridge.on("error", (error: Error) => {
    logger.error("Bridge error:", error);
  });
}

/**
 * Register process-level handlers for signals and uncaught errors
 */
function registerProcessHandlers(): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    try {
      await stopWebSocketBridge();
      logger.info("WebSocket Bridge stopped");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown", error);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const { wsPort, wsHost } = loadConfiguration();

  logger.info("Starting Thunderbird WebSocket Bridge (Standalone Mode)");
  logger.info(`Host: ${wsHost}, Port: ${wsPort}`);

  try {
    const bridge = await initializeWebSocketBridgeServer({
      port: wsPort,
      host: wsHost,
      timeout: 30000,
      maxPendingRequests: 100,
    });

    logger.info("WebSocket Bridge started successfully");
    logger.info("Waiting for Thunderbird extension connection...");

    attachBridgeEventHandlers(bridge);
    registerProcessHandlers();

    logger.info("Thunderbird WebSocket Bridge is running");
    logger.info("MCP clients can now connect to this bridge");
  } catch (error) {
    logger.error("Failed to start WebSocket Bridge", error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  logger.error("Fatal error:", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
