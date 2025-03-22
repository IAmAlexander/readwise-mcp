import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { Logger } from '../utils/logger.js';
import { VideoHighlightsResponse } from '../types/index.js';
import { validationError, combineValidationResults } from '../types/validation.js';

export class GetVideoHighlightsTool extends BaseMCPTool<{ document_id: string }, VideoHighlightsResponse> {
  readonly name = 'get_video_highlights';
  readonly description = 'Get all highlights from a specific video';
  readonly parameters = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The ID of the video'
      }
    },
    required: ['document_id']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  validate(params: { document_id: string }) {
    const validations = [];

    if (!params.document_id) {
      validations.push(validationError('document_id', 'Document ID is required'));
    }

    return combineValidationResults(validations);
  }

  async execute(params: { document_id: string }) {
    try {
      this.logger.debug('Getting video highlights for document:', params.document_id);
      const result = await this.api.getVideoHighlights(params.document_id);
      this.logger.debug('Successfully retrieved video highlights:', result);
      return { result };
    } catch (error) {
      this.logger.error('Error getting video highlights:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get video highlights: ${error.message}`);
      }
      throw error;
    }
  }
} 