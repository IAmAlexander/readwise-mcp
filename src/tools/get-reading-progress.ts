import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { GetReadingProgressParams, ReadingProgress, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

/**
 * Tool for retrieving reading progress of a document
 */
export class GetReadingProgressTool extends BaseMCPTool<GetReadingProgressParams, ReadingProgress> {
  /**
   * The name of the tool
   */
  readonly name = 'get_reading_progress';
  
  /**
   * The description of the tool
   */
  readonly description = 'Get the reading progress of a document from your Readwise library';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The ID of the document to get reading progress for'
      }
    },
    required: ['document_id']
  };
  
  /**
   * Create a new GetReadingProgressTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }
  
  /**
   * Validate the parameters
   */
  validate(params: GetReadingProgressParams): ValidationResult {
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
  async execute(params: GetReadingProgressParams): Promise<MCPToolResult<ReadingProgress>> {
    try {
      this.logger.debug('Executing get_reading_progress tool', params as any);
      const progress = await this.api.getReadingProgress(params);
      this.logger.debug(`Retrieved reading progress for document ${params.document_id}`);
      return { result: progress };
    } catch (error) {
      this.logger.error('Error executing get_reading_progress tool', error as any);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: {
          document_id: params.document_id,
          title: '',
          status: 'not_started',
          percentage: 0
        },
        success: false,
        error: 'An unexpected error occurred while fetching reading progress'
      };
    }
  }
} 