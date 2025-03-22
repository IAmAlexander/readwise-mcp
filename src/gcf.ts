import { Request, Response } from 'express';
import app from './serverless.js';

/**
 * Google Cloud Function handler for HTTP functions
 * 
 * @param req - Express Request object
 * @param res - Express Response object
 */
export const readwiseMcpFunction = (req: Request, res: Response): void => {
  // Pass the request to the Express app
  return app(req, res);
};

// Export the function as the default export for Google Cloud Functions
export default readwiseMcpFunction; 