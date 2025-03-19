import { BaseMCPTool } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { UpdateReadingProgressParams, ReadingProgress, MCPToolResult, isAPIError } from '../types';
import { ValidationResult, validateRequired, validateNumberRange, validateAllowedValues } from '../types/validation';
import { Logger } from '../utils/logger';

/**
 * Tool for updating reading progress of a document
 */
export class UpdateReadingProgressTool extends BaseMCPTool<UpdateReadingProgressParams, ReadingProgress> {
  /**
   * The name of the tool
   */
  readonly name = 'update_reading_progress';
  
  /**
   * The description of the tool
   */
  readonly description = 'Update the reading progress of a document in your Readwise library';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The ID of the document to update reading progress for'
      },
      status: {
        type: 'string',
        enum: ['not_started', 'in_progress', 'completed'],
        description: 'The reading status of the document'
      },
      percentage: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'The reading progress percentage (0-100)'
      },
      current_page: {
        type: 'number',
        minimum: 0,
        description: 'The current page number'
      },
      total_pages: {
        type: 'number',
        minimum: 0,
        description: 'The total number of pages'
      },
      last_read_at: {
        type: 'string',
        format: 'date-time',
        description: 'The timestamp of when the document was last read'
      }
    },
    required: ['document_id', 'status']
  };
  
  /**
   * Create a new UpdateReadingProgressTool
   * @param api - The ReadwiseAPI instance to use
   * @param logger - The logger instance
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }
  
  /**
   * Validate the parameters
   * @param params - The parameters to validate
   * @returns Validation result
   */
  validate(params: UpdateReadingProgressParams): ValidationResult {
    const validations = [
      validateRequired(params, 'document_id', 'Document ID is required'),
      validateRequired(params, 'status', 'Reading status is required'),
      validateAllowedValues(params, 'status', ['not_started', 'in_progress', 'completed'], 'Invalid reading status')
    ];
    
    // Validate percentage if provided
    if (params.percentage !== undefined) {
      validations.push(
        validateNumberRange(params, 'percentage', 0, 100, 'Percentage must be a number between 0 and 100')
      );
    }
    
    // Validate current_page if provided
    if (params.current_page !== undefined) {
      validations.push(
        validateNumberRange(params, 'current_page', 0, undefined, 'Current page must be a positive number')
      );
    }
    
    // Validate total_pages if provided
    if (params.total_pages !== undefined) {
      validations.push(
        validateNumberRange(params, 'total_pages', 0, undefined, 'Total pages must be a positive number')
      );
    }
    
    // Check each validation result
    for (const validation of validations) {
      if (!validation.success) {
        return validation;
      }
    }
    
    // All validations passed
    return super.validate(params);
  }
  
  /**
   * Execute the tool
   * @param params - The parameters for the request
   * @returns Promise resolving to an object with a result property containing the updated reading progress
   */
  async execute(params: UpdateReadingProgressParams): Promise<MCPToolResult<ReadingProgress>> {
    try {
      this.logger.debug('Executing update_reading_progress tool', params);
      const progress = await this.api.updateReadingProgress(params);
      this.logger.debug(`Updated reading progress for document ${params.document_id}`);
      return { result: progress };
    } catch (error) {
      this.logger.error('Error executing update_reading_progress tool', error);
      
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
        error: 'An unexpected error occurred while updating reading progress'
      };
    }
  }
} 