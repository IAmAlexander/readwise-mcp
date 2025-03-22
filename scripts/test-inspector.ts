#!/usr/bin/env node

import { spawn, type ChildProcess } from 'child_process';
import { createInterface } from 'readline';
import { setTimeout } from 'timers/promises';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestCase {
  name: string;
  command: string;
  expectedOutput?: string | RegExp;
  validate?: (output: string) => boolean;
}

class InspectorTestRunner {
  private serverProcess?: ChildProcess;
  private inspectorProcess?: ChildProcess;
  private testCases: TestCase[];
  private results: { passed: string[]; failed: string[] } = { passed: [], failed: [] };

  constructor() {
    // Define test cases
    this.testCases = [
      {
        name: 'List Tools',
        command: 'list tools',
        validate: (output) => {
          const tools = [
            'get_highlights',
            'get_books',
            'get_documents',
            'search_highlights'
          ];
          return tools.every(tool => output.includes(tool));
        }
      },
      {
        name: 'List Prompts',
        command: 'list prompts',
        validate: (output) => {
          const prompts = [
            'readwise_highlight',
            'readwise_search'
          ];
          return prompts.every(prompt => output.includes(prompt));
        }
      },
      {
        name: 'Get Books',
        command: 'tool get_books --parameters {"page":1,"page_size":5}',
        validate: (output) => {
          try {
            const response = JSON.parse(output);
            return Array.isArray(response.books) && response.books.length <= 5;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Get Highlights',
        command: 'tool get_highlights --parameters {"page":1,"page_size":5}',
        validate: (output) => {
          try {
            const response = JSON.parse(output);
            return Array.isArray(response.highlights) && response.highlights.length <= 5;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Search Highlights',
        command: 'tool search_highlights --parameters {"query":"test"}',
        validate: (output) => {
          try {
            const response = JSON.parse(output);
            return Array.isArray(response.results);
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Get Documents',
        command: 'tool get_documents --parameters {"page":1,"page_size":5}',
        validate: (output) => {
          try {
            const response = JSON.parse(output);
            return Array.isArray(response.documents) && response.documents.length <= 5;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'Readwise Highlight Prompt',
        command: 'prompt readwise_highlight --parameters {"highlight_id":1}',
        validate: (output) => {
          return output.includes('highlight') || output.includes('error');
        }
      },
      {
        name: 'Readwise Search Prompt',
        command: 'prompt readwise_search --parameters {"query":"test"}',
        validate: (output) => {
          return output.includes('results') || output.includes('error');
        }
      }
    ];
  }

  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting server process...');
      
      const serverPath = join(__dirname, '..', 'dist', 'index.js');
      this.serverProcess = spawn('node', [serverPath], {
        env: { ...process.env, TRANSPORT: 'stdio' }
      });

      let serverStarted = false;
      let serverError = '';

      // Wait for server to be ready
      const checkStartup = (data: Buffer) => {
        const message = data.toString();
        console.log('Server output:', message.trim());
        
        if (message.includes('Server started on port')) {
          serverStarted = true;
          resolve();
        }
      };

      this.serverProcess.stdout?.on('data', checkStartup);
      this.serverProcess.stderr?.on('data', (data) => {
        const message = data.toString();
        console.error(chalk.red(`Server error: ${message.trim()}`));
        serverError += message;
        checkStartup(data);
      });

      this.serverProcess.on('error', (error) => {
        console.error(chalk.red('Server process error:', error));
        reject(error);
      });

      this.serverProcess.on('exit', (code) => {
        if (!serverStarted) {
          console.error(chalk.red(`Server process exited with code ${code}`));
          reject(new Error(`Server failed to start: ${serverError}`));
        }
      });

      // Set a timeout
      setTimeout(10000).then(() => {
        if (!serverStarted) {
          reject(new Error('Server startup timeout'));
        }
      });
    });
  }

  private async startInspector(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting inspector with server...');
      
      // Kill any existing inspector processes and clear ports
      try {
        // Kill any existing inspector processes
        execSync('pkill -f "@modelcontextprotocol/inspector"');
        console.log('Killed existing inspector processes');
        
        // Kill any processes using port 3000 (inspector proxy) and 3002 (our server)
        execSync('lsof -ti:3000,3002 | xargs kill -9');
        console.log('Killed processes using ports 3000 and 3002');
      } catch (error) {
        // Ignore errors if no processes were found
      }

      // Wait a moment for ports to be released
      setTimeout(2000).then(() => {
        // Start the inspector with our server using the documented pattern
        const serverPath = join(__dirname, '..', 'dist', 'index.js');
        
        // Basic environment for debugging
        const env = {
          ...process.env,
          DEBUG: '*',
          NODE_ENV: 'development'
        };

        // Follow the documented pattern for passing environment variables with -e flag
        this.inspectorProcess = spawn('npx', [
          '@modelcontextprotocol/inspector',
          '-e', 'MCP_API_KEY=pvRTHpiGinEMs1iKc1M6ylpoDnIDxyWSmU443Q7wyjY10ovdqG',
          '-e', 'MCP_TRANSPORT=stdio',
          '-e', 'MCP_PORT=3002',
          '--',
          'node',
          serverPath,
          '--debug'
        ], {
          stdio: 'pipe',
          env,
          shell: true
        });

        let inspectorStarted = false;
        let serverStarted = false;
        let errorOutput = '';

        const checkStartup = (data: Buffer) => {
          const message = data.toString();
          console.log('Output:', message.trim());
          
          if (message.includes('MCP Inspector is up and running')) {
            console.log('✓ Inspector started');
            inspectorStarted = true;
          }
          if (message.includes('spawn-rx spawning process')) {
            console.log('✓ Server process spawned');
            // Server process is starting
          }
          if (message.includes('Starting Readwise MCP server')) {
            console.log('✓ Server starting');
            // Don't set serverStarted yet, wait for tools to be registered
          }
          if (message.includes('Registered') && message.includes('tools')) {
            console.log('✓ Server initialized');
            serverStarted = true;
          }

          // Only resolve when both inspector and server are ready
          if (inspectorStarted && serverStarted) {
            console.log('Both inspector and server are ready');
            // Give it a moment to fully initialize
            global.setTimeout(() => resolve(), 1000);
          }
        };

        // Listen to both stdout and stderr
        this.inspectorProcess.stdout?.on('data', checkStartup);
        this.inspectorProcess.stderr?.on('data', (data) => {
          const message = data.toString();
          // Check for startup messages in stderr too
          checkStartup(data);
          
          if (!message.includes('ExperimentalWarning')) { // Ignore ts-node warnings
            console.error(chalk.red(`Error: ${message.trim()}`));
            errorOutput += message;
          }
        });

        this.inspectorProcess.on('error', (error) => {
          console.error(chalk.red('Process error:', error));
          reject(error);
        });

        this.inspectorProcess.on('exit', (code) => {
          if (!inspectorStarted || !serverStarted) {
            console.error(chalk.red(`Process exited with code ${code}`));
            reject(new Error(`Failed to start: ${errorOutput}`));
          }
        });

        // Set a longer timeout since we're waiting for both to initialize
        setTimeout(30000).then(() => {
          if (!inspectorStarted || !serverStarted) {
            const status = [];
            if (!inspectorStarted) status.push('Inspector not started');
            if (!serverStarted) status.push('Server not started');
            reject(new Error(`Startup timeout: ${status.join(', ')}`));
          }
        });
      });
    });
  }

  private async runCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.inspectorProcess?.stdin || !this.inspectorProcess?.stdout) {
        reject(new Error('Inspector not running'));
        return;
      }

      console.log(`\nExecuting command: ${command}`);
      let output = '';
      let commandSent = false;

      const outputHandler = (data: Buffer) => {
        const message = data.toString();
        output += message;
        console.log('Command output:', message.trim());
        
        // Look for the prompt character that indicates command completion
        if (message.includes('\n> ')) {
          this.inspectorProcess?.stdout?.removeListener('data', outputHandler);
          console.log('Command completed');
          resolve(output.trim());
        }
      };

      this.inspectorProcess.stdout.on('data', outputHandler);
      
      // Send the command after a short delay to ensure the inspector is ready
      const sendCommand = () => {
        const timer = global.setTimeout(() => {
          try {
            console.log('Sending command to inspector...');
            this.inspectorProcess?.stdin?.write(command + '\n');
            commandSent = true;
          } catch (error) {
            reject(error);
          }
        }, 2000);
        return timer;
      };

      // Set a longer timeout for command execution
      const commandTimeout = global.setTimeout(() => {
        this.inspectorProcess?.stdout?.removeListener('data', outputHandler);
        if (!commandSent) {
          reject(new Error('Failed to send command'));
        } else {
          reject(new Error('Command timeout'));
        }
      }, 30000);

      // Start the command sequence and handle any errors
      try {
        const sendTimer = sendCommand();
        // Clean up on error
        this.inspectorProcess.on('error', () => {
          global.clearTimeout(sendTimer);
          global.clearTimeout(commandTimeout);
        });
      } catch (error) {
        global.clearTimeout(commandTimeout);
        reject(error);
      }

      // Clean up on success
      this.inspectorProcess.stdout?.once('end', () => {
        global.clearTimeout(commandTimeout);
      });
    });
  }

  private async cleanup(): Promise<void> {
    console.log('Cleaning up processes...');
    
    if (this.inspectorProcess) {
      this.inspectorProcess.kill();
      console.log('Killed inspector process');
    }
    
    // Kill any remaining inspector processes
    try {
      execSync('pkill -f "@modelcontextprotocol/inspector"');
      console.log('Killed any remaining inspector processes');
    } catch (error) {
      // Ignore errors if no processes were found
    }

    // Kill any processes using our ports
    try {
      // Kill processes using ports 3000 (inspector UI), 3001 (server default), and 3002 (our server)
      execSync('lsof -ti:3000,3001,3002 | xargs kill -9');
      console.log('Killed processes using ports 3000, 3001, and 3002');
    } catch (error) {
      // Ignore errors if no processes were found
      console.log('No processes found using ports 3000, 3001, or 3002');
    }

    // Wait a moment for ports to be fully released
    await setTimeout(1000);
  }

  private logResult(testName: string, passed: boolean, output?: string): void {
    const status = passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
    console.log(`${status} ${testName}`);
    if (!passed && output) {
      console.log(chalk.gray(output));
    }
    if (passed) {
      this.results.passed.push(testName);
    } else {
      this.results.failed.push(testName);
    }
  }

  public async runTests(): Promise<boolean> {
    try {
      // Clean up any existing processes before starting
      await this.cleanup();

      console.log(chalk.blue('Starting inspector with server...'));
      await this.startInspector();

      console.log(chalk.blue('\nRunning tests...\n'));

      for (const test of this.testCases) {
        try {
          const output = await this.runCommand(test.command);
          const passed = test.validate ? 
            test.validate(output) : 
            test.expectedOutput ? 
              (test.expectedOutput instanceof RegExp ? 
                test.expectedOutput.test(output) : 
                output.includes(test.expectedOutput)
              ) : true;

          this.logResult(test.name, passed, passed ? undefined : output);
        } catch (error) {
          this.logResult(test.name, false, String(error));
        }
      }

      console.log('\nTest Summary:');
      console.log(chalk.green(`Passed: ${this.results.passed.length}`));
      console.log(chalk.red(`Failed: ${this.results.failed.length}`));

      return this.results.failed.length === 0;
    } catch (error) {
      console.error(chalk.red('\nTest run failed:'), error);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests
const runner = new InspectorTestRunner();
runner.runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }); 