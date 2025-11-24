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
- **Document Management**: Save, update, and delete documents via URL
- **Bulk Operations**: Perform bulk save, update, delete, and tagging operations
- **Video Support**: Full video content management with transcripts and timestamps
- **Reading Progress**: Track and update reading progress across your library

## Project Structure

```
readwise-mcp/
├── src/                           # Main source code
│   ├── api/                       # API client layer
│   │   ├── client.ts              # HTTP client with Axios, error handling, rate limit detection
│   │   ├── mock-client.ts         # Mock implementation for testing without API key
│   │   └── readwise-api.ts        # Readwise API wrapper with all endpoint methods
│   │
│   ├── tools/                     # MCP tool implementations (29 tools)
│   │   ├── base.ts                # Base tool class with common functionality
│   │   │
│   │   │  # Content Browsing Tools
│   │   ├── get-books.ts           # Retrieve books from library
│   │   ├── get-documents.ts       # Retrieve documents from library
│   │   ├── get-highlights.ts      # Retrieve highlights with filtering
│   │   ├── get-recent-content.ts  # Get recently added/updated content
│   │   │
│   │   │  # Search Tools
│   │   ├── search-highlights.ts   # Full-text search for highlights
│   │   ├── advanced-search.ts     # Multi-filter search with facets
│   │   ├── search-by-tag.ts       # Search highlights by tags (AND/OR)
│   │   ├── search-by-date.ts      # Search highlights by date range
│   │   │
│   │   │  # Highlight Management Tools
│   │   ├── create-highlight.ts    # Create new highlights
│   │   ├── update-highlight.ts    # Update existing highlights
│   │   ├── delete-highlight.ts    # Delete highlights (with confirmation)
│   │   ├── create-note.ts         # Add notes to highlights
│   │   │
│   │   │  # Document Management Tools (v3 API)
│   │   ├── save-document.ts       # Save new documents by URL
│   │   ├── update-document.ts     # Update document metadata
│   │   ├── delete-document.ts     # Delete documents (with confirmation)
│   │   │
│   │   │  # Bulk Operation Tools
│   │   ├── bulk-tags.ts           # Bulk tag operations
│   │   ├── bulk-save-documents.ts # Bulk save multiple documents
│   │   ├── bulk-update-documents.ts # Bulk update document metadata
│   │   ├── bulk-delete-documents.ts # Bulk delete documents
│   │   │
│   │   │  # Tag Management Tools
│   │   ├── get-tags.ts            # Retrieve all tags
│   │   ├── document-tags.ts       # Manage tags for specific documents
│   │   │
│   │   │  # Reading Progress Tools
│   │   ├── get-reading-progress.ts    # Get reading progress for document
│   │   ├── update-reading-progress.ts # Update reading status/percentage
│   │   ├── get-reading-list.ts        # Get reading list with progress info
│   │   │
│   │   │  # Video Tools
│   │   ├── get-videos.ts          # List videos from library
│   │   ├── get-video.ts           # Get video details with transcript
│   │   ├── get-video-highlights.ts    # Get highlights for a video
│   │   ├── create-video-highlight.ts  # Create highlight with timestamp
│   │   ├── get-video-position.ts      # Get playback position
│   │   └── update-video-position.ts   # Update playback position
│   │
│   ├── prompts/                   # MCP prompt implementations
│   │   ├── highlight-prompt.ts    # Analyze highlights (summarize, analyze, connect, question)
│   │   └── search-prompt.ts       # Search and format highlights with attribution
│   │
│   ├── mcp/                       # MCP infrastructure
│   │   ├── registry/              # Tool and prompt registration system
│   │   │   ├── base-tool.ts       # Base class for all MCP tools
│   │   │   ├── base-prompt.ts     # Base class for all MCP prompts
│   │   │   ├── tool-registry.ts   # Tool registration and lookup
│   │   │   └── prompt-registry.ts # Prompt registration and lookup
│   │   └── types.ts               # MCP-specific type definitions
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── index.ts               # Core types (Highlight, Book, Document, etc.)
│   │   ├── validation.ts          # Validation utilities and result types
│   │   ├── guards.ts              # Type guard functions
│   │   └── modelcontextprotocol__sdk.d.ts # MCP SDK type declarations
│   │
│   ├── utils/                     # Utility functions
│   │   ├── config.ts              # Configuration management
│   │   ├── logger.ts              # Main logger implementation
│   │   ├── logger-interface.ts    # Logger interface definition
│   │   ├── safe-logger.ts         # Transport-aware safe logging
│   │   ├── response.ts            # Response formatting utilities
│   │   └── sse.ts                 # Server-Sent Events utilities
│   │
│   │  # Server Entry Points
│   ├── index.ts                   # Main CLI entry point with argument parsing
│   ├── server.ts                  # Core MCP server implementation
│   ├── simple-server.ts           # Standalone Express server with OpenAPI
│   │
│   │  # Serverless Handlers
│   ├── serverless.ts              # Serverless wrapper
│   ├── lambda.ts                  # AWS Lambda handler
│   └── gcf.ts                     # Google Cloud Function handler
│
├── tests/                         # Test suite
│   ├── setup.ts                   # Test configuration and setup
│   ├── server.test.ts             # Server integration tests
│   ├── tools/                     # Individual tool tests
│   │   ├── get-books.test.ts
│   │   ├── get-documents.test.ts
│   │   ├── get-highlights.test.ts
│   │   └── search-highlights.test.ts
│   ├── prompts/                   # Prompt tests
│   │   └── highlight-prompt.test.ts
│   ├── advanced-search.test.ts    # Advanced search feature tests
│   ├── bulk-operations.test.ts    # Bulk operation tests
│   ├── delete-confirmation.test.ts # Deletion confirmation tests
│   ├── reading-progress.test.ts   # Reading progress tests
│   ├── tags.test.ts               # Tag management tests
│   ├── video-features.test.ts     # Video functionality tests
│   └── status.test.ts             # Health/status endpoint tests
│
├── examples/                      # Example implementations
│   ├── README.md                  # Examples documentation
│   ├── programmatic-access.ts     # Programmatic API usage example
│   ├── mcp-implementations/       # MCP implementation examples
│   │   └── basic-mcp-test.ts
│   └── test-clients/              # Client-side test scripts
│       └── test-mcp-client.ts
│
├── test-scripts/                  # Testing utilities
│   ├── README.md                  # Test scripts documentation
│   └── fixed-mcp-test.ts          # MCP protocol compliance tests
│
├── scripts/                       # Development scripts
│   ├── run-inspector.ts           # MCP Inspector runner
│   ├── test-inspector.ts          # Inspector test automation
│   └── tsconfig.json              # Scripts-specific TypeScript config
│
├── docs/                          # Documentation
│   ├── serverless-deployment.md   # Serverless deployment guide
│   ├── serverless-implementation-summary.md # Implementation details
│   └── testing-and-debugging.md   # Testing guide
│
├── dist/                          # Compiled JavaScript output (generated)
│   └── ...                        # Mirrors src/ structure with .js and .d.ts files
│
├── bin/                           # CLI binaries
│   └── cli.ts                     # CLI wrapper script
│
│  # Configuration Files
├── package.json                   # NPM package configuration
├── package-lock.json              # NPM dependency lock file
├── tsconfig.json                  # TypeScript configuration
├── .eslintrc.json                 # ESLint configuration
├── serverless.yml                 # Serverless Framework configuration
├── smithery.yaml                  # Smithery AI deployment configuration
│
│  # Documentation
├── README.md                      # This file - main documentation
└── SMITHERY.md                    # Smithery deployment documentation
```

### Key Directories Explained

#### `src/api/`
Contains the HTTP client layer for communicating with the Readwise API. The `client.ts` file provides a generic HTTP client with error handling and rate limit detection. The `readwise-api.ts` file wraps all Readwise API endpoints with typed methods.

#### `src/tools/`
Each file implements a single MCP tool that exposes Readwise functionality to AI assistants. Tools follow a consistent pattern:
- Parameter validation
- API interaction
- Response formatting
- Error handling with user-friendly messages

#### `src/mcp/`
Infrastructure for the MCP protocol implementation, including tool and prompt registration, base classes, and type definitions.

#### `src/types/`
Comprehensive TypeScript type definitions for all data structures, API responses, and validation utilities.

#### `src/utils/`
Shared utilities including logging (with transport-aware safe logging for stdio), configuration management, and response formatting.

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

## Available Tools (29 Total)

### Content Browsing
| Tool | Description |
|------|-------------|
| `get_books` | Retrieve books from your Readwise library with category filtering |
| `get_documents` | Retrieve documents from your library with pagination |
| `get_highlights` | Get highlights with filtering by book_id, search, and pagination |
| `get_recent_content` | Get the most recently added or updated content |

### Search & Filtering
| Tool | Description |
|------|-------------|
| `search_highlights` | Full-text search for highlights using a query string |
| `advanced_search` | Multi-filter search with facets (books, tags, categories, dates) |
| `search_by_tag` | Search highlights by tags with AND/OR matching |
| `search_by_date` | Search highlights within a date range |

### Highlight Management
| Tool | Description |
|------|-------------|
| `create_highlight` | Create new highlights with text, book_id, notes, location, color, tags |
| `update_highlight` | Update existing highlight text, notes, or metadata |
| `delete_highlight` | Delete a highlight (requires "DELETE" confirmation) |
| `create_note` | Add notes to existing highlights |

### Document Management (v3 API)
| Tool | Description |
|------|-------------|
| `save_document` | Save new documents to Readwise by URL |
| `update_document` | Update document metadata (title, author, tags, location) |
| `delete_document` | Delete documents (requires "I confirm deletion" confirmation) |

### Bulk Operations
| Tool | Description |
|------|-------------|
| `bulk_tags` | Add tags to multiple documents at once |
| `bulk_save_documents` | Save multiple documents by URL in one operation |
| `bulk_update_documents` | Update metadata for multiple documents |
| `bulk_delete_documents` | Delete multiple documents (requires confirmation) |

### Tag Management
| Tool | Description |
|------|-------------|
| `get_tags` | Retrieve all tags from your Readwise library |
| `document_tags` | Get, add, or remove tags for a specific document |

### Reading Progress
| Tool | Description |
|------|-------------|
| `get_reading_progress` | Get reading progress for a specific document |
| `update_reading_progress` | Update reading status, percentage, or pages read |
| `get_reading_list` | Get reading list filtered by status or category |

### Video Support
| Tool | Description |
|------|-------------|
| `get_videos` | List videos from your library with optional filtering |
| `get_video` | Get video details including transcript |
| `get_video_highlights` | Get all highlights for a specific video |
| `create_video_highlight` | Create a highlight at a specific timestamp |
| `get_video_position` | Get current playback position for a video |
| `update_video_position` | Update video playback position |

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