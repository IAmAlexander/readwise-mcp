// Simple Readwise MCP server in JavaScript
// This avoids TypeScript compilation issues while preserving core functionality

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

// Global error handling
process.on('unhandledRejection', (error) => {
  console.error("UNHANDLED REJECTION:");
  console.error(error);
  process.exit(1);
});

/**
 * Get port from environment or command line arguments
 */
function getPort() {
  // Check command line args first (--port=XXXX)
  const portArg = process.argv.find(arg => arg.startsWith('--port='));
  if (portArg) {
    const port = parseInt(portArg.split('=')[1], 10);
    if (!isNaN(port)) return port;
  }
  
  // Then check environment variable
  if (process.env.MCP_PORT) {
    const port = parseInt(process.env.MCP_PORT, 10);
    if (!isNaN(port)) return port;
  }
  
  // Default ports based on transport
  const isMCPInspector = process.env.MCP_INSPECTOR === 'true' || 
                         process.argv.includes('--mcp-inspector');
  return isMCPInspector ? 3000 : 3001;
}

/**
 * Main function to run the server
 */
async function main() {
  console.error("Starting Simple Readwise MCP Server");
  
  try {
    // Determine transport type
    const isMCPInspector = process.env.MCP_INSPECTOR === 'true' || 
                          process.argv.includes('--mcp-inspector');
    const transportType = isMCPInspector ? 'sse' : 'stdio';
    const port = getPort();
    
    console.error(`Using ${transportType} transport on port ${port}`);
    
    // Create server
    console.error("Creating server...");
    const server = new Server({
      name: "simple-readwise-mcp",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {
          "echo": true
        }
      }
    });
    console.error("Server created");
    
    // Create Express app for HTTP server (needed for SSE transport)
    const app = express();
    app.use(cors());
  // Do not attach a JSON body parser globally; the SSE transport expects to
  // read the raw request stream in handlePostMessage.
    const httpServer = createServer(app);
    
    // Set up health endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        transport: transportType,
        port: port
      });
    });
    
    // Set up direct request handling
    console.error("Setting up request handling...");
    server._onRequest = async (method, params, context) => {
      console.error(`Received request: ${method}`, params);
      
      // Handle echo tool
      if (method === "mcp/call_tool" && params.name === "echo") {
        console.error("Executing echo tool", params);
        try {
          const message = params.parameters?.message || "No message provided";
          
          // Add timeout protection for the echo tool
          const result = await Promise.race([
            Promise.resolve({
              content: [{ 
                type: "text", 
                text: `Echo: ${message}` 
              }]
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Echo tool execution timed out')), 5000)
            )
          ]);
          
          console.error(`Echo tool completed with result: ${JSON.stringify(result)}`);
          return result;
        } catch (error) {
          console.error(`Error in echo tool: ${error.message}`);
          // Follow MCP error format with isError flag
          return {
            isError: true,
            content: [{ 
              type: "text", 
              text: `Error: ${error.message}` 
            }]
          };
        }
      }
      
      // Let server handle other requests
      return null;
    };
    
    // Start HTTP server for SSE transport
    console.error(`Starting HTTP server on port ${port}...`);
    await new Promise(resolve => {
      httpServer.listen(port, () => {
        console.error(`HTTP server started on port ${port}`);
        resolve();
      });
    });
    
    // Set up the appropriate transport
    if (transportType === 'stdio') {
      await setupStdioTransport(server);
    } else {
      await setupSSETransport(server, app);
    }
    
    console.error("Server running. Press Ctrl+C to stop");
  } catch (error) {
    console.error("ERROR IN MAIN:", error);
    process.exit(1);
  }
}

/**
 * Set up stdio transport
 */
async function setupStdioTransport(server) {
  console.error("Setting up stdio transport...");
  
  try {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const transport = new StdioServerTransport();
    
    server.connect(transport)
      .then(() => {
        console.error("Stdio transport connected successfully");
      })
      .catch(error => {
        console.error("Error connecting stdio transport:", error);
      });
  } catch (error) {
    console.error("Error setting up stdio transport:", error);
    throw error;
  }
}

/**
 * Set up SSE transport and endpoints
 */
async function setupSSETransport(server, app) {
  console.error("Setting up SSE transport...");

  // Keep a reference to the active SSE transport
  let sseTransport = null;

  // Set up SSE endpoint
  app.get('/sse', async (req, res) => {
    console.error("New SSE connection");

    try {
      // Close any previous transport
      if (sseTransport) {
        try { await sseTransport.close(); } catch {}
        sseTransport = null;
      }

      // Create transport and connect
      sseTransport = new SSEServerTransport('/messages', res);
      await server.connect(sseTransport);
      console.error("SSE transport connected successfully");

      // Handle client disconnect
      req.on('close', () => {
        console.error("Client disconnected");
        sseTransport?.close().catch(err => {
          console.error("Error closing transport:", err);
        });
        sseTransport = null;
      });
    } catch (error) {
      console.error("Error connecting SSE transport:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Set up messages endpoint for SSE
  app.post('/messages', async (req, res) => {
    try {
      if (!sseTransport) {
        res.status(500).json({ error: 'SSE connection not established' });
        return;
      }
      await sseTransport.handlePostMessage(req, res);
    } catch (error) {
      console.error("Error handling message:", error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  console.error("SSE transport setup complete");
}

// Start the application
main().catch(error => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});