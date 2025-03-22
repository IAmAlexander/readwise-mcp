#!/bin/bash
set -e

# Generate a timestamp for the log file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="smart-mcp-test-${TIMESTAMP}.log"

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

# Enhanced cleanup function with thorough port and process management
cleanup() {
    echo "Cleaning up processes and checking ports..." | tee -a "$LOG_FILE"
    
    # Kill any processes running our server scripts
    pkill -f "simple-readwise-server.js" 2>/dev/null || true
    pkill -f "mcp-cli" 2>/dev/null || true
    
    # Kill any processes on our ports
    for port in ${STDIO_PORT:-3001} ${SSE_PORT:-3000}; do
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
    done
    
    # Wait for OS to release ports (recommended 3 seconds in MCP docs)
    echo "Waiting for OS to release ports..." | tee -a "$LOG_FILE"
    sleep 3
    
    # Check if ports are free
    for port in ${STDIO_PORT:-3001} ${SSE_PORT:-3000}; do
        if lsof -ti :$port > /dev/null 2>&1; then
            echo "ERROR: Port $port is still in use after cleanup. Attempting force kill..." | tee -a "$LOG_FILE"
            lsof -ti :$port | xargs kill -9 2>/dev/null || true
            sleep 2
            
            if lsof -ti :$port > /dev/null 2>&1; then
                echo "ERROR: Port $port is still in use after force kill. Test may fail." | tee -a "$LOG_FILE"
                return 1
            else
                echo "Port $port successfully freed after force kill." | tee -a "$LOG_FILE"
            fi
        else
            echo "Port $port is free." | tee -a "$LOG_FILE"
        fi
    done
    
    echo "Cleanup completed successfully." | tee -a "$LOG_FILE"
    return 0
}

# Server health check function with timeout
wait_for_server() {
    local port=$1
    local max_attempts=${2:-10}
    local attempt=1
    
    echo "Waiting for server to be ready on port $port..." | tee -a "$LOG_FILE"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            echo "Server is ready on port $port" | tee -a "$LOG_FILE"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts: Server not ready yet, waiting..." | tee -a "$LOG_FILE"
        sleep 1
        ((attempt++))
    done
    
    echo "ERROR: Server failed to start after $max_attempts attempts" | tee -a "$LOG_FILE"
    return 1
}

# Function to test a server transport
test_transport() {
    local transport=$1
    local port=$2
    local health_file=$3
    
    echo "" | tee -a "$LOG_FILE"
    echo "======================================" | tee -a "$LOG_FILE"
    echo "Testing $transport transport on port $port" | tee -a "$LOG_FILE"
    echo "======================================" | tee -a "$LOG_FILE"
    
    # Start server with specified transport
    if [ "$transport" == "stdio" ]; then
        echo "Starting server in $transport mode on port $port..." | tee -a "$LOG_FILE"
        ./run-simple-server.sh --$transport --port $port > "${transport}_output.log" 2>&1 &
        SERVER_PID=$!
    else
        echo "Starting server in $transport mode on port $port..." | tee -a "$LOG_FILE"
        MCP_INSPECTOR=true ./run-simple-server.sh --$transport --port $port > "${transport}_output.log" 2>&1 &
        SERVER_PID=$!
    fi
    
    # Wait for server to be ready with timeout
    if ! wait_for_server $port; then
        echo "ERROR: Server failed to start in $transport mode" | tee -a "$LOG_FILE"
        cat "${transport}_output.log" | tee -a "$LOG_FILE"
        return 1
    fi
    
    # Test health endpoint and save response
    echo "Testing health endpoint for $transport mode" | tee -a "$LOG_FILE"
    if ! curl -s "http://localhost:$port/health" -o "$health_file"; then
        echo "ERROR: Health check failed for $transport mode" | tee -a "$LOG_FILE"
        return 1
    fi
    
    echo "Health check response saved to $health_file" | tee -a "$LOG_FILE"
    cat "$health_file" | tee -a "$LOG_FILE"
    
    # Test completed successfully
    echo "$transport transport test completed successfully" | tee -a "$LOG_FILE"
    return 0
}

# Main test execution
main() {
    echo "Starting MCP server tests at $(date)" | tee -a "$LOG_FILE"
    echo "Logs will be saved to $LOG_FILE" | tee -a "$LOG_FILE"
    
    # Clean up before tests
    if ! cleanup; then
        echo "Initial cleanup failed, attempting to use dynamic ports" | tee -a "$LOG_FILE"
        STDIO_PORT=$(find_available_port 3001)
        SSE_PORT=$(find_available_port 3000)
        echo "Using dynamic ports: STDIO=$STDIO_PORT, SSE=$SSE_PORT" | tee -a "$LOG_FILE"
    else
        # Use default ports if cleanup succeeded
        STDIO_PORT=3001
        SSE_PORT=3000
    fi
    
    # Verify mcp-cli is installed
    if ! command -v mcp-cli > /dev/null; then
        echo "ERROR: mcp-cli not found. Please install it with 'npm install -g @modelcontextprotocol/cli'" | tee -a "$LOG_FILE"
        exit 1
    else
        echo "mcp-cli is installed" | tee -a "$LOG_FILE"
    fi
    
    # Test STDIO transport
    if ! test_transport "stdio" "$STDIO_PORT" "health_stdio.json"; then
        echo "STDIO transport test failed" | tee -a "$LOG_FILE"
        cleanup
        exit 1
    fi
    
    # Clean up after STDIO test
    cleanup
    
    # Test SSE transport
    if ! test_transport "sse" "$SSE_PORT" "health_sse.json"; then
        echo "SSE transport test failed" | tee -a "$LOG_FILE"
        cleanup
        exit 1
    fi
    
    # Clean up after all tests
    cleanup
    
    echo "" | tee -a "$LOG_FILE"
    echo "============================" | tee -a "$LOG_FILE"
    echo "All tests completed successfully!" | tee -a "$LOG_FILE"
    echo "============================" | tee -a "$LOG_FILE"
}

# Run the tests
main 