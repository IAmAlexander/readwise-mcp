import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { CreateVideoHighlightParams, VideoHighlight, MCPToolResult, isAPIError } from '../types/index.js';
import { validationError, combineValidationResults } from '../types/validation.js';

export class CreateVideoHighlightTool extends BaseMCPTool<CreateVideoHighlightParams, VideoHighlight> {
  readonly name = 'create_video_highlight';
  readonly description = 'Create a highlight on a video at a specific timestamp';
  readonly parameters = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The ID of the video'
      },
      text: {
        type: 'string',
        description: 'The text of the highlight'
      },
      timestamp: {
        type: 'string',
        description: 'The timestamp where the highlight occurs (e.g., "14:35")'
      },
      note: {
        type: 'string',
        description: 'Optional note about the highlight'
      }
    },
    required: ['document_id', 'text', 'timestamp']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  validate(params: CreateVideoHighlightParams) {
    const validations = [] as ReturnType<typeof validationError>[];

    if (!params.document_id) {
      validations.push(validationError('document_id', 'Document ID is required'));
    }

    if (!params.text) {
      validations.push(validationError('text', 'Highlight text is required'));
    }

    if (!params.timestamp) {
      validations.push(validationError('timestamp', 'Timestamp is required'));
    } else if (!this.isValidTimestamp(params.timestamp)) {
      validations.push(validationError('timestamp', 'Invalid timestamp format. Use "MM:SS" or "HH:MM:SS"'));
    }

    return combineValidationResults(validations as any);
  }

  private isValidTimestamp(timestamp: string): boolean {
    const pattern = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/;
    return pattern.test(timestamp);
  }

  async execute(params: CreateVideoHighlightParams): Promise<MCPToolResult<VideoHighlight>> {
    try {
      this.logger.debug('Creating video highlight with params:', params as any);
      const result = await this.api.createVideoHighlight(params as any);
      this.logger.debug('Successfully created video highlight:', result as any);
      return { result };
    } catch (error) {
      this.logger.error('Error creating video highlight:', error as any);
      if (isAPIError(error)) throw error;
      return { result: { id: '', document_id: params.document_id, text: params.text, timestamp: params.timestamp }, success: false, error: 'Failed to create video highlight' } as any;
    }
  }
} 