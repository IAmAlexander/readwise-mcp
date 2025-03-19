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
  } else if (request.type === 'prompt_call') {
    if (request.name === 'readwise_highlight') {
      // Get the book_id from params (or use default)
      const bookId = request.parameters.book_id || 'book-1';
      const task = request.parameters.task || 'analyze';
      
      // Get highlights for this book
      mockAPI.getHighlights({ book_id: bookId }).then(highlightsResponse => {
        // Get book details
        mockAPI.getBook(bookId).then(book => {
          if (!book) {
            throw new Error(`Book not found: ${bookId}`);
          }
          
          // Format highlights in a readable way
          const highlights = highlightsResponse.results.map(h => 
            `"${h.text}"${h.note ? ` — Note: ${h.note}` : ''}`
          ).join('\n\n');
          
          // Build message based on task
          let messageContent = '';
          switch (task) {
            case 'summarize':
              messageContent = `Here are some highlights from "${book.title}" by ${book.author || 'Unknown'}:\n\n${highlights}\n\nPlease provide a concise summary of these highlights.`;
              break;
            case 'analyze':
              messageContent = `Here are some highlights from "${book.title}" by ${book.author || 'Unknown'}:\n\n${highlights}\n\nPlease analyze these highlights and provide key insights.`;
              break;
            case 'connect':
              messageContent = `Here are some highlights from "${book.title}" by ${book.author || 'Unknown'}:\n\n${highlights}\n\nPlease identify connections between these highlights and suggest related topics to explore.`;
              break;
            case 'question':
              messageContent = `Here are some highlights from "${book.title}" by ${book.author || 'Unknown'}:\n\n${highlights}\n\nPlease generate thoughtful questions based on these highlights to deepen understanding.`;
              break;
            default:
              messageContent = `Here are some highlights from "${book.title}" by ${book.author || 'Unknown'}:\n\n${highlights}`;
          }
          
          // Include custom context if provided
          if (request.parameters.context) {
            messageContent = `${request.parameters.context}\n\n${messageContent}`;
          }
          
          callback({
            result: {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: messageContent
                  }
                }
              ]
            },
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
    } else if (request.name === 'readwise_search') {
      // Get search query and parameters
      const query = request.parameters.query || '';
      
      // Search highlights
      mockAPI.searchHighlights({ query }).then(searchResults => {
        if (searchResults.length === 0) {
          throw new Error(`No results found for query: ${query}`);
        }
        
        // Format results in a readable way
        const formattedResults = searchResults.map((result, index) => {
          const { highlight, book } = result;
          return `${index + 1}. "${highlight.text}" — ${book.title}${book.author ? ` by ${book.author}` : ''}`;
        }).join('\n\n');
        
        // Build message content
        const messageContent = `Here are the search results for "${query}":\n\n${formattedResults}\n\nPlease analyze these results and provide insights related to your search.`;
        
        callback({
          result: {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: messageContent
                }
              }
            ]
          },
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
    parameters: { query: 'code' },
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