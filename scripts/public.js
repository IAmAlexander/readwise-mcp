#!/usr/bin/env node

/**
 * Simple script to make the local MCP server public with ngrok
 * 
 * Usage:
 *    npm run public
 * 
 * Requirements:
 *    npm install -g ngrok
 */

const { exec, spawn } = require('child_process');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default port
const PORT = process.env.PORT || 3000;

// Check if ngrok is installed
exec('ngrok --version', (error) => {
  if (error) {
    console.error('Error: ngrok is not installed or not in PATH');
    console.log('Please install ngrok: npm install -g ngrok');
    process.exit(1);
  }
  
  startServer();
});

// Start the MCP server
function startServer() {
  console.log('Starting Readwise MCP server...');
  
  // Start the server as a child process
  const serverProcess = spawn('npm', ['run', 'dev'], {
    env: {
      ...process.env,
      TRANSPORT: 'sse',
      PORT
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Log server output
  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data.toString().trim()}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data.toString().trim()}`);
  });
  
  // Wait for server to start
  setTimeout(() => {
    startNgrok();
  }, 3000);
  
  // Handle exit
  process.on('SIGINT', () => {
    console.log('\nStopping server...');
    serverProcess.kill();
    process.exit();
  });
}

// Start ngrok to expose the server
function startNgrok() {
  console.log(`Starting ngrok on port ${PORT}...`);
  
  // Start ngrok
  const ngrokProcess = spawn('ngrok', ['http', PORT.toString()], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Parse ngrok output to get URL
  ngrokProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[ngrok] ${output.trim()}`);
    
    // Try to extract the URL from the output
    const httpMatch = output.match(/https:\/\/[a-z0-9-]+\.ngrok\.io/);
    if (httpMatch) {
      const url = httpMatch[0];
      console.log('\n-------------------------------------------');
      console.log(`MCP Server is now available at: ${url}`);
      console.log('Use this URL to connect to your MCP server');
      console.log('-------------------------------------------\n');
    }
  });
  
  ngrokProcess.stderr.on('data', (data) => {
    console.error(`[ngrok Error] ${data.toString().trim()}`);
  });
  
  // Handle exit
  process.on('SIGINT', () => {
    console.log('\nStopping ngrok...');
    ngrokProcess.kill();
  });
  
  // Show instructions
  console.log('\nThe server is now running. Press Ctrl+C to stop.\n');
}

// Start the process
console.log('Making your Readwise MCP server public with ngrok...');
console.log('Press Ctrl+C to stop.\n'); 