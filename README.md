# Readwise MCP Server

This is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [Readwise](https://readwise.io), allowing AI assistants to access your saved articles, books, highlights, and documents.

## Features

- **Books & Articles**: Browse your collection of saved books and articles
- **Highlights**: Access all your highlighted passages
- **Search**: Find content across your entire Readwise library
- **Recent Content**: Quickly retrieve your latest saved items

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
- "Remind me of that hilarious MCP meme article I read last week"
- "Show me all my saved snippets about adding RGB lighting to my code editor"
- "What were those AI agents I bookmarked that can automatically generate lofi beats while I code?"
- "Find that article about how to convince my product manager that 'vibe-driven development' is a real methodology"
- "What was that post about creating a hackathon project using only ChatGPT, Claude, and excessive amounts of caffeine?"

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

## Privacy & Security

- Your Readwise API token is stored securely in your local machine
- Your Readwise data is only accessed when explicitly requested
- No data is permanently stored on the MCP server

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
