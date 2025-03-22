#!/usr/bin/env node
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
class InspectorTestRunner {
    serverProcess;
    inspectorProcess;
    testCases;
    results = { passed: [], failed: [] };
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
                    }
                    catch {
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
                    }
                    catch {
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
                    }
                    catch {
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
                    }
                    catch {
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
    async startServer() {
        return new Promise((resolve, reject) => {
            console.log('Starting server process...');
            const serverPath = join(__dirname, '..', 'dist', 'index.js');
            this.serverProcess = spawn('node', [serverPath], {
                env: { ...process.env, TRANSPORT: 'stdio' }
            });
            let serverStarted = false;
            let serverError = '';
            // Wait for server to be ready
            const checkStartup = (data) => {
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
    async startInspector() {
        return new Promise((resolve, reject) => {
            console.log('Starting inspector process...');
            // Kill any existing inspector processes
            try {
                execSync('pkill -f "@modelcontextprotocol/inspector"');
                console.log('Killed existing inspector processes');
            }
            catch (error) {
                // Ignore errors if no processes were found
            }
            // Wait a moment for ports to be released
            setTimeout(1000).then(() => {
                // Start the inspector with environment variables
                this.inspectorProcess = spawn('npx', ['@modelcontextprotocol/inspector'], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: {
                        ...process.env,
                        PORT: '3003',
                        CLIENT_PORT: '5175'
                    }
                });
                let inspectorStarted = false;
                let inspectorError = '';
                // Wait for inspector to be ready
                const checkStartup = (data) => {
                    const message = data.toString();
                    console.log('Inspector output:', message.trim());
                    if (message.includes('Connected') || message.includes('Starting inspector...')) {
                        inspectorStarted = true;
                        resolve();
                    }
                };
                this.inspectorProcess.stdout?.on('data', checkStartup);
                this.inspectorProcess.stderr?.on('data', (data) => {
                    const message = data.toString();
                    console.error(chalk.red(`Inspector error: ${message.trim()}`));
                    inspectorError += message;
                    checkStartup(data);
                });
                this.inspectorProcess.on('error', (error) => {
                    console.error(chalk.red('Inspector process error:', error));
                    reject(error);
                });
                this.inspectorProcess.on('exit', (code) => {
                    if (!inspectorStarted) {
                        console.error(chalk.red(`Inspector process exited with code ${code}`));
                        reject(new Error(`Inspector failed to start: ${inspectorError}`));
                    }
                });
                // Set a timeout
                setTimeout(10000).then(() => {
                    if (!inspectorStarted) {
                        reject(new Error('Inspector startup timeout'));
                    }
                });
            });
        });
    }
    async runCommand(command) {
        return new Promise((resolve, reject) => {
            if (!this.inspectorProcess?.stdin || !this.inspectorProcess?.stdout) {
                reject(new Error('Inspector not running'));
                return;
            }
            let output = '';
            const outputHandler = (data) => {
                output += data.toString();
                if (output.includes('\n> ')) {
                    this.inspectorProcess?.stdout?.removeListener('data', outputHandler);
                    resolve(output.trim());
                }
            };
            this.inspectorProcess.stdout.on('data', outputHandler);
            this.inspectorProcess.stdin.write(command + '\n');
            // Set a timeout
            setTimeout(10000).then(() => {
                this.inspectorProcess?.stdout?.removeListener('data', outputHandler);
                reject(new Error('Command timeout'));
            });
        });
    }
    async cleanup() {
        console.log('Cleaning up processes...');
        if (this.inspectorProcess) {
            this.inspectorProcess.kill();
            console.log('Killed inspector process');
        }
        if (this.serverProcess) {
            this.serverProcess.kill();
            console.log('Killed server process');
        }
        // Kill any remaining inspector processes
        try {
            execSync('pkill -f "@modelcontextprotocol/inspector"');
            console.log('Killed any remaining inspector processes');
        }
        catch (error) {
            // Ignore errors if no processes were found
        }
    }
    logResult(testName, passed, output) {
        const status = passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
        console.log(`${status} ${testName}`);
        if (!passed && output) {
            console.log(chalk.gray(output));
        }
        if (passed) {
            this.results.passed.push(testName);
        }
        else {
            this.results.failed.push(testName);
        }
    }
    async runTests() {
        try {
            console.log(chalk.blue('Starting server...'));
            await this.startServer();
            console.log(chalk.blue('Starting inspector...'));
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
                                output.includes(test.expectedOutput)) : true;
                    this.logResult(test.name, passed, passed ? undefined : output);
                }
                catch (error) {
                    this.logResult(test.name, false, String(error));
                }
            }
            console.log('\nTest Summary:');
            console.log(chalk.green(`Passed: ${this.results.passed.length}`));
            console.log(chalk.red(`Failed: ${this.results.failed.length}`));
            return this.results.failed.length === 0;
        }
        catch (error) {
            console.error(chalk.red('\nTest run failed:'), error);
            return false;
        }
        finally {
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
//# sourceMappingURL=test-inspector.js.map