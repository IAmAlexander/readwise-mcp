import { BaseMCPTool } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { AdvancedSearchParams, AdvancedSearchResult, MCPToolResult, isAPIError } from '../types';
import { ValidationResult, validateArray, validateNumberRange, validateAllowedValues } from '../types/validation';
import { Logger } from '../utils/logger';

/**
 * Tool for advanced search with multiple filters and facets
 */
export class AdvancedSearchTool extends BaseMCPTool<AdvancedSearchParams, AdvancedSearchResult> {
  /**
   * The name of the tool
   */
  readonly name = 'advanced_search';
  
  /**
   * The description of the tool
   */
  readonly description = 'Search highlights with advanced filters and facets';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Optional search query'
      },
      book_ids: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional list of book IDs to filter by'
      },
      tags: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional list of tags to filter by'
      },
      categories: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional list of categories to filter by'
      },
      date_range: {
        type: 'object',
        properties: {
          start: {
            type: 'string',
            description: 'Start date in ISO format'
          },
          end: {
            type: 'string',
            description: 'End date in ISO format'
          }
        }
      },
      location_range: {
        type: 'object',
        properties: {
          start: {
            type: 'number',
            description: 'Start location'
          },
          end: {
            type: 'number',
            description: 'End location'
          }
        }
      },
      has_note: {
        type: 'boolean',
        description: 'Filter highlights that have notes'
      },
      sort_by: {
        type: 'string',
        enum: ['created_at', 'updated_at', 'highlighted_at', 'location'],
        description: 'Field to sort by'
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order'
      },
      page: {
        type: 'number',
        description: 'Page number for pagination'
      },
      page_size: {
        type: 'number',
        description: 'Number of results per page'
      }
    }
  };
  
  /**
   * Create a new AdvancedSearchTool
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
  validate(params: AdvancedSearchParams): ValidationResult {
    const validations = [];
    
    // Validate arrays if provided
    if (params.book_ids !== undefined) {
      validations.push(validateArray(params, 'book_ids', 'Book IDs must be an array of strings'));
    }
    
    if (params.tags !== undefined) {
      validations.push(validateArray(params, 'tags', 'Tags must be an array of strings'));
    }
    
    if (params.categories !== undefined) {
      validations.push(validateArray(params, 'categories', 'Categories must be an array of strings'));
    }
    
    // Validate sort parameters if provided
    if (params.sort_by !== undefined) {
      validations.push(
        validateAllowedValues(
          params,
          'sort_by',
          ['created_at', 'updated_at', 'highlighted_at', 'location'],
          'Invalid sort field'
        )
      );
    }
    
    if (params.sort_order !== undefined) {
      validations.push(
        validateAllowedValues(
          params,
          'sort_order',
          ['asc', 'desc'],
          'Sort order must be "asc" or "desc"'
        )
      );
    }
    
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
  async execute(params: AdvancedSearchParams): Promise<MCPToolResult<AdvancedSearchResult>> {
    try {
      this.logger.debug('Executing advanced_search tool', params);
      const result = await this.api.advancedSearch(params);
      this.logger.debug(`Found ${result.highlights.count} highlights`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing advanced_search tool', error);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: {
          highlights: {
            count: 0,
            next: null,
            previous: null,
            results: []
          }
        },
        success: false,
        error: 'An unexpected error occurred while searching'
      };
    }
  }
} 