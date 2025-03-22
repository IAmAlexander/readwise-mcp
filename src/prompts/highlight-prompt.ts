import { BaseMCPPrompt } from '../mcp/registry/base-prompt.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { GetHighlightsParams } from '../types/index.js';
import { ValidationResult, validateNumberRange, validateAllowedValues, combineValidationResults } from '../types/validation.js';
import { Logger } from '../utils/logger.js';

/**
 * Parameters for the ReadwiseHighlightPrompt
 */
export interface ReadwiseHighlightPromptParams extends GetHighlightsParams {
  /**
   * Optional context to include in the prompt
   */
  context?: string;
  
  /**
   * Optional task for the model to perform with the highlights
   */
  task?: 'summarize' | 'analyze' | 'connect' | 'question';
}

/**
 * Prompt for retrieving and analyzing highlights in Readwise
 */
export class ReadwiseHighlightPrompt extends BaseMCPPrompt<ReadwiseHighlightPromptParams, {
  messages: Array<{
    role: string;
    content: {
      type: string;
      text: string;
    };
  }>;
}> {
  /**
   * The name of the prompt
   */
  readonly name = 'readwise_highlight';
  
  /**
   * The description of the prompt
   */
  readonly description = 'Retrieves and analyzes highlights from Readwise';
  
  /**
   * The parameters for the prompt
   */
  readonly parameters = {
    type: 'object',
    properties: {
      book_id: {
        type: 'string',
        description: 'The ID of the book to get highlights from'
      },
      page: {
        type: 'number',
        description: 'The page number of results to get'
      },
      page_size: {
        type: 'number',
        description: 'The number of results per page (max 100)'
      },
      search: {
        type: 'string',
        description: 'Search term to filter highlights'
      },
      context: {
        type: 'string',
        description: 'Additional context to include in the prompt'
      },
      task: {
        type: 'string',
        enum: ['summarize', 'analyze', 'connect', 'question'],
        description: 'The task to perform with the highlights'
      }
    },
    required: []
  };
  
  /**
   * Create a new ReadwiseHighlightPrompt
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
  validate(params: ReadwiseHighlightPromptParams): ValidationResult {
    const validations = [
      validateNumberRange(params, 'page', 1, undefined, 'Page must be a positive number'),
      validateNumberRange(params, 'page_size', 1, 100, 'Page size must be a number between 1 and 100'),
      validateAllowedValues(params, 'task', ['summarize', 'analyze', 'connect', 'question'], 
        'Task must be one of: summarize, analyze, connect, question')
    ];
    
    return combineValidationResults(validations);
  }
  
  /**
   * Execute the prompt
   * @param params - Parameters for the prompt
   * @returns A structured response with messages in the format expected by the MCP protocol
   * @throws Error if the API request fails or if there's an issue with processing the highlights
   */
  async execute(params: ReadwiseHighlightPromptParams): Promise<{
    messages: Array<{
      role: string;
      content: {
        type: string;
        text: string;
      };
    }>;
  }> {
    this.logger.debug('Executing ReadwiseHighlightPrompt', { params });
    
    try {
      // Fetch highlights from Readwise API
      const highlightsResponse = await this.api.getHighlights({
        book_id: params.book_id,
        page: params.page || 1,
        page_size: params.page_size || 20,
        search: params.search
      });
      
      if (!highlightsResponse.results || highlightsResponse.results.length === 0) {
        this.logger.warn('No highlights found for the given parameters', { params });
        throw new Error('No highlights found. Try different parameters or check your Readwise library.');
      }
      
      // Format highlights as structured content
      const highlights = highlightsResponse.results.map(highlight => {
        return `"${highlight.text}"${highlight.note ? ` - Note: ${highlight.note}` : ''}`;
      }).join('\n\n');
      
      // Build the message content based on task
      let messageContent = '';
      const task = params.task || 'summarize';
      
      switch (task) {
        case 'summarize':
          messageContent = `Here are some highlights from your Readwise library:\n\n${highlights}\n\nPlease provide a summary of these highlights.`;
          break;
        case 'analyze':
          messageContent = `Here are some highlights from your Readwise library:\n\n${highlights}\n\nPlease analyze these highlights and identify key themes and insights.`;
          break;
        case 'connect':
          messageContent = `Here are some highlights from your Readwise library:\n\n${highlights}\n\nPlease identify connections between these highlights and suggest related topics to explore.`;
          break;
        case 'question':
          messageContent = `Here are some highlights from your Readwise library:\n\n${highlights}\n\nPlease generate thoughtful questions based on these highlights to deepen understanding.`;
          break;
        default:
          messageContent = `Here are some highlights from your Readwise library:\n\n${highlights}`;
      }
      
      // Include custom context if provided
      if (params.context) {
        messageContent = `${params.context}\n\n${messageContent}`;
      }
      
      this.logger.debug('Successfully generated prompt from highlights', {
        highlightCount: highlightsResponse.results.length,
        task
      });
      
      // Return structured message array in the format expected by the MCP protocol
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: messageContent
            }
          }
        ]
      };
    } catch (error) {
      // Log the error details
      this.logger.error('Error executing ReadwiseHighlightPrompt', error);
      
      // Rethrow with a more specific message based on error type
      if (error instanceof Error) {
        // Check if it's already a formatted error message
        if (error.message.includes('No highlights found')) {
          throw error;
        }
        
        // Handle API-specific errors
        if (error.message.includes('401')) {
          throw new Error('Authentication failed. Please check your Readwise API key.');
        } else if (error.message.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.message.includes('5')) {
          throw new Error('Readwise service error. Please try again later.');
        }
        
        // Generic error with original message
        throw new Error(`Failed to process highlights: ${error.message}`);
      }
      
      // Unknown error type
      throw new Error('An unexpected error occurred while processing highlights.');
    }
  }
} 