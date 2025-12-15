import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { DailyReviewResponse, MCPToolResult, isAPIError, ResponseFormat } from '../types/index.js';
import { ValidationResult, validationSuccess } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

interface GetDailyReviewParams {
  format?: ResponseFormat;
}

interface CompactDailyReviewResponse {
  review_id: number;
  review_url: string;
  review_completed: boolean;
  highlight_count: number;
  highlights: Array<{
    id: number;
    text: string;
    title: string;
    author: string;
    note?: string;
    tags: string[];
  }>;
}

/**
 * Tool for retrieving daily review highlights (spaced repetition)
 */
export class GetDailyReviewTool extends BaseMCPTool<GetDailyReviewParams, DailyReviewResponse | CompactDailyReviewResponse> {
  /**
   * The name of the tool
   */
  readonly name = 'get_daily_review';

  /**
   * The description of the tool
   */
  readonly description = 'Get your daily review highlights using Readwise spaced repetition. Returns highlights selected by the spaced repetition algorithm for optimal retention.';

  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['full', 'compact'],
        description: 'Response format. Use "compact" for token-optimized responses (recommended for LLM context)',
        default: 'full'
      }
    }
  };

  /**
   * Create a new GetDailyReviewTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  /**
   * Validate the parameters
   */
  validate(_params: GetDailyReviewParams): ValidationResult {
    return validationSuccess();
  }

  /**
   * Execute the tool
   */
  async execute(params: GetDailyReviewParams): Promise<MCPToolResult<DailyReviewResponse | CompactDailyReviewResponse>> {
    try {
      this.logger.debug('Executing get_daily_review tool', params as any);
      const review = await this.api.getDailyReview();
      this.logger.debug(`Retrieved ${review.highlights.length} daily review highlights`);

      // Return compact format if requested
      if (params.format === 'compact') {
        const compactReview: CompactDailyReviewResponse = {
          review_id: review.review_id,
          review_url: review.review_url,
          review_completed: review.review_completed,
          highlight_count: review.highlights.length,
          highlights: review.highlights.map(h => ({
            id: h.id,
            text: h.text,
            title: h.title,
            author: h.author,
            note: h.note || undefined,
            tags: h.tags.map(t => t.name)
          }))
        };
        return { result: compactReview };
      }

      return { result: review };
    } catch (error) {
      this.logger.error('Error executing get_daily_review tool', error as any);

      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }

      // Handle unexpected errors with proper result format
      return {
        result: { review_id: 0, review_url: '', review_completed: false, highlights: [] },
        success: false,
        error: 'An unexpected error occurred while fetching daily review'
      };
    }
  }
}
