#!/usr/bin/env node

/**
 * This script starts the Readwise MCP server and runs it through the MCP Inspector
 * for testing. The Inspector will handle transport selection and port management.
 */

import { spawn } from 'child_process';
import { getConfig } from './src/utils/config';
import path from 'path';

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

console.log('Starting Readwise MCP server with Inspector...');
console.log('');

// Start the server through the Inspector
// Let the Inspector handle transport and port management
const inspector = spawn('npx', [
  '@modelcontextprotocol/inspector',
  '-e', 'MCP_INSPECTOR=true',
  '-e', `READWISE_API_KEY=${apiKey}`,
  '-e', 'DEBUG=*',
  '--',
  'node',
  'dist/index.js'
], {
  stdio: 'inherit'
});

// Handle inspector exit
inspector.on('exit', (code) => {
  console.log(`Inspector exited with code ${code}`);
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping inspector and server...');
  inspector.kill('SIGINT');
});

// Display instructions
setTimeout(() => {
  console.log('');
  console.log('==========================================================');
  console.log('MCP Inspector is running');
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