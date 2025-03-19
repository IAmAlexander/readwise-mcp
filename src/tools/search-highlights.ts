import { BaseMCPTool } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { SearchParams, SearchResult, MCPToolResult, isAPIError } from '../types';
import { ValidationResult, validateRequired, validateNumberRange } from '../types/validation';
import { Logger } from '../utils/logger';

/**
 * Tool for searching highlights in Readwise
 */
export class SearchHighlightsTool extends BaseMCPTool<SearchParams, SearchResult[]> {
  /**
   * The name of the tool
   */
  readonly name = 'search_highlights';
  
  /**
   * The description of the tool
   */
  readonly description = 'Search for highlights in your Readwise library';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query'
      },
      limit: {
        type: 'integer',
        description: 'The maximum number of results to return'
      }
    },
    required: ['query']
  };
  
  /**
   * Create a new SearchHighlightsTool
   * @param api - The ReadwiseAPI instance to use
   * @param logger - The logger instance
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }
  
  /**
   * Validate the parameters
   * @param params - The parameters to validate
   * @returns Validation result
   */
  validate(params: SearchParams): ValidationResult {
    const requiredValidation = validateRequired(params, 'query', 'Search query is required');
    if (!requiredValidation.success) {
      return requiredValidation;
    }
    
    return validateNumberRange(params, 'limit', 1, undefined, 'Limit must be a positive number');
  }
  
  /**
   * Execute the tool
   * @param params - The parameters for the request
   * @returns Promise resolving to an object with a result property containing search results
   */
  async execute(params: SearchParams): Promise<MCPToolResult<SearchResult[]>> {
    try {
      this.logger.debug('Executing search_highlights tool', { query: params.query, limit: params.limit });
      const results = await this.api.searchHighlights(params);
      this.logger.debug(`Found ${results.length} search results`);
      return { result: results };
    } catch (error) {
      this.logger.error('Error executing search_highlights tool', error);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: [],
        success: false,
        error: 'An unexpected error occurred while searching highlights'
      };
    }
  }
} 