/**
 * Type guards for Readwise MCP types
 */

/**
 * Utility function to check if an error is an API error
 */
export function isAPIError(error: unknown): boolean {
  return error !== null && 
         typeof error === 'object' && 
         'type' in error && 
         (error as any).type === 'api';
} 