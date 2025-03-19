import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import express from 'express';
import serverless from 'serverless-http';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createServer } from 'http';
import { ReadwiseMCPServer } from './server';
import { getConfig } from './utils/config';
import { Logger, LogLevel } from './utils/logger';

// Create an Express app
const app = express();

// Configure middleware
app.use(bodyParser.json());
app.use(cors());

// Get config
const config = getConfig();

// Create a logger
const logger = Logger.forTransport('sse', config.debug);

// Create HTTP server
const server = createServer(app);

// Create MCP server
const mcpServer = new ReadwiseMCPServer(
  config.readwiseApiKey,
  config.port,
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

// Create a serverless handler
const handler = serverless(app);

/**
 * AWS Lambda handler function
 */
export const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.debug('Received event', event);
  
  try {
    // Process the event using serverless-http
    const result = await handler(event, {} as any);
    
    if (typeof result === 'object' && result !== null && 'statusCode' in result) {
      logger.debug('Processed event', { statusCode: (result as any).statusCode });
      return result as APIGatewayProxyResult;
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Invalid handler response'
      })
    };
  } catch (error) {
    logger.error('Error handling event', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error'
      })
    };
  }
}; 