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
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:88',message:'Default export function called',data:{configReceived:!!config,configKeys:config?Object.keys(config):[],hasApiKey:!!config?.readwiseApiKey,debug:config?.debug},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D'})}).catch(()=>{});
  // #endregion
  console.error('[SMITHERY-DEBUG] Default export function called', { 
    hasConfig: !!config, 
    configKeys: config ? Object.keys(config) : [],
    timestamp: new Date().toISOString()
  });
  try {
    const apiKey = config.readwiseApiKey || '';
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:92',message:'Config parsed successfully',data:{apiKeyLength:apiKey.length,debug:config.debug},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    if (config.debug) {
      console.log('Starting Readwise MCP Server in debug mode');
      console.log(`API key provided: ${apiKey ? 'Yes' : 'No (lazy loading enabled)'}`);
    }

    // Create API client (allow empty API key for lazy loading)
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:98',message:'Creating API client',data:{apiKeyProvided:!!apiKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const apiClient = new ReadwiseClient({
      apiKey: apiKey || '',
    });
    
    const api = new ReadwiseAPI(apiClient);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:102',message:'API client created',data:{apiClientCreated:!!apiClient,apiCreated:!!api},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Create MCP server
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:105',message:'Creating MCP server',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    const server = new McpServer({
      name: "readwise-mcp",
      version: "1.0.0",
    });
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:108',message:'MCP server created',data:{serverCreated:!!server,hasServerProperty:!!server.server,serverType:typeof server.server},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:152',message:'Starting tool registration',data:{toolCount:tools.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    for (const tool of tools) {
      // Use empty object {} - validation happens in tool.execute()
      // The SDK will accept any parameters and pass them to our handler
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:155',message:'Registering tool',data:{toolName:tool.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      try {
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
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:202',message:'Tool registered successfully',data:{toolName:tool.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      } catch (toolError) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:205',message:'Tool registration failed',data:{toolName:tool.name,error:toolError instanceof Error?toolError.message:String(toolError)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        throw toolError;
      }
    }
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:211',message:'All tools registered',data:{toolCount:tools.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:273',message:'About to return server.server',data:{hasServer:!!server,hasServerProperty:!!server.server,serverServerType:typeof server.server,serverServerKeys:server.server?Object.keys(server.server).slice(0,5):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const serverToReturn = server.server;
    console.error('[SMITHERY-DEBUG] Returning server.server', {
      hasServer: !!server,
      hasServerProperty: !!server.server,
      serverType: typeof serverToReturn,
      isNull: serverToReturn === null,
      isUndefined: serverToReturn === undefined,
      timestamp: new Date().toISOString()
    });
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:276',message:'Returning server.server',data:{serverToReturnType:typeof serverToReturn,serverToReturnIsNull:serverToReturn===null,serverToReturnIsUndefined:serverToReturn===undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return serverToReturn;
    
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:280',message:'Error caught in default export',data:{errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:'unknown',hasStack:error instanceof Error?!!error.stack:false,errorType:typeof error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('[SMITHERY-DEBUG] Server initialization error:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'unknown',
      stack: error instanceof Error ? error.stack?.substring(0, 1000) : undefined,
      timestamp: new Date().toISOString()
    });
    console.error(`Server initialization error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/b268e285-8037-4c21-862d-a3266952b6d6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smithery.ts:283',message:'Error stack trace',data:{stackTrace:error.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }
    throw error;
  }
}
