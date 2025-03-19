# MCP Server Development and Deployment Workflow

This document outlines the complete process for building, testing, and deploying a Model Context Protocol (MCP) server, based on our experience with the Readwise MCP server.

## Table of Contents

1. [Project Setup](#project-setup)
2. [Development](#development)
3. [Testing](#testing)
4. [Deployment Preparation](#deployment-preparation)
5. [Smithery Deployment](#smithery-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Project Setup

### 1. Initialize the Project

```bash
# Create a new directory for your project
mkdir your-mcp-server
cd your-mcp-server

# Initialize a new npm project
npm init -y

# Initialize git repository
git init
```

### 2. Install Dependencies

```bash
# Install MCP SDK and other core dependencies
npm install @modelcontextprotocol/sdk express cors axios

# Install development dependencies
npm install --save-dev typescript ts-node @types/node @types/express @types/cors jest ts-jest @types/jest
```

### 3. Configure TypeScript

Create a `tsconfig.json` file:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "sourceMap": true,
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Setup Project Structure

```bash
# Create source directory
mkdir -p src/types

# Create test directory
mkdir tests
```

## Development

### 1. Create MCP Manifest

Create a `mcp-manifest.json` file in the root directory:

```json
{
  "schema_version": "v1",
  "name": "YourServiceName",
  "name_for_human": "Your Service Name",
  "description_for_human": "A human-readable description of your service.",
  "description_for_model": "A description for the AI model explaining how to use your service.",
  "auth": {
    "type": "oauth",
    "client_url": "/auth/login",
    "scope": "",
    "authorization_url": "https://your-service.com/access_token",
    "authorization_content_type": "application/json"
  },
  "api": {
    "type": "openapi",
    "url": "/openapi.json"
  },
  "logo_url": "https://your-service.com/logo.png",
  "contact_email": "your-email@example.com",
  "legal_info_url": "https://your-service.com/terms"
}
```

### 2. Create Main Server File

Create `src/index.ts`:

```typescript
// Import dependencies
import { MCP, createExpressAdapter } from '@modelcontextprotocol/sdk';
import type { AuthorizationData } from '@modelcontextprotocol/sdk';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// Configuration
const PORT = process.env.PORT || 3000;
const API_BASE = 'https://your-service-api.com';

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Setup MCP Server
const mcp = new MCP({
  manifest: {
    schema_version: "v1",
    name: "YourServiceName",
    name_for_human: "Your Service Name",
    description_for_human": "A human-readable description of your service.",
    description_for_model": "A description for the AI model explaining how to use your service.",
    auth: {
      type: "oauth",
      client_url: "/auth/login",
      scope: "",
      authorization_url": "https://your-service.com/access_token",
      authorization_content_type": "application/json"
    },
    api: {
      type: "openapi",
      url: "/openapi.json"
    },
    logo_url: "https://your-service.com/logo.png",
    contact_email: "your-email@example.com",
    legal_info_url: "https://your-service.com/terms"
  }
});

// Define your API endpoints and tools here
// ...

// Setup OpenAPI specification
app.get('/openapi.json', (req, res) => {
  // Return your OpenAPI specification
  res.json({
    openapi: "3.0.0",
    info: {
      title: "Your Service API",
      version: "1.0.0",
      description: "API for Your Service"
    },
    paths: {
      // Define your API paths here
    }
  });
});

// Setup MCP adapter
const adapter = createExpressAdapter(mcp);
app.use(adapter);

// Start the server
app.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
  console.log(`OpenAPI specification available at: http://localhost:${PORT}/openapi.json`);
});
```

### 3. Update package.json Scripts

Add these scripts to your package.json:

```json
"scripts": {
  "build": "tsc",
  "start": "node --no-warnings dist/index.js",
  "dev": "ts-node src/index.ts",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

## Testing

### 1. Create Test Files

Create test files in the `tests` directory for each component of your MCP server.

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch
```

### 3. Test with MCP Inspector

Create a `run-inspector.ts` file:

```typescript
import { spawn } from 'child_process';
import path from 'path';

// Configuration
const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;

// Start the server
console.log('Starting MCP server...');
const server = spawn('ts-node', ['src/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: PORT.toString() }
});

// Handle server exit
server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping server...');
  server.kill('SIGINT');
});
```

Run the inspector:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000
```

## Deployment Preparation

### 1. Create Dockerfile

Create a `Dockerfile` in the root directory:

```dockerfile
FROM node:16-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the TypeScript project
RUN npm run build

# Runtime stage to reduce image size
FROM node:16-alpine

WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/mcp-manifest.json ./

# Expose port for MCP server
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
```

### 2. Create smithery.yaml

Create a `smithery.yaml` file in the root directory:

```yaml
version: 1
type: docker

# Build configuration
build:
  dockerfile: Dockerfile
  dockerBuildPath: .

# Runtime configuration
runtime:
  port: 3000

# MCP configuration  
mcp:
  manifest: mcp-manifest.json

# Start command configuration
startCommand:
  type: stdio
  configSchema:
    # JSON Schema defining the configuration options for the MCP
    type: object
    properties:
      apiKey:
        type: string
        description: "The API key for your service (optional)."
  commandFunction: |
    (config) => ({ 
      command: 'node', 
      args: ['dist/index.js'], 
      env: config.apiKey ? { API_KEY: config.apiKey } : {} 
    })
```

### 3. Test Docker Build Locally

```bash
# Build the Docker image
docker build -t your-mcp-server .

# Run the Docker container
docker run -p 3000:3000 your-mcp-server
```

## Smithery Deployment

### 1. Push to GitHub

```bash
# Add all files
git add .

# Commit changes
git commit -m "Prepare for Smithery deployment"

# Push to GitHub
git push origin main
```

### 2. Deploy on Smithery

1. Go to [Smithery](https://smithery.ai)
2. Add your server or claim it if it's already listed
3. Navigate to your server page
4. Click on the "Deploy" tab (only visible to authenticated server owners)
5. Follow the deployment instructions

### 3. Verify Deployment

After deployment, verify that your MCP server is working correctly by:

1. Testing the playground on your server page
2. Checking the logs for any errors
3. Verifying that all endpoints are accessible

## Troubleshooting

### Common Issues and Solutions

1. **Smithery.yaml Configuration Error**
   - Ensure the `startCommand` section is properly configured
   - Verify that the `commandFunction` returns the correct command

2. **Docker Build Errors**
   - Check that all dependencies are properly installed
   - Verify that the TypeScript build process works correctly

3. **MCP Protocol Errors**
   - Ensure your server implements the required MCP endpoints
   - Verify that your OpenAPI specification is correctly formatted

4. **Authentication Issues**
   - Check that your OAuth configuration is correct
   - Verify that your API key handling works as expected

## Best Practices

1. **Code Organization**
   - Separate your code into modules for better maintainability
   - Use TypeScript interfaces for type safety

2. **Error Handling**
   - Implement proper error handling for all API calls
   - Return meaningful error messages to clients

3. **Security**
   - Never hardcode API keys or secrets
   - Use environment variables for sensitive information

4. **Testing**
   - Write comprehensive tests for all components
   - Test with the MCP Inspector before deployment

5. **Documentation**
   - Document your API endpoints thoroughly
   - Provide clear instructions for using your MCP server

6. **Deployment**
   - Use multi-stage Docker builds to reduce image size
   - Test your Docker build locally before deploying to Smithery

7. **Monitoring**
   - Implement logging for debugging
   - Monitor your server's performance and usage

---

This workflow document provides a comprehensive guide for building and deploying MCP servers. Adjust the steps as needed for your specific project requirements. 