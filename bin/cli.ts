#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from '../src/server';
import fs from 'fs';
import path from 'path';

// Get package version from package.json
let version = '1.0.0';
try {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  version = packageJson.version || version;
} catch (error) {
  console.error('Warning: Could not read package.json version');
}

// Setup CLI program
const program = new Command();
program
  .name('readwise-mcp')
  .description('Readwise MCP server for accessing your Readwise library')
  .version(version);

// Add options
program
  .option('-p, --port <number>', 'Port to listen on (for SSE transport)', '3000')
  .option('-t, --transport <type>', 'Transport type (stdio or sse)', 'stdio')
  .option('-d, --debug', 'Enable debug mode')
  .option('-c, --config <path>', 'Path to config file')
  .option('-k, --api-key <key>', 'Readwise API key (overrides config file and environment)')
  .option('-b, --base-url <url>', 'Readwise API base URL (overrides config file and environment)');

// Define action
program.action((options) => {
  // Start the server with the provided options
  startServer({
    port: parseInt(options.port, 10),
    transport: options.transport as 'stdio' | 'sse',
    debug: !!options.debug,
    configPath: options.config,
    readwiseApiKey: options.apiKey,
    readwiseApiBaseUrl: options.baseUrl
  });
});

// Parse command line arguments
program.parse(process.argv); 