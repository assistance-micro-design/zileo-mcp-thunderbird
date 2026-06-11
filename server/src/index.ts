#!/usr/bin/env node

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
 * Zileo MCP — Thunderbird Entry Point
 * Main entry point for the Zileo MCP — Thunderbird server
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
    const shutdown = async (signal: string): Promise<void> => {
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

    logger.info("Zileo MCP — Thunderbird is running");
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
