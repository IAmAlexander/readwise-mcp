import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { Logger } from '../utils/logger.js';
import { VideoPlaybackPosition } from '../types/index.js';
import { validationError, combineValidationResults } from '../types/validation.js';

export class GetVideoPositionTool extends BaseMCPTool<{ document_id: string }, VideoPlaybackPosition> {
  readonly name = 'get_video_position';
  readonly description = 'Get the current playback position of a video';
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
      this.logger.debug('Getting video position for document:', params.document_id);
      const result = await this.api.getVideoPosition(params.document_id);
      this.logger.debug('Successfully retrieved video position:', result);
      return { result };
    } catch (error) {
      this.logger.error('Error getting video position:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get video position: ${error.message}`);
      }
      throw error;
    }
  }
} 