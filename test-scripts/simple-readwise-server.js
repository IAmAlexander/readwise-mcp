// Simple Readwise MCP server in JavaScript
// This avoids TypeScript compilation issues while preserving core functionality

import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
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
    app.use(bodyParser.json());
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
      setupSSETransport(server, app);
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
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Stdio transport connected successfully");
  } catch (error) {
    console.error("Error connecting stdio transport:", error);
    throw error;
  }
}

/**
 * Set up SSE transport and endpoints
 */
function setupSSETransport(server, app) {
  console.error("Setting up SSE transport...");

  // Track active SSE connection to prevent race conditions
  let activeConnection = null;

  // Set up SSE endpoint
  app.get('/sse', async (req, res) => {
    console.error("New SSE connection request");

    // Check if there's already an active connection
    if (activeConnection !== null) {
      console.error("Rejecting connection: another client is already connected");
      res.status(409).json({
        error: 'Conflict',
        message: 'Another SSE client is already connected. This server supports single-client testing only.'
      });
      return;
    }

    // Mark connection as active immediately to prevent race conditions
    const connectionId = Date.now();
    activeConnection = connectionId;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    try {
      // Create transport
      const transport = new SSEServerTransport('/messages', res);

      // Connect transport to server
      await server.connect(transport);
      console.error("SSE transport connected successfully");

      // Keep-alive interval
      const keepAliveInterval = setInterval(() => {
        if (!res.writableEnded) {
          res.write('event: ping\ndata: {}\n\n');
        } else {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      // Handle client disconnect
      req.on('close', async () => {
        console.error("Client disconnected");
        clearInterval(keepAliveInterval);

        // Clear active connection
        if (activeConnection === connectionId) {
          activeConnection = null;
        }

        try {
          await transport.close();
        } catch (err) {
          console.error("Error closing transport:", err);
        }
      });
    } catch (error) {
      console.error("Error in SSE endpoint:", error);

      // Clear active connection on error
      if (activeConnection === connectionId) {
        activeConnection = null;
      }

      if (!res.writableEnded) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
        res.end();
      }
    }
  });
  
  // Set up messages endpoint for SSE
  app.post('/messages', (req, res) => {
    console.error("Received POST message");

    // Handle the message through SSE transport
    try {
      // Find active transport
      const transport = server._transport;

      if (!transport) {
        console.error("No SSE connection established");
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'No SSE connection established. Please connect to /sse first.'
        });
        return;
      }

      if (!transport.handlePostMessage) {
        console.error("SSE connection lost or invalid");
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'SSE connection lost or invalid. Please reconnect to /sse.'
        });
        return;
      }

      // Pass message to transport
      transport.handlePostMessage(req, res);
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