# Readwise MCP Server

This is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [Readwise](https://readwise.io), allowing AI assistants to access your saved articles, books, highlights, and documents.

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
- **Rate Limiting**: Smart handling of API limits to prevent throttling

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

2. **Configure in Claude Desktop**:
   Add the following to your Claude Desktop configuration:

   ```json
   {
     "mcpServers": {
       "readwise": {
         "command": "npx",
         "args": [
           "@iamalexander/readwise-mcp"
         ]
       }
     }
   }
   ```

3. **First Run Authentication**:
   - When you first use the Readwise integration in Claude, you'll be prompted to enter your Readwise API token
   - The token will be securely stored for future use

### Docker Support

If you prefer using Docker:

1. **Create config directory**:

   ```bash
   mkdir -p ~/.readwise-mcp
   ```

2. **Usage with Docker**:

   ```json
   {
     "mcpServers": {
       "readwise": {
         "command": "docker",
         "args": [
           "run",
           "-i",
           "--rm",
           "-v",
           "~/.readwise-mcp:/app/config",
           "-p",
           "3000:3000",
           "iamalexander/readwise-mcp"
         ]
       }
     }
   }
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

## Feature Documentation

### Basic Features

#### Browsing Content
- List books and articles: `GET /books`
- Get highlights: `GET /highlights`
- Search content: `GET /search?query=your_search_term`
- Get recent content: `GET /recent?limit=10`

### Tag Management

Organize your content with tags:

- **List all tags**: `GET /tags`
- **Get tags for a document**: `GET /document/{document_id}/tags`
- **Update all tags for a document**: `PUT /document/{document_id}/tags`
  ```json
  {
    "tags": ["important", "ai", "research"]
  }
  ```
- **Add a specific tag**: `POST /document/{document_id}/tags/{tag}`
- **Remove a specific tag**: `DELETE /document/{document_id}/tags/{tag}`

### Advanced Search

Powerful filtering options:

```
GET /search/advanced?query=machine+learning&tags=ai,research&author=Smith&dateFrom=2023-01-01&dateTo=2023-12-31&sortBy=created_at&sortOrder=desc
```

Parameters:
- `query`: Search text
- `category`: Filter by content type (book, article, etc.)
- `tags`: Comma-separated list of tags
- `author`: Filter by author
- `title`: Filter by title
- `location`: Filter by location (new, later, archive, feed)
- `dateFrom` & `dateTo`: Date range in ISO 8601 format
- `sortBy`: Field to sort by (created_at, updated_at, title, author)
- `sortOrder`: Sort direction (asc, desc)
- `withHtmlContent`: Include HTML content in results (true/false)

### Reading Progress Tracking

Track your reading status and progress:

- **Get reading progress**: `GET /document/{document_id}/progress`
- **Update reading progress**: `PUT /document/{document_id}/progress`
  ```json
  {
    "status": "in_progress",
    "percentage": 45,
    "current_page": 112,
    "total_pages": 250
  }
  ```
- **Get reading list**: `GET /reading-list?status=in_progress`

Reading statuses:
- `not_started`: Haven't begun reading
- `in_progress`: Currently reading
- `completed`: Finished reading

### Content Management

Save, update, and delete content:

- **Save new content**: `POST /save`
  ```json
  {
    "url": "https://example.com/article",
    "title": "Optional title override",
    "tags": ["ai", "research"]
  }
  ```
- **Update document**: `PATCH /update/{document_id}`
  ```json
  {
    "title": "New title",
    "author": "New author"
  }
  ```
- **Delete document**: `DELETE /delete/{document_id}?confirm=yes`
  - **Safety feature**: Requires `confirm=yes` parameter to prevent accidental deletion

### Bulk Operations

Efficiently manage multiple documents at once:

- **Bulk save**: `POST /bulk/save`
  ```json
  {
    "items": [
      { "url": "https://example.com/article1", "tags": ["ai"] },
      { "url": "https://example.com/article2", "tags": ["research"] }
    ],
    "confirmation": "I confirm saving these items"
  }
  ```

- **Bulk update**: `POST /bulk/update`
  ```json
  {
    "updates": [
      { "document_id": "123", "title": "New Title 1" },
      { "document_id": "456", "tags": ["updated", "important"] }
    ],
    "confirmation": "I confirm these updates"
  }
  ```

- **Bulk delete**: `POST /bulk/delete`
  ```json
  {
    "document_ids": ["123", "456", "789"],
    "confirmation": "I confirm deletion of these documents"
  }
  ```

- **Bulk tag**: `POST /bulk/tag`
  ```json
  {
    "document_ids": ["123", "456"],
    "tags": ["important", "reference"],
    "replace_existing": false,
    "confirmation": "I confirm these tag changes"
  }
  ```

#### Safety Confirmations

All bulk operations and deletions require explicit confirmation to prevent accidental data loss:

- **Single document deletion**: Requires `confirm=yes` query parameter
- **Bulk save**: Requires `"confirmation": "I confirm saving these items"`
- **Bulk update**: Requires `"confirmation": "I confirm these updates"`
- **Bulk delete**: Requires `"confirmation": "I confirm deletion of these documents"`
- **Bulk tag**: Requires `"confirmation": "I confirm these tag changes"`

These confirmations act as a "human in the loop" safety mechanism to prevent unintended changes to your Readwise library.

### API Status

Check the API status and rate limit information:

- **Get status**: `GET /status`

## Troubleshooting

### Token Issues

If you encounter authentication issues:

1. Verify your Readwise API token is still valid by checking at <https://readwise.io/access_token>
2. For manual installation, you can reset the authentication by deleting the stored credentials:

   ```bash
   rm ~/.readwise-mcp/credentials.json
   ```

3. Restart Claude and try connecting again

### Connection Issues

If Claude cannot connect to the Readwise server:

1. Ensure the server is running (if manually started)
2. Check that port 3000 is not being used by another application
3. Restart Claude Desktop

### Rate Limiting

The server includes built-in rate limiting to prevent hitting Readwise API limits. If you encounter rate limit errors:

1. Wait a few minutes before trying again
2. Reduce the frequency of requests
3. Check the rate limit headers in the response for more information

## Privacy & Security

- Your Readwise API token is stored securely in your local machine
- Your Readwise data is only accessed when explicitly requested
- No data is permanently stored on the MCP server
- Safety confirmations prevent accidental data loss

## Development

To run this server locally for development:

```bash
# Clone the repository
git clone https://github.com/IAmAlexander/readwise-mcp.git
cd readwise-mcp

# Install dependencies
npm install

# Start the server
npm start
```

The server will be available at `http://localhost:3000`.

## Contributing

Found a bug? Have an idea for a feature? Want to make this MCP server even more awesome? Contributions are welcome and encouraged!

### How to Contribute

1. **Fork this repo** (preferably while sipping your beverage of choice)
2. **Create your feature branch** (`git checkout -b feature/my-amazing-idea`)
3. **Write some vibes-optimized code** (RGB comments optional but appreciated)
4. **Commit your changes** (`git commit -m 'Add mind-blowing feature that will make Claude extremely impressed'`)
5. **Push to the branch** (`git push origin feature/my-amazing-idea`)
6. **Open a Pull Request** and wait for the dopamine hit when it gets merged

All contributions, big or small, practical or whimsical, are valued. Whether you're improving error handling or adding support for tracking how many existential crises your saved philosophy papers have caused Claude, we want to see it!

Remember: There are no bad ideas in brainstorming, only "features we haven't justified to product management yet."

## License

MIT (Modified Imagination Technology) - Just kidding, it's the standard MIT license.

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
