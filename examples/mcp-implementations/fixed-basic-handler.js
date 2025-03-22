// Minimal MCP server with a basic tool handler that aligns with working example
// Uses Server class and ServerTools plugin

import { Server } from '@modelcontextprotocol/sdk/server';
import { ServerTools } from '@modelcontextprotocol/sdk/server/tools';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

// For better debugging
process.on('unhandledRejection', (error) => {
  console.error("UNHANDLED REJECTION:");
  console.error(error);
  console.error("STACK:", error.stack);
  process.exit(1);
});

// Implementation with a basic tool handler
async function main() {
  console.error("Starting Readwise MCP server with basic handler");
  
  try {
    // Create server
    console.error("Creating server...");
    const server = new Server({
      name: "readwise-mcp",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {
          "echo": true
        }
      }
    });
    console.error("Server created");

    // Register the tools plugin
    const tools = server.registerPlugin(ServerTools);

    // Add a simple echo tool
    console.error("Setting up echo tool handler...");
    tools.registerTool({
      name: "echo",
      description: "A simple tool that echoes back the input message",
      handler: async (params) => {
        try {
          console.error(`Executing echo tool with params: ${JSON.stringify(params)}`);
          
          // Return the message parameter as echo result
          return {
            content: [{ 
              type: "text", 
              text: `Echo: ${params.message || "No message provided"}` 
            }]
          };
        } catch (err) {
          console.error('Error executing echo tool:', err);
          return {
            content: [{ 
              type: "text", 
              text: `Error: ${err.message}` 
            }],
            isError: true
          };
        }
      }
    });
    console.error("Tool handler setup complete");

    // Connect transport
    console.error("Creating transport...");
    const transport = new StdioServerTransport();
    console.error("Transport created");
    
    console.error("Connecting to transport...");
    await server.connect(transport);
    console.error("Transport connected successfully");
    
    console.error("Server running with echo tool available");
  } catch (error) {
    console.error("ERROR IN MAIN:", error);
    if (error.stack) {
      console.error("STACK:", error.stack);
    }
    process.exit(1);
  }
}

// Run with proper error handling
main().catch(error => {
  console.error("FATAL ERROR:", error);
  if (error.stack) {
    console.error("STACK:", error.stack);
  }
  process.exit(1);
});