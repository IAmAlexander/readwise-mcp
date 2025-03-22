import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { CreateHighlightParams, Highlight, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired, validateNumberRange, validateArray } from '../types/validation.js';
import { Logger } from '../utils/logger.js';

/**
 * Tool for creating new highlights
 */
export class CreateHighlightTool extends BaseMCPTool<CreateHighlightParams, Highlight> {
  /**
   * The name of the tool
   */
  readonly name = 'create_highlight';
  
  /**
   * The description of the tool
   */
  readonly description = 'Create a new highlight in your Readwise library';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to highlight'
      },
      book_id: {
        type: 'string',
        description: 'The ID of the book to create the highlight in'
      },
      note: {
        type: 'string',
        description: 'Optional note to add to the highlight'
      },
      location: {
        type: 'number',
        description: 'Optional location in the book (e.g. page number)'
      },
      location_type: {
        type: 'string',
        description: 'Optional type of location (e.g. "page", "chapter")'
      },
      color: {
        type: 'string',
        description: 'Optional color for the highlight'
      },
      tags: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional tags to add to the highlight'
      }
    },
    required: ['text', 'book_id']
  };
  
  /**
   * Create a new CreateHighlightTool
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
  validate(params: CreateHighlightParams): ValidationResult {
    const validations = [
      validateRequired(params, 'text', 'Highlight text is required'),
      validateRequired(params, 'book_id', 'Book ID is required')
    ];
    
    // Validate location if provided
    if (params.location !== undefined) {
      validations.push(
        validateNumberRange(params, 'location', 0, undefined, 'Location must be a positive number')
      );
    }
    
    // Validate tags if provided
    if (params.tags !== undefined) {
      validations.push(
        validateArray(params, 'tags', 'Tags must be an array of strings')
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
   * @returns Promise resolving to an object with a result property containing the created highlight
   */
  async execute(params: CreateHighlightParams): Promise<MCPToolResult<Highlight>> {
    try {
      this.logger.debug('Executing create_highlight tool', params);
      const highlight = await this.api.createHighlight(params);
      this.logger.debug(`Created highlight in book ${params.book_id}`);
      return { result: highlight };
    } catch (error) {
      this.logger.error('Error executing create_highlight tool', error);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: {
          id: '',
          text: params.text,
          book_id: params.book_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        success: false,
        error: 'An unexpected error occurred while creating the highlight'
      };
    }
  }
} 