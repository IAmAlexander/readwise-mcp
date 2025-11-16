import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { GetRecentContentParams, RecentContentResponse, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateNumberRange } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

/**
 * Tool for getting recent content
 */
export class GetRecentContentTool extends BaseMCPTool<GetRecentContentParams, RecentContentResponse> {
  /**
   * The name of the tool
   */
  readonly name = 'get_recent_content';

  /**
   * The description of the tool
   */
  readonly description = 'Get the most recently added or updated content from your Readwise library';

  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of recent items to retrieve (default: 10, max: 50)',
        minimum: 1,
        maximum: 50,
        default: 10
      },
      content_type: {
        type: 'string',
        enum: ['books', 'highlights', 'all'],
        description: 'Type of content to retrieve (default: all)',
        default: 'all'
      }
    },
    required: []
  };

  /**
   * Create a new GetRecentContentTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  /**
   * Validate the parameters
   */
  validate(params: GetRecentContentParams): ValidationResult {
    const validations = [];

    // Validate limit if provided
    if (params.limit !== undefined) {
      validations.push(validateNumberRange(params, 'limit', 1, 50, 'Limit must be between 1 and 50'));
    }

    // Check each validation result
    for (const validation of validations) {
      if (!validation.valid) {
        return validation;
      }
    }

    // All validations passed
    return super.validate(params);
  }

  /**
   * Execute the tool
   */
  async execute(params: GetRecentContentParams): Promise<MCPToolResult<RecentContentResponse>> {
    try {
      this.logger.debug('Executing get_recent_content tool', params as any);
      const result = await this.api.getRecentContent(params);
      this.logger.debug(`Retrieved ${result.count} recent items`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing get_recent_content tool', error as any);

      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }

      // Handle unexpected errors with proper result format
      throw error;
    }
  }
}
