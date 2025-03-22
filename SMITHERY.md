# Deploying to Smithery AI

This document explains how to deploy the Readwise MCP server to Smithery AI.

## Prerequisites

1. A GitHub account linked to Smithery AI
2. Readwise API token
3. The repository pushed to GitHub (already done)

## Deployment Steps

1. Go to [Smithery AI](https://smithery.ai/) and log in with your GitHub account
2. Click on "Add Server" button
3. Select this repository from the list
4. Configure deployment settings:
   - The Smithery configuration is already set up in `smithery.yaml`
   - This file defines the configuration options needed (Readwise API token, port, etc.)
   - The Dockerfile is also already set up
5. Click "Deploy" on the Smithery Deployments tab of your server page

## Configuration

The Readwise MCP server requires the following configuration:

- `readwiseApiToken`: Your Readwise API token (required)
- `port`: Port to run the server on (default: 3001)
- `debug`: Enable debug logging (default: false)

## Available Tools

The simplified Smithery deployment includes the following tools:

1. `getBooks`: Retrieve books from your Readwise account
2. `getHighlights`: Retrieve highlights from your Readwise account

## Troubleshooting

If you encounter issues with the deployment:

1. Check the Smithery logs for any error messages
2. Verify that your Readwise API token is valid
3. Make sure the GitHub repository is public or properly shared with Smithery

## Local Testing

To test the Smithery configuration locally:

```bash
# Install Smithery CLI if not already installed
npm install -g @smithery/cli

# Run the server with test configuration
npx @smithery/cli run server-readwise-mcp --config '{"readwiseApiToken":"your-token-here"}'
```

Use the MCP Inspector to test the server:

```bash
npx @modelcontextprotocol/inspector npx @smithery/cli run server-readwise-mcp --config '{"readwiseApiToken":"your-token-here"}'
``` 