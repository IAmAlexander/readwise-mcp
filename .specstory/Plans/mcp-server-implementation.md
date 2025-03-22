# Readwise MCP Implementation Plan

This document outlines the step-by-step plan for implementing the Readwise Model Context Protocol (MCP) server in TypeScript.

## Phase 1: Project Structure Refinement

1. **Reorganize Project Structure**
   ```bash
   Steps:
   1. Reorganize src/ directory structure:
      src/
      ├── api/           # Readwise API integration
      ├── models/        # Data models
      ├── transport/     # MCP transport layer
      ├── utils/         # Utility functions
      ├── tools/         # Individual MCP tool implementations
      ├── mcp/          # MCP specific code
      │   └── registry/  # Function registry and types
      └── types/        # Shared TypeScript type definitions
   2. Update tsconfig.json settings
   3. Update package.json scripts
   ```

2. **Setup TypeScript Configuration**
   ```bash
   Steps:
   1. Update tsconfig.json with:
      - Strict type checking
      - Path aliases for clean imports
      - ESM module resolution
      - Source map support
      - Decorator support
   2. Configure ESLint with:
      - @typescript-eslint/recommended
      - Strict type checking rules
      - Import ordering
   3. Setup Jest with ts-jest
   ```

3. **Create Core Type Definitions**
   ```typescript
   Steps:
   1. Define tool interfaces:
      interface MCPTool<TParams, TResult> {
        name: string;
        execute(params: TParams): Promise<TResult>;
      }
   
   2. Define Readwise data types:
      interface Highlight {
        id: string;
        text: string;
        note?: string;
        location?: number;
        color?: string;
        // ... other properties
      }
      // ... other interfaces
   
   3. Define MCP message types:
      interface MCPRequest<T = unknown> {
        id: string;
        method: string;
        params: T;
      }
      
      interface MCPResponse<T = unknown> {
        id: string;
        result?: T;
        error?: MCPError;
      }
   
   4. Create utility types:
      type ToolRegistry = {
        [K in ToolName]: MCPTool<any, any>;
      }
   ```

## Phase 2: Core Implementation

4. **Implement Base Classes**
   ```typescript
   Steps:
   1. Create base tool class:
      abstract class BaseMCPTool<TParams, TResult> implements MCPTool<TParams, TResult> {
        abstract name: string;
        abstract execute(params: TParams): Promise<TResult>;
        validate?(params: TParams): void;
      }
   
   2. Create API client with interceptors:
      class ReadwiseClient {
        private interceptors: RequestInterceptor[];
        constructor(config: ClientConfig) {...}
        use(interceptor: RequestInterceptor): void {...}
      }
   
   3. Create transport base:
      abstract class Transport {
        abstract send<T>(message: MCPMessage): Promise<T>;
        abstract listen(): AsyncIterator<MCPMessage>;
      }
   ```

5. **Implement API Integration**
   ```typescript
   Steps:
   1. Create typed API methods:
      class ReadwiseAPI {
        async getHighlights(params: GetHighlightsParams): Promise<PaginatedResponse<Highlight>> {...}
        async getBooks(params?: GetBooksParams): Promise<Book[]> {...}
      }
   
   2. Add response transformers:
      interface ResponseTransformer<T, R> {
        transform(response: T): Promise<R>;
      }
   
   3. Implement error handling:
      class APIError extends Error {
        constructor(
          message: string,
          public status: number,
          public code: string
        ) {...}
      }
   ```

6. **Implement Tools**
   ```typescript
   Steps:
   1. Create individual tool classes:
      class GetHighlightsTool extends BaseMCPTool<GetHighlightsParams, Highlight[]> {...}
      class SearchTool extends BaseMCPTool<SearchParams, SearchResult[]> {...}
   
   2. Add parameter validation:
      class ValidationError extends Error {...}
      function validateParams<T>(schema: Schema<T>, params: unknown): T {...}
   
   3. Implement retry logic:
      const withRetry = <T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> => {...}
   ```

## Phase 3: MCP Function Implementation

7. **Implement Core MCP Functions**
   ```typescript
   Steps:
   1. Create typed function registry
   2. Implement basic functions with proper typing:
      - get_highlights(): Promise<MCPResponse<Highlight[]>>
      - get_books(): Promise<MCPResponse<Book[]>>
      - get_documents(): Promise<MCPResponse<Document[]>>
      - search_highlights(): Promise<MCPResponse<SearchResult[]>>
   3. Add parameter validation with TypeScript
   4. Add typed response formatting
   ```

8. **Add Advanced MCP Functions**
   ```typescript
   Steps:
   1. Implement advanced functions with types:
      - create_highlight(): Promise<MCPResponse<Highlight>>
      - update_highlight(): Promise<MCPResponse<Highlight>>
      - delete_highlight(): Promise<MCPResponse<void>>
      - bulk_operations(): Promise<MCPResponse<BulkResult>>
   2. Add rate limiting with typed decorators
   3. Implement typed caching system
   ```

## Phase 4: Error Handling and Logging

9. **Implement Error Handling**
   ```typescript
   Steps:
   1. Create custom error classes
   2. Add typed error mappers
   3. Implement retry logic with generics
   4. Add validation error types
   ```

10. **Add Logging System**
    ```typescript
    Steps:
    1. Setup typed logging configuration
    2. Add strongly-typed log handlers
    3. Implement type-safe log formatting
    4. Add debug logging with type information
    ```

## Phase 5: Testing and Documentation

11. **Create Test Suite**
    ```typescript
    Steps:
    1. Setup Jest with TypeScript
    2. Create typed test fixtures
    3. Implement typed unit tests:
      - API client tests
      - Transport layer tests
      - MCP function tests
    4. Add integration tests with type checking
    ```

12. **Write Documentation**
    ```markdown
    Steps:
    1. Create detailed README:
      - TypeScript-specific installation
      - Usage examples with types
      - Configuration guide
    2. Add TSDoc comments to all interfaces/classes
    3. Create API documentation with type information
    4. Add TypeScript-specific development guide
    ```

## Phase 6: Deployment and CI/CD

13. **Setup Docker Support**
    ```dockerfile
    Steps:
    1. Create multi-stage Dockerfile for TypeScript
    2. Add docker-compose.yml
    3. Create TypeScript-aware build scripts
    4. Add Docker documentation
    ```

14. **Implement Smithery Integration**
    ```yaml
    Steps:
    1. Update smithery.yaml for TypeScript
    2. Add TypeScript-aware deployment config
    3. Test deployment with type checking
    4. Add deployment documentation
    ```

## Phase 7: Final Polish

15. **Performance Optimization**
    ```typescript
    Steps:
    1. Implement connection pooling with types
    2. Add typed request caching
    3. Optimize data handling with generics
    4. Add type-safe performance monitoring
    ```

16. **Security Enhancements**
    ```typescript
    Steps:
    1. Add typed API key validation
    2. Implement secure storage with type safety
    3. Add rate limiting with typed decorators
    4. Security documentation with TypeScript examples
    ```

## Phase 8: Remaining Tool Implementation

17. **Implement GetBooksTool**
   ```typescript
   Steps:
   1. Create GetBooksTool class:
      class GetBooksTool extends BaseMCPTool<GetBooksParams, PaginatedResponse<Book>> {
        name = 'get_books';
        // Implementation
      }
   2. Add parameter validation
   3. Implement execute method
   4. Add error handling
   5. Register in ToolRegistry
   6. Write unit tests
   ```

18. **Implement GetDocumentsTool**
   ```typescript
   Steps:
   1. Create GetDocumentsTool class:
      class GetDocumentsTool extends BaseMCPTool<GetDocumentsParams, PaginatedResponse<Document>> {
        name = 'get_documents';
        // Implementation
      }
   2. Add parameter validation
   3. Implement execute method
   4. Add error handling
   5. Register in ToolRegistry
   6. Write unit tests
   ```

19. **Implement SearchHighlightsTool**
   ```typescript
   Steps:
   1. Create SearchHighlightsTool class:
      class SearchHighlightsTool extends BaseMCPTool<SearchParams, SearchResult[]> {
        name = 'search_highlights';
        // Implementation
      }
   2. Add parameter validation
   3. Implement execute method
   4. Add error handling
   5. Register in ToolRegistry
   6. Write unit tests
   ```

20. **Implement CreateHighlightTool**
   ```typescript
   Steps:
   1. Create CreateHighlightTool class:
      class CreateHighlightTool extends BaseMCPTool<CreateHighlightParams, Highlight> {
        name = 'create_highlight';
        // Implementation
      }
   2. Add parameter validation
   3. Implement execute method
   4. Add error handling
   5. Register in ToolRegistry
   6. Write unit tests
   ```

21. **Implement UpdateHighlightTool**
   ```typescript
   Steps:
   1. Create UpdateHighlightTool class:
      class UpdateHighlightTool extends BaseMCPTool<UpdateHighlightParams, Highlight> {
        name = 'update_highlight';
        // Implementation
      }
   2. Add parameter validation
   3. Implement execute method
   4. Add error handling
   5. Register in ToolRegistry
   6. Write unit tests
   ```

22. **Implement DeleteHighlightTool**
   ```typescript
   Steps:
   1. Create DeleteHighlightTool class:
      class DeleteHighlightTool extends BaseMCPTool<DeleteHighlightParams, void> {
        name = 'delete_highlight';
        // Implementation
      }
   2. Add parameter validation
   3. Implement execute method
   4. Add error handling
   5. Register in ToolRegistry
   6. Write unit tests
   ```

23. **Implement BulkOperationsTool**
   ```typescript
   Steps:
   1. Create BulkOperationsTool class:
      class BulkOperationsTool extends BaseMCPTool<BulkOperationsParams, BulkResult> {
        name = 'bulk_operations';
        // Implementation
      }
   2. Add parameter validation
   3. Implement execute method
   4. Add error handling
   5. Register in ToolRegistry
   6. Write unit tests
   ```

## Phase 9: MCP Transport Layer

24. **Fix MCP Integration Issues**
   ```typescript
   Steps:
   1. Update MCP initialization to match SDK requirements:
      const mcp = new MCP({
        manifest: {...},
        authorize: async () => {...},
        getClient: () => {...}
      });
   2. Fix registerFunction implementation
   3. Implement proper start method
   4. Add error handling for MCP-specific errors
   ```

25. **Implement Transport Layer**
   ```typescript
   Steps:
   1. Create StdioTransport class
   2. Create SSETransport class
   3. Add transport factory
   4. Implement message handling
   5. Add error handling
   ```

## Phase 10: Integration Testing

26. **Create Integration Tests**
   ```typescript
   Steps:
   1. Setup test environment
   2. Create mock Readwise API server
   3. Implement end-to-end tests
   4. Add CI/CD pipeline for testing
   ```

27. **Create Manual Testing Tools**
   ```typescript
   Steps:
   1. Create test client
   2. Add interactive testing mode
   3. Create test scripts
   ```

## Phase 11: Enhanced Logging

28. **Implement Safe Logging for stdio Transport**
   ```typescript
   Steps:
   1. Create a transport-aware logger:
      class SafeLogger {
        constructor(private transport: 'stdio' | 'sse') {}
        
        log(message: string, data?: any): void {
          if (this.transport === 'sse') {
            console.log(message, data);
          } else {
            // For stdio, log to stderr to avoid interfering with protocol
            console.error(`[LOG] ${message}`, data);
          }
        }
      }
   2. Update existing logging to use SafeLogger
   3. Add log redirection for stdio transport
   4. Add log filtering options
   ```

29. **Add Debug Mode**
   ```typescript
   Steps:
   1. Implement debug flag in configuration
   2. Add verbose logging in debug mode
   3. Add performance metrics logging
   4. Create debug visualization tools
   ```

## Phase 12: MCP Prompts

30. **Implement MCP Prompts**
   ```typescript
   Steps:
   1. Create base prompt class:
      class BaseMCPPrompt<TParams> {
        name: string;
        
        constructor() {}
        
        validate?(params: TParams): void;
        
        execute(params: TParams): {
          messages: Array<{
            role: string;
            content: {
              type: string;
              text: string;
            };
          }>;
        }
      }
   2. Implement ReadwiseSearchPrompt
   3. Implement ReadwiseHighlightPrompt
   4. Register prompts in the MCP server
   ```

31. **Add Prompt Registry**
   ```typescript
   Steps:
   1. Create PromptRegistry class
   2. Implement prompt registration
   3. Add prompt lookup functionality
   4. Connect to MCP server
   ```

## Phase 13: NPM Publishing

32. **Prepare for NPM Publishing**
   ```typescript
   Steps:
   1. Update package.json with metadata:
      {
        "name": "@readwise/mcp",
        "version": "1.0.0",
        "description": "Readwise MCP server",
        "main": "dist/index.js",
        "types": "dist/index.d.ts",
        "files": ["dist", "README.md", "LICENSE"],
        "keywords": ["readwise", "mcp", "model-context-protocol"],
        "author": "Your Name",
        "license": "MIT"
      }
   2. Create .npmignore file
   3. Add build scripts
   4. Create CLI entry point
   ```

33. **Create CLI Wrapper**
   ```typescript
   Steps:
   1. Implement CLI using commander:
      #!/usr/bin/env node
      import { program } from 'commander';
      import { startServer } from './index';
      
      program
        .name('readwise-mcp')
        .description('Readwise MCP server')
        .version('1.0.0');
      
      program
        .option('-p, --port <number>', 'Port to listen on', '3000')
        .option('-t, --transport <type>', 'Transport type (stdio or sse)', 'stdio')
        .option('-d, --debug', 'Enable debug mode')
        .action((options) => {
          startServer(options);
        });
      
      program.parse();
   2. Add bin entry in package.json
   3. Create startServer function
   4. Add CLI documentation
   ```

## Phase 14: Serverless Deployment (COMPLETED)

1. **Create Serverless Entry Points**
   ```typescript
   Steps:
   1. Create serverless.ts for Express-based serverless deployment
   2. Create lambda.ts for AWS Lambda deployment
   3. Create gcf.ts for Google Cloud Functions deployment
   4. Update server configuration to support serverless environments
   ```

2. **Add Platform-Specific Configurations**
   ```yaml
   Steps:
   1. Create vercel.json for Vercel deployment
   2. Create serverless.yml for AWS Lambda deployment
   3. Add deployment scripts to package.json
   4. Create environment variable handling for serverless platforms
   ```

3. **Create Deployment Documentation**
   ```markdown
   Steps:
   1. Create serverless-deployment.md guide
   2. Update README.md with serverless deployment information
   3. Add platform-specific troubleshooting tips
   4. Document environment variable configuration
   ```

4. **Test Deployments**
   ```typescript
   Steps:
   1. Test Vercel deployment
   2. Test AWS Lambda deployment
   3. Test Google Cloud Functions deployment
   4. Verify MCP functionality in serverless environments
   ```

## Phase 15: CLI Implementation

36. **Create CLI Entry Point**
   ```typescript
   Steps:
   1. Create bin/cli.ts file:
      #!/usr/bin/env node
      import { program } from 'commander';
      import { startServer } from '../src/index';
      import { version } from '../package.json';
      
      program
        .name('readwise-mcp')
        .description('Readwise MCP server')
        .version(version);
      
      program
        .option('-p, --port <number>', 'Port to listen on', '3000')
        .option('-t, --transport <type>', 'Transport type (stdio or sse)', 'stdio')
        .option('-d, --debug', 'Enable debug mode')
        .option('-c, --config <path>', 'Path to config file')
        .action((options) => {
          startServer(options);
        });
      
      program.parse();
   2. Update package.json with bin entry
   3. Create startServer function in src/index.ts
   4. Add CLI documentation
   ```

37. **Implement Configuration Loading**
   ```typescript
   Steps:
   1. Create config loading function:
      function loadConfig(options: CliOptions): ServerConfig {
        // Load from file if specified
        if (options.config) {
          try {
            const fileConfig = JSON.parse(fs.readFileSync(options.config, 'utf8'));
            return mergeConfigs(defaultConfig, fileConfig, options);
          } catch (error) {
            console.error(`Error loading config file: ${error.message}`);
            process.exit(1);
          }
        }
        
        // Load from environment and CLI options
        return mergeConfigs(defaultConfig, loadEnvConfig(), options);
      }
   2. Implement config merging
   3. Add config validation
   4. Create config file template
   ```

## Implementation Timeline

1. **Phase 1-10**: Core implementation - 1 week (Completed)
2. **Phase 11-14**: Enhanced features - 1 week (Completed)
3. **Phase 15-16**: CLI and Serverless - 1 week
4. **Phase 17-18**: NPM Publishing and Testing - 1 week

Total estimated time: 4 weeks 