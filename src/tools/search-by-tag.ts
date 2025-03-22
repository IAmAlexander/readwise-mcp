import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { SearchByTagParams, Highlight, MCPToolResult, isAPIError, PaginatedResponse } from '../types/index.js';
import { ValidationResult, validateRequired, validateArray, validateNumberRange } from '../types/validation.js';
import { Logger } from '../utils/logger.js';

/**
 * Tool for searching highlights by tags
 */
export class SearchByTagTool extends BaseMCPTool<SearchByTagParams, PaginatedResponse<Highlight>> {
  /**
   * The name of the tool
   */
  readonly name = 'search_by_tag';
  
  /**
   * The description of the tool
   */
  readonly description = 'Search highlights by tags';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'List of tags to search for'
      },
      match_all: {
        type: 'boolean',
        description: 'Whether to match all tags (AND) or any tag (OR)'
      },
      page: {
        type: 'number',
        description: 'Page number for pagination'
      },
      page_size: {
        type: 'number',
        description: 'Number of results per page'
      }
    },
    required: ['tags']
  };
  
  /**
   * Create a new SearchByTagTool
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
  validate(params: SearchByTagParams): ValidationResult {
    const validations = [
      validateRequired(params, 'tags', 'Tags are required'),
      validateArray(params, 'tags', 'Tags must be an array of strings')
    ];
    
    // Validate pagination parameters if provided
    if (params.page !== undefined) {
      validations.push(
        validateNumberRange(params, 'page', 1, undefined, 'Page must be a positive number')
      );
    }
    
    if (params.page_size !== undefined) {
      validations.push(
        validateNumberRange(params, 'page_size', 1, 100, 'Page size must be between 1 and 100')
      );
    }
    
    // Check each validation result
    for (const validation of validations) {
      if (!validation.success) {
        return validation;
      }
    }
    
    // All validations passed
    return super.validate(params);
  }
  
  /**
   * Execute the tool
   * @param params - The parameters for the request
   * @returns Promise resolving to an object with a result property containing the search results
   */
  async execute(params: SearchByTagParams): Promise<MCPToolResult<PaginatedResponse<Highlight>>> {
    try {
      this.logger.debug('Executing search_by_tag tool', params);
      const result = await this.api.searchByTags(params);
      this.logger.debug(`Found ${result.count} highlights with specified tags`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing search_by_tag tool', error);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: {
          count: 0,
          next: null,
          previous: null,
          results: []
        },
        success: false,
        error: 'An unexpected error occurred while searching by tags'
      };
    }
  }
} 