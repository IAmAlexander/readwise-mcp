import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { Logger } from '../utils/logger.js';
import { GetVideosParams, VideoResponse } from '../types/index.js';
import { ValidationResult, validationSuccess, validationError, combineValidationResults } from '../types/validation.js';
import { MCPToolResult } from '../types/index.js';

export class GetVideosTool extends BaseMCPTool<GetVideosParams, VideoResponse> {
  readonly name = 'get_videos';
  readonly description = 'Get videos from Readwise library';
  readonly parameters = {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of videos to return',
        minimum: 1,
        maximum: 100
      },
      pageCursor: {
        type: 'string',
        description: 'Cursor for pagination'
      },
      tags: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Filter videos by tags'
      },
      platform: {
        type: 'string',
        description: 'Filter videos by platform'
      }
    }
  };

  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  validate(params: GetVideosParams): ValidationResult {
    const results: ValidationResult[] = [];

    if (params.limit !== undefined) {
      if (params.limit < 1 || params.limit > 100) {
        results.push(validationError('limit', 'Limit must be between 1 and 100'));
      }
    }

    if (params.tags !== undefined && !Array.isArray(params.tags)) {
      results.push(validationError('tags', 'Tags must be an array'));
    }

    return combineValidationResults(results);
  }

  async execute(params: GetVideosParams): Promise<MCPToolResult<VideoResponse>> {
    try {
      this.logger.debug('Getting videos', { params });
      const result = await this.api.getVideos(params);
      this.logger.debug('Got videos', { count: result.count });
      return { result };
    } catch (error) {
      this.logger.error('Error getting videos', { error });
      throw error;
    }
  }
} 