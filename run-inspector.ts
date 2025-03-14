import { spawn, execSync } from 'child_process';
import path from 'path';

// Kill any running Node.js processes
try {
  console.log('Killing any running Node.js processes...');
  execSync('pkill -f "node"');
} catch (error) {
  // Ignore errors if no processes are found
}

// Start the Readwise MCP server
console.log('Starting Readwise MCP server...');
const serverProcess = spawn('npm', ['run', 'simple'], {
  cwd: __dirname,
  stdio: 'inherit'
});

// Wait for the server to start
console.log('Waiting for server to start...');
setTimeout(() => {
  // Start the MCP Inspector
  console.log('Starting MCP Inspector...');
  const inspectorProcess = spawn('npx', ['@modelcontextprotocol/inspector@0.6.0'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
      ...process.env,
      MCP_PROXY_PORT: '3001',
      MCP_SERVER_PORT: '3001',
      MCP_CLIENT_PORT: '5174',
      NODE_OPTIONS: '--no-warnings'
    }
  });

  // Handle inspector process exit
  inspectorProcess.on('exit', (code) => {
    console.log(`MCP Inspector exited with code ${code}`);
    // Kill the server process
    serverProcess.kill();
    process.exit(0);
  });
}, 3000);

// Handle server process exit
serverProcess.on('exit', (code) => {
  console.log(`Readwise MCP server exited with code ${code}`);
  process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Terminating processes...');
  serverProcess.kill();
  process.exit(0);
}); 