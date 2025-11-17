import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { DeleteDocumentParams, DeleteDocumentResponse, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired, validateAllowedValues } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

/**
 * Tool for deleting documents
 */
export class DeleteDocumentTool extends BaseMCPTool<DeleteDocumentParams, DeleteDocumentResponse> {
  /**
   * The name of the tool
   */
  readonly name = 'delete_document';

  /**
   * The description of the tool
   */
  readonly description = 'Delete a document from your Readwise library (requires confirmation)';

  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The ID of the document to delete'
      },
      confirmation: {
        type: 'string',
        description: 'Type "I confirm deletion" to confirm deletion'
      }
    },
    required: ['document_id', 'confirmation']
  };

  /**
   * Create a new DeleteDocumentTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  /**
   * Validate the parameters
   */
  validate(params: DeleteDocumentParams): ValidationResult {
    const validations = [
      validateRequired(params, 'document_id', 'Document ID is required'),
      validateRequired(params, 'confirmation', 'Confirmation is required'),
      validateAllowedValues(params, 'confirmation', ['I confirm deletion'], 'Type "I confirm deletion" to confirm')
    ];

    // Check each validation result
    for (const validation of validations) {
      if (!validation.valid) {
        return validation;
      }
    }

    // All validations passed
    return super.validate(params);
  }

  /**
   * Execute the tool
   */
  async execute(params: DeleteDocumentParams): Promise<MCPToolResult<DeleteDocumentResponse>> {
    try {
      this.logger.debug('Executing delete_document tool', params as any);
      const result = await this.api.deleteDocument(params);
      this.logger.debug(`Deleted document: ${params.document_id}`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing delete_document tool', error as any);

      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }

      // Handle unexpected errors with proper result format
      throw error;
    }
  }
}
