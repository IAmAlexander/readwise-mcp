import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import express from 'express';
import serverless from 'serverless-http';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer } from 'http';
import { ReadwiseMCPServer } from './server.js';
import { getConfig } from './utils/config.js';
import { SafeLogger } from './utils/safe-logger.js';
import { LogLevel } from './utils/logger-interface.js';

// Create an Express app
const app = express();

// Configure middleware
app.use(bodyParser.json());
app.use(cors());

// Get config
const config = getConfig();

// Create logger instance
const logger = new SafeLogger({
  level: LogLevel.INFO,
  transport: console.error,
  timestamps: true,
  colors: true
});

// Create HTTP server
const server = createServer(app);

// Create MCP server
const mcpServer = new ReadwiseMCPServer(
  process.env.READWISE_API_KEY || '',
  Number(process.env.PORT) || 3000,
  logger,
  'sse'
);

// Setup routes
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime()
  });
});

app.post('/mcp', (req, res) => {
  const requestId = req.body.request_id;
  
  if (!requestId) {
    res.status(400).json({
      error: 'Missing request_id'
    });
    return;
  }
  
  // Handle the request
  mcpServer.handleMCPRequest(req.body, (response) => {
    // Send the response back
    res.json(response);
  });
});

// Start the server
mcpServer.start().catch(err => logger.error('Failed to start server:', err as any));

// Create a serverless handler
const handler = serverless(app);

// Export the serverless handler
export const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.debug('Received event', event as any);
  
  try {
    // Process the event using serverless-http
    const result = await handler(event, {} as any);
    
    if (typeof result === 'object' && result !== null && 'statusCode' in result) {
      logger.debug('Processed event', { statusCode: (result as any).statusCode } as any);
      return result as APIGatewayProxyResult;
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Invalid handler response'
      })
    };
  } catch (error) {
    logger.error('Error handling event', error as any);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error'
      })
    };
  }
};

// Export the Express app as default
export default app; 