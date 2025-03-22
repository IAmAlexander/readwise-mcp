#!/bin/bash
set -e

# Generate a timestamp for the log file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="echo-test-${TIMESTAMP}.log"

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

# Test echo tool with stdio transport
test_echo_stdio() {
    local message=$1
    
    log "Starting server in stdio mode..."
    ./run-simple-server.sh --stdio > stdio_server.log 2>&1 &
    local server_pid=$!
    
    # Wait for server to start
    sleep 5
    
    if ! ps -p $server_pid > /dev/null; then
        log "ERROR: Server process died"
        cat stdio_server.log
        return 1
    fi
    
    log "Testing echo tool with message: $message"
    local echo_cmd="mcp-cli call-tool \"node --experimental-specifier-resolution=node ./simple-readwise-server.js\" echo '{\"message\": \"$message\"}'"
    local echo_output=$(run_with_timeout 10 "$echo_cmd")
    local echo_status=$?
    
    # Kill server
    kill $server_pid 2>/dev/null || true
    
    # Check result
    if [ $echo_status -ne 0 ]; then
        log "Echo tool test failed: Command timed out or failed"
        return 1
    fi
    
    if [[ "$echo_output" == *"$message"* ]]; then
        log "Echo tool test passed: Got expected response"
        echo "$echo_output"
        return 0
    else
        log "Echo tool test failed: Unexpected response"
        log "Expected to find: $message"
        log "Got: $echo_output"
        return 1
    fi
}

# Main test execution
main() {
    log "Starting echo tool test at $(date)"
    
    # Clean up before test
    cleanup
    
    # Verify mcp-cli is installed
    if ! command -v mcp-cli > /dev/null; then
        log "ERROR: mcp-cli not found. Please install it with 'npm install -g @modelcontextprotocol/cli'"
        exit 1
    else
        log "mcp-cli is installed"
    fi
    
    # Test stdio transport with echo tool
    if ! test_echo_stdio "Hello from echo test"; then
        log "STDIO Echo tool test failed"
        cleanup
        exit 1
    fi
    
    # Final cleanup
    cleanup
    
    log "All echo tool tests passed successfully!"
}

# Run the tests
main 