#!/bin/bash

# Common utilities for test scripts

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if a port is in use
is_port_in_use() {
  local port=$1
  if lsof -i ":$port" > /dev/null 2>&1; then
    return 0  # port is in use
  else
    return 1  # port is free
  fi
}

# Check if specified ports are available
check_ports_available() {
  local port_status="ok"
  
  if is_port_in_use 3000; then
    echo -e "${RED}Port 3000 is already in use${NC}"
    port_status="busy"
  else
    echo -e "${GREEN}Port 3000 is available${NC}"
  fi
  
  if is_port_in_use 3001; then
    echo -e "${RED}Port 3001 is already in use${NC}"
    port_status="busy"
  else
    echo -e "${GREEN}Port 3001 is available${NC}"
  fi
  
  if [ "$port_status" = "busy" ]; then
    return 1
  else
    return 0
  fi
}

# Kill process using a specific port
kill_process_on_port() {
  local port=$1
  local pid=$(lsof -t -i:$port 2>/dev/null)
  
  if [ -n "$pid" ]; then
    echo "Killing process $pid on port $port"
    kill -15 $pid 2>/dev/null || kill -9 $pid 2>/dev/null
    sleep 1
  fi
}

# Clean up processes on both ports
cleanup() {
  echo "Cleaning up processes..."
  kill_process_on_port 3000
  kill_process_on_port 3001
  sleep 1
  
  # Additional cleanup for any node processes related to MCP
  local pids=$(ps aux | grep '[n]ode.*mcp' | awk '{print $2}')
  if [ -n "$pids" ]; then
    echo "Killing additional node processes related to MCP"
    for pid in $pids; do
      kill -15 $pid 2>/dev/null || kill -9 $pid 2>/dev/null
    done
  fi
}

# Format JSON for display
format_json() {
  if command -v jq >/dev/null 2>&1; then
    echo "$1" | jq -C '.'
  else
    echo "$1"
  fi
}