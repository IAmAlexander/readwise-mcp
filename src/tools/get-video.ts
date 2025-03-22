import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { Logger } from '../utils/logger.js';
import { VideoDetailsResponse } from '../types/index.js';
import { validationError, combineValidationResults } from '../types/validation.js';

export class GetVideoTool extends BaseMCPTool<{ document_id: string }, VideoDetailsResponse> {
  readonly name = 'get_video';
  readonly description = 'Get details of a specific video from your Readwise library';
  readonly parameters = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The ID of the video to retrieve'
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
      this.logger.debug('Getting video details for document:', params.document_id);
      const result = await this.api.getVideo(params.document_id);
      this.logger.debug('Successfully retrieved video details:', result);
      return { result };
    } catch (error) {
      this.logger.error('Error getting video details:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get video details: ${error.message}`);
      }
      throw error;
    }
  }
} 