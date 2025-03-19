# Readwise MCP Implementation Plan

This plan outlines the steps needed to complete the Readwise Model Context Protocol (MCP) server implementation, addressing current linter errors and ensuring compliance with MCP specifications.

## Current State Analysis

The codebase has several key components implemented:

1. **API Client**: Basic Readwise API client with error handling
2. **Type Definitions**: Core type definitions for MCP operations
3. **Server Structure**: Basic MCP server structure with stdio and SSE transport
4. **Utils**: Logger, SSE server, and validation utilities
5. **Base Classes**: Base tool and prompt classes

**Current Issues:**
- Linter errors in the server.ts file
- Inconsistencies between base-prompt.ts implementation and its usage
- Missing or incomplete API implementation
- Potential validation approach inconsistencies
- Missing proper integration of Logger in tools and prompts

## Phase 1: Fix Core Issues

### 1. Fix Base Prompt Implementation

```typescript
// Update src/mcp/registry/base-prompt.ts
import { ValidationResult, validationSuccess } from '../../types/validation';
import { Logger } from '../../utils/logger';

export abstract class BaseMCPPrompt<TParams, TResult> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: Record<string, any>;
  
  protected readonly logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  validate(params: TParams): ValidationResult {
    return validationSuccess();
  }
  
  abstract execute(params: TParams): Promise<TResult>;
}
```

### 2. Implement ReadwiseAPI Class

Ensure that `src/api/readwise-api.ts` properly implements the API methods needed by the tools.

```typescript
// Example implementation structure
export class ReadwiseAPI {
  constructor(private client: ReadwiseClient) {}
  
  async getHighlights(params?: GetHighlightsParams): Promise<PaginatedResponse<Highlight>> {
    // Implementation
  }
  
  async getBooks(params?: GetBooksParams): Promise<PaginatedResponse<Book>> {
    // Implementation
  }
  
  async getDocuments(params?: any): Promise<PaginatedResponse<Document>> {
    // Implementation
  }
  
  async searchHighlights(params: SearchParams): Promise<SearchResult[]> {
    // Implementation
  }
}
```

### 3. Fix Prompt Classes

Update the prompt classes to match the new base class structure:

1. Update ReadwiseHighlightPrompt
2. Update ReadwiseSearchPrompt

Both need to:
- Accept logger in constructor
- Implement description and parameters properties
- Return ValidationResult from validate method

## Phase 2: Implement Tools

### 1. Implement GetBooksTool

```typescript
// src/tools/get-books.ts
export class GetBooksTool extends BaseMCPTool<GetBooksParams, PaginatedResponse<Book>> {
  readonly name = 'get_books';
  readonly description = 'Get books from Readwise library';
  readonly parameters = {
    // Define JSON Schema
  };
  
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }
  
  // Implement validate and execute methods
}
```

### 2. Implement GetHighlightsTool

Similar structure to GetBooksTool with appropriate parameters and return type.

### 3. Implement GetDocumentsTool

Similar structure to GetBooksTool with appropriate parameters and return type.

### 4. Implement SearchHighlightsTool

Similar structure to GetBooksTool with appropriate parameters and return type.

## Phase 3: Update Server Implementation

### 1. Fix Server Constructor

Update the server.ts to properly handle tool and prompt registration:

```typescript
constructor(
  apiKey: string,
  port: number = 3000,
  logger: Logger,
  transport: TransportType = 'stdio',
  baseUrl?: string
) {
  // Initialize components
}
```

### 2. Fix Tool Registration

Update registerTools method to properly create and register tools with logger.

### 3. Fix Prompt Registration

Update registerPrompts method to properly create and register prompts with logger.

### 4. Validate MCP Request/Response Format

Ensure the server.ts handleRequest method processes requests and generates responses according to MCP specs.

## Phase 4: Testing & Documentation

### 1. Create Test Suite

Create unit tests for:
- API client
- Tools
- Prompts
- Server

### 2. Manual Testing with MCP Inspector

Set up manual testing using the MCP Inspector.

### 3. Documentation

Update README.md with:
- Installation instructions
- Usage examples
- Configuration options
- Tool documentation

### 4. Create Examples

Provide example scripts for using the MCP server with different clients.

## Phase 5: Deployment

### 1. Package Scripts

Update package.json scripts for:
- Building
- Testing
- Starting the server
- Development workflow

### 2. Docker Support

Create a Dockerfile for containerized deployment.

### 3. Smithery Configuration

Update smithery.yaml for deployment on Smithery.

## Implementation Timeline

1. **Phase 1 (Fix Core Issues)**: 1 day
2. **Phase 2 (Implement Tools)**: 1 day
3. **Phase 3 (Update Server)**: 1 day
4. **Phase 4 (Testing & Documentation)**: 1 day
5. **Phase 5 (Deployment)**: 1 day

Total estimated time: 5 days 