import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { SaveDocumentParams, SaveDocumentResponse, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

/**
 * Tool for saving new documents to Readwise
 */
export class SaveDocumentTool extends BaseMCPTool<SaveDocumentParams, SaveDocumentResponse> {
  /**
   * The name of the tool
   */
  readonly name = 'save_document';

  /**
   * The description of the tool
   */
  readonly description = 'Save a new document (URL, article, or webpage) to your Readwise library';

  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL of the content to save'
      },
      title: {
        type: 'string',
        description: 'Optional title override for the document'
      },
      author: {
        type: 'string',
        description: 'Optional author override for the document'
      },
      html: {
        type: 'string',
        description: 'Optional HTML content if not scraping from URL'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional tags to apply to the saved content'
      },
      summary: {
        type: 'string',
        description: 'Optional summary of the content'
      },
      notes: {
        type: 'string',
        description: 'Optional notes about the content'
      },
      location: {
        type: 'string',
        enum: ['new', 'later', 'archive', 'feed'],
        description: 'Where to save the content (new, later, archive, or feed)'
      },
      category: {
        type: 'string',
        description: 'Optional category for the document (e.g., article, email, rss)'
      },
      published_date: {
        type: 'string',
        description: 'Optional published date in ISO 8601 format'
      },
      image_url: {
        type: 'string',
        description: 'Optional cover image URL'
      }
    },
    required: ['url']
  };

  /**
   * Create a new SaveDocumentTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  /**
   * Validate the parameters
   */
  validate(params: SaveDocumentParams): ValidationResult {
    const validations = [
      validateRequired(params, 'url', 'URL is required')
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
  async execute(params: SaveDocumentParams): Promise<MCPToolResult<SaveDocumentResponse>> {
    try {
      this.logger.debug('Executing save_document tool', params as any);
      const result = await this.api.saveDocument(params);
      this.logger.debug(`Saved document: ${result.id}`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing save_document tool', error as any);

      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }

      // Handle unexpected errors with proper result format
      throw error;
    }
  }
}
