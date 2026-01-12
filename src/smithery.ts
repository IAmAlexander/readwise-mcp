#!/usr/bin/env node
/**
 * Smithery-compatible entry point for Readwise MCP Server
 * 
 * This file provides a simplified entry point that works with Smithery's TypeScript runtime.
 * Smithery handles all HTTP/transport setup automatically, so we just need to:
 * 1. Export a configSchema (using Zod)
 * 2. Export a default function that creates and returns the MCP server
 * 3. Register all tools with the server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { z as zod } from "zod";

// Import API client and tools
// Use FetchClient instead of ReadwiseClient for Cloudflare Workers compatibility
// (axios and its dependencies require Node.js built-ins that don't work in Workers)
import { FetchClient } from './api/fetch-client.js';
import { ReadwiseAPI } from './api/readwise-api.js';

// Import all tools
import { GetHighlightsTool } from './tools/get-highlights.js';
import { GetBooksTool } from './tools/get-books.js';
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

// Import prompts
import { ReadwiseHighlightPrompt } from './prompts/highlight-prompt.js';
import { ReadwiseSearchPrompt } from './prompts/search-prompt.js';

// Import logger interface and create a simple console logger
import type { Logger } from './utils/logger-interface.js';

// Import response converter utility
import { toMCPResponse } from './utils/response.js';

// Simple console logger for Smithery
import { LogLevel } from './utils/logger-interface.js';
const consoleLogger: Logger = {
  level: LogLevel.INFO,
  transport: console.log,
  timestamps: true,
  colors: false,
  debug: (message: string, context?: unknown) => console.log('[DEBUG]', message, context || ''),
  info: (message: string, context?: unknown) => console.log('[INFO]', message, context || ''),
  warn: (message: string, context?: unknown) => console.warn('[WARN]', message, context || ''),
  error: (message: string, context?: unknown) => console.error('[ERROR]', message, context || ''),
};

// Configuration schema for Smithery
export const configSchema = z.object({
  readwiseApiKey: z.string().optional().describe("Your Readwise API access token. Get it from https://readwise.io/access_token"),
  debug: z.boolean().default(false).describe("Enable verbose debug logging to troubleshoot issues")
});

// Zod parameter schemas for all tools
// These provide parameter descriptions to Smithery for better UX
const toolSchemas: Record<string, Record<string, z.ZodType>> = {
  // Core tools
  get_highlights: {
    book_id: z.string().optional().describe("Filter highlights by book ID"),
    page: z.number().optional().describe("Page number for pagination"),
    page_size: z.number().optional().describe("Number of results per page (1-100)"),
    search: z.string().optional().describe("Search term to filter highlights"),
  },
  get_books: {
    page: z.number().optional().describe("Page number to retrieve"),
    page_size: z.number().optional().describe("Number of items per page (max 100)"),
  },
  get_documents: {
    page: z.number().optional().describe("Page number for pagination"),
    page_size: z.number().optional().describe("Number of results per page"),
  },
  search_highlights: {
    query: z.string().describe("The search query to find highlights"),
    limit: z.number().optional().describe("Maximum number of results to return"),
  },
  get_tags: {
    // No parameters - returns all tags
  },
  document_tags: {
    document_id: z.string().describe("The ID of the document"),
    operation: z.enum(['get', 'update', 'add', 'remove']).describe("The operation to perform"),
    tags: z.array(z.string()).optional().describe("Tags to set (for update operation)"),
    tag: z.string().optional().describe("Tag to add/remove (for add/remove operations)"),
  },
  bulk_tags: {
    document_ids: z.array(z.string()).describe("IDs of the documents to tag"),
    tags: z.array(z.string()).describe("Tags to add to all specified documents"),
    replace_existing: z.boolean().optional().describe("Replace existing tags (true) or append (false)"),
    confirmation: z.string().describe('Must be "I confirm these tag changes" to proceed'),
  },
  get_reading_progress: {
    document_id: z.string().describe("The ID of the document to get reading progress for"),
  },
  update_reading_progress: {
    document_id: z.string().describe("The ID of the document to update"),
    status: z.enum(['not_started', 'in_progress', 'completed']).describe("Reading status"),
    percentage: z.number().optional().describe("Reading progress percentage (0-100)"),
    current_page: z.number().optional().describe("Current page number"),
    total_pages: z.number().optional().describe("Total number of pages"),
    last_read_at: z.string().optional().describe("Timestamp of when last read (ISO format)"),
  },
  get_reading_list: {
    status: z.enum(['not_started', 'in_progress', 'completed']).optional().describe("Filter by reading status"),
    category: z.string().optional().describe("Filter by document category"),
    page: z.number().optional().describe("Page number for pagination"),
    page_size: z.number().optional().describe("Number of results per page"),
  },
  // Highlight management
  create_highlight: {
    text: z.string().describe("The text to highlight"),
    book_id: z.string().describe("The ID of the book to create the highlight in"),
    note: z.string().optional().describe("Note to add to the highlight"),
    location: z.number().optional().describe("Location in the book (e.g. page number)"),
    location_type: z.string().optional().describe("Type of location (e.g. page, chapter)"),
    color: z.string().optional().describe("Color for the highlight"),
    tags: z.array(z.string()).optional().describe("Tags to add to the highlight"),
  },
  update_highlight: {
    highlight_id: z.string().describe("The ID of the highlight to update"),
    text: z.string().optional().describe("New text for the highlight"),
    note: z.string().optional().describe("Note to add to the highlight"),
    location: z.number().optional().describe("Location in the book"),
    location_type: z.string().optional().describe("Type of location"),
    color: z.string().optional().describe("Color for the highlight"),
    tags: z.array(z.string()).optional().describe("Tags for the highlight"),
  },
  delete_highlight: {
    highlight_id: z.string().describe("The ID of the highlight to delete"),
    confirmation: z.string().describe('Type "DELETE" to confirm deletion'),
  },
  create_note: {
    highlight_id: z.string().describe("The ID of the highlight to add a note to"),
    note: z.string().describe("The note text to add"),
  },
  // Search tools
  advanced_search: {
    query: z.string().optional().describe("Search query"),
    book_ids: z.array(z.string()).optional().describe("List of book IDs to filter by"),
    tags: z.array(z.string()).optional().describe("List of tags to filter by"),
    categories: z.array(z.string()).optional().describe("List of categories to filter by"),
    date_range: z.object({
      start: z.string().optional().describe("Start date in ISO format"),
      end: z.string().optional().describe("End date in ISO format"),
    }).optional().describe("Date range filter"),
    location_range: z.object({
      start: z.number().optional().describe("Start location"),
      end: z.number().optional().describe("End location"),
    }).optional().describe("Location range filter"),
    has_note: z.boolean().optional().describe("Filter highlights that have notes"),
    sort_by: z.enum(['created_at', 'updated_at', 'highlighted_at', 'location']).optional().describe("Field to sort by"),
    sort_order: z.enum(['asc', 'desc']).optional().describe("Sort order"),
    page: z.number().optional().describe("Page number for pagination"),
    page_size: z.number().optional().describe("Number of results per page"),
  },
  search_by_tag: {
    tags: z.array(z.string()).describe("List of tags to search for"),
    match_all: z.boolean().optional().describe("Match all tags (AND) or any tag (OR)"),
    page: z.number().optional().describe("Page number for pagination"),
    page_size: z.number().optional().describe("Number of results per page"),
  },
  search_by_date: {
    start_date: z.string().optional().describe("Start date in ISO format (e.g. 2024-01-01)"),
    end_date: z.string().optional().describe("End date in ISO format (e.g. 2024-12-31)"),
    date_field: z.enum(['created_at', 'updated_at', 'highlighted_at']).optional().describe("Which date field to search on"),
    page: z.number().optional().describe("Page number for pagination"),
    page_size: z.number().optional().describe("Number of results per page"),
  },
  // Video tools
  get_videos: {
    limit: z.number().optional().describe("Maximum number of videos to return (1-100)"),
    pageCursor: z.string().optional().describe("Cursor for pagination"),
    tags: z.array(z.string()).optional().describe("Filter videos by tags"),
    platform: z.string().optional().describe("Filter videos by platform"),
  },
  get_video: {
    document_id: z.string().describe("The Readwise document ID for the video"),
  },
  create_video_highlight: {
    document_id: z.string().describe("The ID of the video"),
    text: z.string().describe("The text of the highlight"),
    timestamp: z.string().describe("Timestamp where the highlight occurs (e.g. 14:35)"),
    note: z.string().optional().describe("Note about the highlight"),
  },
  get_video_highlights: {
    document_id: z.string().describe("The ID of the video"),
  },
  update_video_position: {
    document_id: z.string().describe("The ID of the video"),
    position: z.number().describe("Current playback position in seconds"),
    duration: z.number().describe("Total duration of the video in seconds"),
  },
  get_video_position: {
    document_id: z.string().describe("The ID of the video"),
  },
  // Document management tools
  save_document: {
    url: z.string().describe("The URL of the content to save"),
    title: z.string().optional().describe("Title override for the document"),
    author: z.string().optional().describe("Author override for the document"),
    html: z.string().optional().describe("HTML content if not scraping from URL"),
    tags: z.array(z.string()).optional().describe("Tags to apply to the saved content"),
    summary: z.string().optional().describe("Summary of the content"),
    notes: z.string().optional().describe("Notes about the content"),
    location: z.enum(['new', 'later', 'archive', 'feed']).optional().describe("Where to save the content"),
    category: z.string().optional().describe("Category for the document (e.g. article, email)"),
    published_date: z.string().optional().describe("Published date in ISO 8601 format"),
    image_url: z.string().optional().describe("Cover image URL"),
  },
  update_document: {
    document_id: z.string().describe("The ID of the document to update"),
    title: z.string().optional().describe("New title for the document"),
    author: z.string().optional().describe("New author for the document"),
    summary: z.string().optional().describe("New summary for the document"),
    published_date: z.string().optional().describe("New published date in ISO 8601 format"),
    image_url: z.string().optional().describe("New cover image URL"),
    location: z.enum(['new', 'later', 'archive', 'feed']).optional().describe("New location"),
    category: z.string().optional().describe("New category"),
    tags: z.array(z.string()).optional().describe("New tags for the document"),
  },
  delete_document: {
    document_id: z.string().describe("The ID of the document to delete"),
    confirmation: z.string().describe('Type "I confirm deletion" to confirm'),
  },
  get_recent_content: {
    limit: z.number().optional().describe("Number of recent items to retrieve (default: 10, max: 50)"),
    content_type: z.enum(['books', 'highlights', 'all']).optional().describe("Type of content to retrieve (default: all)"),
  },
  // Bulk document operation tools
  bulk_save_documents: {
    items: z.array(z.object({
      url: z.string().describe("The URL of the content to save"),
      title: z.string().optional().describe("Title override"),
      author: z.string().optional().describe("Author override"),
      html: z.string().optional().describe("HTML content"),
      tags: z.array(z.string()).optional().describe("Tags"),
      summary: z.string().optional().describe("Summary"),
      notes: z.string().optional().describe("Notes"),
      location: z.enum(['new', 'later', 'archive', 'feed']).optional().describe("Location"),
    })).describe("Array of documents to save"),
    confirmation: z.string().describe('Type "I confirm saving these items" to confirm'),
  },
  bulk_update_documents: {
    updates: z.array(z.object({
      document_id: z.string().describe("The ID of the document to update"),
      title: z.string().optional().describe("New title"),
      author: z.string().optional().describe("New author"),
      summary: z.string().optional().describe("New summary"),
      tags: z.array(z.string()).optional().describe("New tags"),
      location: z.enum(['new', 'later', 'archive', 'feed']).optional().describe("New location"),
      category: z.string().optional().describe("New category"),
    })).describe("Array of document updates"),
    confirmation: z.string().describe('Type "I confirm these updates" to confirm'),
  },
  bulk_delete_documents: {
    document_ids: z.array(z.string()).describe("Array of document IDs to delete"),
    confirmation: z.string().describe('Type "I confirm deletion of these documents" to confirm'),
  },
};

// Zod parameter schemas for prompts
const promptSchemas: Record<string, Record<string, z.ZodType>> = {
  readwise_highlight: {
    book_id: z.string().optional().describe("The ID of the book to get highlights from"),
    page: z.number().optional().describe("The page number of results to get"),
    page_size: z.number().optional().describe("The number of results per page (max 100)"),
    search: z.string().optional().describe("Search term to filter highlights"),
    context: z.string().optional().describe("Additional context to include in the prompt"),
    task: z.enum(['summarize', 'analyze', 'connect', 'question']).optional().describe("The task to perform with the highlights"),
  },
  readwise_search: {
    query: z.string().describe("Search query to find highlights"),
    limit: z.number().optional().describe("Maximum number of results to return"),
    context: z.string().optional().describe("Additional context to include in the prompt"),
  },
};

// Export stateless flag for MCP (Smithery requirement)
export const stateless = true;

/**
 * Create and configure the Readwise MCP server
 * This is the default export that Smithery will call
 */
export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  try {
    const apiKey = config.readwiseApiKey || '';
    
    if (config.debug) {
      console.log('Starting Readwise MCP Server in debug mode');
      console.log(`API key provided: ${apiKey ? 'Yes' : 'No (lazy loading enabled)'}`);
    }

    // Create API client (allow empty API key for lazy loading)
    // Use FetchClient for Cloudflare Workers compatibility
    const apiClient = new FetchClient({
      apiKey: apiKey || '',
    });
    
    const api = new ReadwiseAPI(apiClient);

    // Create MCP server
    const server = new McpServer({
      name: "readwise-mcp",
      title: "Readwise",
      version: "1.0.0",
    });

    // Register all tools
    const tools = [
      // Core tools
      new GetHighlightsTool(api, consoleLogger),
      new GetBooksTool(api, consoleLogger),
      new GetDocumentsTool(api, consoleLogger),
      new SearchHighlightsTool(api, consoleLogger),
      new GetTagsTool(api, consoleLogger),
      new DocumentTagsTool(api, consoleLogger),
      new BulkTagsTool(api, consoleLogger),
      new GetReadingProgressTool(api, consoleLogger),
      new UpdateReadingProgressTool(api, consoleLogger),
      new GetReadingListTool(api, consoleLogger),
      // Highlight management
      new CreateHighlightTool(api, consoleLogger),
      new UpdateHighlightTool(api, consoleLogger),
      new DeleteHighlightTool(api, consoleLogger),
      new CreateNoteTool(api, consoleLogger),
      // Search tools
      new AdvancedSearchTool(api, consoleLogger),
      new SearchByTagTool(api, consoleLogger),
      new SearchByDateTool(api, consoleLogger),
      // Video tools
      new GetVideosTool(api, consoleLogger),
      new GetVideoTool(api, consoleLogger),
      new CreateVideoHighlightTool(api, consoleLogger),
      new GetVideoHighlightsTool(api, consoleLogger),
      new UpdateVideoPositionTool(api, consoleLogger),
      new GetVideoPositionTool(api, consoleLogger),
      // Document management tools
      new SaveDocumentTool(api, consoleLogger),
      new UpdateDocumentTool(api, consoleLogger),
      new DeleteDocumentTool(api, consoleLogger),
      new GetRecentContentTool(api, consoleLogger),
      // Bulk document operation tools
      new BulkSaveDocumentsTool(api, consoleLogger),
      new BulkUpdateDocumentsTool(api, consoleLogger),
      new BulkDeleteDocumentsTool(api, consoleLogger),
    ];

    // Tool annotations based on operation type
    const getToolAnnotations = (toolName: string) => {
      // Delete operations - destructive but idempotent (deleting twice = same result)
      const deleteTools = ['delete_highlight', 'delete_document', 'bulk_delete_documents'];
      if (deleteTools.includes(toolName)) {
        return { readOnlyHint: false, destructiveHint: true, idempotentHint: true };
      }

      // Create operations - not idempotent (creating twice = two resources)
      const createTools = [
        'create_highlight', 'create_note', 'create_video_highlight',
        'save_document', 'bulk_save_documents'
      ];
      if (createTools.includes(toolName)) {
        return { readOnlyHint: false, destructiveHint: false, idempotentHint: false };
      }

      // Update operations - idempotent (updating twice with same data = same result)
      const updateTools = [
        'update_highlight', 'update_reading_progress', 'update_video_position',
        'update_document', 'bulk_update_documents', 'document_tags', 'bulk_tags'
      ];
      if (updateTools.includes(toolName)) {
        return { readOnlyHint: false, destructiveHint: false, idempotentHint: true };
      }

      // Default: read-only operations
      return { readOnlyHint: true, destructiveHint: false, idempotentHint: true };
    };

    // Register each tool with the server using server.tool() method
    for (const tool of tools) {
      try {
        const annotations = getToolAnnotations(tool.name);
        server.tool(
        tool.name,
        tool.description,
        toolSchemas[tool.name] || {}, // Use Zod schemas for parameter descriptions
        annotations,
        async (args: any) => {
          try {
            const toolResult = await tool.execute(args || {});
            // Extract the actual result from MCPToolResult wrapper
            const actualResult = toolResult && typeof toolResult === 'object' && 'result' in toolResult
              ? (toolResult as any).result
              : toolResult;
            
            // Convert to MCP content format (like Exa does)
            // Tools must return { content: [{ type: "text", text: "..." }] } format
            const mcpResponse = toMCPResponse(actualResult);
            // Return just the content format expected by SDK
            return {
              content: mcpResponse.content.map(item => {
                // Ensure type is exactly what SDK expects
                if (item.type === 'text') {
                  return {
                    type: 'text' as const,
                    text: item.text || ''
                  };
                }
                // For other types, return as-is (cast to satisfy type checker)
                return item as any;
              })
            };
          } catch (error) {
            if (config.debug) {
              console.error(`Error executing tool ${tool.name}:`, error);
            }
            // Return error in MCP format with proper serialization
            let errorMessage: string;
            if (error instanceof Error) {
              errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null) {
              // Handle plain object errors (e.g., from older code paths)
              const errObj = error as Record<string, unknown>;
              if ('message' in errObj && typeof errObj.message === 'string') {
                errorMessage = errObj.message;
              } else if ('details' in errObj && typeof errObj.details === 'object') {
                const details = errObj.details as Record<string, unknown>;
                errorMessage = typeof details.message === 'string'
                  ? details.message
                  : JSON.stringify(error);
              } else {
                errorMessage = JSON.stringify(error);
              }
            } else {
              errorMessage = String(error);
            }
            return {
              content: [{
                type: 'text' as const,
                text: errorMessage
              }]
            };
          }
        }
      );
      } catch (toolError) {
        throw toolError;
      }
    }

    // Register MCP Resources
    // These provide data access to LLM clients
    server.resource(
      "books",
      "readwise://books",
      { description: "List of books in your Readwise library", mimeType: "application/json" },
      async () => {
        try {
          const books = await api.getBooks({ page_size: 50 });
          return {
            contents: [{
              uri: "readwise://books",
              mimeType: "application/json",
              text: JSON.stringify(books.results.map(b => ({
                id: b.id,
                title: b.title,
                author: b.author,
                category: b.category,
                highlights_count: b.highlights_count
              })), null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: "readwise://books",
              mimeType: "text/plain",
              text: `Error fetching books: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    server.resource(
      "recent-highlights",
      "readwise://highlights/recent",
      { description: "Recent highlights from your Readwise library", mimeType: "application/json" },
      async () => {
        try {
          const highlights = await api.getHighlights({ page_size: 20 });
          return {
            contents: [{
              uri: "readwise://highlights/recent",
              mimeType: "application/json",
              text: JSON.stringify(highlights.results.map(h => ({
                id: h.id,
                text: h.text,
                note: h.note,
                book_id: h.book_id,
                created_at: h.created_at
              })), null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: "readwise://highlights/recent",
              mimeType: "text/plain",
              text: `Error fetching highlights: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    server.resource(
      "tags",
      "readwise://tags",
      { description: "List of all tags in your Readwise library", mimeType: "application/json" },
      async () => {
        try {
          const tags = await api.getTags();
          return {
            contents: [{
              uri: "readwise://tags",
              mimeType: "application/json",
              text: JSON.stringify(tags, null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: "readwise://tags",
              mimeType: "text/plain",
              text: `Error fetching tags: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // Register prompts using server.prompt() method
    const highlightPrompt = new ReadwiseHighlightPrompt(api, consoleLogger);
    const searchPrompt = new ReadwiseSearchPrompt(api, consoleLogger);
    
    // Register highlight prompt with Zod schemas for parameter descriptions
    server.prompt(
      highlightPrompt.name,
      highlightPrompt.description,
      promptSchemas[highlightPrompt.name] || {},
      async (args: any) => {
        const result = await highlightPrompt.execute(args || {});
        // Convert MCPResponse to prompt format with messages array
        // Extract text from content array (usually first item)
        const firstContent = result.content && result.content.length > 0 
          ? result.content[0] 
          : null;
        
        // Ensure we have a text content item
        const textContent = firstContent && firstContent.type === 'text' && firstContent.text
          ? { type: 'text' as const, text: firstContent.text || '' }
          : { type: 'text' as const, text: '' };
        
        return {
          messages: [
            {
              role: 'user' as const,
              content: textContent
            }
          ]
        };
      }
    );

    // Register search prompt with Zod schemas for parameter descriptions
    server.prompt(
      searchPrompt.name,
      searchPrompt.description,
      promptSchemas[searchPrompt.name] || {},
      async (args: any) => {
        const result = await searchPrompt.execute(args || {});
        // Convert MCPResponse to prompt format with messages array
        // Extract text from content array (usually first item)
        const firstContent = result.content && result.content.length > 0 
          ? result.content[0] 
          : null;
        
        // Ensure we have a text content item
        const textContent = firstContent && firstContent.type === 'text' && firstContent.text
          ? { type: 'text' as const, text: firstContent.text || '' }
          : { type: 'text' as const, text: '' };
        
        return {
          messages: [
            {
              role: 'user' as const,
              content: textContent
            }
          ]
        };
      }
    );

    if (config.debug) {
      console.log(`Registered ${tools.length} tools and 2 prompts`);
    }

    // Return the server object (Smithery handles transport)
    return server.server;
    
  } catch (error) {
    console.error(`Server initialization error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
