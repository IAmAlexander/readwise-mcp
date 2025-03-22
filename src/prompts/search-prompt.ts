import { BaseMCPPrompt } from '../mcp/registry/base-prompt.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { SearchParams } from '../types/index.js';
import { ValidationResult, validateRequired, validateNumberRange } from '../types/validation.js';
import { Logger } from '../utils/logger.js';

/**
 * Parameters for the ReadwiseSearchPrompt
 */
export interface ReadwiseSearchPromptParams extends SearchParams {
  /**
   * Optional context to include in the prompt
   */
  context?: string;
}

/**
 * Prompt for searching highlights in Readwise
 */
export class ReadwiseSearchPrompt extends BaseMCPPrompt<ReadwiseSearchPromptParams, {
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
  readonly name = 'readwise_search';
  
  /**
   * The description of the prompt
   */
  readonly description = 'Searches and analyzes highlights from Readwise';
  
  /**
   * The parameters for the prompt
   */
  readonly parameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query to find highlights'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return'
      },
      context: {
        type: 'string',
        description: 'Additional context to include in the prompt'
      }
    },
    required: ['query']
  };
  
  /**
   * Create a new ReadwiseSearchPrompt
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
  validate(params: ReadwiseSearchPromptParams): ValidationResult {
    const requiredValidation = validateRequired(params, 'query', 'Search query is required');
    if (!requiredValidation.success) {
      return requiredValidation;
    }
    
    return validateNumberRange(params, 'limit', 1, undefined, 'Limit must be a positive number');
  }
  
  /**
   * Execute the prompt
   * @param params - Parameters for the prompt
   * @returns A structured response with messages in the format expected by the MCP protocol
   * @throws Error if the API request fails or if there's an issue with processing the search results
   */
  async execute(params: ReadwiseSearchPromptParams): Promise<{
    messages: Array<{
      role: string;
      content: {
        type: string;
        text: string;
      };
    }>;
  }> {
    this.logger.debug('Executing ReadwiseSearchPrompt', { params });
    
    if (!params.query) {
      this.logger.warn('Missing required search query parameter');
      throw new Error('Search query is required');
    }
    
    try {
      // Search for highlights in Readwise
      const searchResults = await this.api.searchHighlights({
        query: params.query,
        limit: params.limit || 10
      });
      
      if (searchResults.length === 0) {
        this.logger.warn('No search results found', { query: params.query });
        throw new Error(`No results found for search query: "${params.query}". Try a different search term.`);
      }
      
      // Format search results as structured content
      const formattedResults = searchResults.map((result, index) => {
        return `${index + 1}. "${result.highlight.text}"${result.highlight.note ? ` - Note: ${result.highlight.note}` : ''}\n   Source: ${result.book.title || 'Unknown'} by ${result.book.author || 'Unknown Author'}`;
      }).join('\n\n');
      
      // Build the message content
      let messageContent = `Here are search results from your Readwise library for query "${params.query}":\n\n${formattedResults}\n\nThese highlights matched your search criteria. Would you like me to analyze them, summarize key points, or help you find connections between them?`;
      
      // Include custom context if provided
      if (params.context) {
        messageContent = `${params.context}\n\n${messageContent}`;
      }
      
      this.logger.debug('Successfully generated search results prompt', {
        query: params.query,
        resultCount: searchResults.length
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
      this.logger.error('Error executing ReadwiseSearchPrompt', error);
      
      // Rethrow with a more specific message based on error type
      if (error instanceof Error) {
        // Check if it's already a formatted error message
        if (error.message.includes('No results found')) {
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
        throw new Error(`Failed to search highlights: ${error.message}`);
      }
      
      // Unknown error type
      throw new Error('An unexpected error occurred while searching highlights.');
    }
  }
} 