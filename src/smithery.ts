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
import { ReadwiseClient } from './api/client.js';
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
  readwiseApiKey: z.string().optional().describe("Readwise API key from https://readwise.io/access_token"),
  debug: z.boolean().default(false).describe("Enable debug logging")
});

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
    const apiClient = new ReadwiseClient({
      apiKey: apiKey || '',
    });
    
    const api = new ReadwiseAPI(apiClient);

    // Create MCP server
    const server = new McpServer({
      name: "readwise-mcp",
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

    // Register each tool with the server using server.tool() method
    // This is the recommended way to register tools with McpServer
    for (const tool of tools) {
      // Use empty object {} - validation happens in tool.execute()
      // The SDK will accept any parameters and pass them to our handler
      server.tool(
        tool.name,
        tool.description,
        {}, // Parameters schema - empty object accepts any params, validation in execute()
        {
          readOnlyHint: true, // Most Readwise operations are read-only
          destructiveHint: false,
          idempotentHint: true
        },
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
            // Return error in MCP format
            return {
              content: [{
                type: 'text' as const,
                text: error instanceof Error ? error.message : String(error)
              }]
            };
          }
        }
      );
    }

    // Register prompts using server.prompt() method
    const highlightPrompt = new ReadwiseHighlightPrompt(api, consoleLogger);
    const searchPrompt = new ReadwiseSearchPrompt(api, consoleLogger);
    
    // Register highlight prompt
    // Use empty object {} like Exa does - validation happens in execute()
    server.prompt(
      highlightPrompt.name,
      highlightPrompt.description,
      {}, // Parameters schema - empty object accepts any params, validation in execute()
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

    // Register search prompt
    server.prompt(
      searchPrompt.name,
      searchPrompt.description,
      {}, // Parameters schema - empty object accepts any params, validation in execute()
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
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
}
