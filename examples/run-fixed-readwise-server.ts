// Test script for the fixed Readwise MCP Server implementation

import { FixedReadwiseMCPServer } from './fixed-readwise-server';
import { SafeLogger } from './src/utils/safe-logger.js';
import { LogLevel } from './src/utils/logger-interface.js';
import { getConfig } from './src/utils/config.js';

// Global error handling
process.on('unhandledRejection', (error: unknown) => {
  console.error("UNHANDLED REJECTION:");
  if (error instanceof Error) {
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  } else {
    console.error("Non-Error object thrown:", error);
    try {
      console.error("Stringified error:", JSON.stringify(error, null, 2));
    } catch (e) {
      console.error("Error could not be stringified");
    }
  }
  process.exit(1);
});

async function main() {
  // Initialize logger
  const logger = new SafeLogger({
    level: LogLevel.DEBUG,
    transport: console.error,
    timestamps: true,
    colors: true
  });

  logger.info("Starting Fixed Readwise MCP Server test");
  
  try {
    // Load configuration
    logger.info("Loading configuration...");
    const config = getConfig();
    
    // Check for required API key
    if (!config.readwiseApiKey) {
      logger.error("Missing Readwise API key in configuration");
      process.exit(1);
    }
    
    // Create and start the server
    logger.info("Creating server...");
    const server = new FixedReadwiseMCPServer(
      config.readwiseApiKey,
      config.port || 3000,
      logger,
      config.transport || 'stdio',
      config.readwiseApiBaseUrl
    );
    
    // Start the server
    logger.info("Starting server...");
    await server.start();
    logger.info("Server started successfully");
    
    // Handle process termination
    process.on('SIGINT', async () => {
      logger.info("Shutting down server...");
      await server.stop();
      logger.info("Server stopped");
      process.exit(0);
    });
    
    // Keep the process running
    logger.info("Server is running. Press Ctrl+C to stop");
  } catch (error) {
    logger.error("Error in main", error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Start the application
main().catch(error => {
  console.error("FATAL ERROR:", error);
  if (error instanceof Error && error.stack) {
    console.error("STACK:", error.stack);
  }
  process.exit(1);
});