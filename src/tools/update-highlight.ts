import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { UpdateHighlightParams, Highlight, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired, validateNumberRange, validateArray } from '../types/validation.js';
import { Logger } from '../utils/logger.js';

/**
 * Tool for updating existing highlights
 */
export class UpdateHighlightTool extends BaseMCPTool<UpdateHighlightParams, Highlight> {
  /**
   * The name of the tool
   */
  readonly name = 'update_highlight';
  
  /**
   * The description of the tool
   */
  readonly description = 'Update an existing highlight in your Readwise library';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      highlight_id: {
        type: 'string',
        description: 'The ID of the highlight to update'
      },
      text: {
        type: 'string',
        description: 'The new text for the highlight'
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
    required: ['highlight_id']
  };
  
  /**
   * Create a new UpdateHighlightTool
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
  validate(params: UpdateHighlightParams): ValidationResult {
    const validations = [
      validateRequired(params, 'highlight_id', 'Highlight ID is required')
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
   * @returns Promise resolving to an object with a result property containing the updated highlight
   */
  async execute(params: UpdateHighlightParams): Promise<MCPToolResult<Highlight>> {
    try {
      this.logger.debug('Executing update_highlight tool', params);
      const highlight = await this.api.updateHighlight(params);
      this.logger.debug(`Updated highlight ${params.highlight_id}`);
      return { result: highlight };
    } catch (error) {
      this.logger.error('Error executing update_highlight tool', error);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: {
          id: params.highlight_id,
          text: params.text || '',
          book_id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        success: false,
        error: 'An unexpected error occurred while updating the highlight'
      };
    }
  }
} 