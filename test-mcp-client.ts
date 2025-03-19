import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * This script tests the Readwise MCP client functionality by:
 * 1. Starting the Readwise MCP server as a child process
 * 2. Connecting to it using the MCP client
 * 3. Testing various tool calls
 */

async function main() {
  console.log('Starting Readwise MCP client test...');

  // Start the server process
  console.log('Starting server process...');
  const serverProcess = spawn('npm', ['run', 'start'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Create a transport to the server
  const transport = new StdioClientTransport({
    command: 'npm',
    args: ['run', 'start']
  });

  // Create the client
  const client = new Client(
    {
      name: 'readwise-mcp-test-client',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Connect to the server
  console.log('Connecting to server...');
  await client.connect(transport);
  console.log('Connected to server successfully!');

  try {
    // Test tool calls
    console.log('\n--- Testing tools ---');

    // Test get_books tool
    console.log('\nTesting get_books tool...');
    const booksResult = await client.callTool({
      name: 'get_books',
      arguments: {
        limit: 3
      }
    });
    if (booksResult.content && booksResult.content[0] && booksResult.content[0].text) {
      console.log('Books result:', JSON.parse(booksResult.content[0].text));
    }

    // Test get_highlights tool
    console.log('\nTesting get_highlights tool...');
    const highlightsResult = await client.callTool({
      name: 'get_highlights',
      arguments: {
        limit: 3
      }
    });
    if (highlightsResult.content && highlightsResult.content[0] && highlightsResult.content[0].text) {
      console.log('Highlights result:', JSON.parse(highlightsResult.content[0].text));
    }

    // Test search_highlights tool
    console.log('\nTesting search_highlights tool...');
    const searchResult = await client.callTool({
      name: 'search_highlights',
      arguments: {
        query: 'programming',
        limit: 3
      }
    });
    if (searchResult.content && searchResult.content[0] && searchResult.content[0].text) {
      console.log('Search result:', JSON.parse(searchResult.content[0].text));
    }

    // Test get_tags tool
    console.log('\nTesting get_tags tool...');
    const tagsResult = await client.callTool({
      name: 'get_tags',
      arguments: {}
    });
    if (tagsResult.content && tagsResult.content[0] && tagsResult.content[0].text) {
      console.log('Tags result:', JSON.parse(tagsResult.content[0].text));
    }

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Clean up
    console.log('\nTest completed.');
    
    // Kill the server process if we started it
    if (serverProcess) {
      console.log('Terminating server process...');
      serverProcess.kill();
    }
    
    // Exit the process
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Error in test script:', error);
  process.exit(1);
}); 