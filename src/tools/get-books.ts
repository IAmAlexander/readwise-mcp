import { ValidationResult, validateNumberRange } from '../types/validation';
import { BaseMCPTool } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { Logger } from '../utils/logger';
import { PaginatedResponse, Book, MCPToolResult, isAPIError } from '../types';

/**
 * Parameters for the GetBooksTool
 */
export interface GetBooksParams {
  /**
   * Page number to retrieve
   */
  page?: number;
  
  /**
   * Number of items per page
   */
  page_size?: number;
}

/**
 * Tool to get books from Readwise API
 */
export class GetBooksTool extends BaseMCPTool<GetBooksParams, PaginatedResponse<Book>> {
  /**
   * Tool name
   */
  name = 'get_books';
  
  /**
   * Tool description
   */
  description = 'Get a list of books from Readwise';
  
  /**
   * JSON Schema for the parameters
   */
  parameters = {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Page number to retrieve'
      },
      page_size: {
        type: 'number',
        description: 'Number of items per page (max 100)'
      }
    }
  };
  
  /**
   * Constructor
   * @param api - Readwise API client
   * @param logger - Logger instance
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }
  
  /**
   * Validate the parameters
   * @param params - The parameters to validate
   * @returns Validation result
   */
  validate(params: GetBooksParams): ValidationResult {
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
   * @param params - The parameters to use for execution
   * @returns Promise resolving to an object with a result property containing books
   */
  async execute(params: GetBooksParams): Promise<MCPToolResult<PaginatedResponse<Book>>> {
    try {
      this.logger.debug('Executing get_books tool', params);
      const books = await this.api.getBooks({
        page: params.page,
        page_size: params.page_size
      });
      this.logger.debug(`Retrieved ${books.results.length} books`);
      return { result: books };
    } catch (error) {
      this.logger.error('Error executing get_books tool', error);
      
      if (isAPIError(error)) {
        throw error;
      }
      
      this.logger.error('Error fetching books from Readwise API', { error });
      return {
        result: { count: 0, next: null, previous: null, results: [] },
        success: false,
        error: 'An unexpected error occurred while fetching books'
      };
    }
  }
} 