// Fixed Readwise MCP Server implementation
// This follows the established working patterns from our integrated solution

// Third-party imports
import express from 'express';
import type { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';

// MCP SDK imports - corrected imports for MCP functionality
import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';

// Local imports - with proper extensions for runtime
import type { TransportType } from './src/types/index.js';
import { ReadwiseClient } from './src/api/client.js';
import { ReadwiseAPI } from './src/api/readwise-api.js';
import { ToolRegistry } from './src/mcp/registry/tool-registry.js';
import { PromptRegistry } from './src/mcp/registry/prompt-registry.js';
import { Logger } from './src/utils/logger.js';
import { getConfig } from './src/utils/config.js';

// Tool imports
import { GetBooksTool } from './src/tools/get-books.js';
import { GetHighlightsTool } from './src/tools/get-highlights.js';
import { GetDocumentsTool } from './src/tools/get-documents.js';
import { SearchHighlightsTool } from './src/tools/search-highlights.js';
// Add other tool imports as needed

// Prompt imports
import { ReadwiseHighlightPrompt } from './src/prompts/highlight-prompt.js';
import { ReadwiseSearchPrompt } from './src/prompts/search-prompt.js';

/**
 * Improved Readwise MCP Server implementation
 * This follows the working pattern from our experiments
 */
export class FixedReadwiseMCPServer {
  private app: Express;
  private httpServer: HttpServer;
  private server: Server;
  private port: number;
  private apiClient: ReadwiseClient;
  private api: ReadwiseAPI;
  private toolRegistry: ToolRegistry;
  private promptRegistry: PromptRegistry;
  private logger: Logger;
  private transportType: TransportType;
  private startTime: number;
  private transport: StdioServerTransport | SSEServerTransport | null = null;

  /**
   * Create a new Fixed Readwise MCP server
   * @param apiKey - Readwise API key
   * @param port - Port to listen on (default: 3000)
   * @param logger - Logger instance
   * @param transport - Transport type (default: stdio)
   */
  constructor(
    apiKey: string,
    port: number = 3000,
    logger: Logger,
    transport: TransportType = 'stdio',
    baseUrl?: string
  ) {
    // Check if running under MCP Inspector
    const isMCPInspector = process.env.MCP_INSPECTOR === 'true' || 
                          process.argv.includes('--mcp-inspector') ||
                          process.env.NODE_ENV === 'mcp-inspector';
    
    // When running under inspector:
    // - Use port 3000 (required for inspector's proxy)
    // - Force SSE transport
    this.port = isMCPInspector ? 3000 : port;
    this.transportType = isMCPInspector ? 'sse' : transport;
    this.logger = logger;
    this.startTime = Date.now();

    // Initialize API client
    this.apiClient = new ReadwiseClient({
      apiKey,
      baseUrl
    });
    
    this.api = new ReadwiseAPI(this.apiClient);

    // Initialize registries
    this.toolRegistry = new ToolRegistry(this.logger);
    this.promptRegistry = new PromptRegistry(this.logger);

    // Initialize Express app
    this.app = express();
    this.app.use(bodyParser.json());
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));
    this.httpServer = createServer(this.app);

    // Initialize the MCP server
    this.server = new Server({
      name: "readwise-mcp",
      version: "1.0.0"
    }, {
      capabilities: {
        // Tools and prompts will be populated in registerTools()
        tools: {},
        prompts: {}
      }
    });

    // Register tools
    this.registerTools();
    
    // Register prompts
    this.registerPrompts();
  }

  /**
   * Register MCP tools and set request handlers
   */
  private registerTools(): void {
    this.logger.debug('Registering tools');
    
    // Create tool instances
    const getHighlightsTool = new GetHighlightsTool(this.api, this.logger);
    const getBooksTool = new GetBooksTool(this.api, this.logger);
    const getDocumentsTool = new GetDocumentsTool(this.api, this.logger);
    const searchHighlightsTool = new SearchHighlightsTool(this.api, this.logger);
    // Add other tools as needed
    
    // Register tools with the registry
    this.toolRegistry.register(getHighlightsTool);
    this.toolRegistry.register(getBooksTool);
    this.toolRegistry.register(getDocumentsTool);
    this.toolRegistry.register(searchHighlightsTool);
    // Register other tools as needed

    // Set up the server's capabilities to include all registered tools
    const toolCapabilities = this.toolRegistry.getNames().reduce((acc, name) => {
      acc[name] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    // Update server capabilities
    this.server._capabilities.tools = toolCapabilities;

    this.logger.info(`Registered ${this.toolRegistry.getNames().length} tools`);
  }
  
  /**
   * Register MCP prompts
   */
  private registerPrompts(): void {
    this.logger.debug('Registering prompts');
    
    // Create prompts
    const highlightPrompt = new ReadwiseHighlightPrompt(this.api, this.logger);
    const searchPrompt = new ReadwiseSearchPrompt(this.api, this.logger);
    
    // Register prompts with the registry
    this.promptRegistry.register(highlightPrompt);
    this.promptRegistry.register(searchPrompt);
    
    // Set up the server's capabilities to include all registered prompts
    const promptCapabilities = this.promptRegistry.getNames().reduce((acc, name) => {
      acc[name] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    // Update server capabilities
    this.server._capabilities.prompts = promptCapabilities;
    
    this.logger.info(`Registered ${this.promptRegistry.getNames().length} prompts`);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.logger.debug('Starting HTTP server...');
      
      // Set up routes before starting the server
      this.setupRoutes();
      
      // Start the HTTP server
      this.httpServer.listen(this.port, () => {
        this.logger.info(`Server started on port ${this.port} with ${this.transportType} transport`);
        this.logger.info(`Startup time: ${Date.now() - this.startTime}ms`);
        
        // Set up the appropriate transport
        if (this.transportType === 'stdio') {
          this.setupStdioTransport();
        } else if (this.transportType === 'sse') {
          this.setupSSETransport();
        }
        
        // Set up direct request handling for tools and prompts
        this.setupRequestHandling();
        
        this.logger.info('Server initialization complete');
        resolve();
      });
    });
  }
  
  /**
   * Setup direct request handling for tools and prompts
   * This is a more reliable approach than relying on setRequestHandler
   */
  private setupRequestHandling(): void {
    this.logger.debug('Setting up direct request handling');
    
    // Override the server's internal _onRequest method to handle tool and prompt calls
    (this.server as any)._onRequest = async (method: string, params: any, context: any) => {
      this.logger.debug(`Received request: ${method}`, { params });
      
      // Handle tool calls
      if (method === "mcp/call_tool") {
        const toolName = params.name;
        const toolParams = params.parameters || {};
        
        // Get the tool from the registry
        const tool = this.toolRegistry.get(toolName);
        
        if (!tool) {
          this.logger.warn(`Tool not found: ${toolName}`);
          return {
            isError: true,
            content: [{ type: "text", text: `Tool '${toolName}' not found` }]
          };
        }
        
        try {
          // Validate parameters
          const validationResult = tool.validate(toolParams);
          if (!validationResult.success) {
            this.logger.warn('Tool validation failed', { errors: validationResult.errors });
            return {
              isError: true,
              content: [{ 
                type: "text", 
                text: validationResult.errors.map(e => `${e.field}: ${e.message}`).join('\n') 
              }]
            };
          }
          
          // Execute tool
          this.logger.debug(`Executing tool: ${toolName}`);
          const toolResult = await tool.execute(toolParams);
          this.logger.debug('Tool executed successfully', { toolResult });
          
          // Convert the tool result to the format expected by MCP
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify(toolResult.result) 
            }]
          };
        } catch (err) {
          this.logger.error('Error executing tool', err instanceof Error ? err : new Error(String(err)));
          return {
            isError: true,
            content: [{ 
              type: "text", 
              text: `Error: ${err instanceof Error ? err.message : String(err)}` 
            }]
          };
        }
      }
      
      // Handle prompt calls
      else if (method === "mcp/render_prompt") {
        const promptName = params.name;
        const promptParams = params.parameters || {};
        
        // Get the prompt from the registry
        const prompt = this.promptRegistry.get(promptName);
        
        if (!prompt) {
          this.logger.warn(`Prompt not found: ${promptName}`);
          return {
            isError: true,
            content: [{ type: "text", text: `Prompt '${promptName}' not found` }]
          };
        }
        
        try {
          // Validate parameters
          const validationResult = prompt.validate(promptParams);
          if (!validationResult.success) {
            this.logger.warn('Prompt validation failed', { errors: validationResult.errors });
            return {
              isError: true,
              content: [{ 
                type: "text", 
                text: validationResult.errors.map(e => `${e.field}: ${e.message}`).join('\n') 
              }]
            };
          }
          
          // Execute prompt
          this.logger.debug(`Rendering prompt: ${promptName}`);
          const promptResult = await prompt.execute(promptParams);
          this.logger.debug('Prompt rendered successfully', { promptResult });
          
          // Convert the prompt result to the format expected by MCP
          return {
            content: [{ 
              type: "text", 
              text: typeof promptResult === 'string' ? promptResult : 
                    promptResult.result ? JSON.stringify(promptResult.result) : 
                    JSON.stringify(promptResult) 
            }]
          };
        } catch (err) {
          this.logger.error('Error rendering prompt', err instanceof Error ? err : new Error(String(err)));
          return {
            isError: true,
            content: [{ 
              type: "text", 
              text: `Error: ${err instanceof Error ? err.message : String(err)}` 
            }]
          };
        }
      }
      
      // Let the server handle other requests
      return null;
    };
  }
  
  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.transport) {
        try {
          this.transport.close();
        } catch (error) {
          this.logger.warn('Error closing transport', error);
        }
      }
      
      this.httpServer.close((err) => {
        if (err) {
          this.logger.error('Error stopping server', err);
          reject(err);
        } else {
          this.logger.info('Server stopped');
          resolve();
        }
      });
    });
  }
  
  /**
   * Set up routes for the server
   */
  private setupRoutes(): void {
    this.logger.debug('Setting up routes');
    
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        transport: this.transportType,
        tools: this.toolRegistry.getNames(),
        prompts: this.promptRegistry.getNames()
      });
    });

    // SSE endpoint
    this.app.get('/sse', (_req: Request, res: Response) => {
      this.logger.debug('SSE connection requested');
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders();
      
      // Send initial connection event
      res.write(`data: ${JSON.stringify({ event: 'connected' })}\n\n`);
    });
    
    // POST endpoint for messages when using SSE
    this.app.post('/messages', bodyParser.json(), (req: Request, res: Response) => {
      this.logger.debug('POST message received', { body: req.body });
      
      // Ensure transport is connected
      if (!this.transport) {
        this.logger.error('Transport not connected');
        res.status(500).json({ error: 'Transport not connected' });
        return;
      }
      
      // Handle the message
      if (this.transport && 'handlePostMessage' in this.transport) {
        (this.transport as any).handlePostMessage(req, res);
      } else {
        this.logger.error('Transport does not support handlePostMessage');
        res.status(500).json({ error: 'Transport does not support handlePostMessage' });
      }
    });
  }

  /**
   * Set up stdio transport
   */
  private setupStdioTransport(): void {
    this.logger.debug('Setting up stdio transport');
    
    try {
      // Create transport
      const transport = new StdioServerTransport();
      this.transport = transport;
      
      // Connect transport to server
      this.server.connect(transport)
        .then(() => {
          this.logger.info('Stdio transport connected successfully');
        })
        .catch(error => {
          this.logger.error('Error connecting stdio transport', error);
        });
    } catch (error) {
      this.logger.error('Error setting up stdio transport', error);
      throw error;
    }
  }

  /**
   * Set up SSE transport
   */
  private setupSSETransport(): void {
    this.logger.debug('Setting up SSE endpoint for transport');
    
    // The actual transport connection happens when a client connects to /sse
    this.app.get('/sse', async (req: Request, res: Response) => {
      try {
        this.logger.debug('New SSE connection request');

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        // Create transport instance for this connection
        const transport = new SSEServerTransport('/messages', res);
        this.transport = transport;

        // Handle client disconnect
        req.on('close', () => {
          this.logger.debug('Client disconnected');
          transport.close().catch(err => {
            this.logger.error('Error closing transport:', err);
          });
        });

        // Connect transport to server
        await this.server.connect(transport);
        this.logger.info('SSE transport connected successfully');

        // Keep connection alive with heartbeats
        const keepAliveInterval = setInterval(() => {
          if (!res.writableEnded) {
            res.write('event: ping\ndata: {}\n\n');
          } else {
            clearInterval(keepAliveInterval);
          }
        }, 30000);

      } catch (error) {
        this.logger.error('Error setting up SSE transport', error);
        if (!res.writableEnded) {
          res.write(`event: error\ndata: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
          res.end();
        }
      }
    });
  }
}