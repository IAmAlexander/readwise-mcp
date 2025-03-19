#!/usr/bin/env node

/**
 * Simple test script for the Readwise MCP server
 */

// Import the test libraries
const readline = require('readline');
const axios = require('axios');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test HTTP endpoint
async function testHttpEndpoint() {
  try {
    const response = await axios.get('http://localhost:3000/health');
    console.log('HTTP endpoint response:', response.data);
    return true;
  } catch (error) {
    console.error('Error testing HTTP endpoint:', error.message);
    return false;
  }
}

// Test MCP tool call
async function testToolCall(name, parameters) {
  const request = {
    type: 'tool_call',
    name,
    parameters,
    request_id: `test-${Date.now()}`
  };
  
  console.log(`Sending tool call: ${name}`);
  
  // Send via stdin if stdio mode is detected
  if (process.env.READWISE_MCP_TRANSPORT === 'stdio') {
    console.log('Using stdio transport');
    process.stdout.write(JSON.stringify(request) + '\n');
    return true;
  } else {
    // Otherwise send via HTTP
    console.log('Using HTTP transport');
    try {
      const response = await axios.post('http://localhost:3000/mcp', request);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return true;
    } catch (error) {
      console.error('Error sending tool call:', error.message);
      return false;
    }
  }
}

// Start the interactive test interface
async function startInterface() {
  console.log('--------------------------------------');
  console.log('Readwise MCP Server Test Interface');
  console.log('--------------------------------------');
  
  // Test HTTP endpoint if not in stdio mode
  if (process.env.READWISE_MCP_TRANSPORT !== 'stdio') {
    await testHttpEndpoint();
  }
  
  showMenu();
}

// Show the main menu
function showMenu() {
  console.log('\nChoose a test:');
  console.log('1. Test Get Books');
  console.log('2. Test Get Highlights');
  console.log('3. Test Get Documents');
  console.log('4. Test Search Highlights');
  console.log('5. Exit');
  
  rl.question('Enter your choice: ', (answer) => {
    switch (answer) {
      case '1':
        testGetBooks();
        break;
      case '2':
        testGetHighlights();
        break;
      case '3':
        testGetDocuments();
        break;
      case '4':
        testSearchHighlights();
        break;
      case '5':
        console.log('Exiting test interface.');
        rl.close();
        break;
      default:
        console.log('Invalid choice. Please try again.');
        showMenu();
        break;
    }
  });
}

// Test Get Books
function testGetBooks() {
  rl.question('Enter page size (default: 10): ', (pageSize) => {
    const parameters = {
      page_size: pageSize ? parseInt(pageSize, 10) : 10
    };
    
    testToolCall('get_books', parameters)
      .then(() => showMenu());
  });
}

// Test Get Highlights
function testGetHighlights() {
  rl.question('Enter book ID (optional): ', (bookId) => {
    rl.question('Enter page size (default: 10): ', (pageSize) => {
      const parameters = {
        page_size: pageSize ? parseInt(pageSize, 10) : 10
      };
      
      if (bookId) {
        parameters.book_id = bookId;
      }
      
      testToolCall('get_highlights', parameters)
        .then(() => showMenu());
    });
  });
}

// Test Get Documents
function testGetDocuments() {
  rl.question('Enter page size (default: 10): ', (pageSize) => {
    const parameters = {
      page_size: pageSize ? parseInt(pageSize, 10) : 10
    };
    
    testToolCall('get_documents', parameters)
      .then(() => showMenu());
  });
}

// Test Search Highlights
function testSearchHighlights() {
  rl.question('Enter search query: ', (query) => {
    if (!query) {
      console.log('Search query is required.');
      return testSearchHighlights();
    }
    
    rl.question('Enter result limit (default: 10): ', (limit) => {
      const parameters = {
        query,
        limit: limit ? parseInt(limit, 10) : 10
      };
      
      testToolCall('search_highlights', parameters)
        .then(() => showMenu());
    });
  });
}

// Start the interface
startInterface(); 