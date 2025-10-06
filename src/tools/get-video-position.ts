import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { VideoPlaybackPosition, MCPToolResult, isAPIError } from '../types/index.js';
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
    const validations = [] as ReturnType<typeof validationError>[];

    if (!params.document_id) {
      validations.push(validationError('document_id', 'Document ID is required'));
    }

    return combineValidationResults(validations as any);
  }

  async execute(params: { document_id: string }): Promise<MCPToolResult<VideoPlaybackPosition>> {
    try {
      this.logger.debug('Getting video position for document:', params.document_id as any);
      const result = await this.api.getVideoPosition(params.document_id);
      this.logger.debug('Successfully retrieved video position:', result as any);
      return { result };
    } catch (error) {
      this.logger.error('Error getting video position:', error as any);
      if (isAPIError(error)) throw error;
      return { result: { document_id: params.document_id, position: 0, percentage: 0, last_updated: new Date().toISOString() }, success: false, error: 'Failed to get video position' };
    }
  }
} 