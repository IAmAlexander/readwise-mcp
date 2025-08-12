import { BaseMCPPrompt } from '../mcp/registry/base-prompt.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import { SearchParams } from '../types/index.js';
import { ValidationResult, validateRequired, validateNumberRange } from '../types/validation.js';
import type { Logger } from '../utils/logger-interface.js';
import type { MCPResponse } from '../mcp/types.js';

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
export class ReadwiseSearchPrompt extends BaseMCPPrompt<ReadwiseSearchPromptParams, MCPResponse> {
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
   */
  validate(params: ReadwiseSearchPromptParams): ValidationResult {
    const requiredValidation = validateRequired(params, 'query', 'Search query is required');
    if (!requiredValidation.valid) {
      return requiredValidation;
    }
    return validateNumberRange(params, 'limit', 1, undefined, 'Limit must be a positive number');
  }
  
  /**
   * Execute the prompt
   */
  async execute(params: ReadwiseSearchPromptParams): Promise<MCPResponse> {
    this.logger.debug('Executing ReadwiseSearchPrompt', { params } as any);
    
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
        this.logger.warn('No search results found', { query: params.query } as any);
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
      } as any);
      
      // Return MCPResponse
      return {
        content: [
          {
            type: 'text',
            text: messageContent
          }
        ]
      };
    } catch (error) {
      // Log the error details
      this.logger.error('Error executing ReadwiseSearchPrompt', error as any);
      
      if (error instanceof Error) {
        if (error.message.includes('No results found')) {
          throw error;
        }
        if (error.message.includes('401')) {
          throw new Error('Authentication failed. Please check your Readwise API key.');
        } else if (error.message.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.message.includes('5')) {
          throw new Error('Readwise service error. Please try again later.');
        }
        throw new Error(`Failed to search highlights: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while searching highlights.');
    }
  }
} 