/**
 * MCP Server Configuration
 * Configures the Model Context Protocol server for Thunderbird
 * @module server
 */

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
} from "./websocket/bridge.js";
import { allTools, getToolHandler, toolExists } from "./tools/index.js";
import {
  resources,
  resourceTemplates,
  getResourceHandler,
} from "./resources/index.js";
import logger from "./utils/logger.js";

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
        name: "thunderbird-mcp",
        version: "1.0.0",
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
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug("Received tools/list request");
      return { tools: allTools };
    });

    // Call a tool
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
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
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
          return {
            contents: [
              {
                uri,
                mimeType: "text/plain",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    logger.info("Starting Thunderbird MCP Server");

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
    logger.info("Stopping Thunderbird MCP Server");
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
