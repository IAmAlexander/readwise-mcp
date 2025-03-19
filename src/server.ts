import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer, Server as HttpServer } from 'http';
import { SSEServer } from './utils/sse';
import { ReadwiseClient } from './api/client';
import { ReadwiseAPI } from './api/readwise-api';
import { BaseMCPTool } from './mcp/registry/base-tool';
import { BaseMCPPrompt } from './mcp/registry/base-prompt';
import { ToolRegistry } from './mcp/registry/tool-registry';
import { PromptRegistry } from './mcp/registry/prompt-registry';
import { GetBooksTool } from './tools/get-books';
import { GetHighlightsTool } from './tools/get-highlights';
import { GetDocumentsTool } from './tools/get-documents';
import { SearchHighlightsTool } from './tools/search-highlights';
import { ReadwiseHighlightPrompt } from './prompts/highlight-prompt';
import { ReadwiseSearchPrompt } from './prompts/search-prompt';
import { Logger } from './utils/logger';
import { MCPRequest, MCPResponse, ErrorResponse, ErrorType, TransportType } from './types';
import { ValidationResult, ValidationError } from './types/validation';
import { GetTagsTool } from './tools/get-tags';
import { DocumentTagsTool } from './tools/document-tags';
import { BulkTagsTool } from './tools/bulk-tags';

/**
 * Readwise MCP Server implementation
 */
export class ReadwiseMCPServer {
  private app: Express;
  private server: HttpServer;
  private sseServer?: SSEServer;
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
    this.port = port;
    this.logger = logger;
    this.transportType = transport;
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
    this.app.use(cors());
    this.server = createServer(this.app);

    // Initialize SSE server if using SSE transport
    if (this.transportType === 'sse') {
      this.logger.info('Initializing SSE server');
      this.sseServer = new SSEServer(this.server);
    }

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
    
    // Create tools
    const getBooksTool = new GetBooksTool(this.api, this.logger);
    const getHighlightsTool = new GetHighlightsTool(this.api, this.logger);
    const getDocumentsTool = new GetDocumentsTool(this.api, this.logger);
    const searchHighlightsTool = new SearchHighlightsTool(this.api, this.logger);
    const getTagsTool = new GetTagsTool(this.api, this.logger);
    const documentTagsTool = new DocumentTagsTool(this.api, this.logger);
    const bulkTagsTool = new BulkTagsTool(this.api, this.logger);
    
    // Register tools
    this.toolRegistry.register(getBooksTool);
    this.toolRegistry.register(getHighlightsTool);
    this.toolRegistry.register(getDocumentsTool);
    this.toolRegistry.register(searchHighlightsTool);
    this.toolRegistry.register(getTagsTool);
    this.toolRegistry.register(documentTagsTool);
    this.toolRegistry.register(bulkTagsTool);
    
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
      // Start the HTTP server
      this.server.listen(this.port, () => {
        this.logger.info(`Server started on port ${this.port} with ${this.transportType} transport`);
        this.logger.info(`Startup time: ${Date.now() - this.startTime}ms`);
        
        // Add routes
        this.setupRoutes();
        
        // If using stdio transport, set up stdin handler
        if (this.transportType === 'stdio') {
          this.setupStdioTransport();
        }
        
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
    
    // MCP endpoint for SSE transport
    if (this.transportType === 'sse') {
      this.app.post('/mcp', (req: Request, res: Response) => {
        const requestId = req.body.request_id;
        
        if (!requestId) {
          res.status(400).json({
            error: 'Missing request_id'
          });
          return;
        }
        
        // Send SSE event indicating the request was received
        if (this.sseServer) {
          this.sseServer.send(requestId, 'request_received', {
            request_id: requestId,
            timestamp: new Date().toISOString()
          });
          
          // Process the request
          this.handleMCPRequest(req.body, (response) => {
            this.sseServer?.send(requestId, 'response', response);
            
            // Send completion event
            this.sseServer?.send(requestId, 'request_completed', {
              request_id: requestId,
              timestamp: new Date().toISOString()
            });
          });
        }
        
        // Respond to the initial request
        res.json({
          status: 'processing',
          request_id: requestId
        });
      });
    }
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
} 