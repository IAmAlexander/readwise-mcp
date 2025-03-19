# Readwise MCP Server

A Model Context Protocol (MCP) server for accessing and interacting with your Readwise library.

## Features

- Access highlights from your Readwise library
- Search for highlights using natural language queries
- Get books and documents from your library
- Seamless integration with Claude and other MCP-compatible assistants
- Enhanced prompt capabilities for highlight analysis
- Transport-aware logging system
- Robust error handling and validation
- MCP protocol compliance with proper request_id handling
- Health check endpoint for monitoring
- Improved setup wizard with API key validation

## Installation

```bash
# Install from npm
npm install -g readwise-mcp

# Or clone the repository and install dependencies
git clone https://github.com/your-username/readwise-mcp.git
cd readwise-mcp
npm install
npm run build
```

## Setup

Before using the server, you need to configure your Readwise API key:

```bash
# Run the setup wizard
npm run setup

# Or start with the API key directly
readwise-mcp --api-key YOUR_API_KEY
```

You can get your API key from [https://readwise.io/access_token](https://readwise.io/access_token).

## Usage

### CLI

```bash
# Start with stdio transport (default, for Claude Desktop)
readwise-mcp

# Start with SSE transport (for web-based integrations)
readwise-mcp --transport sse --port 3000

# Enable debug logging
readwise-mcp --debug
```

### API

```typescript
import { ReadwiseMCPServer } from 'readwise-mcp';

const server = new ReadwiseMCPServer(
  'YOUR_API_KEY',
  3000, // port
  logger,
  'sse' // transport
);

await server.start();
```

## Testing with MCP Inspector

To test your server with the MCP Inspector:

```bash
# First, build the project
npm run build

# Then run the inspector test script
npm run test-inspector
```

This will start the server in SSE mode and provide instructions for connecting with the MCP Inspector.

## Testing Without a Readwise API Key

If you don't have a Readwise API key or don't want to use your real API key for testing, you can use the mock testing functionality:

```bash
npm run test-mock
```

This runs a test script that:

1. Creates a mock implementation of the Readwise API
2. Sets up the MCP server with this mock API
3. Tests various endpoints with sample data
4. Verifies server functionality without requiring a real API key

The mock implementation includes:
- Sample books, highlights, and documents
- Simulated network delays for realistic testing
- Error handling testing

## Available Tools

- **get_highlights**: Get highlights from your Readwise library
- **get_books**: Get books from your Readwise library
- **get_documents**: Get documents from your Readwise library
- **search_highlights**: Search for highlights in your Readwise library

## Available Prompts

- **readwise_highlight**: Process highlights from Readwise
  - Supports summarization, analysis, connection finding, and question generation
  - Includes robust error handling and parameter validation
  - Formats highlights in a reader-friendly way

- **readwise_search**: Search and process highlights from Readwise
  - Provides formatted search results with source information
  - Handles API errors gracefully with user-friendly messages
  - Includes validation for required parameters

## Recent Improvements

### Enhanced MCP Protocol Compliance
- Proper handling of request_id in all responses
- Validation of incoming requests against MCP protocol specifications
- Consistent error response format following MCP guidelines

### Improved Setup Experience
- Interactive setup wizard with API key validation
- Secure storage of configuration
- Detailed error messages for troubleshooting

### Robust Error Handling
- Specific error messages for different API error conditions
- Consistent error format across all tools and prompts
- Transport-aware logging that doesn't interfere with the protocol

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Start in development mode with auto-reload
npm run dev:watch

# Lint code
npm run lint
```

## License

MIT