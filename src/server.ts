// Third-party imports
import express from 'express';
import type { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';

// MCP SDK imports - need .js extension for runtime imports
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

// Local type imports - no .js extension
import type { MCPRequest, MCPResponse, ErrorResponse, ErrorType, TransportType } from './types/index.js';
import type { ValidationResult, ValidationError } from './types/validation.js';

// Local implementation imports - need .js extension
import { ReadwiseClient } from './api/client.js';
import { ReadwiseAPI } from './api/readwise-api.js';
import { BaseMCPTool } from './mcp/registry/base-tool.js';
import { BaseMCPPrompt } from './mcp/registry/base-prompt.js';
import { ToolRegistry } from './mcp/registry/tool-registry.js';
import { PromptRegistry } from './mcp/registry/prompt-registry.js';
import { Logger } from './utils/logger.js';
import { getConfig } from './utils/config.js';

// Tool imports - need .js extension
import { GetBooksTool } from './tools/get-books.js';
import { GetHighlightsTool } from './tools/get-highlights.js';
import { GetDocumentsTool } from './tools/get-documents.js';
import { SearchHighlightsTool } from './tools/search-highlights.js';
import { GetTagsTool } from './tools/get-tags.js';
import { DocumentTagsTool } from './tools/document-tags.js';
import { BulkTagsTool } from './tools/bulk-tags.js';
import { GetReadingProgressTool } from './tools/get-reading-progress.js';
import { UpdateReadingProgressTool } from './tools/update-reading-progress.js';
import { GetReadingListTool } from './tools/get-reading-list.js';
import { CreateHighlightTool } from './tools/create-highlight.js';
import { UpdateHighlightTool } from './tools/update-highlight.js';
import { DeleteHighlightTool } from './tools/delete-highlight.js';
import { CreateNoteTool } from './tools/create-note.js';
import { AdvancedSearchTool } from './tools/advanced-search.js';
import { SearchByTagTool } from './tools/search-by-tag.js';
import { SearchByDateTool } from './tools/search-by-date.js';
import { GetVideosTool } from './tools/get-videos.js';
import { GetVideoTool } from './tools/get-video.js';
import { CreateVideoHighlightTool } from './tools/create-video-highlight.js';
import { GetVideoHighlightsTool } from './tools/get-video-highlights.js';
import { UpdateVideoPositionTool } from './tools/update-video-position.js';
import { GetVideoPositionTool } from './tools/get-video-position.js';

// Prompt imports - need .js extension
import { ReadwiseHighlightPrompt } from './prompts/highlight-prompt.js';
import { ReadwiseSearchPrompt } from './prompts/search-prompt.js';

/**
 * Readwise MCP Server implementation
 */
export class ReadwiseMCPServer {
  private app: Express;
  private server: HttpServer;
  private mcpServer: MCPServer;
  private port: number;
  private apiClient: ReadwiseClient;
  private api: ReadwiseAPI;
  private toolRegistry: ToolRegistry;
  private promptRegistry: PromptRegistry;
  private logger: Logger;
  private transportType: TransportType;
  private startTime: number;

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
    this.server = createServer(this.app);

    // Initialize MCP Server
    this.mcpServer = new MCPServer({
      name: "readwise-mcp",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: this.toolRegistry.getNames().reduce((acc, name) => ({ ...acc, [name]: true }), {}),
        prompts: this.promptRegistry.getNames().reduce((acc, name) => ({ ...acc, [name]: true }), {})
      }
    });

    // Register tools
    this.registerTools();
    
    // Register prompts
    this.registerPrompts();
  }

  /**
   * Register MCP tools
   */
  private registerTools(): void {
    this.logger.debug('Registering tools');
    
    // Create tool instances
    const getHighlightsTool = new GetHighlightsTool(this.api, this.logger);
    const getBooksTool = new GetBooksTool(this.api, this.logger);
    const getDocumentsTool = new GetDocumentsTool(this.api, this.logger);
    const searchHighlightsTool = new SearchHighlightsTool(this.api, this.logger);
    const getTagsTool = new GetTagsTool(this.api, this.logger);
    const documentTagsTool = new DocumentTagsTool(this.api, this.logger);
    const bulkTagsTool = new BulkTagsTool(this.api, this.logger);
    const getReadingProgressTool = new GetReadingProgressTool(this.api, this.logger);
    const updateReadingProgressTool = new UpdateReadingProgressTool(this.api, this.logger);
    const getReadingListTool = new GetReadingListTool(this.api, this.logger);
    const createHighlightTool = new CreateHighlightTool(this.api, this.logger);
    const updateHighlightTool = new UpdateHighlightTool(this.api, this.logger);
    const deleteHighlightTool = new DeleteHighlightTool(this.api, this.logger);
    const createNoteTool = new CreateNoteTool(this.api, this.logger);
    const advancedSearchTool = new AdvancedSearchTool(this.api, this.logger);
    const searchByTagTool = new SearchByTagTool(this.api, this.logger);
    const searchByDateTool = new SearchByDateTool(this.api, this.logger);

    // Video tools
    const getVideosTool = new GetVideosTool(this.api, this.logger);
    const getVideoTool = new GetVideoTool(this.api, this.logger);
    const createVideoHighlightTool = new CreateVideoHighlightTool(this.api, this.logger);
    const getVideoHighlightsTool = new GetVideoHighlightsTool(this.api, this.logger);
    const updateVideoPositionTool = new UpdateVideoPositionTool(this.api, this.logger);
    const getVideoPositionTool = new GetVideoPositionTool(this.api, this.logger);

    // Register tools
    this.toolRegistry.register(getHighlightsTool);
    this.toolRegistry.register(getBooksTool);
    this.toolRegistry.register(getDocumentsTool);
    this.toolRegistry.register(searchHighlightsTool);
    this.toolRegistry.register(getTagsTool);
    this.toolRegistry.register(documentTagsTool);
    this.toolRegistry.register(bulkTagsTool);
    this.toolRegistry.register(getReadingProgressTool);
    this.toolRegistry.register(updateReadingProgressTool);
    this.toolRegistry.register(getReadingListTool);
    this.toolRegistry.register(createHighlightTool);
    this.toolRegistry.register(updateHighlightTool);
    this.toolRegistry.register(deleteHighlightTool);
    this.toolRegistry.register(createNoteTool);
    this.toolRegistry.register(advancedSearchTool);
    this.toolRegistry.register(searchByTagTool);
    this.toolRegistry.register(searchByDateTool);
    this.toolRegistry.register(getVideosTool);
    this.toolRegistry.register(getVideoTool);
    this.toolRegistry.register(createVideoHighlightTool);
    this.toolRegistry.register(getVideoHighlightsTool);
    this.toolRegistry.register(updateVideoPositionTool);
    this.toolRegistry.register(getVideoPositionTool);

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
    
    // Register prompts
    this.promptRegistry.register(highlightPrompt);
    this.promptRegistry.register(searchPrompt);
    
    this.logger.info(`Registered ${this.promptRegistry.getNames().length} prompts`);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.logger.debug('Starting HTTP server...');
      // Start the HTTP server
      this.server.listen(this.port, () => {
        this.logger.info(`Server started on port ${this.port} with ${this.transportType} transport`);
        this.logger.info(`Startup time: ${Date.now() - this.startTime}ms`);
        
        this.logger.debug('Setting up routes...');
        // Add routes
        this.setupRoutes();
        this.logger.debug('Routes configured');
        
        // If using stdio transport, set up stdin handler
        if (this.transportType === 'stdio') {
          this.logger.debug('Setting up stdio transport...');
          this.setupStdioTransport();
          this.logger.debug('Stdio transport configured');
        } else if (this.transportType === 'sse') {
          this.logger.debug('Setting up SSE transport...');
          this.setupSSETransport();
          this.logger.debug('SSE transport configured');
        }
        
        this.logger.info('Server initialization complete');
        resolve();
      });
    });
  }
  
  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server.close((err) => {
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

    // Capabilities endpoint
    this.app.get('/capabilities', (_req: Request, res: Response) => {
      res.json({
        version: '1.0.0',
        transports: ['sse'],
        tools: this.toolRegistry.getNames().map(name => {
          const tool = this.toolRegistry.get(name);
          return {
            name,
            description: tool?.description || '',
            parameters: tool?.parameters || {}
          };
        }),
        prompts: this.promptRegistry.getNames().map(name => {
          const prompt = this.promptRegistry.get(name);
          return {
            name,
            description: prompt?.description || '',
            parameters: prompt?.parameters || {}
          };
        })
      });
    });
  }
  
  /**
   * Set up stdio transport
   */
  private setupStdioTransport(): void {
    this.logger.debug('Setting up stdio transport');
    
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data: Buffer) => {
      try {
        const input = data.toString().trim();
        if (!input) return;
        
        // Parse the request
        const request = JSON.parse(input) as MCPRequest;
        
        // Handle the request
        this.handleMCPRequest(request, (response) => {
          // Write the response to stdout
          process.stdout.write(JSON.stringify(response) + '\n');
        });
      } catch (error) {
        this.logger.error('Error handling stdin data', error);
        
        // Write error response to stdout
        const errorResponse: ErrorResponse = {
          error: {
            type: 'transport' as ErrorType,
            details: {
              code: 'invalid_request',
              message: error instanceof Error ? error.message : 'Invalid request'
            }
          },
          request_id: 'unknown'  // Unknown request_id for parsing errors
        };
        
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    });
    
    this.logger.info('Listening for requests on stdin');
  }

  /**
   * Validate that a request follows the MCP protocol format
   * @param request - The request to validate
   * @returns True if the request is valid, false otherwise
   */
  private validateMCPRequest(request: any): { valid: boolean; error?: string } {
    // Check if request is an object
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Request must be a JSON object' };
    }

    // Check if request has required fields
    if (!('type' in request)) {
      return { valid: false, error: 'Missing required field: type' };
    }

    if (!('name' in request)) {
      return { valid: false, error: 'Missing required field: name' };
    }

    if (!('request_id' in request)) {
      return { valid: false, error: 'Missing required field: request_id' };
    }

    // Validate request type
    if (request.type !== 'tool_call' && request.type !== 'prompt_call') {
      return { valid: false, error: `Invalid request type: ${request.type}. Must be 'tool_call' or 'prompt_call'` };
    }

    // Validate request name
    if (typeof request.name !== 'string' || request.name.trim() === '') {
      return { valid: false, error: 'Invalid request name: must be a non-empty string' };
    }

    // Validate request_id
    if (typeof request.request_id !== 'string' || request.request_id.trim() === '') {
      return { valid: false, error: 'Invalid request_id: must be a non-empty string' };
    }

    // Validate parameters
    if (!('parameters' in request) || typeof request.parameters !== 'object') {
      return { valid: false, error: 'Missing or invalid parameters: must be an object' };
    }

    return { valid: true };
  }

  /**
   * Handle an MCP request
   * @param request - The MCP request
   * @param callback - Callback function to receive the response
   */
  public handleMCPRequest(request: MCPRequest, callback: (response: MCPResponse | ErrorResponse) => void): void {
    // Validate the request format
    const validation = this.validateMCPRequest(request);
    if (!validation.valid) {
      this.logger.warn('Invalid MCP request format', { error: validation.error, request });
      callback({
        error: {
          type: 'transport',
          details: {
            code: 'invalid_request',
            message: validation.error || 'Invalid request format'
          }
        },
        request_id: (request as any)?.request_id || 'unknown'
      });
      return;
    }

    const requestType = (request as any).type;
    const requestName = (request as any).name;
    const requestId = (request as any).request_id;
    
    this.logger.debug('Handling MCP request', {
      type: requestType,
      name: requestName,
      request_id: requestId
    });
    
    // Handle different request types
    if (requestType === 'tool_call') {
      this.handleToolCall(request as MCPRequest & { type: 'tool_call' }, callback);
    } else if (requestType === 'prompt_call') {
      this.handlePromptCall(request as MCPRequest & { type: 'prompt_call' }, callback);
    } else {
      this.logger.warn(`Unknown request type: ${requestType}`);
      
      // Return error
      callback({
        error: {
          type: 'transport',
          details: {
            code: 'invalid_request_type',
            message: `Unknown request type: ${requestType}`
          }
        },
        request_id: requestId
      });
    }
  }

  /**
   * Handle a tool call
   * @param request - The tool call request
   * @param callback - Callback function to receive the response
   */
  private handleToolCall(
    request: MCPRequest & { type: 'tool_call' },
    callback: (response: MCPResponse | ErrorResponse) => void
  ): void {
    const { name, parameters, request_id } = request;
    
    // Get the tool
    const tool = this.toolRegistry.get(name);
    
    if (!tool) {
      this.logger.warn(`Tool not found: ${name}`);
      
      // Return error
      callback({
        error: {
          type: 'transport',
          details: {
            code: 'tool_not_found',
            message: `Tool not found: ${name}`
          }
        },
        request_id
      });
      return;
    }
    
    // Validate parameters
    const validationResult = tool.validate(parameters);
    
    if (!validationResult.success) {
      this.logger.warn(`Invalid parameters for tool ${name}`, validationResult.errors);
      
      // Convert validation errors to string messages
      const errorMessages = validationResult.errors?.map(
        (err: ValidationError) => `${err.field}: ${err.message}`
      );
      
      // Return error
      callback({
        error: {
          type: 'validation',
          details: {
            code: 'invalid_parameters',
            message: errorMessages?.join(', ') || 'Invalid parameters',
            errors: errorMessages
          }
        },
        request_id
      });
      return;
    }
    
    // Execute the tool
    tool.execute(parameters)
      .then((result) => {
        this.logger.debug(`Tool ${name} execution successful`);
        
        // Return the result with request_id
        callback({
          result,
          request_id
        });
      })
      .catch((error) => {
        this.logger.error(`Error executing tool ${name}`, error);
        
        // Check if the error is already in the expected format
        if (error && typeof error === 'object' && 'type' in error) {
          callback({
            error: error as any,
            request_id
          });
          return;
        }
        
        // Return error
        callback({
          error: {
            type: 'transport',
            details: {
              code: 'execution_error',
              message: error instanceof Error ? error.message : 'Error executing tool'
            }
          },
          request_id
        });
      });
  }

  /**
   * Handle a prompt call
   * @param request - The prompt call request
   * @param callback - Callback function to receive the response
   */
  private handlePromptCall(
    request: MCPRequest & { type: 'prompt_call' },
    callback: (response: MCPResponse | ErrorResponse) => void
  ): void {
    const { name, parameters, request_id } = request;
    
    // Get the prompt
    const prompt = this.promptRegistry.get(name);
    
    if (!prompt) {
      this.logger.warn(`Prompt not found: ${name}`);
      
      // Return error
      callback({
        error: {
          type: 'transport',
          details: {
            code: 'prompt_not_found',
            message: `Prompt not found: ${name}`
          }
        },
        request_id
      });
      return;
    }
    
    // Validate parameters
    const validationResult = prompt.validate(parameters);
    
    if (!validationResult.success) {
      this.logger.warn(`Invalid parameters for prompt ${name}`, validationResult.errors);
      
      // Convert validation errors to string messages
      const errorMessages = validationResult.errors?.map(
        (err: ValidationError) => `${err.field}: ${err.message}`
      );
      
      // Return error
      callback({
        error: {
          type: 'validation',
          details: {
            code: 'invalid_parameters',
            message: errorMessages?.join(', ') || 'Invalid parameters',
            errors: errorMessages
          }
        },
        request_id
      });
      return;
    }
    
    // Execute the prompt
    prompt.execute(parameters)
      .then((result) => {
        this.logger.debug(`Prompt ${name} execution successful`);
        
        // Return the result with request_id
        callback({
          result,
          request_id
        });
      })
      .catch((error) => {
        this.logger.error(`Error executing prompt ${name}`, error);
        
        // Check if the error is already in the expected format
        if (error && typeof error === 'object' && 'type' in error) {
          callback({
            error: error as any,
            request_id
          });
          return;
        }
        
        // Return error
        callback({
          error: {
            type: 'transport',
            details: {
              code: 'execution_error',
              message: error instanceof Error ? error.message : 'Error executing prompt'
            }
          },
          request_id
        });
      });
  }

  /**
   * Set up SSE transport
   */
  private setupSSETransport(): void {
    this.logger.debug('Setting up SSE transport');

    // SSE endpoint for server-to-client streaming
    this.app.get('/sse', async (req: Request, res: Response) => {
      try {
        this.logger.debug('New SSE connection request', {
          query: req.query,
          headers: req.headers
        });

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        // Create transport instance for this connection
        const transport = new SSEServerTransport('/sse', res);

        // Set up transport handlers
        transport.onmessage = async (message) => {
          this.logger.debug('Received message:', message);
          if (message && typeof message === 'object' && 'method' in message && 'id' in message) {
            // Convert JSON-RPC to MCP request
            const mcpRequest: MCPRequest = {
              type: 'tool_call',
              name: message.method,
              parameters: message.params || {},
              request_id: String(message.id)
            };

            // Handle the message through MCP server
            this.handleMCPRequest(mcpRequest, async (response) => {
              // Convert MCP response to JSON-RPC
              const jsonRpcResponse = {
                jsonrpc: '2.0' as const,
                id: message.id,
                ...(('error' in response)
                  ? {
                    error: {
                      code: -32000,
                      message: response.error.details.message,
                      data: response.error
                    }
                  }
                  : { result: response.result }
                )
              };
              await transport.send(jsonRpcResponse);
            });
          }
        };

        transport.onerror = (error) => {
          this.logger.error('Transport error:', error);
          if (!res.writableEnded) {
            res.write(`event: error\ndata: ${JSON.stringify({ error })}\n\n`);
          }
        };

        transport.onclose = () => {
          this.logger.debug('Transport closed');
          if (!res.writableEnded) {
            res.write('event: close\ndata: {}\n\n');
            res.end();
          }
        };

        // Start the transport and connect to MCP server
        await transport.start();
        await this.mcpServer.connect(transport);
        this.logger.info('SSE transport connected to MCP server');

        // Send initial connection event with capabilities
        const connectionEvent = {
          jsonrpc: '2.0',
          method: 'connection_established',
          params: {
            server_info: {
              name: 'readwise-mcp',
              version: '1.0.0',
              capabilities: {
                transports: ['sse'],
                tools: this.toolRegistry.getNames().reduce((acc, name) => ({ ...acc, [name]: true }), {}),
                prompts: this.promptRegistry.getNames().reduce((acc, name) => ({ ...acc, [name]: true }), {})
              }
            }
          }
        };
        res.write(`data: ${JSON.stringify(connectionEvent)}\n\n`);

        // Handle client disconnect
        req.on('close', () => {
          this.logger.debug('Client disconnected');
          transport.close().catch(err => {
            this.logger.error('Error closing transport:', err);
          });
        });

        // Keep connection alive with heartbeats
        const keepAliveInterval = setInterval(() => {
          if (!res.writableEnded) {
            res.write('event: ping\ndata: {}\n\n');
          }
        }, 30000);

        // Clean up interval on disconnect
        req.on('close', () => {
          clearInterval(keepAliveInterval);
        });

      } catch (error) {
        this.logger.error('Error in SSE endpoint:', error);
        // Only send error response if headers haven't been sent
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
              data: error instanceof Error ? error.message : String(error)
            }
          });
        }
      }
    });

    // Message handling endpoint for client-to-server communication
    this.app.post('/messages', express.json(), async (req: Request, res: Response) => {
      try {
        const transport = new SSEServerTransport('/messages', res);
        await transport.handlePostMessage(req, res);
      } catch (error) {
        this.logger.error('Error handling message:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: error instanceof Error ? error.message : String(error)
          }
        });
      }
    });
  }
} 