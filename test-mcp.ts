import { spawn } from 'child_process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { ReadwiseAPI } from './src/api/readwise-api';
import { ReadwiseClient } from './src/api/client';
import { ToolRegistry } from './src/mcp/registry/tool-registry';
import { PromptRegistry } from './src/mcp/registry/prompt-registry';
import { getConfig } from './src/utils/config';
import { SafeLogger, LogLevel } from './src/utils/safe-logger';

/**
 * This script tests the Readwise MCP server by:
 * 1. Starting the server with SSE transport
 * 2. Testing each tool with sample parameters
 * 3. Verifying the responses
 */

async function main() {
  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Get configuration
  const config = getConfig();
  
  // Force SSE transport for testing
  config.transport = 'sse';

  // Create logger
  const logger = new SafeLogger(
    'sse',
    'readwise-mcp-test',
    {
      level: LogLevel.DEBUG,
      showLevel: true,
      timestamps: true
    }
  );

  logger.info('Starting Readwise MCP Server Test...');

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
  const httpServer = app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });

  // Setup SSE endpoint
  let sseTransport: SSEServerTransport | null = null;

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

  // Test the server with MCP Inspector
  logger.info('Starting MCP Inspector...');
  const inspectorProcess = spawn('npx', ['@modelcontextprotocol/inspector'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      MCP_SERVER_URL: `http://localhost:${port}/sse`
    }
  });

  // Handle inspector process exit
  inspectorProcess.on('exit', (code) => {
    logger.info(`MCP Inspector exited with code ${code}`);
    httpServer.close();
    process.exit(0);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    httpServer.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    httpServer.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Error in test script:', error);
  process.exit(1);
}); 