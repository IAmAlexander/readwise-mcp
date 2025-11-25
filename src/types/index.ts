// Core type definitions for Readwise MCP
export * from './validation.js';
export * from './guards.js';
export * from './errors.js';

// Import ValidationResult for use in MCPTool interface
import type { ValidationResult } from './validation.js';

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
  user_metadata?: {
    reading_status?: 'not_started' | 'in_progress' | 'completed';
    reading_percentage?: number;
    current_page?: number;
    total_pages?: number;
    last_read_at?: string;
  };
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

/**
 * Tag-related types
 */
export interface TagResponse {
  count: number;
  tags: string[];
}

export interface DocumentTagsResponse {
  document_id: string;
  tags: string[];
}

export interface UpdateTagsRequest {
  tags: string[];
}

export interface BulkTagRequest {
  document_ids: string[];
  tags: string[];
  replace_existing?: boolean;
  confirmation: string;
}

export interface BulkTagResponse {
  success: boolean;
  updated_documents: number;
  errors?: Array<{
    document_id: string;
    error: string;
  }>;
}

export interface ReadingProgress {
  document_id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  percentage: number;
  current_page?: number;
  total_pages?: number;
  last_read_at?: string;
}

export interface GetReadingProgressParams {
  document_id: string;
}

export interface UpdateReadingProgressParams {
  document_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  percentage?: number;
  current_page?: number;
  total_pages?: number;
  last_read_at?: string;
}

export interface GetReadingListParams {
  status?: 'not_started' | 'in_progress' | 'completed';
  category?: string;
  page?: number;
  page_size?: number;
}

export interface ReadingListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Array<Document & { reading_progress: ReadingProgress }>;
}

/**
 * Content management types
 */
export interface CreateHighlightParams {
  text: string;
  book_id: string;
  note?: string;
  location?: number;
  location_type?: string;
  color?: string;
  tags?: string[];
}

export interface UpdateHighlightParams {
  highlight_id: string;
  text?: string;
  note?: string;
  location?: number;
  location_type?: string;
  color?: string;
  tags?: string[];
}

export interface DeleteHighlightParams {
  highlight_id: string;
  confirmation: string;
}

export interface CreateNoteParams {
  highlight_id: string;
  note: string;
}

export interface UpdateNoteParams {
  highlight_id: string;
  note: string;
}

export interface DeleteNoteParams {
  highlight_id: string;
  confirmation: string;
}

/**
 * Advanced search types
 */
export interface AdvancedSearchParams {
  query?: string;
  book_ids?: string[];
  tags?: string[];
  categories?: string[];
  date_range?: {
    start?: string;
    end?: string;
  };
  location_range?: {
    start?: number;
    end?: number;
  };
  has_note?: boolean;
  sort_by?: 'created_at' | 'updated_at' | 'highlighted_at' | 'location';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface SearchByTagParams {
  tags: string[];
  match_all?: boolean;
  page?: number;
  page_size?: number;
}

export interface SearchByDateParams {
  start_date?: string;
  end_date?: string;
  date_field?: 'created_at' | 'updated_at' | 'highlighted_at';
  page?: number;
  page_size?: number;
}

export interface AdvancedSearchResult {
  highlights: PaginatedResponse<Highlight>;
  facets?: {
    tags?: Array<{ tag: string; count: number }>;
    categories?: Array<{ category: string; count: number }>;
    books?: Array<{ book_id: string; title: string; count: number }>;
  };
}

export interface VideoTranscriptSegment {
  timestamp: string;
  text: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  url: string;
  author: string;
  tags: string[];
  duration?: number;
  platform?: string;
  thumbnail_url?: string;
  description?: string;
}

export interface VideoHighlight {
  id: string;
  text: string;
  note?: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface VideoPlaybackPosition {
  document_id: string;
  position: number;
  percentage: number;
  last_updated: string;
}

export interface GetVideosParams {
  limit?: number;
  pageCursor?: string;
  tags?: string[];
  platform?: string;
}

export interface GetVideoParams {
  document_id: string;
}

export interface CreateVideoHighlightParams {
  document_id: string;
  text: string;
  timestamp: string;
  note?: string;
}

export interface UpdateVideoPositionParams {
  document_id: string;
  position: number;
  duration: number;
}

export interface VideoResponse {
  count: number;
  results: VideoMetadata[];
  nextPageCursor?: string;
}

export interface VideoDetailsResponse extends VideoMetadata {
  transcript: VideoTranscriptSegment[];
}

export interface VideoHighlightsResponse {
  count: number;
  results: VideoHighlight[];
}

/**
 * Document management types (v3 API)
 */
export interface SaveDocumentParams {
  url: string;
  title?: string;
  author?: string;
  html?: string;
  tags?: string[];
  summary?: string;
  notes?: string;
  location?: 'new' | 'later' | 'archive' | 'feed';
  category?: string;
  published_date?: string;
  image_url?: string;
}

export interface SaveDocumentResponse {
  id: string;
  url: string;
  title: string;
  author?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface UpdateDocumentParams {
  document_id: string;
  title?: string;
  author?: string;
  summary?: string;
  published_date?: string;
  image_url?: string;
  location?: 'new' | 'later' | 'archive' | 'feed';
  category?: string;
  tags?: string[];
}

export interface DeleteDocumentParams {
  document_id: string;
  confirmation: string;
}

export interface DeleteDocumentResponse {
  success: boolean;
  document_id: string;
}

/**
 * Bulk document operation types
 */
export interface BulkSaveDocumentsParams {
  items: SaveDocumentParams[];
  confirmation: string;
}

export interface BulkUpdateDocumentsParams {
  updates: UpdateDocumentParams[];
  confirmation: string;
}

export interface BulkDeleteDocumentsParams {
  document_ids: string[];
  confirmation: string;
}

export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    success: boolean;
    document_id?: string;
    url?: string;
    error?: string;
  }>;
}

/**
 * Recent content types
 */
export interface GetRecentContentParams {
  limit?: number;
  content_type?: 'books' | 'highlights' | 'all';
}

export interface RecentContentItem {
  type: 'book' | 'highlight';
  created_at: string;
  [key: string]: any;
}

export interface RecentContentResponse {
  count: number;
  results: RecentContentItem[];
} 