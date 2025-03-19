import { BaseMCPTool } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { GetReadingListParams, ReadingListResponse, MCPToolResult, isAPIError } from '../types';
import { ValidationResult, validateNumberRange, validateAllowedValues } from '../types/validation';
import { Logger } from '../utils/logger';

/**
 * Tool for retrieving a list of documents with their reading progress
 */
export class GetReadingListTool extends BaseMCPTool<GetReadingListParams, ReadingListResponse> {
  /**
   * The name of the tool
   */
  readonly name = 'get_reading_list';
  
  /**
   * The description of the tool
   */
  readonly description = 'Get a list of documents with their reading progress from your Readwise library';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['not_started', 'in_progress', 'completed'],
        description: 'Filter by reading status'
      },
      category: {
        type: 'string',
        description: 'Filter by document category'
      },
      page: {
        type: 'integer',
        minimum: 1,
        description: 'The page number for pagination'
      },
      page_size: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'The number of results per page'
      }
    }
  };
  
  /**
   * Create a new GetReadingListTool
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
  validate(params: GetReadingListParams): ValidationResult {
    const validations = [];
    
    // Validate status if provided
    if (params.status) {
      validations.push(
        validateAllowedValues(params, 'status', ['not_started', 'in_progress', 'completed'], 'Invalid reading status')
      );
    }
    
    // Validate page if provided
    if (params.page !== undefined) {
      validations.push(
        validateNumberRange(params, 'page', 1, undefined, 'Page must be a positive number')
      );
    }
    
    // Validate page_size if provided
    if (params.page_size !== undefined) {
      validations.push(
        validateNumberRange(params, 'page_size', 1, 100, 'Page size must be a number between 1 and 100')
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
   * @returns Promise resolving to an object with a result property containing the reading list
   */
  async execute(params: GetReadingListParams): Promise<MCPToolResult<ReadingListResponse>> {
    try {
      this.logger.debug('Executing get_reading_list tool', params);
      const readingList = await this.api.getReadingList(params);
      this.logger.debug(`Retrieved reading list with ${readingList.count} documents`);
      return { result: readingList };
    } catch (error) {
      this.logger.error('Error executing get_reading_list tool', error);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: {
          count: 0,
          next: undefined,
          previous: undefined,
          results: []
        },
        success: false,
        error: 'An unexpected error occurred while fetching reading list'
      };
    }
  }
} 