#!/usr/bin/env node

// Runtime imports - need .js extension
import { ReadwiseMCPServer } from './server.js';

// Type-only imports - no .js extension
import type { TransportType } from './types/index.js';

// Local imports with implementation - need .js extension
import { ReadwiseClient } from './api/client.js';
import { ReadwiseAPI } from './api/readwise-api.js';
import { SafeLogger } from './utils/safe-logger.js';
import { LogLevel } from './utils/logger-interface.js';
import { getConfig, saveConfig } from './utils/config.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import readline from 'readline';

/**
 * Main entry point for the Readwise MCP server
 */
async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('port', {
      alias: 'p',
      description: 'Port to listen on',
      type: 'number',
      default: process.env.PORT ? parseInt(process.env.PORT) : 3001
    })
    .option('transport', {
      alias: 't',
      description: 'Transport type (stdio or sse)',
      choices: ['stdio', 'sse'] as TransportType[],
      default: 'stdio' as TransportType
    })
    .option('debug', {
      alias: 'd',
      description: 'Enable debug logging',
      type: 'boolean',
      default: false
    })
    .option('api-key', {
      alias: 'k',
      description: 'Readwise API key',
      type: 'string'
    })
    .option('setup', {
      alias: 's',
      description: 'Run setup wizard',
      type: 'boolean',
      default: false
    })
    .help()
    .argv as {
      port: number;
      transport: TransportType;
      debug: boolean;
      'api-key'?: string;
      setup: boolean;
    };

  // Create logger
  const logger = new SafeLogger({
    level: argv.debug ? LogLevel.DEBUG : LogLevel.INFO,
    transport: argv.transport === 'sse' ? console.log : console.error,
    timestamps: true,
    colors: true,
  });

  logger.info('Starting Readwise MCP server');
  logger.debug('Command line arguments:', argv as any);

  try {
    // Run setup wizard if requested
    if (argv.setup) {
      const apiKey = await runSetupWizard();
      logger.info('Setup complete');
      return;
    }

    // Load config
    logger.debug('Loading configuration...');
    const config = getConfig();
    logger.debug('Configuration loaded');
    
    // Get API key from command-line args, config, or environment
    const apiKey = argv['api-key'] || config.readwiseApiKey || process.env.READWISE_API_KEY || '';
    
    // Allow server to start without API key for Smithery scanning (lazy loading)
    // API key will be validated when tools are actually called
    if (!apiKey) {
      logger.warn('No API key provided. Server will start but tools will require authentication.');
    } else {
      logger.debug('API key provided');
    }

    logger.info('Initializing server...');
    // Start the server
    const server = new ReadwiseMCPServer(
      apiKey,
      argv.port,
      logger,
      argv.transport
    );

    logger.info('Starting server...');
    await server.start();
    logger.info('Server started successfully');
    
    // Handle shutdown gracefully
    const shutdown = async () => {
      logger.info('Shutting down...');
      await server.stop();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Handle unhandled errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      shutdown();
    });
    
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', reason as any);
      shutdown();
    });
    
  } catch (error) {
    logger.error('Error starting server', error as any);
    process.exit(1);
  }
}

/**
 * Run the setup wizard to configure the API key
 */
async function runSetupWizard(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  console.log('Readwise MCP Server Setup Wizard');
  console.log('-------------------------------');
  console.log('');
  console.log('This wizard will help you set up your Readwise MCP server.');
  console.log('You will need your Readwise API key to continue.');
  console.log('');
  console.log('You can find your API key at https://readwise.io/access_token');
  console.log('');

  let apiKey = await question('Enter your Readwise API key: ');
  
  while (!apiKey) {
    console.log('API key is required.');
    apiKey = await question('Enter your Readwise API key: ');
  }

  try {
    // Test the API key by making a request to the Readwise API
    console.log('Validating API key...');
    
    const client = new ReadwiseClient({ apiKey });
    const api = new ReadwiseAPI(client);
    
    try {
      // Attempt to fetch a single book to verify API key works
      await api.getBooks({ page: 1, page_size: 1 });
      console.log('API key validated successfully.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        console.error('Error: Invalid API key. Please check your API key and try again.');
        rl.close();
        return runSetupWizard(); // Restart the setup wizard
      }
      
      console.warn('Warning: Could not validate API key due to API connection issue.');
      const proceed = await question('Do you want to save this API key anyway? (y/n): ');
      
      if (proceed.toLowerCase() !== 'y') {
        rl.close();
        return runSetupWizard(); // Restart the setup wizard
      }
    }
    
    // Save the API key to the config with secure permissions
    saveConfig({ readwiseApiKey: apiKey });
    
    console.log('');
    console.log('Configuration saved successfully.');
    console.log('You can now start the server using:');
    console.log('  readwise-mcp');
    console.log('');
  } catch (error) {
    console.error('Error saving configuration:', error instanceof Error ? error.message : String(error));
  } finally {
    rl.close();
  }

  return apiKey;
}

// Start the server
main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});