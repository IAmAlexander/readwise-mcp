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

## Project Structure

This repository is organized into the following key directories:

- **src/**: Main source code for the Readwise MCP server
- **test-scripts/**: Test scripts and utilities for validating MCP server functionality
  - `smart-mcp-test.sh`: Main testing script for both stdio and SSE transports
  - `run-simple-server.sh`: Script to run a simple MCP server
  - See `test-scripts/README.md` for complete documentation
- **examples/**: Example implementations and code samples
  - `examples/mcp-implementations/`: Basic MCP server implementations
  - `examples/test-clients/`: Client-side test scripts
  - See `examples/README.md` for complete documentation
- **dist/**: Compiled JavaScript output (generated)
- **scripts/**: Utility scripts for development and testing

## Installation

```bash
# Install from npm
npm install -g readwise-mcp

# Or clone the repository and install dependencies
git clone https://github.com/IAmAlexander/readwise-mcp.git
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

The project includes built-in support for testing with the MCP Inspector. You can use either the TypeScript script or the shell script to run the inspector.

### Automated Tests

Run the automated test suite that verifies all tools and prompts:

```bash
# Run automated inspector tests
npm run test-inspector

# Run in CI mode (exits with status code)
npm run test-inspector:ci
```

The test suite verifies:
- Server startup and connection
- Tool availability and responses
- Prompt functionality
- Error handling
- Response format compliance

Each test provides detailed output and a summary of passed/failed cases.

### Manual Testing

### Using the Shell Script

```bash
# Test with stdio transport (default)
./scripts/inspector.sh

# Test with SSE transport
./scripts/inspector.sh -t sse -p 3001

# Enable debug mode
./scripts/inspector.sh -d

# Full options
./scripts/inspector.sh --transport sse --port 3001 --debug
```

### Using the TypeScript Script

```bash
# Test with stdio transport (default)
npm run inspector

# Test with SSE transport
npm run inspector -- -t sse -p 3001

# Enable debug mode
npm run inspector -- -d

# Full options
npm run inspector -- --transport sse --port 3001 --debug
```

### Available Options

- `-t, --transport <type>`: Transport type (stdio or sse), default: stdio
- `-p, --port <number>`: Port number for SSE transport, default: 3001
- `-d, --debug`: Enable debug mode

### Example Inspector Commands

Test a specific tool:
```bash
./scripts/inspector.sh
> tool get-highlights --parameters '{"page": 1, "page_size": 10}'
```

Test a prompt:
```bash
./scripts/inspector.sh
> prompt search-highlights --parameters '{"query": "python"}'
```

List available tools and prompts:
```bash
./scripts/inspector.sh
> list tools
> list prompts
```

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

## Integration

### Claude Desktop

Add to your Claude Desktop config (`~/.config/Claude/claude_desktop_config.json` on Linux, `~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "readwise": {
      "command": "readwise-mcp",
      "env": {
        "READWISE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "readwise": {
      "command": "readwise-mcp",
      "env": {
        "READWISE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Deployment (Hosted SSE Server)

### Smithery

[![Smithery Badge](https://smithery.ai/badge/readwise-mcp)](https://smithery.ai/server/readwise-mcp)

Install via Smithery CLI:
```bash
npx @smithery/cli install readwise-mcp --client claude
```

Or find it on the [Smithery Registry](https://smithery.ai/server/readwise-mcp).

### Railway (One-Click Deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/readwise-mcp)

1. Click the button above or go to [Railway](https://railway.app)
2. Connect your GitHub repo
3. Add environment variable: `READWISE_API_KEY`
4. Deploy!

Your server will be available at `https://your-app.railway.app`

### Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repo
3. Render will auto-detect `render.yaml`
4. Add environment variable: `READWISE_API_KEY`
5. Deploy!

### Docker

```bash
docker build -t readwise-mcp .
docker run -p 3001:3001 -e READWISE_API_KEY=your_key readwise-mcp
```

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