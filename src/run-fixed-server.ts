// Runner script for the fixed Readwise MCP server implementation

import { FixedReadwiseMCPServer } from './fixed-server';
import { SafeLogger } from './utils/safe-logger.js';
import { LogLevel } from './utils/logger-interface';
import { getConfig } from './utils/config.js';

// Global error handling with improved detail
process.on('unhandledRejection', (error: unknown) => {
  console.error("UNHANDLED REJECTION (DETAILED):");
  if (error instanceof Error) {
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
  } else {
    console.error("Non-Error object thrown:", error);
    try {
      console.error("Stringified error:", JSON.stringify(error, null, 2));
    } catch (e) {
      console.error("Error could not be stringified, raw object:", error);
      console.error("Error properties:", Object.getOwnPropertyNames(error).map(prop => `${prop}: ${(error as any)[prop]}`));
    }
  }
  process.exit(1);
});

async function main() {
  // Initialize logger
  const logger = new SafeLogger({
    level: LogLevel.DEBUG,
    timestamps: true,
    colors: true
  });

  logger.info("Starting Fixed Readwise MCP Server");
  
  try {
    // Load configuration
    logger.info("Loading configuration...");
    const config = getConfig();
    logger.debug("Configuration loaded:", config as any);
    
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
    try {
      await server.start();
      logger.info("Server started successfully");
    } catch (startError) {
      logger.error("Error starting server:", startError as Error);
      throw startError;
    }
    
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
    if (error instanceof Error) {
      logger.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      } as any);
    } else {
      logger.error("Non-Error object:", error as any);
    }
    process.exit(1);
  }
}

// Start the application with enhanced error handling
main().catch(error => {
  console.error("FATAL ERROR (DETAILED):");
  if (error instanceof Error) {
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
  } else {
    console.error("Non-Error object thrown:", error);
    try {
      console.error("Stringified error:", JSON.stringify(error, null, 2));
    } catch (e) {
      console.error("Error could not be stringified, raw object:", error);
      console.error("Error properties:", Object.getOwnPropertyNames(error).map(prop => `${prop}: ${(error as any)[prop]}`));
    }
  }
  process.exit(1);
});