# MCP Server Testing

This directory contains the testing infrastructure for the Readwise MCP server implementation. The tests ensure that the server properly supports both stdio and SSE transports, and that the echo tool functions correctly.

## Key Improvements

1. **Enhanced Port Management**
   - Robust cleanup functions that ensure ports are free before starting tests
   - Dynamic port allocation when default ports are unavailable
   - Proper wait times (3 seconds) for OS to release ports
   - Verification that ports are actually free

2. **Improved Tool Execution**
   - Added timeout handling for tool execution to prevent hanging
   - Implemented proper MCP error reporting format with `isError: true`
   - Enhanced logging and troubleshooting

3. **Better Server Health Checking**
   - Health endpoint monitoring with timeout and retries
   - Server startup confirmation through HTTP health checks
   - Logging of health status for easier debugging

4. **Process Management**
   - Signal handling for proper cleanup on process termination
   - Tracking of server PIDs for reliable process management
   - Multiple cleanup attempts with verification

## Test Scripts

### 1. `smart-mcp-test.sh`
Main test script that verifies both stdio and SSE transports in sequence:
- Cleans up before tests
- Verifies transport health
- Performs basic server health checks
- Logs all output for debugging

### 2. `test-echo-tool.sh`
Specialized test for the echo tool with stdio transport:
- Tests the echo tool with specific messages
- Implements timeout handling to avoid hanging
- Verifies message response integrity

### 3. `test-sse-mode.sh`
Specialized test for the SSE transport:
- Tests server startup in SSE mode
- Verifies echo tool works with SSE transport
- Implements health checking and timeouts

### 4. `run-simple-server.sh`
Helper script to start the server in a specific transport mode:
- Supports both stdio and SSE transports
- Implements port cleanup and verification
- Handles process management and cleanup on exit

## Running Tests

```bash
# Run comprehensive test for both transports
./smart-mcp-test.sh

# Test just the echo tool
./test-echo-tool.sh

# Test just the SSE transport
./test-sse-mode.sh
```

## MCP Protocol Compliance

These tests follow MCP best practices:

1. **Port Management**: Following the MCP guide recommendation of waiting 3 seconds for OS to release ports
2. **Error Handling**: Using the proper error format with `isError: true` as specified in MCP docs
3. **Transport Testing**: Testing both stdio (port 3001) and SSE (port 3000) as per conventions
4. **Health Verification**: Using HTTP health endpoints rather than tool calls for server status

## Main Test Scripts

- **smart-mcp-test.sh**: Main test script for validating MCP server functionality with both stdio and SSE transports
- **run-simple-server.sh**: Script to run a simple MCP server for testing
- **simple-readwise-server.js**: A simplified MCP server implementation used for testing
- **test-readwise-mcp.sh**: Comprehensive test script for the Readwise MCP server

## Additional Test Utilities

- **fixed-test-mcp.ts**: Fixed test script for the MCP server that follows proper initialization patterns
- **mcp-test.js**: Test script with SSE transport support and inspector integration
- **mcp-test.ts**: Original TypeScript test script with SSE transport support and inspector integration (contains linter errors that need fixes)
- **test-mcp.ts**: Simple server test script for quick verification
- **test-mock-mcp.ts**: Test script using a mock API implementation that doesn't require a real API key

## Notes on TypeScript Test Scripts

Some of the TypeScript test scripts (particularly `mcp-test.ts`) contain linter errors related to module imports and type definitions. If you want to use these scripts:

1. Ensure all dependencies are properly installed
2. Update import paths to match your project structure
3. Fix any type definition issues before compiling 