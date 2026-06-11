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
 * MCP Server Configuration
 * Configures the Model Context Protocol server for Thunderbird
 * @module server
 */

import { createRequire } from "node:module";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  initializeWebSocketBridge,
  stopWebSocketBridge,
  isBridgeClientMode,
  getWebSocketBridge,
} from "./websocket/bridge.js";
import { allTools, getToolHandler, toolExists } from "./tools/index.js";
import {
  isToolAllowed,
  getToolTier,
  buildToolDeniedResult,
} from "./permissions/tool-permissions.js";
import {
  resources,
  resourceTemplates,
  getResourceHandler,
} from "./resources/index.js";
import { nativeErrorToJsonRpc } from "./utils/errors.js";
import logger from "./utils/logger.js";

/**
 * Single source of truth for the version reported to MCP clients:
 * server/package.json (bumped by the release process). The Dockerfile label,
 * manifest.json and root package.json are kept in sync by
 * version-coherence.test.ts.
 */
const require = createRequire(import.meta.url);
const { version: SERVER_VERSION } = require("../package.json") as {
  version: string;
};

/**
 * MCP Server for Thunderbird
 */
export class ThunderbirdMcpServer {
  private server: Server;
  private transport: StdioServerTransport;

  constructor() {
    // Create MCP server instance
    this.server = new Server(
      {
        name: "zileo-mcp-thunderbird",
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    // Create stdio transport
    this.transport = new StdioServerTransport();

    // Set up handlers
    this.setupHandlers();
  }

  /**
   * Set up MCP protocol handlers
   */
  private setupHandlers(): void {
    // List available tools (filtered by SEC-AUTH-001 permissions)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug("Received tools/list request");
      const permissions = this.getToolPermissions();
      const filteredTools = allTools.filter(
        (tool: { name: string }) => isToolAllowed(tool.name, permissions),
      );
      logger.debug(
        `Returning ${filteredTools.length}/${allTools.length} tools (${allTools.length - filteredTools.length} filtered by permissions)`,
      );
      return { tools: filteredTools };
    });

    // Call a tool (with SEC-AUTH-001 permission check)
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`Tool call: ${name}`);

      // Validate tool exists
      if (!toolExists(name)) {
        return {
          content: [{ type: "text", text: `Error: Tool not found: ${name}` }],
          isError: true,
        };
      }

      // SEC-AUTH-001: Check tool authorization
      const permissions = this.getToolPermissions();
      if (!isToolAllowed(name, permissions)) {
        const tier = getToolTier(name) || "unknown";
        logger.warn(`Tool call denied by permissions: ${name} (tier: ${tier})`);
        return buildToolDeniedResult(name);
      }

      // Get tool handler
      const handler = getToolHandler(name);
      if (!handler) {
        return {
          content: [
            { type: "text", text: `Error: Tool handler not found: ${name}` },
          ],
          isError: true,
        };
      }

      try {
        // Execute tool
        const result = await handler(args || {});
        return result;
      } catch (error) {
        logger.error(`Tool execution error: ${name}`, error);
        const jsonRpcError = nativeErrorToJsonRpc(error);
        return {
          content: [
            { type: "text", text: `Error: ${jsonRpcError.message}` },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug("Received resources/list request");
      return { resources, resourceTemplates };
    });

    // Read a resource
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;
        logger.info(`Resource read: ${uri}`);

        // Get resource handler
        const handler = getResourceHandler(uri);
        if (!handler) {
          return {
            contents: [
              {
                uri,
                mimeType: "text/plain",
                text: `Error: Unknown resource: ${uri}`,
              },
            ],
          };
        }

        try {
          // Execute resource handler
          const content = await handler(uri);
          return { contents: [content] };
        } catch (error) {
          logger.error(`Resource read error: ${uri}`, error);
          const jsonRpcError = nativeErrorToJsonRpc(error);
          return {
            contents: [
              {
                uri,
                mimeType: "text/plain",
                text: `Error: ${jsonRpcError.message}`,
              },
            ],
          };
        }
      },
    );
  }

  /**
   * SEC-AUTH-001: Get tool permissions from the WebSocket bridge.
   * Returns an empty object if the bridge is not initialized (defaults will be used).
   */
  private getToolPermissions(): Record<string, boolean> {
    try {
      const bridge = getWebSocketBridge();
      return bridge.getToolPermissions();
    } catch {
      // Bridge not initialized yet - use empty permissions (defaults apply)
      return {};
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    logger.info("Starting Zileo MCP — Thunderbird");

    try {
      // Initialize WebSocket bridge for Thunderbird communication
      // This now supports two modes:
      // 1. Client mode: connects to existing bridge (e.g., when Docker container runs standalone bridge)
      // 2. Server mode: creates new bridge server if no existing bridge found
      const wsPort = parseInt(process.env.THUNDERBIRD_PORT || "9876", 10);
      logger.info(`Initializing WebSocket bridge on port ${wsPort}`);
      try {
        await initializeWebSocketBridge({
          port: wsPort,
          timeout: 30000,
          maxPendingRequests: 100,
        });
        const mode = isBridgeClientMode() ? "client" : "server";
        logger.info(
          `WebSocket bridge initialized successfully in ${mode} mode`,
        );
      } catch (wsError) {
        logger.warn(
          `WebSocket bridge failed to start: ${wsError instanceof Error ? wsError.message : "Unknown error"}`,
        );
        logger.warn(
          "MCP server will continue but Thunderbird tools will not work until WebSocket is available",
        );
      }

      // Connect server to transport
      await this.server.connect(this.transport);
      logger.info("MCP Server started successfully");
    } catch (error) {
      logger.error("Failed to start MCP server", error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    logger.info("Stopping Zileo MCP — Thunderbird");
    await stopWebSocketBridge();
    await this.server.close();
  }
}

/**
 * Create and export server instance
 */
export function createServer(): ThunderbirdMcpServer {
  return new ThunderbirdMcpServer();
}
