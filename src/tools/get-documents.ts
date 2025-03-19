import { BaseMCPTool } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { Document, PaginatedResponse, MCPToolResult, isAPIError } from '../types';
import { ValidationResult, validateNumberRange } from '../types/validation';
import { Logger } from '../utils/logger';

/**
 * Parameters for the GetDocumentsTool
 */
export interface GetDocumentsParams {
  /**
   * The page number to retrieve
   */
  page?: number;
  
  /**
   * The number of results per page
   */
  page_size?: number;
}

/**
 * Tool for retrieving documents from Readwise
 */
export class GetDocumentsTool extends BaseMCPTool<GetDocumentsParams, PaginatedResponse<Document>> {
  /**
   * The name of the tool
   */
  readonly name = 'get_documents';
  
  /**
   * The description of the tool
   */
  readonly description = 'Retrieve documents from your Readwise library';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        description: 'The page number for pagination'
      },
      page_size: {
        type: 'integer',
        description: 'The number of results per page'
      }
    }
  };
  
  /**
   * Create a new GetDocumentsTool
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
  validate(params: GetDocumentsParams): ValidationResult {
    // Nothing to validate if no parameters provided
    if (!params.page && !params.page_size) {
      return super.validate(params);
    }
    
    const validations = [];
    
    // Only validate page if provided
    if (params.page !== undefined) {
      validations.push(validateNumberRange(params, 'page', 1, undefined, 'Page must be a positive number'));
    }
    
    // Only validate page_size if provided
    if (params.page_size !== undefined) {
      validations.push(validateNumberRange(params, 'page_size', 1, 100, 'Page size must be a number between 1 and 100'));
    }
    
    // If validations array is empty, return success
    if (validations.length === 0) {
      return super.validate(params);
    }
    
    // Check each validation result
    for (const validation of validations) {
      if (validation && !validation.success) {
        return validation;
      }
    }
    
    // All validations passed
    return super.validate(params);
  }
  
  /**
   * Execute the tool
   * @param params - The parameters for the request
   * @returns Promise resolving to an object with a result property containing documents
   */
  async execute(params: GetDocumentsParams): Promise<MCPToolResult<PaginatedResponse<Document>>> {
    try {
      this.logger.debug('Executing get_documents tool', params);
      const documents = await this.api.getDocuments(params);
      this.logger.debug(`Retrieved ${documents.results.length} documents`);
      return { result: documents };
    } catch (error) {
      this.logger.error('Error executing get_documents tool', error);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: { count: 0, next: null, previous: null, results: [] },
        success: false,
        error: 'An unexpected error occurred while fetching documents'
      };
    }
  }
} 