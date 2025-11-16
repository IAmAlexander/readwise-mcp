import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { UpdateDocumentParams, Document, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

/**
 * Tool for updating document metadata
 */
export class UpdateDocumentTool extends BaseMCPTool<UpdateDocumentParams, Document> {
  /**
   * The name of the tool
   */
  readonly name = 'update_document';

  /**
   * The description of the tool
   */
  readonly description = 'Update metadata for an existing document in your Readwise library';

  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The ID of the document to update'
      },
      title: {
        type: 'string',
        description: 'New title for the document'
      },
      author: {
        type: 'string',
        description: 'New author for the document'
      },
      summary: {
        type: 'string',
        description: 'New summary for the document'
      },
      published_date: {
        type: 'string',
        description: 'New published date in ISO 8601 format'
      },
      image_url: {
        type: 'string',
        description: 'New cover image URL'
      },
      location: {
        type: 'string',
        enum: ['new', 'later', 'archive', 'feed'],
        description: 'New location (new, later, archive, or feed)'
      },
      category: {
        type: 'string',
        description: 'New category (e.g., article, email, rss)'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'New tags for the document'
      }
    },
    required: ['document_id']
  };

  /**
   * Create a new UpdateDocumentTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  /**
   * Validate the parameters
   */
  validate(params: UpdateDocumentParams): ValidationResult {
    const validations = [
      validateRequired(params, 'document_id', 'Document ID is required')
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
  async execute(params: UpdateDocumentParams): Promise<MCPToolResult<Document>> {
    try {
      this.logger.debug('Executing update_document tool', params as any);
      const result = await this.api.updateDocument(params);
      this.logger.debug(`Updated document: ${params.document_id}`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing update_document tool', error as any);

      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }

      // Handle unexpected errors with proper result format
      throw error;
    }
  }
}
