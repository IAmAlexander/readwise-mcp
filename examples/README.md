# MCP Server Examples

This directory contains example implementations and utilities for the Model Context Protocol (MCP) servers.

## Contents

### Main Examples

- **run-inspector.ts**: Script to run the MCP server through the MCP Inspector for testing
- **fixed-readwise-server.ts**: Complete implementation of the Readwise MCP server
- **run-fixed-readwise-server.ts**: Runner script for the fixed Readwise MCP server

### MCP Implementations (examples/mcp-implementations)

- **basic-mcp-test.ts**: Minimal MCP test server showing basic configuration
- **fixed-basic-handler.js**: Simple MCP server with echo tool implementation

### Test Clients (examples/test-clients)

- **test-mcp-client.ts**: Client-side test script for interacting with the MCP server

## Usage

The examples are provided for reference and learning. You can run these examples to understand how MCP servers work.

### Running the Fixed Readwise Server

```bash
# Compile TypeScript first
npx tsc

# Run the server
node dist/examples/run-fixed-readwise-server.js
```

### Running with MCP Inspector

```bash
# Compile TypeScript first
npx tsc

# Run with Inspector
node dist/examples/run-inspector.js
``` 