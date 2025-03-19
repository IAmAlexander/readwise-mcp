// Core type definitions for Readwise MCP
export * from './validation';

// Import ValidationResult for use in MCPTool interface
import { ValidationResult } from './validation';

/**
 * Result type for MCP tools
 */
export interface MCPToolResult<T> {
  result: T;
  success?: boolean;
  error?: string;
}

// MCP Tool interface
export interface MCPTool<TParams, TResult> {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute(params: TParams): Promise<MCPToolResult<TResult>>;
  validate?(params: TParams): ValidationResult;
}

// Utility function to check if an error is an API error
export function isAPIError(error: unknown): boolean {
  return error !== null && 
         typeof error === 'object' && 
         'type' in error && 
         (error as any).type === 'api';
}

// Readwise data types
export interface Highlight {
  id: string;
  text: string;
  note?: string;
  location?: number;
  location_type?: string;
  color?: string;
  book_id: string;
  book_title?: string;
  book_author?: string;
  url?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  updated?: string;
  highlighted_at?: string;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  category: string;
  source?: string;
  cover_image_url?: string;
  highlights_count?: number;
  highlights_url?: string;
  source_url?: string;
  updated?: string;
}

export interface Document {
  id: string;
  title: string;
  author?: string;
  source?: string;
  url?: string;
  created_at: string;
  updated_at: string;
  highlights_count?: number;
}

// MCP message types
export type MCPRequest = 
  | { type: 'tool_call'; name: string; parameters: any; request_id: string }
  | { type: 'prompt_call'; name: string; parameters: any; request_id: string };

export type MCPResponse = {
  result?: any;
  request_id: string;
};

export type ErrorResponse = {
  error: {
    type: ErrorType;
    details: {
      code: string;
      message: string;
      errors?: string[];
    };
  };
  request_id: string;
};

// API types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface GetHighlightsParams {
  book_id?: string;
  page?: number;
  page_size?: number;
  search?: string;
}

export interface GetBooksParams {
  category?: string;
  page?: number;
  page_size?: number;
}

export interface SearchParams {
  query: string;
  limit?: number;
}

export interface SearchResult {
  highlight: Highlight;
  book: Book;
  score: number;
}

// Utility types
export type ToolName = 
  | 'get_highlights'
  | 'get_books'
  | 'get_documents'
  | 'search_highlights'
  | 'create_highlight'
  | 'update_highlight'
  | 'delete_highlight'
  | 'bulk_operations';

export type ToolRegistry = {
  [K in ToolName]: MCPTool<any, any>;
}

// Client configuration
export interface ClientConfig {
  /**
   * Readwise API token
   */
  apiKey: string;
  
  /**
   * Optional base URL for the Readwise API
   * @default 'https://readwise.io/api/v2'
   */
  baseUrl?: string;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface APIError {
  status: number;
  code: string;
  message: string;
}

export interface TransportError {
  code: string;
  message: string;
}

// Discriminated union for error handling
export type ReadwiseError = 
  | { type: 'validation'; details: ValidationError[] }
  | { type: 'api'; details: APIError }
  | { type: 'transport'; details: TransportError };

/**
 * Transport type for the MCP server
 */
export type TransportType = 'stdio' | 'sse';

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  version: string;
  uptime: number;
}

/**
 * MCP error response types
 */
export type ErrorType = 'validation' | 'execution' | 'transport' | 'unknown'; 