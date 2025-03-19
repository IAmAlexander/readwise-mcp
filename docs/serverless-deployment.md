# Serverless Deployment Guide

This guide provides instructions for deploying the Readwise MCP server to various serverless platforms.

## Prerequisites

- Node.js 16.x or 18.x
- npm or yarn
- Git
- An account on the serverless platform of your choice
- Readwise API key

## Environment Variables

For all deployments, you'll need to set the following environment variables:

- `READWISE_API_KEY`: Your Readwise API key
- `READWISE_API_BASE_URL`: The Readwise API base URL (default: https://readwise.io/api/v2)
- `DEBUG`: Set to "true" to enable debug logging (default: false)

## Vercel Deployment

### Setup

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Deploy

1. Deploy to Vercel preview environment:
   ```bash
   npm run deploy
   ```

2. Deploy to Vercel production environment:
   ```bash
   npm run deploy:prod
   ```

3. Set environment variables in the Vercel dashboard or using the CLI:
   ```bash
   vercel env add READWISE_API_KEY
   ```

### Configuration

The Vercel deployment uses the `vercel.json` file in the root of the project to configure the deployment. You can modify this file to change the deployment settings.

## AWS Lambda Deployment

### Setup

1. Install the Serverless Framework:
   ```bash
   npm install -g serverless
   ```

2. Configure AWS credentials:
   ```bash
   serverless config credentials --provider aws --key YOUR_ACCESS_KEY --secret YOUR_SECRET_KEY
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Deploy

1. Deploy to AWS Lambda:
   ```bash
   npm run sls:deploy
   ```

2. Deploy to production stage:
   ```bash
   npm run sls:deploy:prod
   ```

### Configuration

The AWS Lambda deployment uses the `serverless.yml` file in the root of the project to configure the deployment. You can modify this file to change the deployment settings.

## Google Cloud Functions Deployment

### Setup

1. Install the Google Cloud SDK:
   ```bash
   # Follow instructions at https://cloud.google.com/sdk/docs/install
   ```

2. Login to Google Cloud:
   ```bash
   gcloud auth login
   ```

3. Set your project:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

4. Build the project:
   ```bash
   npm run build
   ```

### Deploy

1. Deploy to Google Cloud Functions:
   ```bash
   gcloud functions deploy readwise-mcp \
     --runtime nodejs18 \
     --trigger-http \
     --allow-unauthenticated \
     --entry-point readwiseMcpFunction \
     --source dist \
     --set-env-vars READWISE_API_KEY=YOUR_API_KEY,DEBUG=false
   ```

### Configuration

The Google Cloud Functions deployment uses the `gcf.ts` file in the `src` directory as the entry point. The function is exported as `readwiseMcpFunction`.

## Testing Your Deployment

After deploying to any platform, you can test your deployment by visiting the URL provided by the platform. You should see a welcome page with information about the Readwise MCP server.

To test the MCP functionality, you can use the `/status` endpoint to check the server status:

```
https://your-deployment-url/status
```

## Connecting to Your Deployment

To connect to your deployed MCP server from Claude or other MCP-compatible assistants, use the following URL:

```
https://your-deployment-url/sse
```

## Troubleshooting

### Common Issues

1. **Connection Errors**: Ensure your serverless function has the correct permissions and environment variables.

2. **Timeout Errors**: If you're experiencing timeout errors, you may need to increase the timeout setting for your serverless function.

3. **Memory Errors**: If you're experiencing memory errors, you may need to increase the memory allocation for your serverless function.

4. **CORS Errors**: If you're experiencing CORS errors, ensure that CORS is properly configured in your serverless function.

### Logs

To view logs for your serverless function:

- **Vercel**: Use the Vercel dashboard or run `vercel logs`
- **AWS Lambda**: Use the AWS CloudWatch console or run `serverless logs -f api`
- **Google Cloud Functions**: Use the Google Cloud Console or run `gcloud functions logs read readwise-mcp`

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [Google Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/) 