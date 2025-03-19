import { BaseMCPTool } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { SearchByDateParams, Highlight, MCPToolResult, isAPIError, PaginatedResponse } from '../types';
import { ValidationResult, validateAllowedValues, validateNumberRange } from '../types/validation';
import { Logger } from '../utils/logger';

/**
 * Tool for searching highlights by date range
 */
export class SearchByDateTool extends BaseMCPTool<SearchByDateParams, PaginatedResponse<Highlight>> {
  /**
   * The name of the tool
   */
  readonly name = 'search_by_date';
  
  /**
   * The description of the tool
   */
  readonly description = 'Search highlights by date range';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description: 'Start date in ISO format (e.g. 2024-01-01)'
      },
      end_date: {
        type: 'string',
        description: 'End date in ISO format (e.g. 2024-12-31)'
      },
      date_field: {
        type: 'string',
        enum: ['created_at', 'updated_at', 'highlighted_at'],
        description: 'Which date field to search on'
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
   * Create a new SearchByDateTool
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
  validate(params: SearchByDateParams): ValidationResult {
    const validations = [];
    
    // Validate date field if provided
    if (params.date_field !== undefined) {
      validations.push(
        validateAllowedValues(
          params,
          'date_field',
          ['created_at', 'updated_at', 'highlighted_at'],
          'Invalid date field'
        )
      );
    }
    
    // Validate date format if provided
    if (params.start_date !== undefined) {
      const startDate = new Date(params.start_date);
      if (isNaN(startDate.getTime())) {
        return {
          success: false,
          errors: [{
            field: 'start_date',
            message: 'Invalid date format. Use ISO format (e.g. 2024-01-01)'
          }]
        };
      }
    }
    
    if (params.end_date !== undefined) {
      const endDate = new Date(params.end_date);
      if (isNaN(endDate.getTime())) {
        return {
          success: false,
          errors: [{
            field: 'end_date',
            message: 'Invalid date format. Use ISO format (e.g. 2024-12-31)'
          }]
        };
      }
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
  async execute(params: SearchByDateParams): Promise<MCPToolResult<PaginatedResponse<Highlight>>> {
    try {
      this.logger.debug('Executing search_by_date tool', params);
      const result = await this.api.searchByDate(params);
      this.logger.debug(`Found ${result.count} highlights in date range`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing search_by_date tool', error);
      
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
        error: 'An unexpected error occurred while searching by date'
      };
    }
  }
} 