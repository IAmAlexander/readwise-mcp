import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { BulkDeleteDocumentsParams, BulkOperationResult, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired, validateAllowedValues, validationError } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

/**
 * Tool for bulk deleting documents
 */
export class BulkDeleteDocumentsTool extends BaseMCPTool<BulkDeleteDocumentsParams, BulkOperationResult> {
  /**
   * The name of the tool
   */
  readonly name = 'bulk_delete_documents';

  /**
   * The description of the tool
   */
  readonly description = 'Delete multiple documents from your Readwise library in bulk (requires confirmation)';

  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      document_ids: {
        type: 'array',
        description: 'Array of document IDs to delete',
        items: {
          type: 'string'
        }
      },
      confirmation: {
        type: 'string',
        description: 'Type "I confirm deletion of these documents" to confirm bulk deletion'
      }
    },
    required: ['document_ids', 'confirmation']
  };

  /**
   * Create a new BulkDeleteDocumentsTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  /**
   * Validate the parameters
   */
  validate(params: BulkDeleteDocumentsParams): ValidationResult {
    const validations = [
      validateRequired(params, 'document_ids', 'Document IDs array is required'),
      validateRequired(params, 'confirmation', 'Confirmation is required'),
      validateAllowedValues(params, 'confirmation', ['I confirm deletion of these documents'], 'Type "I confirm deletion of these documents" to confirm')
    ];

    // Check each validation result
    for (const validation of validations) {
      if (!validation.valid) {
        return validation;
      }
    }

    // Validate document_ids is an array
    if (!Array.isArray(params.document_ids) || params.document_ids.length === 0) {
      return validationError('document_ids', 'Document IDs must be a non-empty array');
    }

    // All validations passed
    return super.validate(params);
  }

  /**
   * Execute the tool
   */
  async execute(params: BulkDeleteDocumentsParams): Promise<MCPToolResult<BulkOperationResult>> {
    try {
      this.logger.debug('Executing bulk_delete_documents tool', { count: params.document_ids.length } as any);
      const result = await this.api.bulkDeleteDocuments(params);
      this.logger.debug(`Bulk delete completed: ${result.successful} succeeded, ${result.failed} failed`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing bulk_delete_documents tool', error as any);

      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }

      // Handle unexpected errors with proper result format
      throw error;
    }
  }
}
