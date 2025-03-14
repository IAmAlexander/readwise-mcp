#!/bin/bash

# Kill any running Node.js processes
pkill -f "node"

# Start the Readwise MCP server
echo "Starting Readwise MCP server..."
npm run simple &
SERVER_PID=$!

# Wait for the server to start
sleep 3

# Set environment variables for the MCP Inspector
export MCP_PROXY_PORT=3001
export MCP_SERVER_PORT=3001
export MCP_CLIENT_PORT=5174
export NODE_OPTIONS="--no-warnings"

# Start the MCP Inspector
echo "Starting MCP Inspector..."
npx @modelcontextprotocol/inspector@0.6.0

# Clean up
kill $SERVER_PID 