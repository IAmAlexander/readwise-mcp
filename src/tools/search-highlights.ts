import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { SearchParams, SearchResult, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired, validateNumberRange } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

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
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }
  
  /**
   * Validate the parameters
   */
  validate(params: SearchParams): ValidationResult {
    const requiredValidation = validateRequired(params, 'query', 'Search query is required');
    if (!requiredValidation.valid) {
      return requiredValidation;
    }
    
    return validateNumberRange(params, 'limit', 1, undefined, 'Limit must be a positive number');
  }
  
  /**
   * Execute the tool
   */
  async execute(params: SearchParams): Promise<MCPToolResult<SearchResult[]>> {
    try {
      this.logger.debug('Executing search_highlights tool', { query: params.query, limit: params.limit } as any);
      const results = await this.api.searchHighlights(params);
      this.logger.debug(`Found ${results.length} search results`);
      return { result: results };
    } catch (error) {
      this.logger.error('Error executing search_highlights tool', error as any);
      
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