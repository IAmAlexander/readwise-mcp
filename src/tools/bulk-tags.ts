import { ValidationResult, validateRequired, validateArray, combineValidationResults, validationError } from '../types/validation';
import { BaseMCPTool } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { Logger } from '../utils/logger';
import { BulkTagRequest, BulkTagResponse, MCPToolResult } from '../types';

/**
 * Parameters for bulk tag operations
 */
export interface BulkTagsParams {
  /**
   * IDs of the documents to tag
   */
  document_ids: string[];
  
  /**
   * Tags to add to all specified documents
   */
  tags: string[];
  
  /**
   * Whether to replace existing tags (true) or append to them (false)
   */
  replace_existing?: boolean;
  
  /**
   * Confirmation string to prevent accidental operations
   */
  confirmation: string;
}

/**
 * Tool to perform bulk tag operations in Readwise
 */
export class BulkTagsTool extends BaseMCPTool<BulkTagsParams, BulkTagResponse> {
  /**
   * Tool name
   */
  name = 'bulk_tags';
  
  /**
   * Tool description
   */
  description = 'Add tags to multiple documents in Readwise';
  
  /**
   * JSON Schema for the parameters
   */
  parameters = {
    type: 'object',
    properties: {
      document_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs of the documents to tag'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags to add to all specified documents'
      },
      replace_existing: {
        type: 'boolean',
        description: 'Whether to replace existing tags (true) or append to them (false)',
        default: false
      },
      confirmation: {
        type: 'string',
        description: 'Confirmation string. Must be "I confirm these tag changes" to proceed.'
      }
    },
    required: ['document_ids', 'tags', 'confirmation']
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
  validate(params: BulkTagsParams): ValidationResult {
    const validations = [
      validateRequired(params, 'document_ids', 'Document IDs are required'),
      validateRequired(params, 'tags', 'Tags are required'),
      validateRequired(params, 'confirmation', 'Confirmation is required'),
      validateArray(params, 'document_ids', 'Document IDs must be an array of strings'),
      validateArray(params, 'tags', 'Tags must be an array of strings')
    ];
    
    // Check confirmation string
    if (params.confirmation !== 'I confirm these tag changes') {
      return validationError('confirmation', 'Confirmation must be exactly "I confirm these tag changes"');
    }
    
    return combineValidationResults(validations);
  }
  
  /**
   * Execute the tool
   * @param params - The parameters to use for execution
   * @returns Promise resolving to an object with a result property containing the bulk operation results
   */
  async execute(params: BulkTagsParams): Promise<MCPToolResult<BulkTagResponse>> {
    try {
      this.logger.debug('Executing bulk_tags tool', { 
        documentCount: params.document_ids.length,
        tagCount: params.tags.length
      });
      
      const result = await this.api.bulkTagDocuments({
        document_ids: params.document_ids,
        tags: params.tags,
        replace_existing: params.replace_existing,
        confirmation: params.confirmation
      });
      
      this.logger.debug(`Successfully performed bulk tag operation on ${result.updated_documents} documents`);
      return { result };
    } catch (error: unknown) {
      this.logger.error('Error executing bulk_tags tool', error);
      return {
        result: { success: false, updated_documents: 0 },
        success: false,
        error: `An unexpected error occurred while performing bulk tag operation: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
} 