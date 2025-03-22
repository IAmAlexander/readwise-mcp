import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { CreateNoteParams, Highlight, MCPToolResult, isAPIError } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';
import { Logger } from '../utils/logger.js';

/**
 * Tool for creating notes on highlights
 */
export class CreateNoteTool extends BaseMCPTool<CreateNoteParams, Highlight> {
  /**
   * The name of the tool
   */
  readonly name = 'create_note';
  
  /**
   * The description of the tool
   */
  readonly description = 'Create a note on a highlight in your Readwise library';
  
  /**
   * The JSON Schema parameters for the tool
   */
  readonly parameters = {
    type: 'object',
    properties: {
      highlight_id: {
        type: 'string',
        description: 'The ID of the highlight to add a note to'
      },
      note: {
        type: 'string',
        description: 'The note text to add to the highlight'
      }
    },
    required: ['highlight_id', 'note']
  };
  
  /**
   * Create a new CreateNoteTool
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
  validate(params: CreateNoteParams): ValidationResult {
    const validations = [
      validateRequired(params, 'highlight_id', 'Highlight ID is required'),
      validateRequired(params, 'note', 'Note text is required')
    ];
    
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
  async execute(params: CreateNoteParams): Promise<MCPToolResult<Highlight>> {
    try {
      this.logger.debug('Executing create_note tool', params);
      const highlight = await this.api.createNote(params);
      this.logger.debug(`Created note on highlight ${params.highlight_id}`);
      return { result: highlight };
    } catch (error) {
      this.logger.error('Error executing create_note tool', error);
      
      // Re-throw API errors
      if (isAPIError(error)) {
        throw error;
      }
      
      // Handle unexpected errors with proper result format
      return {
        result: {
          id: params.highlight_id,
          text: '',
          book_id: '',
          note: params.note,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        success: false,
        error: 'An unexpected error occurred while creating the note'
      };
    }
  }
} 