#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Define the MCP protocol requirements
const protocolRequirements = {
  toolRequirements: [
    'name - String identifier for the tool',
    'description - Human-readable description of what the tool does',
    'parameters - JSON Schema for inputs'
  ],
  promptRequirements: [
    'name - String identifier for the prompt',
    'description - Human-readable description of what the prompt does',
    'parameters - JSON Schema for inputs'
  ],
  executionRequirements: [
    'validate - Validates input parameters',
    'execute - Executes the tool/prompt with validated parameters'
  ],
  responseRequirements: [
    'Tool response contains result or error property',
    'Errors have appropriate type (validation/transport)',
    'Validation errors include field and message'
  ]
};

// Identify all potential MCP tools and prompts
function scanDirectory(dir) {
  const tools = [];
  const prompts = [];
  
  function readDir(currentDir) {
    const files = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file.name);
      
      if (file.isDirectory()) {
        readDir(fullPath);
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        if (content.includes('extends BaseMCPTool') || 
            content.includes('implements MCPTool')) {
          tools.push({ name: file.name, path: fullPath });
        }
        
        if (content.includes('extends BaseMCPPrompt') || 
            content.includes('implements MCPPrompt')) {
          prompts.push({ name: file.name, path: fullPath });
        }
      }
    }
  }
  
  readDir(dir);
  return { tools, prompts };
}

// Check a file for protocol compliance
function checkFile(filePath, isPrompt = false) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for required properties
  const hasName = content.includes('readonly name =') || content.includes('get name()');
  const hasDescription = content.includes('readonly description =') || content.includes('get description()');
  const hasParameters = content.includes('readonly parameters =') || content.includes('get parameters()');
  const hasValidate = content.includes('validate(') || content.includes('validate =');
  const hasExecute = content.includes('execute(') || content.includes('execute =');
  
  // Check for error handling patterns
  const hasErrorHandling = content.includes('try {') && content.includes('catch (');
  const hasValidationError = content.includes('type: \'validation\'') || content.includes('type: "validation"');
  const hasTransportError = content.includes('type: \'transport\'') || content.includes('type: "transport"');
  const hasErrorDetails = content.includes('details: {') && 
                           (content.includes('code:') || content.includes('message:'));
  
  // Collect issues
  if (!hasName) issues.push('Missing name property');
  if (!hasDescription) issues.push('Missing description property');
  if (!hasParameters) issues.push('Missing parameters schema');
  if (!hasValidate) issues.push('Missing validate method');
  if (!hasExecute) issues.push('Missing execute method');
  if (!hasErrorHandling) issues.push('No try/catch error handling');
  
  if (isPrompt) {
    const hasMessagesResponse = content.includes('messages:') && content.includes('role:') && content.includes('content:');
    if (!hasMessagesResponse) issues.push('Prompt should return messages array with role and content properties');
  } else {
    const hasResultProperty = content.includes('result:') || content.includes('results:');
    if (!hasResultProperty) issues.push('Tool should return a result/results property');
  }
  
  if (!hasValidationError && !hasTransportError) {
    issues.push('No proper error typing (validation/transport)');
  }
  
  if (!hasErrorDetails) {
    issues.push('Error responses missing proper details (code/message)');
  }
  
  return issues;
}

// Main execution
function main() {
  console.log(chalk.blue.bold('MCP Protocol Compliance Check'));
  console.log(chalk.blue('============================'));
  
  const srcDir = path.join(__dirname, '..', 'src');
  const { tools, prompts } = scanDirectory(srcDir);
  
  console.log(chalk.yellow.bold('\nMCP Protocol Requirements:'));
  Object.entries(protocolRequirements).forEach(([category, requirements]) => {
    console.log(chalk.yellow(`\n${category}:`));
    requirements.forEach(req => console.log(`- ${req}`));
  });
  
  console.log(chalk.green.bold('\nTools Found:'), tools.length);
  let toolIssuesFound = false;
  
  tools.forEach(tool => {
    const issues = checkFile(tool.path);
    if (issues.length > 0) {
      toolIssuesFound = true;
      console.log(chalk.red(`\n❌ ${tool.name} (${tool.path}):`));
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log(chalk.green(`✅ ${tool.name}`));
    }
  });
  
  console.log(chalk.green.bold('\nPrompts Found:'), prompts.length);
  let promptIssuesFound = false;
  
  prompts.forEach(prompt => {
    const issues = checkFile(prompt.path, true);
    if (issues.length > 0) {
      promptIssuesFound = true;
      console.log(chalk.red(`\n❌ ${prompt.name} (${prompt.path}):`));
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log(chalk.green(`✅ ${prompt.name}`));
    }
  });
  
  // Summary
  console.log(chalk.blue.bold('\nCompliance Summary:'));
  if (!toolIssuesFound && !promptIssuesFound) {
    console.log(chalk.green.bold('✅ All tools and prompts appear to be MCP compliant!'));
  } else {
    const toolStatus = toolIssuesFound ? 
      chalk.red('❌ Some tools have compliance issues') : 
      chalk.green('✅ All tools are compliant');
    
    const promptStatus = promptIssuesFound ? 
      chalk.red('❌ Some prompts have compliance issues') : 
      chalk.green('✅ All prompts are compliant');
    
    console.log(toolStatus);
    console.log(promptStatus);
    
    console.log(chalk.yellow('\nRecommendations:'));
    console.log('1. Ensure all tools/prompts have name, description, and parameters properties');
    console.log('2. Implement proper validation and error handling');
    console.log('3. Return standardized responses (result/error for tools, messages for prompts)');
    console.log('4. Use appropriate error types (validation/transport) with details');
    
    // Exit with error code for CI/CD pipelines
    process.exit(1);
  }
}

main(); 