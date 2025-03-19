#!/usr/bin/env node

/**
 * This script tests the Readwise MCP server using a mock API implementation
 * which doesn't require a real Readwise API key.
 */

import { ReadwiseMCPServer } from './src/server';
import { Logger, LogLevel } from './src/utils/logger';
import { MockReadwiseAPI } from './src/api/mock-client';
import { MCPRequest, MCPResponse, ErrorResponse } from './src/types';

// Create a logger that outputs to console
const logger = new Logger({
  level: LogLevel.DEBUG,
  transport: 'stderr',
  timestamps: true,
  colors: true
});

// This will be used to track request/response pairs
let responsesReceived = 0;
const expectedResponses = 7;

logger.info('Starting Readwise MCP server with mock API for testing');

// Create a server with a fake API key
// We'll bypass the actual API calls by mocking them
const server = new ReadwiseMCPServer('fake-api-key', 3000, logger, 'stdio');

// Override the server's handleMCPRequest method to use our mock API
const originalHandleMCPRequest = server.handleMCPRequest.bind(server);
server.handleMCPRequest = function(request, callback) {
  // Create a mock API instance for this request
  const mockAPI = new MockReadwiseAPI();
  
  // Process the request
  // We'll intercept it to use our mock API instead of the real one
  logger.debug(`Processing ${request.type} - ${request.name}`);
  
  if (request.type === 'tool_call') {
    if (request.name === 'get_books') {
      mockAPI.getBooks(request.parameters).then(result => {
        callback({
          result,
          request_id: request.request_id
        });
      }).catch(error => {
        callback({
          error: {
            type: 'transport',
            details: {
              code: 'execution_error',
              message: error.message
            }
          },
          request_id: request.request_id
        });
      });
      return;
    } else if (request.name === 'get_highlights') {
      mockAPI.getHighlights(request.parameters).then(result => {
        callback({
          result,
          request_id: request.request_id
        });
      }).catch(error => {
        callback({
          error: {
            type: 'transport',
            details: {
              code: 'execution_error',
              message: error.message
            }
          },
          request_id: request.request_id
        });
      });
      return;
    } else if (request.name === 'search_highlights') {
      mockAPI.searchHighlights(request.parameters).then(result => {
        callback({
          result,
          request_id: request.request_id
        });
      }).catch(error => {
        callback({
          error: {
            type: 'transport',
            details: {
              code: 'execution_error',
              message: error.message
            }
          },
          request_id: request.request_id
        });
      });
      return;
    }
  }
  
  // Pass through to original for validation and error cases
  originalHandleMCPRequest(request, callback);
};

// Start the server
server.start().then(() => {
  logger.info('Server started successfully');
  
  // Run a series of test requests
  runTests();
}).catch(error => {
  logger.error('Failed to start server', error);
  process.exit(1);
});

/**
 * Simulate a client sending MCP requests to the server
 */
function runTests(): void {
  // Test get_books tool
  sendRequest({
    type: 'tool_call',
    name: 'get_books',
    parameters: { page: 1, page_size: 10 },
    request_id: 'test-1'
  });
  
  // Test get_highlights tool
  sendRequest({
    type: 'tool_call',
    name: 'get_highlights',
    parameters: { book_id: 'book-1' },
    request_id: 'test-2'
  });
  
  // Test search_highlights tool
  sendRequest({
    type: 'tool_call',
    name: 'search_highlights',
    parameters: { query: 'code' },
    request_id: 'test-3'
  });
  
  // Test readwise_highlight prompt
  sendRequest({
    type: 'prompt_call',
    name: 'readwise_highlight',
    parameters: { book_id: 'book-1', task: 'analyze' },
    request_id: 'test-4'
  });
  
  // Test readwise_search prompt
  sendRequest({
    type: 'prompt_call',
    name: 'readwise_search',
    parameters: { query: 'AI' },
    request_id: 'test-5'
  });
  
  // Test error handling - unknown tool
  sendRequest({
    type: 'tool_call',
    name: 'nonexistent_tool',
    parameters: {},
    request_id: 'test-6'
  });
  
  // Test error handling - invalid parameters
  sendRequest({
    type: 'tool_call',
    name: 'get_highlights',
    parameters: { page: -1 },
    request_id: 'test-7'
  });
}

/**
 * Send a request to the server
 */
function sendRequest(request: MCPRequest): void {
  logger.info(`Sending request: ${request.type} - ${request.name} (${request.request_id})`);
  
  // Handle the response
  server.handleMCPRequest(request, handleResponse);
}

/**
 * Handle a response from the server
 */
function handleResponse(response: MCPResponse | ErrorResponse): void {
  if ('error' in response) {
    logger.warn(`Received error response for ${response.request_id}:`, {
      type: response.error.type,
      code: response.error.details.code,
      message: response.error.details.message
    });
  } else {
    logger.info(`Received successful response for ${response.request_id}`);
    
    // You can inspect the response data here if needed
    if (process.env.VERBOSE) {
      logger.debug('Response data:', response.result);
    }
  }
  
  responsesReceived++;
  
  // Exit after all tests have completed
  if (responsesReceived === expectedResponses) {
    logger.info('All tests completed successfully');
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Test interrupted, shutting down...');
  process.exit(0);
}); 