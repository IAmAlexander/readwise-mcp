import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { BulkUpdateDocumentsParams, BulkOperationResult, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired, validateAllowedValues, validationError } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

/**
 * Tool for bulk updating documents
 */
export class BulkUpdateDocumentsTool extends BaseMCPTool<BulkUpdateDocumentsParams, BulkOperationResult> {
  /**
   * The name of the tool
   */
  readonly name = 'bulk_update_documents';

  /**
   * The description of the tool
   */
  readonly description = 'Update metadata for multiple documents in your Readwise library in bulk (requires confirmation)';

  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      updates: {
        type: 'array',
        description: 'Array of document updates',
        items: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'The ID of the document to update'
            },
            title: {
              type: 'string',
              description: 'New title'
            },
            author: {
              type: 'string',
              description: 'New author'
            },
            summary: {
              type: 'string',
              description: 'New summary'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'New tags'
            },
            location: {
              type: 'string',
              enum: ['new', 'later', 'archive', 'feed'],
              description: 'New location'
            },
            category: {
              type: 'string',
              description: 'New category'
            }
          },
          required: ['document_id']
        }
      },
      confirmation: {
        type: 'string',
        description: 'Type "I confirm these updates" to confirm bulk update'
      }
    },
    required: ['updates', 'confirmation']
  };

  /**
   * Create a new BulkUpdateDocumentsTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  /**
   * Validate the parameters
   */
  validate(params: BulkUpdateDocumentsParams): ValidationResult {
    const validations = [
      validateRequired(params, 'updates', 'Updates array is required'),
      validateRequired(params, 'confirmation', 'Confirmation is required'),
      validateAllowedValues(params, 'confirmation', ['I confirm these updates'], 'Type "I confirm these updates" to confirm')
    ];

    // Check each validation result
    for (const validation of validations) {
      if (!validation.valid) {
        return validation;
      }
    }

    // Validate updates is an array
    if (!Array.isArray(params.updates) || params.updates.length === 0) {
      return validationError('updates', 'Updates must be a non-empty array');
    }

    // All validations passed
    return super.validate(params);
  }

  /**
   * Execute the tool
   */
  async execute(params: BulkUpdateDocumentsParams): Promise<MCPToolResult<BulkOperationResult>> {
    try {
      this.logger.debug('Executing bulk_update_documents tool', { count: params.updates.length } as any);
      const result = await this.api.bulkUpdateDocuments(params);
      this.logger.debug(`Bulk update completed: ${result.successful} succeeded, ${result.failed} failed`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing bulk_update_documents tool', error as any);

      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }

      // Handle unexpected errors with proper result format
      throw error;
    }
  }
}
