# Readwise MCP Server

[![npm downloads](https://img.shields.io/npm/dm/readwise-mcp?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/readwise-mcp)
[![smithery badge](https://smithery.ai/badge/@IAmAlexander/readwise-mcp)](https://smithery.ai/server/@IAmAlexander/readwise-mcp)
[![Install in Cursor](https://img.shields.io/badge/Install_in-Cursor-000000?style=flat-square&logo=cursor&logoColor=white)](https://cursor.com/install-mcp?name=readwise-mcp&config=eyJ0eXBlIjoiaHR0cCIsInVybCI6Imh0dHBzOi8vc2VydmVyLnNtaXRoZXJ5LmFpL0BJQW1BbGV4YW5kZXIvcmVhZHdpc2UtbWNwL21jcCJ9)
[![Install in VS Code](https://img.shields.io/badge/Install_in-VS_Code-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=readwise-mcp&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A//server.smithery.ai/%40IAmAlexander/readwise-mcp/mcp%22%7D)
[![Install in Claude Desktop](https://img.shields.io/badge/Install_in-Claude_Desktop-D97757?style=flat-square&logo=anthropic&logoColor=white)](https://smithery.ai/server/@IAmAlexander/readwise-mcp)
[![npm version](https://img.shields.io/npm/v/readwise-mcp?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/readwise-mcp)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [Readwise](https://readwise.io), allowing AI assistants to access your saved articles, books, highlights, and documents.

## Features

- **Books & Articles**: Browse your collection of saved books and articles
- **Highlights**: Access all your highlighted passages
- **Search**: Find content across your entire Readwise library
- **Recent Content**: Quickly retrieve your latest saved items
- **Tag Management**: Organize and filter content with tags
- **Advanced Search**: Powerful filtering by author, date, tags, and more
- **Reading Progress**: Track your reading status and completion percentage
- **Bulk Operations**: Efficiently manage multiple documents at once
- **Content Management**: Save, update, and delete content in your library
- **Video Support**: Access and interact with videos saved in your Readwise Reader
- **Rate Limiting**: Smart handling of API limits to prevent throttling
- **Transport Options**: Support for both stdio (Claude Desktop) and SSE (web) transports
- **MCP Compliance**: Full protocol compliance with proper request_id handling

## Installation

### Installing via Smithery

To install Readwise MCP for Claude Desktop automatically via Smithery:

```bash
npx -y @smithery/cli install @iamalexander/readwise-mcp --client claude
```

### Installing Manually

1. **Obtain a Readwise API Token**:
   - Log in to your [Readwise account](https://readwise.io)
   - Go to <https://readwise.io/access_token> to generate your API token
   - Copy the token for later use

2. **Install from npm**:
   ```bash
   npm install -g readwise-mcp
   ```

3. **Or clone and build**:
   ```bash
   git clone https://github.com/IAmAlexander/readwise-mcp.git
   cd readwise-mcp
   npm install
   npm run build
   ```

4. **Configure your API key**:
   ```bash
   # Run the setup wizard
   npm run setup

   # Or start with the API key directly
   readwise-mcp --api-key YOUR_API_KEY
   ```

### Docker Support

If you prefer using Docker:

1. **Create config directory**:
   ```bash
   mkdir -p ~/.readwise-mcp
   ```

2. **Build and run**:
   ```bash
   docker build -t readwise-mcp .
   docker run -p 3001:3001 -e READWISE_API_KEY=your_key readwise-mcp
   ```

## Usage Examples

Once connected to Claude, unleash your Readwise knowledge with questions like:

- "Find my highlights about 'vibes-first programming' and aesthetic IDEs"
- "What did I save about Claude Code's secret Easter eggs?"
- "Show me all articles tagged with 'AI' and 'productivity'"
- "What's in my reading list that I haven't started yet?"
- "Find articles by Paul Graham that I saved in the last 3 months"
- "Show me books I've completed reading"
- "Save this article to my Readwise: https://example.com/interesting-article"
- "Add the tag 'must-read' to that article about quantum computing"
- "What's my reading progress on that book about machine learning?"

### Video-Related Examples

- "Show me all YouTube videos I've saved in Readwise"
- "What highlights did I make on that video about TypeScript?"
- "What's my current playback position for that AI conference video?"
- "Find videos in my library that mention 'machine learning'"
- "Create a highlight at 23:45 in the TypeScript tutorial with the note 'Important pattern'"
- "What did the speaker say around the 15-minute mark in that AI safety video?"
- "Show me the transcript of the programming tutorial I saved yesterday"

## Feature Documentation

### Basic Features

#### Browsing Content
- **List books and articles**: Retrieve your saved books with pagination
- **Get highlights**: Access all your highlighted passages with filtering options
- **Search content**: Full-text search across your entire library
- **Get recent content**: Quickly access your latest saved items

### Tag Management

Organize your content with tags:

- **List all tags**: Get all tags in your library
- **Get tags for a document**: View tags on a specific document
- **Update tags**: Replace all tags on a document
- **Add a specific tag**: Add a single tag to a document
- **Remove a specific tag**: Remove a tag from a document
- **Bulk tagging**: Apply tags to multiple documents at once

### Advanced Search

Powerful filtering options for finding exactly what you need:

- `query`: Search text
- `category`: Filter by content type (book, article, etc.)
- `tags`: Filter by tags (comma-separated)
- `author`: Filter by author
- `title`: Filter by title
- `location`: Filter by location (new, later, archive, feed)
- `dateFrom` & `dateTo`: Date range in ISO 8601 format
- `sortBy`: Field to sort by (created_at, updated_at, title, author)
- `sortOrder`: Sort direction (asc, desc)

### Reading Progress Tracking

Track your reading status and progress:

- **Get reading progress**: View current progress on any document
- **Update reading progress**: Set status, percentage, and page numbers
- **Get reading list**: Filter by reading status

Reading statuses:
- `not_started`: Haven't begun reading
- `in_progress`: Currently reading
- `completed`: Finished reading

### Video Features

Access and interact with videos saved in your Readwise Reader:

#### Video Listing and Details

- **List all videos**: Browse videos from YouTube, Vimeo, and other platforms
- **Get video details with transcript**: Access complete metadata and time-synced transcripts

#### Video Highlights

- **Create highlight with timestamp**: Mark important moments in videos
- **Get video highlights**: Retrieve all highlights for a video, sorted by timestamp

#### Video Playback Position

- **Update playback position**: Save your current position for later resuming
- **Get playback position**: Resume where you left off

#### How Transcript Access Works

The video transcript feature:
1. Extracts the time-synced transcript from the video's HTML content
2. Parses timestamp and text pairs
3. Returns transcript as an array of segments with timestamps

This allows you to:
- Search for specific content within videos
- Create highlights at precise moments
- Jump directly to important points
- Reference video content with exact time context

### Content Management

Save, update, and delete content:

- **Save new content**: Add URLs, articles, or custom content to your library
- **Update document**: Modify title, author, summary, tags, and more
- **Delete document**: Remove content (with safety confirmation)

### Bulk Operations

Efficiently manage multiple documents at once:

- **Bulk save**: Save multiple URLs/content items
- **Bulk update**: Update multiple documents
- **Bulk delete**: Remove multiple documents
- **Bulk tag**: Apply tags to multiple documents

#### Safety Confirmations

All bulk operations and deletions require explicit confirmation to prevent accidental data loss:

- **Single document deletion**: Requires confirmation parameter
- **Bulk operations**: Require specific confirmation strings

These confirmations act as a "human in the loop" safety mechanism.

### API Status

Check the API status and rate limit information at any time.

## Available Tools

The server provides 30 tools for interacting with your Readwise library:

### Core Tools
- **get_highlights**: Retrieve highlights with filtering and pagination
- **get_books**: Get books from your library
- **get_documents**: Get documents from your library
- **search_highlights**: Search for highlights by query
- **get_tags**: List all tags in your library
- **get_recent_content**: Get recently saved content

### Tag Management
- **document_tags**: Get, update, add, or remove tags on a document
- **bulk_tags**: Apply tags to multiple documents

### Reading Progress
- **get_reading_progress**: Get progress on a specific document
- **update_reading_progress**: Update reading status and progress
- **get_reading_list**: Get documents filtered by reading status

### Highlight Management
- **create_highlight**: Create a new highlight
- **update_highlight**: Modify an existing highlight
- **delete_highlight**: Remove a highlight
- **create_note**: Add a note to a highlight

### Search Tools
- **advanced_search**: Powerful multi-parameter search
- **search_by_tag**: Find content by tags
- **search_by_date**: Find content by date range

### Video Tools
- **get_videos**: List videos in your library
- **get_video**: Get video details with transcript
- **create_video_highlight**: Create highlight with timestamp
- **get_video_highlights**: Get all highlights for a video
- **update_video_position**: Save playback position
- **get_video_position**: Get saved playback position

### Document Management
- **save_document**: Save new content to library
- **update_document**: Modify document metadata
- **delete_document**: Remove a document

### Bulk Operations
- **bulk_save_documents**: Save multiple documents
- **bulk_update_documents**: Update multiple documents
- **bulk_delete_documents**: Delete multiple documents

## Available Resources

MCP Resources provide direct data access for LLM clients:

- **books** (`readwise://books`): List of books in your Readwise library
- **recent-highlights** (`readwise://highlights/recent`): Recent highlights from your library
- **tags** (`readwise://tags`): List of all tags in your Readwise library

## Available Prompts

- **readwise_highlight**: Process highlights from Readwise
  - Supports summarization, analysis, connection finding, and question generation
  - Includes robust error handling and parameter validation
  - Formats highlights in a reader-friendly way

- **readwise_search**: Search and process highlights from Readwise
  - Provides formatted search results with source information
  - Handles API errors gracefully with user-friendly messages
  - Includes validation for required parameters

## Demo and Testing

The repository includes demo files to help you test and explore functionality:

### Demo Files

- **demo/test-connection.html**: Test basic connection to the server
- **demo/mcp-demo.html**: Comprehensive UI for all features
- **demo/video-features.html**: Specialized interface for video functionality
- **demo/enhanced-transcript-features.html**: Advanced transcript features

### Running Tests

```bash
# Run the full test suite
npm test

# Run automated inspector tests
npm run test-inspector

# Test without a real API key (mock mode)
npm run test-mock
```

### Testing with MCP Inspector

```bash
# Test with stdio transport (default)
./scripts/inspector.sh

# Test with SSE transport
./scripts/inspector.sh -t sse -p 3001

# Enable debug mode
./scripts/inspector.sh -d
```

## Integration

### Claude Desktop

Add to your Claude Desktop config:
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

### Claude Code

Install via CLI:

```bash
claude mcp add readwise-mcp --transport http https://server.smithery.ai/@IAmAlexander/readwise-mcp/mcp
```

Or use the JSON config format:

```json
{
  "mcpServers": {
    "readwise-mcp": {
      "type": "http",
      "url": "https://server.smithery.ai/@IAmAlexander/readwise-mcp/mcp"
    }
  }
}
```

## Deployment

### Smithery

Install via Smithery CLI:
```bash
npx @smithery/cli install @iamalexander/readwise-mcp --client claude
```

Or find it on the [Smithery Registry](https://smithery.ai/server/@IAmAlexander/readwise-mcp).

### Railway (One-Click Deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/readwise-mcp)

1. Click the button above or go to [Railway](https://railway.app)
2. Connect your GitHub repo
3. Add environment variable: `READWISE_API_KEY`
4. Deploy!

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

## Troubleshooting

### Token Issues

If you encounter authentication issues:

1. Verify your Readwise API token is still valid at <https://readwise.io/access_token>
2. Reset authentication by deleting stored credentials:
   ```bash
   rm ~/.readwise-mcp/credentials.json
   ```
3. Restart and try connecting again

### Connection Issues

If the server cannot connect:

1. Ensure the server is running (if manually started)
2. Check that port 3001 is not being used by another application
3. Restart your AI client (Claude Desktop, Cursor, etc.)

### Rate Limiting

The server includes built-in rate limiting. If you encounter rate limit errors:

1. Wait a few minutes before trying again
2. Reduce the frequency of requests
3. Check the rate limit headers in responses

### Video-Specific Issues

1. **Missing transcripts**: Not all videos have transcripts. YouTube videos typically have the best support.
2. **Transcript quality**: Transcripts are from the video platform and may contain errors.
3. **Timestamp inconsistencies**: Different platforms use different formats; the API normalizes when possible.
4. **Playback position not updating**: Ensure both `position` and `duration` parameters are provided.

## Privacy & Security

- Your Readwise API token is stored securely on your local machine
- Your Readwise data is only accessed when explicitly requested
- No data is permanently stored on the MCP server
- Safety confirmations prevent accidental data loss

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

### Project Structure

- **src/**: Main source code
- **test-scripts/**: Test scripts and utilities
- **examples/**: Example implementations
- **demo/**: Interactive HTML demos
- **tests/**: Test suites

## Contributing

Found a bug? Have an idea for a feature? Want to make this MCP server even more awesome? Contributions are welcome and encouraged!

### How to Contribute

1. **Fork this repo** (preferably while sipping your beverage of choice)
2. **Create your feature branch** (`git checkout -b feature/my-amazing-idea`)
3. **Write some vibes-optimized code** (RGB comments optional but appreciated)
4. **Commit your changes** (`git commit -m 'Add mind-blowing feature'`)
5. **Push to the branch** (`git push origin feature/my-amazing-idea`)
6. **Open a Pull Request** and wait for the dopamine hit when it gets merged

All contributions, big or small, practical or whimsical, are valued!

## License

MIT License

Copyright (c) 2023 Alexander

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.