import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { ReadwiseAPI } from './src/api/readwise-api';
import { ReadwiseClient } from './src/api/client';
import { ToolRegistry } from './src/mcp/registry/tool-registry';
import { PromptRegistry } from './src/mcp/registry/prompt-registry';
import { getConfig } from './src/utils/config';
import { SafeLogger, LogLevel } from './src/utils/safe-logger';

/**
 * This script provides comprehensive testing for the Readwise MCP implementation:
 * 1. Tests the server with both stdio and SSE transports
 * 2. Tests the client connecting to the server
 * 3. Tests all available tools and prompts
 */

// Global variables
let httpServer: http.Server | null = null;
let sseTransport: SSEServerTransport | null = null;
let serverProcess: any = null;

// Create a logger
const logger = new SafeLogger(
  'stdio',
  'readwise-mcp-test',
  {
    level: LogLevel.DEBUG,
    showLevel: true,
    timestamps: true
  }
);

/**
 * Test the server with SSE transport
 */
async function testServerSSE() {
  logger.info('Testing server with SSE transport...');

  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Get configuration
  const config = getConfig();
  config.transport = 'sse';

  // Create the Readwise API client
  const client = new ReadwiseClient({
    apiKey: config.readwiseApiKey,
    baseUrl: config.readwiseApiBaseUrl
  });
  const api = new ReadwiseAPI(client);

  // Create the tool registry
  const toolRegistry = new ToolRegistry(api);

  // Create the prompt registry
  const promptRegistry = new PromptRegistry(api);

  // Setup MCP Server
  const server = new McpServer({
    name: "Readwise",
    version: "1.0.0",
    description: "Access your Readwise library, including articles, books, highlights, and documents."
  });

  // Register MCP functions
  for (const tool of toolRegistry.getAllTools()) {
    logger.debug(`Registering tool: ${tool.name}`);
    
    server.tool(
      tool.name,
      tool.parameters,
      async (params: any) => {
        try {
          logger.debug(`Executing tool: ${tool.name}`, params);
          
          // Validate parameters if needed
          if (tool.validate) {
            const validationResult = tool.validate(params);
            if (!validationResult.valid) {
              logger.warn(`Validation failed for tool ${tool.name}: ${validationResult.error}`);
              return {
                content: [{ type: "text", text: validationResult.error || 'Invalid parameters' }],
                isError: true
              };
            }
          }
          
          const result = await tool.execute(params);
          logger.debug(`Tool ${tool.name} executed successfully`);
          return {
            content: [{ type: "text", text: JSON.stringify(result) }]
          };
        } catch (error) {
          logger.error(`Error executing tool ${tool.name}:`, error);
          
          // Convert error to MCP-compatible format
          let errorMessage = "An unexpected error occurred";
          
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          return {
            content: [{ type: "text", text: errorMessage }],
            isError: true
          };
        }
      }
    );
  }

  // Setup HTTP server
  const port = config.port || 3000;
  httpServer = app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });

  // Setup SSE endpoint
  app.get('/sse', async (req, res) => {
    logger.info('SSE connection established');
    sseTransport = new SSEServerTransport('/messages', res);
    await server.connect(sseTransport);
  });

  app.post('/messages', async (req, res) => {
    if (sseTransport) {
      logger.debug('Received message', { body: req.body });
      await sseTransport.handlePostMessage(req, res);
    } else {
      logger.warn('No active SSE connection');
      res.status(400).json({ error: 'No active SSE connection' });
    }
  });

  // Add status endpoint
  app.get('/status', (req, res) => {
    res.status(200).json({
      status: 'ok',
      version: '1.0.0',
      transport: 'sse',
      tools: toolRegistry.getAllToolNames(),
      prompts: promptRegistry.getAllPromptNames()
    });
  });

  logger.info('Server with SSE transport started successfully');
  return { port };
}

/**
 * Test the client connecting to the server
 */
async function testClient(port: number) {
  logger.info('Testing client connecting to server...');

  try {
    // Create a transport to the server
    const transport = new StdioClientTransport({
      command: 'npm',
      args: ['run', 'start']
    });

    // Create the client
    const client = new Client(
      {
        name: 'readwise-mcp-test-client',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Connect to the server
    logger.info('Connecting to server...');
    await client.connect(transport);
    logger.info('Connected to server successfully!');

    // Test tool calls
    logger.info('Testing tools...');

    // Test get_books tool
    logger.info('Testing get_books tool...');
    const booksResult = await client.callTool({
      name: 'get_books',
      arguments: {
        limit: 3
      }
    });
    if (booksResult.content && booksResult.content[0] && booksResult.content[0].text) {
      logger.info('Books result:', JSON.parse(booksResult.content[0].text));
    }

    logger.info('Client tests completed successfully');
  } catch (error) {
    logger.error('Error during client test:', error);
    throw error;
  }
}

/**
 * Test the server with stdio transport
 */
async function testServerStdio() {
  logger.info('Testing server with stdio transport...');

  // Start the server process
  serverProcess = spawn('npm', ['run', 'start'], {
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', (data: Buffer) => {
    logger.debug(`Server stdout: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data: Buffer) => {
    logger.debug(`Server stderr: ${data.toString().trim()}`);
  });

  // Wait for the server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  logger.info('Server with stdio transport started successfully');
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Test server with SSE transport
    const { port } = await testServerSSE();
    
    // Test client
    await testClient(port);
    
    // Test server with stdio transport
    await testServerStdio();
    
    logger.info('All tests completed successfully!');
  } catch (error) {
    logger.error('Error during tests:', error);
  } finally {
    // Clean up
    if (httpServer) {
      logger.info('Closing HTTP server...');
      httpServer.close();
    }
    
    if (serverProcess) {
      logger.info('Terminating server process...');
      serverProcess.kill();
    }
    
    logger.info('Tests completed.');
  }
}

// Run the tests
runTests().catch((error) => {
  logger.error('Unhandled error in test script:', error);
  process.exit(1);
}); 