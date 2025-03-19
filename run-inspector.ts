#!/usr/bin/env node

/**
 * This script starts the Readwise MCP server in SSE mode and provides
 * instructions for running the MCP Inspector against it for testing.
 */

import { spawn } from 'child_process';
import { getConfig } from './src/utils/config';
import os from 'os';
import path from 'path';

// Configuration
const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;
const DEBUG = process.env.DEBUG === 'true' || false;

// Get API key from config
let apiKey: string;
try {
  const config = getConfig();
  apiKey = config.readwiseApiKey;
  
  if (!apiKey) {
    console.error('No API key found in configuration. Please run the setup wizard first:');
    console.error('  npm run setup');
    process.exit(1);
  }
} catch (error) {
  console.error('Error loading configuration:', error instanceof Error ? error.message : String(error));
  console.error('Please run the setup wizard first:');
  console.error('  npm run setup');
  process.exit(1);
}

console.log('Starting Readwise MCP server in SSE mode...');
console.log(`Port: ${PORT}`);
console.log(`Debug mode: ${DEBUG ? 'enabled' : 'disabled'}`);
console.log('');

// Start the server
const nodeCmd = process.platform === 'win32' ? 'node.exe' : 'node';
const server = spawn(nodeCmd, ['dist/index.js', '--transport', 'sse', '--port', PORT.toString(), DEBUG ? '--debug' : ''], {
  stdio: 'inherit',
  env: { 
    ...process.env, 
    PORT: PORT.toString(),
    READWISE_API_KEY: apiKey,
    DEBUG: DEBUG ? 'true' : 'false'
  }
});

// Handle server exit
server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping server...');
  server.kill('SIGINT');
});

// Display instructions
setTimeout(() => {
  console.log('');
  console.log('==========================================================');
  console.log('Server running at ' + SERVER_URL);
  console.log('');
  console.log('To test with the MCP Inspector, run:');
  console.log(`  npx @modelcontextprotocol/inspector ${SERVER_URL}`);
  console.log('');
  console.log('Available tools:');
  console.log('  - get_highlights: Get highlights from Readwise');
  console.log('  - get_books: Get books from Readwise');
  console.log('  - get_documents: Get documents from Readwise');
  console.log('  - search_highlights: Search highlights in Readwise');
  console.log('');
  console.log('Available prompts:');
  console.log('  - readwise_highlight: Process highlights from Readwise');
  console.log('  - readwise_search: Search and process highlights');
  console.log('==========================================================');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
}, 2000); 