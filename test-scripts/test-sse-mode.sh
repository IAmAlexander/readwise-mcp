#!/bin/bash
set -e

# Generate a timestamp for the log file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="sse-test-${TIMESTAMP}.log"

# Helper function to log with timestamp
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Enhanced cleanup function with thorough port and process management
cleanup() {
    log "Cleaning up processes and checking ports..."
    
    # Kill any processes running our server scripts
    pkill -f "simple-readwise-server.js" 2>/dev/null || true
    pkill -f "mcp-cli" 2>/dev/null || true
    
    # Kill any processes on our ports
    for port in 3000 3001; do
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
    done
    
    # Wait for OS to release ports (recommended 3 seconds in MCP docs)
    log "Waiting for OS to release ports..."
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
    
    log "Cleanup completed successfully."
    return 0
}

# Server health check function with timeout
wait_for_server() {
    local port=$1
    local max_attempts=${2:-15}
    local attempt=1
    
    log "Waiting for server to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            log "Server is ready on port $port"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Server not ready yet, waiting..."
        sleep 1
        ((attempt++))
    done
    
    log "ERROR: Server failed to start after $max_attempts attempts"
    return 1
}

# Function to run a command with timeout
run_with_timeout() {
    local timeout=$1
    local command=$2
    local temp_file=$(mktemp)
    
    log "Running command with $timeout second timeout: $command"
    
    # Start command in background and redirect output to temp file
    eval "$command" > "$temp_file" 2>&1 &
    local pid=$!
    
    # Wait for command to complete with timeout
    local waited=0
    while kill -0 $pid 2>/dev/null; do
        if [ $waited -ge $timeout ]; then
            log "Command timed out after $timeout seconds"
            kill -9 $pid 2>/dev/null || true
            cat "$temp_file"
            rm -f "$temp_file"
            return 1
        fi
        sleep 1
        ((waited++))
    done
    
    # Get exit code and check result
    wait $pid
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        log "Command failed with exit code $exit_code"
        cat "$temp_file"
        rm -f "$temp_file"
        return 1
    fi
    
    # Command succeeded
    cat "$temp_file"
    rm -f "$temp_file"
    return 0
}

# Test SSE transport
test_sse_transport() {
    local message=$1
    local port=3000
    
    log "Starting server in SSE mode on port $port..."
    MCP_INSPECTOR=true ./run-simple-server.sh --sse --port=$port > sse_server.log 2>&1 &
    local server_pid=$!
    
    # Wait for server to be ready with health check
    if ! wait_for_server $port; then
        log "ERROR: Server failed to start in SSE mode"
        cat sse_server.log
        kill $server_pid 2>/dev/null || true
        return 1
    fi
    
    log "Testing echo tool with SSE transport and message: $message"
    local echo_cmd="mcp-cli call-tool \"http://localhost:$port\" echo '{\"message\": \"$message\"}'"
    local echo_output=$(run_with_timeout 15 "$echo_cmd")
    local echo_status=$?
    
    # Kill server
    kill $server_pid 2>/dev/null || true
    
    # Check result
    if [ $echo_status -ne 0 ]; then
        log "SSE transport test failed: Command timed out or failed"
        return 1
    fi
    
    if [[ "$echo_output" == *"$message"* ]]; then
        log "SSE transport test passed: Got expected response"
        echo "$echo_output"
        return 0
    else
        log "SSE transport test failed: Unexpected response"
        log "Expected to find: $message"
        log "Got: $echo_output"
        return 1
    fi
}

# Main test execution
main() {
    log "Starting SSE transport test at $(date)"
    
    # Clean up before test
    cleanup
    
    # Verify mcp-cli is installed
    if ! command -v mcp-cli > /dev/null; then
        log "ERROR: mcp-cli not found. Please install it with 'npm install -g @modelcontextprotocol/cli'"
        exit 1
    else
        log "mcp-cli is installed"
    fi
    
    # Test SSE transport
    if ! test_sse_transport "Hello from SSE test"; then
        log "SSE transport test failed"
        cleanup
        exit 1
    fi
    
    # Final cleanup
    cleanup
    
    log "SSE transport test completed successfully!"
}

# Run the tests
main 