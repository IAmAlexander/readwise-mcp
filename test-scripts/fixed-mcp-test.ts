/**
 * Properly configured MCP test script that addresses all linter errors
 * This version replaces the original mcp-test.ts with fixed imports, type safety, and proper ES module handling
 */

import { spawn, type ChildProcess } from 'child_process';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { SafeLogger } from '../src/utils/safe-logger.js';
import { LogLevel, type LogContext } from '../src/utils/logger-interface.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Environment setup for import resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SSE_PORT = 3001;
const INSPECTOR_PORT = 5174;
const PROXY_PORT = 3002;

// Global variables
let httpServer: http.Server | null = null;
let inspectorProcess: ChildProcess | null = null;

// Create logger
const logger = new SafeLogger({
  level: LogLevel.DEBUG,
  timestamps: true,
  colors: true
});

/**
 * Kill any existing processes on the specified ports
 */
async function cleanupProcesses(): Promise<void> {
  logger.info('Cleaning up existing processes...');
  
  return new Promise<void>((resolve) => {
    const cleanup = spawn('bash', ['-c', `lsof -ti :${SSE_PORT},${INSPECTOR_PORT},${PROXY_PORT} | xargs kill -9 || true`]);
    
    cleanup.on('close', (code) => {
      logger.info(`Process cleanup completed with code ${code}`);
      resolve();
    });
    
    cleanup.on('error', (err) => {
      logger.warn('Process cleanup failed:', err);
      resolve(); // Continue even if cleanup fails
    });
  });
}

/**
 * Test the server with SSE transport
 * This is a simplified version to demonstrate proper imports and type safety
 */
async function testServerSSE() {
  logger.info('Testing server with SSE transport...');

  try {
    // Create Express app
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    // Dynamically import MCP SDK to avoid ESM issues
    const { Server } = await import('@modelcontextprotocol/sdk/server');
    const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse');
    
    // Setup config and API (placeholders)
    const apiKey = process.env.READWISE_API_KEY || '';
    if (!apiKey) {
      throw new Error('No API key found in environment. Please set READWISE_API_KEY.');
    }

    // Setup MCP Server with proper arguments
    const server = new Server(
      {
        name: "Readwise",
        version: "1.0.0",
        description: "Access your Readwise library"
      }, 
      {
        capabilities: {
          tools: {
            "echo": true
          }
        }
      }
    );

    // Register basic echo tool for testing
    server.tool(
      "echo",
      "Echo back the input message",
      async (params: any) => {
        try {
          const message = params?.message || "No message provided";
          logger.debug(`Executing echo tool with message: ${message}`);
          
          return {
            content: [{ 
              type: "text", 
              text: `Echo: ${message}` 
            }]
          };
        } catch (err) {
          logger.error('Error executing echo tool', err as Error);
          return {
            content: [{ 
              type: "text", 
              text: `Error: ${(err as Error).message}` 
            }],
            isError: true
          };
        }
      }
    );

    // Setup HTTP server with proper typing
    httpServer = http.createServer(app);
    httpServer.listen(SSE_PORT, () => {
      logger.info(`Server listening on port ${SSE_PORT}`);
    });

    // Setup SSE endpoint
    app.get('/sse', async (req, res) => {
      logger.info('SSE connection established');
      const transport = new SSEServerTransport('/sse', res);
      await server.connect(transport);
    });

    // Add status endpoint
    app.get('/status', (req, res) => {
      res.status(200).json({
        status: 'ok',
        version: '1.0.0',
        transport: 'sse',
        tools: ["echo"]
      });
    });

    logger.info('Server with SSE transport started successfully');
    return { port: SSE_PORT };
  } catch (error) {
    logger.error('Error starting SSE server', error as Error);
    throw error;
  }
}

/**
 * Start the MCP Inspector
 */
async function startInspector(): Promise<void> {
  logger.info('Starting MCP Inspector...');
  
  // Set environment variables
  const env = {
    ...process.env,
    MCP_INSPECTOR: 'true',
    DEBUG: '*',
    MCP_PROXY_PORT: String(PROXY_PORT),
    MCP_SERVER_PORT: String(SSE_PORT),
    MCP_CLIENT_PORT: String(INSPECTOR_PORT),
    NODE_OPTIONS: '--no-warnings'
  };

  // Start the inspector
  inspectorProcess = spawn('npx', [
    '@modelcontextprotocol/inspector',
    `http://localhost:${SSE_PORT}`
  ], {
    env,
    stdio: 'inherit'
  });

  return new Promise<void>((resolve, reject) => {
    inspectorProcess?.on('spawn', () => {
      logger.info(`Inspector started and connecting to http://localhost:${SSE_PORT}`);
      resolve();
    });

    inspectorProcess?.on('error', (err) => {
      logger.error('Failed to start inspector:', err);
      reject(err);
    });
  });
}

/**
 * Display available tools and prompts
 */
function displayAvailableResources(): void {
  console.log('');
  console.log('==========================================================');
  console.log('MCP Test Environment');
  console.log('');
  console.log('Available tools:');
  console.log('  - echo: Echo back the input message');
  console.log('==========================================================');
  console.log('');
  console.log(`Server: http://localhost:${SSE_PORT}`);
  console.log(`Inspector: http://localhost:${INSPECTOR_PORT}`);
  console.log('');
  console.log('Press Ctrl+C to stop all processes');
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Clean up any existing processes
    await cleanupProcesses();
    
    // Start server with SSE transport
    const { port } = await testServerSSE();
    logger.info(`Server running on port ${port}`);
    
    // Start MCP Inspector
    await startInspector();
    
    // Display available resources
    displayAvailableResources();
    
    // Setup cleanup on exit
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT. Cleaning up...');
      await cleanupProcesses();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM. Cleaning up...');
      await cleanupProcesses();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Error running tests', error as Error);
    await cleanupProcesses();
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    await runTests();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error in main:', err);
  process.exit(1);
});