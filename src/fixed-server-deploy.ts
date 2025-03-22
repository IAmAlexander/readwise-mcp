import { createServer } from 'http';
import { McpServer } from './mcp/server';
import * as process from 'process';

// Import tools
import { GetHighlightsTool } from './tools/get-highlights';
import { GetBooksTool } from './tools/get-books';
import { GetDocumentsTool } from './tools/get-documents';
import { SearchHighlightsTool } from './tools/search-highlights';

// Import readwise API
import { ReadwiseAPI } from './api/readwise-api';

// Basic logging
const log = (msg: string) => {
  const debug = process.env.DEBUG === 'true';
  if (debug) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
  }
};

// Main function
async function main() {
  // Check if Readwise API token is set
  const apiToken = process.env.READWISE_API_TOKEN;
  if (!apiToken) {
    console.error('ERROR: READWISE_API_TOKEN environment variable is required');
    process.exit(1);
  }

  // Create API client
  const readwiseApi = new ReadwiseAPI({ apiKey: apiToken });
  
  // Setup MCP server
  const mcpServer = new McpServer('readwise-mcp');
  
  // Register tools
  mcpServer.registerTool(new GetHighlightsTool(readwiseApi));
  mcpServer.registerTool(new GetBooksTool(readwiseApi));
  mcpServer.registerTool(new GetDocumentsTool(readwiseApi));
  mcpServer.registerTool(new SearchHighlightsTool(readwiseApi));
  
  // Create server
  const port = parseInt(process.env.PORT || '3001', 10);
  const httpServer = createServer();
  
  // Start HTTP server
  httpServer.listen(port, () => {
    log(`Readwise MCP Server started on port ${port}`);
  });
  
  // Handle STDIO
  const stdin = process.stdin;
  const stdout = process.stdout;
  
  await mcpServer.start(stdin, stdout);
  
  // Handle cleanup
  process.on('SIGINT', () => {
    log('Shutting down...');
    httpServer.close();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 