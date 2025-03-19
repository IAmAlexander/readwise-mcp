import { BaseMCPTool } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { GetHighlightsParams, Highlight, PaginatedResponse, MCPToolResult, isAPIError } from '../types';
import { ValidationResult, validateNumberRange } from '../types/validation';
import { Logger } from '../utils/logger';

/**
 * Tool for retrieving highlights from Readwise
 */
export class GetHighlightsTool extends BaseMCPTool<GetHighlightsParams, PaginatedResponse<Highlight>> {
  /**
   * The name of the tool
   */
  readonly name = 'get_highlights';
  
  /**
   * The description of the tool
   */
  readonly description = 'Retrieve highlights from your Readwise library';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      book_id: {
        type: 'string',
        description: 'Filter highlights by book ID'
      },
      page: {
        type: 'integer',
        description: 'The page number for pagination'
      },
      page_size: {
        type: 'integer',
        description: 'The number of results per page'
      },
      search: {
        type: 'string',
        description: 'Search term to filter highlights'
      }
    }
  };
  
  /**
   * Create a new GetHighlightsTool
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
  validate(params: GetHighlightsParams): ValidationResult {
    // Nothing to validate if no parameters provided
    if (!params.page && !params.page_size) {
      return super.validate(params);
    }
    
    const validations = [];
    
    // Only validate page if provided
    if (params.page !== undefined) {
      validations.push(validateNumberRange(params, 'page', 1, undefined, 'Page must be a positive number'));
    }
    
    // Only validate page_size if provided
    if (params.page_size !== undefined) {
      validations.push(validateNumberRange(params, 'page_size', 1, 100, 'Page size must be a number between 1 and 100'));
    }
    
    // If validations array is empty, return success
    if (validations.length === 0) {
      return super.validate(params);
    }
    
    // Check each validation result
    for (const validation of validations) {
      if (validation && !validation.success) {
        return validation;
      }
    }
    
    // All validations passed
    return super.validate(params);
  }
  
  /**
   * Execute the tool
   * @param params - The parameters for the request
   * @returns Promise resolving to an object with a result property containing highlights
   */
  async execute(params: GetHighlightsParams): Promise<MCPToolResult<PaginatedResponse<Highlight>>> {
    try {
      this.logger.debug('Executing get_highlights tool', params);
      const highlights = await this.api.getHighlights(params);
      this.logger.debug(`Retrieved ${highlights.results.length} highlights`);
      return { result: highlights };
    } catch (error) {
      this.logger.error('Error executing get_highlights tool', error);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: { count: 0, next: null, previous: null, results: [] },
        success: false,
        error: 'An unexpected error occurred while fetching highlights'
      };
    }
  }
} 