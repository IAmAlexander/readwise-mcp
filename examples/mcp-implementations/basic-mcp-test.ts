/**
 * Minimal MCP test script
 * This follows the official MCP documentation pattern to establish basic connectivity
 */

import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { LogLevel } from "./src/utils/logger-interface.js";
import { SafeLogger } from "./src/utils/safe-logger.js";
import type { LogContext } from "./src/utils/logger-interface.js";

/**
 * Main function to initialize and start the MCP server
 */
async function main() {
  // Enable debug logging for MCP SDK
  process.env.DEBUG = 'mcp:*';

  // Initialize a logger
  const logger = new SafeLogger({
    level: LogLevel.DEBUG,
    transport: console.error,
    timestamps: true,
    colors: true
  });

  try {
    logger.info("Starting basic MCP test server");

    // Create server instance
    const server = new Server({
      name: "readwise-mcp-test",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {},
        prompts: {}
      }
    });

    // Set up a basic capabilities handler
    server.setRequestHandler('capabilities', async () => {
      logger.debug("Handling capabilities request");
      
      return {
        tools: [],
        prompts: []
      };
    });

    // Handle tool calls
    server.setRequestHandler('tool_call', async (request) => {
      const { name, parameters, request_id } = request;

      logger.debug("Received tool call request", { name, request_id } as LogContext);

      return {
        content: [
          {
            type: "text",
            text: `Tool ${name} called with parameters: ${JSON.stringify(parameters)}`
          }
        ],
        request_id
      };
    });

    // Connect to transport
    logger.info("Connecting to stdio transport");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info("Server started successfully");
  } catch (error) {
    console.error("ERROR DETAILS:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Non-Error object thrown:", JSON.stringify(error, null, 2));
    }
    logger.error("Error starting server", error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error("UNHANDLED REJECTION DETAILS:");
  console.error("----------------------------------------");
  if (error instanceof Error) {
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  } else {
    console.error("Error details:", error);
    try {
      console.error("Stringified error:", JSON.stringify(error, null, 2));
    } catch (e) {
      console.error("Error could not be stringified");
    }
  }
  console.error("----------------------------------------");
  process.exit(1);
});

// Start the server
main().catch(error => {
  console.error("Fatal error:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});