// Runtime imports
import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { validateNumberRange } from '../types/validation.js';
import { isAPIError } from '../types/guards.js';

// Type imports
import type { PaginatedResponse, Book, MCPToolResult, ResponseFormat } from '../types/index.js';
import type { ValidationResult } from '../types/validation.js';

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

  /**
   * Response format (full or compact)
   */
  format?: ResponseFormat;
}

/**
 * Tool to get books from Readwise API
 */
export class GetBooksTool extends BaseMCPTool<GetBooksParams, PaginatedResponse<Book> | { count: number; results: any[] }> {
  /**
   * Tool name
   */
  name = 'get_books';

  /**
   * Tool description
   */
  description = 'Get a list of books from Readwise. Use format="compact" for token-optimized responses.';

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
      },
      format: {
        type: 'string',
        enum: ['full', 'compact'],
        description: 'Response format. Use "compact" for token-optimized responses (recommended for LLM context)',
        default: 'full'
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

    const validations: ValidationResult[] = [];

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
      if (validation && !validation.valid) {
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
  async execute(params: GetBooksParams): Promise<MCPToolResult<PaginatedResponse<Book> | { count: number; results: any[] }>> {
    try {
      this.logger.debug('Executing get_books tool', params as any);
      const { format, ...apiParams } = params;
      const books = await this.api.getBooksOptimized(apiParams, format || 'full');
      this.logger.debug(`Retrieved ${books.results.length} books`);
      return { result: books as PaginatedResponse<Book> };
    } catch (error) {
      this.logger.error('Error executing get_books tool', error as any);

      if (isAPIError(error)) {
        throw error;
      }

      this.logger.error('Error fetching books from Readwise API', { error } as any);
      return {
        result: { count: 0, next: null, previous: null, results: [] },
        success: false,
        error: 'An unexpected error occurred while fetching books'
      };
    }
  }
}
