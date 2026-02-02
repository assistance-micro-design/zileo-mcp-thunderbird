#!/usr/bin/env node

/**
 * Thunderbird MCP Server Entry Point
 * Main entry point for the Thunderbird MCP server
 * @module index
 */

import { createServer } from "./server.js";
import logger from "./utils/logger.js";

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Create and start server
    const server = createServer();
    await server.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      try {
        await server.stop();
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown", error);
        process.exit(1);
      }
    };

    // Register signal handlers
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled rejection at:", promise, "reason:", reason);
      process.exit(1);
    });

    logger.info("Thunderbird MCP Server is running");
  } catch (error) {
    logger.error("Failed to start server", error);
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
