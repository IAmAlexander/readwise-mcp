import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { GetHighlightsParams, Highlight, PaginatedResponse, MCPToolResult, isAPIError, ResponseFormat } from '../types/index.js';
import { ValidationResult, validateNumberRange } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

interface GetHighlightsWithFormatParams extends GetHighlightsParams {
  format?: ResponseFormat;
}

/**
 * Tool for retrieving highlights from Readwise
 */
export class GetHighlightsTool extends BaseMCPTool<GetHighlightsWithFormatParams, PaginatedResponse<Highlight> | { count: number; results: any[] }> {
  /**
   * The name of the tool
   */
  readonly name = 'get_highlights';

  /**
   * The description of the tool
   */
  readonly description = 'Retrieve highlights from your Readwise library. Use format="compact" for token-optimized responses.';

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
   * Create a new GetHighlightsTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  /**
   * Validate the parameters
   */
  validate(params: GetHighlightsWithFormatParams): ValidationResult {
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
   */
  async execute(params: GetHighlightsWithFormatParams): Promise<MCPToolResult<PaginatedResponse<Highlight> | { count: number; results: any[] }>> {
    try {
      this.logger.debug('Executing get_highlights tool', params as any);
      const { format, ...apiParams } = params;
      const highlights = await this.api.getHighlightsOptimized(apiParams, format || 'full');
      this.logger.debug(`Retrieved ${highlights.results.length} highlights`);
      return { result: highlights as PaginatedResponse<Highlight> };
    } catch (error) {
      this.logger.error('Error executing get_highlights tool', error as any);

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
