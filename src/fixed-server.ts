// Updated ReadwiseMCPServer implementation
// Incorporates the working pattern we discovered

import express from 'express';
import type { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';

// MCP SDK imports - using the correct pattern
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

// Local imports
import type { TransportType } from './types/index.js';
import { ReadwiseClient } from './api/client.js';
import { ReadwiseAPI } from './api/readwise-api.js';
import { ToolRegistry } from './mcp/registry/tool-registry.js';
import { PromptRegistry } from './mcp/registry/prompt-registry.js';
import type { Logger } from './utils/logger-interface';
import { MCPResponse, MCPContentItem } from './mcp/types.js';

// Import tool classes for registration
import { GetBooksTool } from './tools/get-books.js';
import { GetHighlightsTool } from './tools/get-highlights.js';
// Import other tools as needed...

// Import prompt classes
import { ReadwiseHighlightPrompt } from './prompts/highlight-prompt.js';
import { ReadwiseSearchPrompt } from './prompts/search-prompt.js';

// Utility function to convert MCPToolResult to MCPResponse
function convertToolResultToResponse(result: any): MCPResponse {
  // If result is already in MCPResponse format, return it
  if (result && Array.isArray(result.content)) {
    return result;
  }
  
  // If result is error format from BaseMCPTool
  if (result && result.success === false && result.error) {
    return {
      isError: true,
      content: [{ 
        type: "text", 
        text: result.error 
      }]
    };
  }
  
  // For standard tool results from BaseMCPTool (with result property)
  if (result && result.result !== undefined) {
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify(result.result) 
      }]
    };
  }
  
  // Default case: unknown format
  return {
    content: [{ 
      type: "text", 
      text: JSON.stringify(result) 
    }]
  };
}

/**
 * Updated Readwise MCP Server implementation
 * Uses the proven working pattern for MCP SDK integration
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
   * Create a new Readwise MCP server
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
    try {
      this.logger = logger;
      this.logger.info("Constructing FixedReadwiseMCPServer");
      this.startTime = Date.now();
      
      // Check if running under MCP Inspector
      const isMCPInspector = process.env.MCP_INSPECTOR === 'true' || 
                            process.argv.includes('--mcp-inspector') ||
                            process.env.NODE_ENV === 'mcp-inspector';
      
      // When running under inspector:
      // - Use port 3000 (required for inspector's proxy)
      // - Force SSE transport
      this.port = isMCPInspector ? 3000 : port;
      this.transportType = isMCPInspector ? 'sse' : transport;
      
      this.logger.debug("Configuration", {
        port: this.port,
        transport: this.transportType,
        isMCPInspector,
        apiKey: apiKey ? "***" : "Not provided",
        baseUrl
      } as any);

      // Initialize API client
      this.logger.debug("Initializing API client");
      this.apiClient = new ReadwiseClient({
        apiKey,
        baseUrl
      });
      
      this.api = new ReadwiseAPI(this.apiClient);
      this.logger.debug("API client initialized");

      // Initialize registries
      this.logger.debug("Initializing registries");
      this.toolRegistry = new ToolRegistry(this.logger);
      this.promptRegistry = new PromptRegistry(this.logger);
      this.logger.debug("Registries initialized");

      // Initialize Express app
      this.logger.debug("Setting up Express app");
      this.app = express();
      this.app.use(bodyParser.json());
      this.app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
      }));
      this.httpServer = createServer(this.app);
      this.logger.debug("Express app set up");

      // Initialize the MCP server with empty capabilities
      // We'll populate these after registering tools and prompts
      this.logger.debug("Creating MCP server");
      try {
        this.server = new Server({
          name: "readwise-mcp",
          version: "1.0.0"
        }, {
          capabilities: {
            tools: {},
            prompts: {}
          }
        });
        this.logger.debug("MCP server created");
      } catch (error) {
        this.logger.error("Error creating MCP server", error as any);
        throw error;
      }

      try {
        // Register tools and prompts
        this.logger.debug("Registering tools and prompts");
        this.registerTools();
        this.registerPrompts();
        this.logger.debug("Tools and prompts registered");
        
        // Update server capabilities to reflect registered tools and prompts
        this.updateServerCapabilities();
        this.logger.debug("Server capabilities updated");
      } catch (error) {
        this.logger.error("Error during server registration phase", error as any);
        throw error;
      }
      
      this.logger.info("FixedReadwiseMCPServer construction complete");
    } catch (error) {
      this.logger.error("Error during server construction", error as any);
      throw error;
    }
  }

  /**
   * Register tools with the registry
   */
  private registerTools(): void {
    try {
      this.logger.debug('Registering tools');
      
      // Create tool instances
      this.logger.debug('Creating tool instances');
      
      // Type casting as any to bypass TypeScript errors for now
      // We're relying on our convertToolResultToResponse to handle type conversions
      const getHighlightsTool = new GetHighlightsTool(this.api, this.logger) as any;
      const getBooksTool = new GetBooksTool(this.api, this.logger) as any;
      // Create other tools as needed...
      
      // Register tools with the registry
      this.logger.debug('Adding tools to registry');
      this.toolRegistry.register(getHighlightsTool);
      this.toolRegistry.register(getBooksTool);
      // Register other tools as needed...
      
      this.logger.info(`Registered ${this.toolRegistry.getNames().length} tools`);
    } catch (error) {
      this.logger.error("Error registering tools", error as any);
      throw error;
    }
  }
  
  /**
   * Register prompts with the registry
   */
  private registerPrompts(): void {
    try {
      this.logger.debug('Registering prompts');
      
      // Create prompts - Type cast as any to bypass type errors
      const highlightPrompt = new ReadwiseHighlightPrompt(this.api, this.logger) as any;
      const searchPrompt = new ReadwiseSearchPrompt(this.api, this.logger) as any;
      
      // Register prompts with the registry
      this.promptRegistry.register(highlightPrompt);
      this.promptRegistry.register(searchPrompt);
      
      this.logger.info(`Registered ${this.promptRegistry.getNames().length} prompts`);
    } catch (error) {
      this.logger.error("Error registering prompts", error as any);
      throw error;
    }
  }
  
  /**
   * Update server capabilities based on registered tools and prompts
   */
  private updateServerCapabilities(): void {
    try {
      // Update server capabilities to include registered tools
      const toolCapabilities = this.toolRegistry.getNames().reduce((acc, name) => {
        acc[name] = true;
        return acc;
      }, {} as Record<string, boolean>);
      
      // Update server capabilities to include registered prompts
      const promptCapabilities = this.promptRegistry.getNames().reduce((acc, name) => {
        acc[name] = true;
        return acc;
      }, {} as Record<string, boolean>);
      
      // Set capabilities on server
      (this.server as any)._capabilities = {
        tools: toolCapabilities,
        prompts: promptCapabilities
      };
      
      this.logger.debug('Updated server capabilities', { 
        tools: Object.keys(toolCapabilities),
        prompts: Object.keys(promptCapabilities)
      } as any);
    } catch (error) {
      this.logger.error("Error updating server capabilities", error as any);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.logger.debug('Starting HTTP server...');
        
        // Set up routes
        this.setupRoutes();
        
        // Start the HTTP server
        this.httpServer.listen(this.port, () => {
          try {
            this.logger.info(`Server started on port ${this.port} with ${this.transportType} transport`);
            this.logger.info(`Startup time: ${Date.now() - this.startTime}ms`);
            
            // Set up the appropriate transport
            if (this.transportType === 'stdio') {
              this.setupStdioTransport().catch(err => {
                this.logger.error('Error setting up stdio transport:', err as any);
                reject(err);
              });
            } else if (this.transportType === 'sse') {
              this.setupSSEEndpoint().catch(err => {
                this.logger.error('Error setting up SSE endpoint:', err as any);
                reject(err);
              });
            } else {
              const err = new Error(`Unsupported transport type: ${this.transportType}`);
              this.logger.error(err.message);
              reject(err);
              return;
            }
            
            // Set up direct request handling for tools and prompts
            this.setupRequestHandling();
            
            this.logger.info('Server initialization complete');
            resolve();
          } catch (err) {
            this.logger.error('Error during server setup:', err as any);
            reject(err);
          }
        }).on('error', (err) => {
          this.logger.error('HTTP server error:', err as any);
          reject(err);
        });
      } catch (err) {
        this.logger.error('Error starting server:', err as any);
        reject(err);
      }
    });
  }
  
  /**
   * Set up direct request handling for tools and prompts
   * This is a more reliable approach than using setRequestHandler
   */
  private setupRequestHandling(): void {
    this.logger.debug('Setting up direct request handling');
    
    // Override the server's internal _onRequest method
    (this.server as any)._onRequest = async (method: string, params: any, context: any) => {
      this.logger.debug(`Received request: ${method}`, { params } as any);
      
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
          // Validate parameters (if tool has validation method)
          if (tool.validate) {
            const validationResult = tool.validate(toolParams);
            if (!validationResult.valid) {
              this.logger.warn(`Invalid parameters for tool ${toolName}:`, validationResult.errors as any);
              return {
                isError: true,
                content: [{ 
                  type: "text", 
                  text: `Invalid parameters: ${validationResult.errors.map(e => e.field ? `${e.field}: ${e.message}` : e.message).join(', ')}` 
                }]
              };
            }
          }
          
          // Execute the tool
          this.logger.debug(`Executing tool ${toolName}`, toolParams as any);
          const result = await tool.execute(toolParams);
          this.logger.debug(`Tool ${toolName} execution result:`, result as any);
          
          // Convert tool result to MCPResponse format
          return convertToolResultToResponse(result);
        } catch (error) {
          this.logger.error(`Error executing tool ${toolName}:`, error as any);
          return {
            isError: true,
            content: [{ 
              type: "text", 
              text: error instanceof Error 
                ? `Error: ${error.message}` 
                : `Unknown error executing tool ${toolName}`
            }]
          };
        }
      }
      
      // Handle prompt calls
      else if (method === "mcp/get_prompt_template") {
        const promptName = params.name;
        
        // Get the prompt from the registry
        const prompt = this.promptRegistry.get(promptName);
        
        if (!prompt) {
          this.logger.warn(`Prompt not found: ${promptName}`);
          return null;
        }
        
        try {
          this.logger.debug(`Getting prompt template for ${promptName}`);
          // Call the prompt's getTemplate method if it exists, otherwise return null
          if ('getTemplate' in prompt && typeof (prompt as any).getTemplate === 'function') {
            const template = await (prompt as any).getTemplate();
            return template;
          } else {
            this.logger.warn(`Prompt ${promptName} does not have a getTemplate method`);
            return null;
          }
        } catch (error) {
          this.logger.error(`Error getting prompt template ${promptName}:`, error as any);
          return null;
        }
      }
      
      // Pass other requests through to the server
      return null;
    };
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
    
    // Tools endpoint - List available tools
    this.app.get('/tools', (_req: Request, res: Response) => {
      const tools = this.toolRegistry.getNames().map(name => {
        const tool = this.toolRegistry.get(name);
        return {
          name,
          description: tool?.description || '',
          parameters: (tool as any)?.parameters || {}
        };
      });
      
      res.json({ tools });
    });
    
    // Prompts endpoint - List available prompts
    this.app.get('/prompts', (_req: Request, res: Response) => {
      const prompts = this.promptRegistry.getNames().map(name => {
        const prompt = this.promptRegistry.get(name);
        return {
          name,
          description: prompt?.description || '',
          parameters: (prompt as any)?.parameters || {}
        };
      });
      
      res.json({ prompts });
    });
  }

  /**
   * Set up the stdio transport for the MCP server
   */
  private async setupStdioTransport(): Promise<void> {
    try {
      this.logger.debug('Setting up stdio transport...');
      
      // Create and connect the transport
      this.transport = new StdioServerTransport();
      
      // Set up error handler
      this.transport.onerror = (error) => {
        this.logger.error('Transport error:', error as any);
      };
      
      // Connect the transport to the server
      try {
        await this.server.connect(this.transport);
        this.logger.info('Server connected to stdio transport');
      } catch (error) {
        this.logger.error('Error connecting server to transport:', error as any);
        throw error;
      }
    } catch (error) {
      this.logger.error('Error setting up stdio transport:', error as any);
      throw error;
    }
  }
  
  /**
   * Set up the SSE endpoint for the MCP server
   */
  private async setupSSEEndpoint(): Promise<void> {
    try {
      this.logger.debug('Setting up SSE endpoint...');
      
      // Add the SSE route
      this.app.get('/sse', (req, res) => {
        try {
          this.logger.debug('SSE connection established');
          
          // Set headers for SSE
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          // Create and set up the transport
          const transport = new SSEServerTransport('/message', res);
          
          // Set up error handler
          transport.onerror = (error) => {
            this.logger.error('Transport error:', error as any);
          };
          
          // Connect the transport to the server
          this.server.connect(transport).catch(error => {
            this.logger.error('Error connecting server to transport:', error as any);
          });
          
          // Save the transport
          this.transport = transport;
          
          // Handle client disconnect
          req.on('close', () => {
            this.logger.debug('SSE connection closed');
          });
          
          // Keepalive for SSE connection
          const keepAliveInterval = setInterval(() => {
            try {
              res.write(':\n\n'); // Comment line as keepalive
            } catch (error) {
              this.logger.error('Error sending keepalive:', error as any);
              clearInterval(keepAliveInterval);
            }
          }, 30000);
          
          // Clear interval on connection close
          req.on('close', () => {
            clearInterval(keepAliveInterval);
          });
        } catch (error) {
          this.logger.error('Error handling SSE connection:', error as any);
          res.status(500).end();
        }
      });
      
      // Add the POST endpoint for client-to-server messages
      this.app.post('/message', express.json(), async (req: Request, res: Response) => {
        try {
          this.logger.debug('Received message:', req.body as any);
          
          if (!this.transport) {
            throw new Error('No transport connected');
          }
          
          await (this.transport as SSEServerTransport).handlePostMessage(req, res);
        } catch (error) {
          this.logger.error('Error handling message:', error as any);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
      
      this.logger.info('SSE endpoint set up');
    } catch (error) {
      this.logger.error('Error setting up SSE endpoint:', error as any);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Close transport if active
      if (this.transport) {
        try {
          this.transport.close();
        } catch (error) {
          this.logger.warn('Error closing transport', error);
        }
      }
      
      // Close HTTP server
      this.httpServer.close((err) => {
        if (err) {
          this.logger.error('Error stopping HTTP server', err);
          reject(err);
        } else {
          this.logger.info('Server stopped');
          resolve();
        }
      });
    });
  }
}