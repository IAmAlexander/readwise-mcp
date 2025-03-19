import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import serverless from 'serverless-http';
import app from './serverless';

// Create a serverless handler for AWS Lambda
const handler = serverless(app);

// Export the Lambda handler
export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // You can add pre-processing logic here if needed
  
  // Call the serverless handler
  return await handler(event, context);
}; 