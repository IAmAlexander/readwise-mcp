#!/usr/bin/env node

import { ReadwiseMCPServer } from './server';
import { getConfig, saveConfig } from './utils/config';
import { Logger, LogLevel } from './utils/logger';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import readline from 'readline';
import { stdin as input, stdout as output } from 'process';
import { TransportType } from './types';
import { ReadwiseClient } from './api/client';
import { ReadwiseAPI } from './api/readwise-api';

/**
 * Main entry point for the Readwise MCP server
 */
async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('port', {
      alias: 'p',
      description: 'Port to listen on',
      type: 'number',
      default: 3000
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
  const logger = Logger.forTransport(argv.transport, argv.debug);

  logger.info('Starting Readwise MCP server');

  try {
    // Run setup wizard if requested
    if (argv.setup) {
      const apiKey = await runSetupWizard();
      logger.info('Setup complete');
      return;
    }

    // Load config
    const config = getConfig();
    
    // Get API key from command-line args or config
    const apiKey = argv['api-key'] || config.readwiseApiKey;
    
    if (!apiKey) {
      logger.error('No API key provided. Please provide an API key using the --api-key flag or run the setup wizard with --setup');
      process.exit(1);
    }

    // Start the server
    const server = new ReadwiseMCPServer(
      apiKey,
      argv.port,
      logger,
      argv.transport
    );

    await server.start();
    
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
      logger.error('Unhandled promise rejection', reason);
      shutdown();
    });
    
  } catch (error) {
    logger.error('Error starting server', error);
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