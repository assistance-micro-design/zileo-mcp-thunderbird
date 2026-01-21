#!/usr/bin/env node

/**
 * Standalone WebSocket Bridge Server
 * Runs only the WebSocket bridge without the MCP server
 * Used by Docker container to provide a shared bridge for multiple MCP clients
 * @module bridge-standalone
 */

import { initializeWebSocketBridgeServer, stopWebSocketBridge } from './websocket/bridge.js';
import logger from './utils/logger.js';

/**
 * Main function
 */
async function main(): Promise<void> {
  const wsPort = parseInt(process.env.THUNDERBIRD_PORT || '9876', 10);

  logger.info('Starting Thunderbird WebSocket Bridge (Standalone Mode)');
  logger.info(`Port: ${wsPort}`);

  try {
    // Initialize WebSocket bridge server only (no MCP server)
    const bridge = await initializeWebSocketBridgeServer({
      port: wsPort,
      timeout: 30000,
      maxPendingRequests: 100,
    });

    logger.info('WebSocket Bridge started successfully');
    logger.info('Waiting for Thunderbird extension connection...');

    // Track connection status
    bridge.on('connected', () => {
      logger.info('Thunderbird extension connected to bridge');
    });

    bridge.on('disconnected', () => {
      logger.info('Thunderbird extension disconnected from bridge');
    });

    bridge.on('error', (error: Error) => {
      logger.error('Bridge error:', error);
    });

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      try {
        await stopWebSocketBridge();
        logger.info('WebSocket Bridge stopped');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    // Register signal handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    logger.info('Thunderbird WebSocket Bridge is running');
    logger.info('MCP clients can now connect to this bridge');
  } catch (error) {
    logger.error('Failed to start WebSocket Bridge', error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
