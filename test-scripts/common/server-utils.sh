#!/bin/bash

# Server utilities for test scripts

# Start server in stdio mode
start_server_stdio() {
  local port=$1
  local log_file="mcp-stdio-server-$port.log"
  
  echo "Starting MCP server on port $port (stdio transport)..."
  echo "Logging to $log_file"
  
  cd "$ROOT_DIR"
  node dist/mcp-cli.js --port $port > "$log_file" 2>&1 &
  echo $! > "server-$port.pid"
  
  return $!
}

# Start server in SSE mode
start_server_sse() {
  local port=$1
  local log_file="mcp-sse-server-$port.log"
  
  echo "Starting MCP server on port $port (SSE transport)..."
  echo "Logging to $log_file"
  
  cd "$ROOT_DIR"
  node dist/mcp-cli.js --port $port --transport sse > "$log_file" 2>&1 &
  echo $! > "server-$port.pid"
  
  return $!
}

# Wait for server to be ready
wait_for_server_ready() {
  local port=$1
  local timeout=${2:-30}
  local start_time=$(date +%s)
  local current_time
  local elapsed_time
  
  echo "Waiting for server on port $port to be ready (timeout: ${timeout}s)..."
  
  while true; do
    current_time=$(date +%s)
    elapsed_time=$((current_time - start_time))
    
    if [ $elapsed_time -ge $timeout ]; then
      echo "Timed out waiting for server to be ready"
      return 1
    fi
    
    if curl -s "http://localhost:$port/health" | grep -q '"status":"ok"'; then
      echo "Server is ready (after ${elapsed_time}s)"
      return 0
    fi
    
    sleep 1
  done
}

# Check server health
check_server_health() {
  local port=$1
  
  echo "Checking server health on port $port..."
  local response=$(curl -s "http://localhost:$port/health")
  
  echo "Health check response:"
  format_json "$response"
  
  if echo "$response" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ Server health check passed${NC}"
    return 0
  else
    echo -e "${RED}❌ Server health check failed${NC}"
    return 1
  fi
}

# Execute tool and check response
execute_tool() {
  local port=$1
  local tool_name=$2
  local params=${3:-"{}"}
  
  echo "Executing tool: $tool_name"
  local response=$(curl -s -X POST "http://localhost:$port/tool/$tool_name" \
    -H "Content-Type: application/json" \
    -d "{\"params\": $params}")
  
  echo "Response from $tool_name tool:"
  format_json "$response"
  
  # Check if the response doesn't contain an error
  if ! echo "$response" | grep -q '"error"' || echo "$response" | grep -q '"result"'; then
    echo -e "${GREEN}✅ $tool_name tool executed successfully${NC}"
    return 0
  else
    echo -e "${RED}❌ $tool_name tool execution failed${NC}"
    return 1
  fi
}