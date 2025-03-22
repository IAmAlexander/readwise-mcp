#!/bin/bash

# Default values
TRANSPORT="stdio"
PORT="3001"
DEBUG=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--transport)
      TRANSPORT="$2"
      shift 2
      ;;
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    -d|--debug)
      DEBUG=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate transport type
if [[ "$TRANSPORT" != "stdio" && "$TRANSPORT" != "sse" ]]; then
  echo "Error: Transport must be either 'stdio' or 'sse'"
  exit 1
fi

# Build command
if [[ "$TRANSPORT" == "stdio" ]]; then
  # For stdio transport
  if [[ "$DEBUG" == true ]]; then
    DEBUG=* node dist/index.js | npx @modelcontextprotocol/inspector
  else
    node dist/index.js | npx @modelcontextprotocol/inspector
  fi
else
  # For SSE transport
  if [[ "$DEBUG" == true ]]; then
    npx @modelcontextprotocol/inspector --transport sse --url "http://localhost:$PORT" --debug
  else
    npx @modelcontextprotocol/inspector --transport sse --url "http://localhost:$PORT"
  fi
fi 