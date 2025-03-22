import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { Logger } from '../utils/logger.js';
import { UpdateVideoPositionParams, VideoPlaybackPosition } from '../types/index.js';
import { validationError, combineValidationResults } from '../types/validation.js';

export class UpdateVideoPositionTool extends BaseMCPTool<UpdateVideoPositionParams, VideoPlaybackPosition> {
  readonly name = 'update_video_position';
  readonly description = 'Update the playback position of a video';
  readonly parameters = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The ID of the video'
      },
      position: {
        type: 'number',
        description: 'Current playback position in seconds',
        minimum: 0
      },
      duration: {
        type: 'number',
        description: 'Total duration of the video in seconds',
        minimum: 0
      }
    },
    required: ['document_id', 'position', 'duration']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  validate(params: UpdateVideoPositionParams) {
    const validations = [];

    if (!params.document_id) {
      validations.push(validationError('document_id', 'Document ID is required'));
    }

    if (params.position === undefined || params.position < 0) {
      validations.push(validationError('position', 'Position must be a non-negative number'));
    }

    if (params.duration === undefined || params.duration < 0) {
      validations.push(validationError('duration', 'Duration must be a non-negative number'));
    }

    if (params.position > params.duration) {
      validations.push(validationError('position', 'Position cannot be greater than duration'));
    }

    return combineValidationResults(validations);
  }

  async execute(params: UpdateVideoPositionParams) {
    try {
      this.logger.debug('Updating video position with params:', params);
      const result = await this.api.updateVideoPosition(params);
      this.logger.debug('Successfully updated video position:', result);
      return { result };
    } catch (error) {
      this.logger.error('Error updating video position:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to update video position: ${error.message}`);
      }
      throw error;
    }
  }
} 