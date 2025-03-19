# Testing and Debugging the Readwise MCP Server

This guide provides instructions for testing and debugging the Readwise MCP server.

## Prerequisites

- Node.js 16.x or 18.x
- npm or yarn
- Git
- Readwise API key

## Testing Tools

The Readwise MCP server includes several testing tools:

1. **MCP Inspector**: An interactive tool for testing MCP servers
2. **Test Scripts**: Custom scripts for testing specific functionality
3. **Jest Tests**: Unit and integration tests

## Using the MCP Inspector

The MCP Inspector is a powerful tool for testing and debugging MCP servers. It provides a graphical interface for interacting with your server, allowing you to:

- View available tools and their parameters
- Execute tools with custom parameters
- View server logs and error messages
- Test server capabilities

### Running the Inspector

To run the MCP Inspector with the Readwise MCP server:

```bash
npm run run-inspector
```

This script will:
1. Start the Readwise MCP server with the SSE transport
2. Launch the MCP Inspector
3. Connect the Inspector to the server

### Inspector Interface

The Inspector interface includes:

- **Server Connection Pane**: Shows the connection status and server information
- **Tools Tab**: Lists all available tools and allows you to execute them
- **Prompts Tab**: Shows available prompts and allows you to test them
- **Resources Tab**: Lists available resources
- **Notifications Pane**: Shows server logs and messages

## Test Scripts

The project includes several test scripts for testing specific functionality:

- `npm run test-mcp`: Tests the MCP server with various tool calls
- `npm run test-mcp-client`: Tests the MCP client functionality
- `npm run mcp-test`: Runs a comprehensive test of all MCP features

## Jest Tests

The project includes Jest tests for unit and integration testing:

- `npm test`: Runs all tests
- `npm run test:watch`: Runs tests in watch mode
- `npm run test:coverage`: Runs tests with coverage reporting
- `npm run test:tags`: Tests tag-related functionality
- `npm run test:search`: Tests search functionality
- `npm run test:bulk`: Tests bulk operations
- `npm run test:progress`: Tests reading progress functionality
- `npm run test:delete`: Tests deletion confirmation

## Debugging

### Server-Side Logging

The Readwise MCP server includes a transport-aware logging system that ensures logs don't interfere with the MCP protocol:

- For stdio transport, logs are sent to stderr
- For SSE transport, logs are sent to console.log

To enable debug logging, set the `debug` flag to `true` in your configuration or use the `--debug` flag when starting the server.

### Common Issues

1. **Connection Errors**: Ensure your server is running and the transport is correctly configured.

2. **Authentication Errors**: Verify your Readwise API key is correct and has the necessary permissions.

3. **Parameter Validation Errors**: Check the parameters you're passing to tools match the expected schema.

4. **Transport Errors**: Ensure you're using the correct transport for your environment (stdio for CLI, SSE for web).

### Debugging Workflow

1. **Start Development**:
   - Launch Inspector with your server
   - Verify basic connectivity
   - Check capability negotiation

2. **Iterative Testing**:
   - Make server changes
   - Rebuild the server
   - Reconnect the Inspector
   - Test affected features
   - Monitor logs

3. **Test Edge Cases**:
   - Invalid inputs
   - Missing parameters
   - Concurrent operations
   - Verify error handling

## Testing in Claude Desktop

To test the Readwise MCP server in Claude Desktop:

1. Configure Claude Desktop to use the Readwise MCP server:
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

2. Start Claude Desktop and verify the connection.

3. Test various queries like:
   - "Find my highlights about 'programming'"
   - "Show me all articles tagged with 'AI'"
   - "What's in my reading list that I haven't started yet?"

## Troubleshooting

### Logs

To view logs:

- **Development**: Logs are printed to the console
- **Claude Desktop**: Logs are captured by Claude Desktop
- **Serverless**: Use the platform-specific logging tools

### Common Errors

1. **"No active SSE connection"**: The server is expecting an SSE connection but none is established.

2. **"Invalid parameters"**: The parameters passed to a tool don't match the expected schema.

3. **"API rate limit exceeded"**: The Readwise API rate limit has been reached. Wait and try again.

4. **"Authentication failed"**: The Readwise API key is invalid or missing.

## Getting Help

If you encounter issues:

1. Check the logs for error messages
2. Review the documentation
3. Open an issue on GitHub
4. Reach out to the MCP community for support 