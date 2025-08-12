import { ValidationResult, validateRequired, validateArray, combineValidationResults } from '../types/validation.js';
import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { DocumentTagsResponse, MCPToolResult } from '../types/index.js';

/**
 * Parameters for document tag operations
 */
export interface DocumentTagsParams {
  /**
   * The ID of the document
   */
  document_id: string;
  
  /**
   * The tags to set (for update operation)
   */
  tags?: string[];
  
  /**
   * The tag to add/remove (for add/remove operations)
   */
  tag?: string;
  
  /**
   * The operation to perform
   */
  operation: 'get' | 'update' | 'add' | 'remove';
}

/**
 * Tool to manage document tags in Readwise
 */
export class DocumentTagsTool extends BaseMCPTool<DocumentTagsParams, DocumentTagsResponse> {
  /**
   * Tool name
   */
  name = 'document_tags';
  
  /**
   * Tool description
   */
  description = 'Get, update, add, or remove tags for a document in Readwise';
  
  /**
   * JSON Schema for the parameters
   */
  parameters = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The ID of the document'
      },
      operation: {
        type: 'string',
        enum: ['get', 'update', 'add', 'remove'],
        description: 'The operation to perform'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'The tags to set (for update operation)'
      },
      tag: {
        type: 'string',
        description: 'The tag to add/remove (for add/remove operations)'
      }
    },
    required: ['document_id', 'operation']
  };
  
  /**
   * Constructor
   * @param api - Readwise API client
   * @param logger - Logger instance
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }
  
  /**
   * Validate the parameters
   * @param params - The parameters to validate
   * @returns Validation result
   */
  validate(params: DocumentTagsParams): ValidationResult {
    const validations = [
      validateRequired(params, 'document_id', 'Document ID is required'),
      validateRequired(params, 'operation', 'Operation is required')
    ];
    
    // Validate operation-specific parameters
    switch (params.operation) {
      case 'update':
        validations.push(validateRequired(params, 'tags', 'Tags are required for update operation'));
        validations.push(validateArray(params, 'tags', 'Tags must be an array of strings'));
        break;
      case 'add':
      case 'remove':
        validations.push(validateRequired(params, 'tag', 'Tag is required for add/remove operations'));
        break;
    }
    
    return combineValidationResults(validations);
  }
  
  /**
   * Execute the tool
   * @param params - The parameters to use for execution
   * @returns Promise resolving to an object with a result property containing the document tags
   */
  async execute(params: DocumentTagsParams): Promise<MCPToolResult<DocumentTagsResponse>> {
    try {
      this.logger.debug('Executing document_tags tool', { params } as any);
      
      let result: DocumentTagsResponse;
      
      switch (params.operation) {
        case 'get':
          result = await this.api.getDocumentTags(params.document_id);
          break;
        case 'update':
          if (!params.tags) throw new Error('Tags are required for update operation');
          result = await this.api.updateDocumentTags(params.document_id, params.tags);
          break;
        case 'add':
          if (!params.tag) throw new Error('Tag is required for add operation');
          result = await this.api.addTagToDocument(params.document_id, params.tag);
          break;
        case 'remove':
          if (!params.tag) throw new Error('Tag is required for remove operation');
          result = await this.api.removeTagFromDocument(params.document_id, params.tag);
          break;
        default:
          throw new Error(`Invalid operation: ${params.operation}`);
      }
      
      this.logger.debug(`Successfully performed ${params.operation} operation on document tags`);
      return { result };
    } catch (error: unknown) {
      this.logger.error('Error executing document_tags tool', error as any);
      return {
        result: { document_id: params.document_id, tags: [] },
        success: false,
        error: `An unexpected error occurred while managing document tags: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
} 