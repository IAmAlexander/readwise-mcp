import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { BulkSaveDocumentsParams, BulkOperationResult, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired, validateAllowedValues, validationError } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

/**
 * Tool for bulk saving documents
 */
export class BulkSaveDocumentsTool extends BaseMCPTool<BulkSaveDocumentsParams, BulkOperationResult> {
  /**
   * The name of the tool
   */
  readonly name = 'bulk_save_documents';

  /**
   * The description of the tool
   */
  readonly description = 'Save multiple documents (URLs, articles, or webpages) to your Readwise library in bulk (requires confirmation)';

  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Array of documents to save',
        items: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL of the content to save'
            },
            title: {
              type: 'string',
              description: 'Optional title override'
            },
            author: {
              type: 'string',
              description: 'Optional author override'
            },
            html: {
              type: 'string',
              description: 'Optional HTML content'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags'
            },
            summary: {
              type: 'string',
              description: 'Optional summary'
            },
            notes: {
              type: 'string',
              description: 'Optional notes'
            },
            location: {
              type: 'string',
              enum: ['new', 'later', 'archive', 'feed'],
              description: 'Optional location'
            }
          },
          required: ['url']
        }
      },
      confirmation: {
        type: 'string',
        description: 'Type "I confirm saving these items" to confirm bulk save'
      }
    },
    required: ['items', 'confirmation']
  };

  /**
   * Create a new BulkSaveDocumentsTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  /**
   * Validate the parameters
   */
  validate(params: BulkSaveDocumentsParams): ValidationResult {
    const validations = [
      validateRequired(params, 'items', 'Items array is required'),
      validateRequired(params, 'confirmation', 'Confirmation is required'),
      validateAllowedValues(params, 'confirmation', ['I confirm saving these items'], 'Type "I confirm saving these items" to confirm')
    ];

    // Check each validation result
    for (const validation of validations) {
      if (!validation.valid) {
        return validation;
      }
    }

    // Validate items is an array
    if (!Array.isArray(params.items) || params.items.length === 0) {
      return validationError('items', 'Items must be a non-empty array');
    }

    // All validations passed
    return super.validate(params);
  }

  /**
   * Execute the tool
   */
  async execute(params: BulkSaveDocumentsParams): Promise<MCPToolResult<BulkOperationResult>> {
    try {
      this.logger.debug('Executing bulk_save_documents tool', { count: params.items.length } as any);
      const result = await this.api.bulkSaveDocuments(params);
      this.logger.debug(`Bulk save completed: ${result.successful} succeeded, ${result.failed} failed`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing bulk_save_documents tool', error as any);

      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }

      // Handle unexpected errors with proper result format
      throw error;
    }
  }
}
