#!/bin/bash

# Test script for Readwise MCP server features
# This script tests the core Readwise features by:
# 1. Starting the MCP server with stdio transport
# 2. Testing various Readwise tools
# 3. Verifying API responses

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Import common utilities
source "$SCRIPT_DIR/../common/utils.sh"
source "$SCRIPT_DIR/../common/server-utils.sh"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Define server port
SERVER_PORT=3001

# Cleanup on exit
trap cleanup EXIT

echo "=== Readwise MCP Features Test ==="
echo "Starting test on $(date)"

# Ensure ports are free
cleanup
sleep 1
check_ports_available

# Start MCP server
echo -e "${YELLOW}Starting MCP server on port $SERVER_PORT (stdio transport)...${NC}"
start_server_stdio $SERVER_PORT
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to be ready..."
wait_for_server_ready $SERVER_PORT 30
if [ $? -ne 0 ]; then
  echo -e "${RED}Server failed to start within timeout period${NC}"
  exit 1
fi

echo -e "${GREEN}Server started successfully${NC}"

# Test server health
check_server_health $SERVER_PORT

# Test 1: Test get_books tool
echo -e "\n${YELLOW}Testing get_books tool...${NC}"
execute_tool $SERVER_PORT "get_books" '{"page": 1, "page_size": 5}'

# Test 2: Test get_tags tool (if available)
echo -e "\n${YELLOW}Testing get_tags tool...${NC}"
execute_tool $SERVER_PORT "get_tags" '{}'

# Test 3: Test get_highlights tool
echo -e "\n${YELLOW}Testing get_highlights tool...${NC}"
execute_tool $SERVER_PORT "get_highlights" '{"page": 1, "page_size": 5}'

# Test 4: Test get_documents tool
echo -e "\n${YELLOW}Testing get_documents tool...${NC}"
execute_tool $SERVER_PORT "get_documents" '{"page": 1, "page_size": 5}'

# Test 5: Test advanced_search tool (if available)
echo -e "\n${YELLOW}Testing advanced_search tool...${NC}"
execute_tool $SERVER_PORT "advanced_search" '{"query": "learning", "page": 1, "page_size": 5}'

# Terminate server
echo -e "\n${YELLOW}Terminating server...${NC}"
kill -TERM $SERVER_PID
wait $SERVER_PID 2>/dev/null || true
echo -e "${GREEN}Server terminated${NC}"

# Final cleanup
cleanup
echo -e "\n${GREEN}Test completed on $(date)${NC}"