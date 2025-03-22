#!/bin/bash

# Run the simple Readwise MCP server
# Usage: ./run-simple-server.sh [--sse|--stdio] [--port=PORT]

# Set default mode to stdio
MODE="stdio"
DEFAULT_STDIO_PORT=3001
DEFAULT_SSE_PORT=3000
PORT=""
SERVER_PID=""

# Trap signals for proper cleanup
trap cleanup_exit SIGINT SIGTERM EXIT

# Function to cleanup on exit
cleanup_exit() {
    echo "Cleaning up before exit..."
    
    # Kill server process if running
    if [ -n "$SERVER_PID" ] && ps -p $SERVER_PID > /dev/null; then
        echo "Killing server process $SERVER_PID"
        kill $SERVER_PID 2>/dev/null || true
        sleep 1
        kill -9 $SERVER_PID 2>/dev/null || true
    fi
    
    # Free port
    if [ -n "$PORT" ]; then
        echo "Freeing port $PORT"
        lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
    fi
    
    echo "Cleanup complete"
    exit 0
}

# Function to cleanup port
cleanup_port() {
    local port=$1
    echo "Checking if port $port is in use..."
    
    if lsof -ti :$port > /dev/null 2>&1; then
        echo "Port $port is in use. Attempting to free it..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        
        # Wait for OS to release port (recommended 3 seconds in MCP docs)
        echo "Waiting for OS to release port..."
        sleep 3
        
        # Check again
        if lsof -ti :$port > /dev/null 2>&1; then
            echo "ERROR: Port $port is still in use after cleanup."
            return 1
        else
            echo "Port $port successfully freed."
        fi
    else
        echo "Port $port is free."
    fi
    
    return 0
}

# Function to find an available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while netstat -an | grep -q ":$port .*LISTEN"; do
        port=$((port + 1))
        if [ $port -gt $((start_port + 100)) ]; then
            echo "ERROR: Could not find an available port within range $start_port-$((start_port + 100))" >&2
            return 1
        fi
    done
    
    echo $port
}

# Parse arguments
for arg in "$@"; do
  case $arg in
    --sse)
      MODE="sse"
      shift
      ;;
    --stdio)
      MODE="stdio"
      shift
      ;;
    --port=*)
      PORT="${arg#*=}"
      shift
      ;;
    *)
      # If it's a number, assume it's a port
      if [[ $arg =~ ^[0-9]+$ ]]; then
        PORT=$arg
      fi
      ;;
  esac
done

# Set the right port if not provided
if [ -z "$PORT" ]; then
  if [ "$MODE" = "sse" ]; then
    PORT=$DEFAULT_SSE_PORT
  else
    PORT=$DEFAULT_STDIO_PORT
  fi
fi

# Clean up the port
if ! cleanup_port $PORT; then
    echo "WARNING: Unable to free port $PORT, attempting to find an available port..."
    PORT=$(find_available_port $PORT)
    if [ $? -ne 0 ]; then
        echo "ERROR: Cannot find an available port. Exiting."
        exit 1
    fi
    echo "Using port $PORT instead."
fi

# Set environment variables based on mode
if [ "$MODE" = "sse" ]; then
  export MCP_INSPECTOR=true
else
  unset MCP_INSPECTOR
fi

# Export port for the server to use
export MCP_PORT=$PORT

echo "Starting server in $MODE mode on port $PORT"

# Execute the server with the specified mode and port
node --experimental-specifier-resolution=node ./simple-readwise-server.js --port=$PORT &
SERVER_PID=$!

echo "Server running with PID $SERVER_PID. Press Ctrl+C to stop."

# Wait for server process to finish
wait $SERVER_PID