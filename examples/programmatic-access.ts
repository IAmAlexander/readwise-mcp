/**
 * Example showing how to access the Readwise MCP server programmatically
 * 
 * To run this example, first start the MCP server:
 * 1. npm run build
 * 2. npm run dev
 * 
 * Then in another terminal:
 * ts-node examples/programmatic-access.ts
 */

/**
 * This demonstrates how to make MCP requests to the Readwise MCP server
 * directly from TypeScript/JavaScript code.
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const SERVER_URL = 'http://localhost:3000';
const API_KEY = process.env.READWISE_API_KEY || 'your-api-key-here';

/**
 * Make an MCP request to the Readwise MCP server
 */
async function makeMCPRequest(request: any): Promise<any> {
  try {
    // Add a request_id if none was provided
    if (!request.request_id) {
      request.request_id = uuidv4();
    }
    
    // When using SSE transport
    if (process.env.TRANSPORT === 'sse') {
      const response = await axios.post(`${SERVER_URL}/mcp`, request, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      
      // This is just the acknowledgment that the request was received
      // You'd need to listen to SSE events to get the actual response
      return response.data;
    } 
    // When using stdio transport directly (for testing purposes)
    else {
      const response = await axios.post(`${SERVER_URL}/mcp-stdio`, request, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      });
      
      return response.data;
    }
  } catch (error) {
    console.error('Error making MCP request:', error);
    throw error;
  }
}

/**
 * Example function to get books from Readwise
 */
async function getBooks(page: number = 1, pageSize: number = 10): Promise<any> {
  const request = {
    type: 'tool_call',
    name: 'get_books',
    parameters: {
      page,
      page_size: pageSize
    },
    request_id: `get-books-${Date.now()}`
  };
  
  return makeMCPRequest(request);
}

/**
 * Example function to get highlights for a specific book
 */
async function getHighlights(bookId: string, page: number = 1, pageSize: number = 20): Promise<any> {
  const request = {
    type: 'tool_call',
    name: 'get_highlights',
    parameters: {
      book_id: bookId,
      page,
      page_size: pageSize
    },
    request_id: `get-highlights-${Date.now()}`
  };
  
  return makeMCPRequest(request);
}

/**
 * Example function to search highlights
 */
async function searchHighlights(query: string, limit: number = 10): Promise<any> {
  const request = {
    type: 'tool_call',
    name: 'search_highlights',
    parameters: {
      query,
      limit
    },
    request_id: `search-highlights-${Date.now()}`
  };
  
  return makeMCPRequest(request);
}

/**
 * Example function to use the readwise_highlight prompt
 */
async function analyzeHighlights(bookId: string, task: 'summarize' | 'analyze' | 'connect' | 'question' = 'analyze'): Promise<any> {
  const request = {
    type: 'prompt_call',
    name: 'readwise_highlight',
    parameters: {
      book_id: bookId,
      task
    },
    request_id: `analyze-highlights-${Date.now()}`
  };
  
  return makeMCPRequest(request);
}

/**
 * Run the examples
 */
async function runExamples(): Promise<void> {
  try {
    console.log('Getting books...');
    const booksResponse = await getBooks();
    console.log('Books:', JSON.stringify(booksResponse, null, 2));
    
    if (booksResponse?.result?.results?.length > 0) {
      const firstBook = booksResponse.result.results[0];
      console.log(`\nGetting highlights for book: ${firstBook.title}...`);
      
      const highlightsResponse = await getHighlights(firstBook.id);
      console.log('Highlights:', JSON.stringify(highlightsResponse, null, 2));
      
      console.log(`\nAnalyzing highlights for book: ${firstBook.title}...`);
      const analysisResponse = await analyzeHighlights(firstBook.id);
      console.log('Analysis:', JSON.stringify(analysisResponse, null, 2));
    }
    
    console.log('\nSearching highlights for "learning"...');
    const searchResponse = await searchHighlights('learning');
    console.log('Search results:', JSON.stringify(searchResponse, null, 2));
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runExamples();
}

// Export the functions for use in other modules
export {
  getBooks,
  getHighlights,
  searchHighlights,
  analyzeHighlights
}; 