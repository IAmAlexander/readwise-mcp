// Third-party imports
import express from 'express';
import type { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import { createRequire } from 'module';

// Load package.json for version info (ES modules compatible)
const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { name: string; version: string };

// MCP SDK imports - need .js extension for runtime imports
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

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
import type { Logger } from './utils/logger-interface.js';
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
import { SaveDocumentTool } from './tools/save-document.js';
import { UpdateDocumentTool } from './tools/update-document.js';
import { DeleteDocumentTool } from './tools/delete-document.js';
import { GetRecentContentTool } from './tools/get-recent-content.js';
import { BulkSaveDocumentsTool } from './tools/bulk-save-documents.js';
import { BulkUpdateDocumentsTool } from './tools/bulk-update-documents.js';
import { BulkDeleteDocumentsTool } from './tools/bulk-delete-documents.js';

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
  private isReady: boolean = false;

  /**
   * Create a new Readwise MCP server
   * @param apiKey - Readwise API key
   * @param port - Port to listen on (default: 3000)
   * @param logger - Logger instance
   * @param transport - Transport type (default: stdio)
   */
  constructor(
    apiKey: string = '',
    port: number = 3000,
    logger: Logger,
    transport: TransportType = 'stdio',
    baseUrl?: string
  ) {
    // Assign logger first so it's available in error handling
    this.logger = logger;
    
    try {
      // Check if running under MCP Inspector
      const isMCPInspector = process.env.MCP_INSPECTOR === 'true' || 
                            process.argv.includes('--mcp-inspector') ||
                            process.env.NODE_ENV === 'mcp-inspector';
      
      // When running under inspector:
      // - Use port 3000 (required for inspector's proxy)
      // - Force SSE transport
      this.port = isMCPInspector ? 3000 : port;
      this.transportType = isMCPInspector ? 'sse' : transport;
      this.startTime = Date.now();

      // Initialize API client (allow empty API key for lazy loading)
      // API key will be validated when tools are actually called
      this.apiClient = new ReadwiseClient({
        apiKey: apiKey || '',
        baseUrl
      });
      
      this.api = new ReadwiseAPI(this.apiClient);

      // Initialize registries
      this.toolRegistry = new ToolRegistry(this.logger);
      this.promptRegistry = new PromptRegistry(this.logger);

      // Initialize Express app
      this.app = express();
      this.app.use(bodyParser.json());

      // Configure CORS - allow all origins for Smithery and other hosted deployments
      // In production, you can restrict this via CORS_ALLOWED_ORIGINS environment variable
      const corsEnabled = process.env.CORS_ENABLED !== 'false';
      const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
        ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : null; // null means allow all origins

      if (corsEnabled) {
        // Configure CORS according to Smithery requirements
        // See: https://smithery.ai/docs/build/deployments/containers#how-do-i-set-up-cors-handling
        this.app.use(cors({
          origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, or health checks)
            if (!origin) return callback(null, true);
            
            // If no specific origins configured, allow all (for Smithery and hosted deployments)
            if (!allowedOrigins) {
              return callback(null, true);
            }

            if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          },
          methods: ['GET', 'POST', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', '*'], // Allow all headers as per Smithery docs
          exposedHeaders: ['mcp-session-id', 'mcp-protocol-version'], // Expose MCP-specific headers
          credentials: true
        }));
      }
      this.server = createServer(this.app);

      // Register tools and prompts BEFORE creating MCP Server
      // so capabilities can be properly initialized
      this.registerTools();
      this.registerPrompts();

      // Initialize MCP Server with actual capabilities
      this.mcpServer = new MCPServer({
        name: packageJson.name,
        version: packageJson.version
      }, {
        capabilities: {
          tools: this.toolRegistry.getNames().reduce((acc, name) => ({ ...acc, [name]: true }), {}),
          prompts: this.promptRegistry.getNames().reduce((acc, name) => ({ ...acc, [name]: true }), {})
        }
      });

      // Register tools with SDK ServerTools plugin so they are properly exposed
      this.registerToolsWithSDK();
      
      // Set up routes BEFORE starting the server
      this.setupRoutes();
      
      // Set up SSE transport routes BEFORE starting the server
      // (SSE endpoint setup happens here, actual transport connection happens on /sse request)
      this.setupSSERoutes();
      
      this.logger.debug('Server constructor completed successfully');
    } catch (error) {
      this.logger.error('Error in server constructor:', error as any);
      // Re-throw to prevent server from starting in an invalid state
      throw error;
    }
  }

  /**
   * Register MCP tools
   */
  private registerTools(): void {
    this.logger.debug('Registering tools');

    // All tool classes - instantiate and register in one pass
    const toolClasses = [
      // Core tools
      GetHighlightsTool,
      GetBooksTool,
      GetDocumentsTool,
      SearchHighlightsTool,
      GetTagsTool,
      DocumentTagsTool,
      BulkTagsTool,
      GetReadingProgressTool,
      UpdateReadingProgressTool,
      GetReadingListTool,
      // Highlight management
      CreateHighlightTool,
      UpdateHighlightTool,
      DeleteHighlightTool,
      CreateNoteTool,
      // Search tools
      AdvancedSearchTool,
      SearchByTagTool,
      SearchByDateTool,
      // Video tools
      GetVideosTool,
      GetVideoTool,
      CreateVideoHighlightTool,
      GetVideoHighlightsTool,
      UpdateVideoPositionTool,
      GetVideoPositionTool,
      // Document management tools
      SaveDocumentTool,
      UpdateDocumentTool,
      DeleteDocumentTool,
      GetRecentContentTool,
      // Bulk document operation tools
      BulkSaveDocumentsTool,
      BulkUpdateDocumentsTool,
      BulkDeleteDocumentsTool,
    ];

    // Instantiate and register all tools
    for (const ToolClass of toolClasses) {
      this.toolRegistry.register(new ToolClass(this.api, this.logger));
    }

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
   * Set up SDK request handlers for tool execution
   * Tools are discovered via capabilities, SDK routes calls to our handlers
   */
  private registerToolsWithSDK(): void {
    try {
      this.logger.debug('Setting up SDK request handlers for tools');
      
      // Set up request handler for tools/list
      this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
        const tools = this.toolRegistry.getNames().map(toolName => {
          const tool = this.toolRegistry.get(toolName);
          return {
            name: tool?.name || toolName,
            description: tool?.description || '',
            inputSchema: tool?.parameters || {}
          };
        });
        
        return { tools };
      });
      
      // Set up request handler for tools/call
      this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        this.logger.debug(`SDK tool call received: ${name}`, { args });

        // Get the tool from our registry
        const tool = this.toolRegistry.get(name);
        if (!tool) {
          throw new Error(`Tool not found: ${name}`);
        }

        // Execute the tool using our existing implementation
        const toolResult = await tool.execute(args || {});

        // Extract the actual result from MCPToolResult wrapper
        // Tools return { result: <data> } format, we need to extract and serialize
        const actualResult = toolResult && typeof toolResult === 'object' && 'result' in toolResult
          ? (toolResult as any).result
          : toolResult;

        // Convert to MCP content format with proper JSON serialization
        // This prevents [object Object] serialization issues
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(actualResult, null, 2)
          }]
        };
      });
      
      this.logger.info(`Set up SDK request handlers for ${this.toolRegistry.getNames().length} tools`);
    } catch (error) {
      this.logger.error('Error setting up SDK request handlers:', error as any);
      // Don't throw - allow server to continue even if handler setup fails
      // Tools will still work through our custom handleMCPRequest method
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.logger.info('Starting HTTP server...');
      this.logger.info(`Binding to 0.0.0.0:${this.port}`);
      this.logger.debug('Routes are already set up in constructor');
      
      // Handle server errors BEFORE listening
      this.server.on('error', (error: NodeJS.ErrnoException) => {
        this.logger.error('Server error event:', error);
        this.logger.error('Error code:', error.code);
        this.logger.error('Error message:', error.message);
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use`));
        } else {
          reject(error);
        }
      });
      
      // Log when server starts listening
      this.server.listen(this.port, '0.0.0.0', () => {
        const address = this.server.address();
        this.logger.info(`✓ Server started successfully on port ${this.port}`);
        this.logger.info(`✓ Listening on ${typeof address === 'string' ? address : `${address?.address}:${address?.port}`}`);
        this.logger.info(`✓ Transport type: ${this.transportType}`);
        this.logger.info(`✓ Startup time: ${Date.now() - this.startTime}ms`);
        this.logger.info(`✓ Health check: http://0.0.0.0:${this.port}/health`);
        this.logger.info(`✓ Tools registered: ${this.toolRegistry.getNames().length}`);
        this.logger.info(`✓ Prompts registered: ${this.promptRegistry.getNames().length}`);
        
        // If using stdio transport, set up stdin handler
        if (this.transportType === 'stdio') {
          this.logger.debug('Setting up stdio transport...');
          this.setupStdioTransport();
          this.logger.debug('Stdio transport configured');
        }
        // SSE routes are already set up in constructor via setupSSERoutes()
        
        // Mark server as ready
        this.isReady = true;
        this.logger.info('✓ Server initialization complete - ready to accept connections');
        resolve();
      });
      
      // Also log when server is listening (additional confirmation)
      this.server.on('listening', () => {
        const address = this.server.address();
        this.logger.debug('Server listening event fired', { address });
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
    
    // Root endpoint for basic connectivity check
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        name: packageJson.name,
        version: packageJson.version,
        status: 'running',
        transport: this.transportType,
        endpoints: {
          health: '/health',
          capabilities: '/capabilities',
          sse: '/sse',
          mcp: '/mcp'
        }
      });
    });
    
    // Health check endpoint - must be accessible without authentication
    // This is critical for Smithery deployment - must respond immediately
    this.app.get('/health', (_req: Request, res: Response) => {
      try {
        const health = {
          status: this.isReady ? 'ok' : 'starting',
          ready: this.isReady,
          uptime: process.uptime(),
          transport: this.transportType,
          tools: this.toolRegistry.getNames().length,
          prompts: this.promptRegistry.getNames().length,
          timestamp: new Date().toISOString(),
          port: this.port
        };
        // Always return 200, but indicate readiness status
        const statusCode = this.isReady ? 200 : 503;
        this.logger.debug('Health check requested', { ...health, statusCode });
        res.status(statusCode).json(health);
      } catch (error) {
        this.logger.error('Error in health check:', error);
        res.status(500).json({
          status: 'error',
          ready: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // OAuth metadata endpoint - Smithery checks this during deployment
    // We use API key auth, not OAuth, so return 404 to indicate OAuth not supported
    this.app.get('/.well-known/oauth-authorization-server', (_req: Request, res: Response) => {
      this.logger.debug('OAuth metadata requested - not supported (using API key auth)');
      res.status(404).json({
        error: 'oauth_not_supported',
        message: 'This server uses API key authentication, not OAuth'
      });
    });

    // Capabilities endpoint
    this.app.get('/capabilities', (_req: Request, res: Response) => {
      res.json({
        version: packageJson.version,
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

    // Handle OPTIONS preflight requests for /mcp endpoint
    // Required for CORS preflight checks from Smithery
    this.app.options('/mcp', (_req: Request, res: Response) => {
      this.logger.debug('OPTIONS preflight request for /mcp');
      // CORS middleware should handle this, but ensure headers are set
      res.status(204).end();
    });

    // Store active Streamable HTTP transports by session ID
    const streamableTransports = new Map<string, StreamableHTTPServerTransport>();

    // MCP HTTP endpoint for Smithery and other HTTP-based clients
    // Uses Streamable HTTP transport from MCP SDK for proper protocol compliance
    this.app.all('/mcp', async (req: Request, res: Response) => {
      try {
        this.logger.debug('MCP Streamable HTTP request received', {
          method: req.method,
          path: req.path,
          headers: Object.keys(req.headers)
        });
        
        // Ensure MCP server is initialized
        if (!this.mcpServer) {
          this.logger.error('MCP server not initialized');
          res.status(503).json({
            error: {
              type: 'transport',
              details: {
                code: 'server_not_ready',
                message: 'MCP server is not initialized yet'
              }
            }
          });
          return;
        }
        
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && streamableTransports.has(sessionId)) {
          // Reuse existing transport for the session
          const existingTransport = streamableTransports.get(sessionId);
          if (!existingTransport) {
            throw new Error(`Transport not found for session: ${sessionId}`);
          }
          transport = existingTransport;
          this.logger.debug(`Reusing transport for session: ${sessionId}`);
        } else {
          // Create a new transport for a new session
          this.logger.debug('Creating new Streamable HTTP transport');
          const { randomUUID } = await import('crypto');
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID()
          });
          
          // Connect transport to MCP server
          // SDK handles all JSON-RPC messages including initialize and list_tools
          this.logger.debug('Connecting transport to MCP server');
          await this.mcpServer.connect(transport);
          this.logger.debug('Transport connected successfully');
          
          // Store transport by session ID after connection
          const newSessionId = (transport as any).sessionId;
          if (newSessionId) {
            streamableTransports.set(newSessionId, transport);
            this.logger.info(`Created new Streamable HTTP transport (session: ${newSessionId})`);
            // Set session ID header for client
            res.setHeader('mcp-session-id', newSessionId);
          } else {
            this.logger.warn('Streamable HTTP transport created but sessionId not available');
          }
        }

        // Handle the request through the transport
        this.logger.debug('Handling request through transport');
        await transport.handleRequest(req, res, req.body);
        this.logger.debug('Request handled successfully');
      } catch (error) {
        this.logger.error('Error handling MCP Streamable HTTP request:', error as any);
        if (error instanceof Error) {
          this.logger.error('Error stack:', error.stack);
        }
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              type: 'transport',
              details: {
                code: 'server_error',
                message: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          });
        }
      }
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
    const validationResult = tool.validate ? tool.validate(parameters) : { valid: true, success: true, errors: [] };
    
    if (!validationResult.valid) {
      this.logger.warn(`Invalid parameters for tool ${name}`, { errors: validationResult.errors } as any);
      const errorResponse: ErrorResponse = {
        error: {
          type: 'validation' as ErrorType,
          details: {
            code: 'invalid_parameters',
            message: 'Invalid parameters',
            errors: validationResult.errors.map(e => `${e.field}: ${e.message}`)
          }
        },
        request_id: request.request_id
      };
      callback(errorResponse);
      return;
    }
    
    // Execute the tool
    (typeof (tool as any).executeAsMCP === 'function' ? (tool as any).executeAsMCP(parameters) : tool.execute(parameters))
      .then((result: any) => {
        this.logger.debug(`Tool ${name} execution successful`);
        
        const response: MCPResponse = (result as any).content ? (result as any) : { content: [{ type: 'text', text: JSON.stringify(result) }] };
        callback({ ...response, request_id: request.request_id });
      })
      .catch((error: unknown) => {
        this.logger.error(`Tool ${name} execution error`, error as any);
        
        // Check if it's an authentication error
        const isAuthError = error && typeof error === 'object' && 'type' in error && error.type === 'authentication';
        const errorDetails = error && typeof error === 'object' && 'details' in error ? error.details : null;
        
        const errorResponse: ErrorResponse = {
          error: {
            type: (isAuthError ? 'validation' : 'execution') as ErrorType,
            details: {
              code: errorDetails && typeof errorDetails === 'object' && 'code' in errorDetails 
                ? String(errorDetails.code)
                : 'tool_error',
              message: errorDetails && typeof errorDetails === 'object' && 'message' in errorDetails
                ? String(errorDetails.message)
                : error instanceof Error 
                  ? error.message 
                  : 'Unknown error'
            }
          },
          request_id: request.request_id
        };
        callback(errorResponse);
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
    const validationResult = prompt.validate ? prompt.validate(parameters) : { valid: true, success: true, errors: [] };
    
    if (!validationResult.valid) {
      this.logger.warn(`Invalid parameters for prompt ${name}`, { errors: validationResult.errors } as any);
      const errorResponse: ErrorResponse = {
        error: {
          type: 'validation' as ErrorType,
          details: {
            code: 'invalid_parameters',
            message: 'Invalid parameters',
            errors: validationResult.errors.map(e => `${e.field}: ${e.message}`)
          }
        },
        request_id: request.request_id
      };
      callback(errorResponse);
      return;
    }
    
    // Execute the prompt
    prompt.execute(parameters)
      .then((result: any) => {
        this.logger.debug(`Prompt ${name} execution successful`);
        const response: MCPResponse = (result as any).content ? (result as any) : { content: [{ type: 'text', text: JSON.stringify(result) }] };
        callback({ ...response, request_id: request.request_id });
      })
      .catch((error: unknown) => {
        this.logger.error(`Prompt ${name} execution error`, error as any);
        const errorResponse: ErrorResponse = {
          error: {
            type: 'execution' as ErrorType,
            details: {
              code: 'prompt_error',
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          },
          request_id: request.request_id
        };
        callback(errorResponse);
      });
  }

  /**
   * Set up SSE transport routes
   * Uses SDK's SSE transport for proper MCP protocol compliance
   */
  private setupSSERoutes(): void {
    this.logger.debug('Setting up SSE routes');

    // Store active SSE transports by session ID
    const sseTransports = new Map<string, SSEServerTransport>();

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

        // Create SSE transport instance
        // The first parameter is the message endpoint path for POST requests
        const transport = new SSEServerTransport('/messages', res);

        // Generate session ID and store transport
        const sessionId = `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sseTransports.set(sessionId, transport);

        // Connect transport to MCP server
        // SDK handles all JSON-RPC messages including initialize and list_tools
        await transport.start();
        await this.mcpServer.connect(transport);
        
        this.logger.info(`SSE transport connected to MCP server (session: ${sessionId})`);

        // Handle client disconnect
        req.on('close', () => {
          this.logger.debug(`Client disconnected (session: ${sessionId})`);
          sseTransports.delete(sessionId);
          transport.close().catch(err => {
            this.logger.error('Error closing transport:', err);
          });
        });

        // Handle transport errors
        transport.onerror = (error) => {
          this.logger.error('Transport error:', error);
          sseTransports.delete(sessionId);
        };

        transport.onclose = () => {
          this.logger.debug(`Transport closed (session: ${sessionId})`);
          sseTransports.delete(sessionId);
        };

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

    // Message endpoint for SSE clients to send POST requests
    // This is required by SSEServerTransport for client-to-server communication
    this.app.post('/messages', async (req: Request, res: Response) => {
      try {
        const sessionId = req.query.sessionId as string;
        
        if (!sessionId) {
          this.logger.warn('POST /messages request missing sessionId');
          res.status(400).json({
            error: {
              type: 'validation',
              details: {
                code: 'missing_session_id',
                message: 'Missing required query parameter: sessionId'
              }
            }
          });
          return;
        }

        const transport = sseTransports.get(sessionId);
        if (!transport) {
          this.logger.warn(`No transport found for sessionId: ${sessionId}`);
          res.status(404).json({
            error: {
              type: 'transport',
              details: {
                code: 'session_not_found',
                message: `No active SSE connection found for sessionId: ${sessionId}`
              }
            }
          });
          return;
        }

        // Handle the POST message through the transport
        // The SDK's SSEServerTransport should handle JSON-RPC messages automatically
        // If handlePostMessage exists, use it; otherwise, the SDK handles it via the connected transport
        if (typeof (transport as any).handlePostMessage === 'function') {
          await (transport as any).handlePostMessage(req, res, req.body);
        } else {
          // The SDK should handle messages automatically through the connected transport
          // For now, acknowledge receipt - the SDK will process it
          this.logger.debug('Message received for SSE session, SDK will handle via connected transport');
          res.json({ jsonrpc: '2.0', id: req.body?.id || null, result: {} });
        }
      } catch (error) {
        this.logger.error('Error handling POST /messages:', error as any);
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              type: 'transport',
              details: {
                code: 'server_error',
                message: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          });
        }
      }
    });
  }
} 