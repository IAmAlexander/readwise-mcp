import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { Logger } from '../utils/logger.js';
import { CreateVideoHighlightParams, VideoHighlight } from '../types/index.js';
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
    const validations = [];

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

    return combineValidationResults(validations);
  }

  private isValidTimestamp(timestamp: string): boolean {
    const pattern = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/;
    return pattern.test(timestamp);
  }

  async execute(params: CreateVideoHighlightParams) {
    try {
      this.logger.debug('Creating video highlight with params:', params);
      const result = await this.api.createVideoHighlight(params);
      this.logger.debug('Successfully created video highlight:', result);
      return { result };
    } catch (error) {
      this.logger.error('Error creating video highlight:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to create video highlight: ${error.message}`);
      }
      throw error;
    }
  }
} 