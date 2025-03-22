#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

# Smart MCP Server Test Script
# Focused on direct, reliable testing with detailed logging

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create log file with timestamp
timestamp=$(date +%Y%m%d_%H%M%S)
log_file="smart-mcp-test-${timestamp}.log"
touch $log_file

# Redirect stdout and stderr to the log file and console
exec > >(tee -a "$log_file") 2>&1

# Function to log messages with timestamp
log() {
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1"
}

# Function to clean up processes and check ports
cleanup() {
    log "Cleaning up processes and checking ports..."
    
    # Kill any processes running our server
    pkill -f "simple-readwise-server.js" || true
    
    # Kill any mcp-cli processes
    pkill -f "mcp-cli" || true
    
    # Kill any processes on our ports
    for port in 3000 3001; do
        if lsof -ti :$port > /dev/null 2>&1; then
            log "Killing processes on port $port"
            lsof -ti :$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    # Wait for OS to release ports
    sleep 3
    
    # Check if ports are free
    for port in 3000 3001; do
        if lsof -ti :$port > /dev/null 2>&1; then
            log "ERROR: Port $port is still in use after cleanup."
            return 1
        else
            log "Port $port is free."
        fi
    done
    
    return 0
}

# Function to wait for server to be ready
wait_for_server() {
    local port=$1
    local max_attempts=10
    local attempt=1
    
    log "Waiting for server to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$port/health > /dev/null 2>&1; then
            log "Server is ready on port $port"
            return 0
        fi
        
        log "Attempt $attempt: Server not ready yet on port $port, waiting..."
        sleep 1
        ((attempt++))
    done
    
    log "ERROR: Server failed to start on port $port after $max_attempts attempts"
    return 1
}

# Run cleanup only once at the end
cleanup_done=false

# Custom exit trap handler
custom_exit() {
    if [ "$cleanup_done" = "false" ]; then
        cleanup
        cleanup_done=true
    fi
}

# Set the trap for script exit
trap custom_exit EXIT

# Check if mcp-cli is installed
if ! command -v mcp-cli &> /dev/null; then
    log "ERROR: mcp-cli is not installed."
    log "Please install it using: npm install -g @modelcontextprotocol/cli"
    exit 1
else
    log "mcp-cli is installed."
fi

# Clean up before starting tests
if ! cleanup; then
    log "Failed to clean up properly. Exiting."
    exit 1
fi

# Test 1: Run with stdio transport
log "======== TEST 1: STDIO TRANSPORT ========"

# Start server in background with stdio transport
log "Starting server with stdio transport..."
./run-simple-server.sh --stdio > stdio_output.log 2>&1 &
server_pid=$!

# Give it a moment to start
sleep 2

# Check if server process is still running
if ! ps -p $server_pid > /dev/null; then
    log "ERROR: Server process died. Check stdio_output.log for details."
    cat stdio_output.log
    exit 1
fi

log "Server started with PID $server_pid"
log "Server output:"
cat stdio_output.log

# Test by accessing health endpoint
log "Checking server health endpoint..."
if curl -s http://localhost:3001/health > health_stdio.json; then
    log "Server health check passed"
    log "Health endpoint response:"
    cat health_stdio.json
else
    log "ERROR: Server health check failed"
    exit 1
fi

# Kill the server process
log "Terminating STDIO server..."
kill $server_pid 2>/dev/null || true
sleep 2
cleanup

# Test 2: Run with SSE transport (for MCP Inspector)
log "======== TEST 2: SSE TRANSPORT ========"

# Start server with SSE transport on port 3000
log "Starting server with SSE transport on port 3000..."
./run-simple-server.sh --sse > sse_output.log 2>&1 &
server_pid=$!

# Wait for server to be ready (checking health endpoint)
if ! wait_for_server 3000; then
    log "ERROR: Server with SSE transport failed to start."
    log "Server output:"
    cat sse_output.log
    exit 1
fi

log "SSE Server started with PID $server_pid"
log "Server output:"
cat sse_output.log

# Test by accessing health endpoint
log "Checking server health endpoint..."
if curl -s http://localhost:3000/health > health_sse.json; then
    log "Server health check passed"
    log "Health endpoint response:"
    cat health_sse.json
else
    log "ERROR: Server health check failed"
    exit 1
fi

# Final cleanup
log "Terminating SSE server..."
kill $server_pid 2>/dev/null || true

# Mark cleanup as done (will be done by trap)
cleanup_done=true

log "All tests passed successfully."
exit 0