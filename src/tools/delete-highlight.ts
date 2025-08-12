import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { DeleteHighlightParams, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired, validateAllowedValues } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';

/**
 * Tool for deleting highlights
 */
export class DeleteHighlightTool extends BaseMCPTool<DeleteHighlightParams, { success: boolean }> {
  /**
   * The name of the tool
   */
  readonly name = 'delete_highlight';
  
  /**
   * The description of the tool
   */
  readonly description = 'Delete a highlight from your Readwise library';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      highlight_id: {
        type: 'string',
        description: 'The ID of the highlight to delete'
      },
      confirmation: {
        type: 'string',
        description: 'Type "DELETE" to confirm deletion'
      }
    },
    required: ['highlight_id', 'confirmation']
  };
  
  /**
   * Create a new DeleteHighlightTool
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }
  
  /**
   * Validate the parameters
   */
  validate(params: DeleteHighlightParams): ValidationResult {
    const validations = [
      validateRequired(params, 'highlight_id', 'Highlight ID is required'),
      validateRequired(params, 'confirmation', 'Confirmation is required'),
      validateAllowedValues(params, 'confirmation', ['DELETE'], 'Type "DELETE" to confirm deletion')
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
  async execute(params: DeleteHighlightParams): Promise<MCPToolResult<{ success: boolean }>> {
    try {
      this.logger.debug('Executing delete_highlight tool', params as any);
      const result = await this.api.deleteHighlight(params);
      this.logger.debug(`Deleted highlight ${params.highlight_id}`);
      return { result };
    } catch (error) {
      this.logger.error('Error executing delete_highlight tool', error as any);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: { success: false },
        success: false,
        error: 'An unexpected error occurred while deleting the highlight'
      };
    }
  }
} 