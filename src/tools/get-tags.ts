import { ValidationResult } from '../types/validation';
import { BaseMCPTool } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { Logger } from '../utils/logger';
import { TagResponse, MCPToolResult } from '../types';

/**
 * Tool to get all tags from Readwise
 */
export class GetTagsTool extends BaseMCPTool<void, TagResponse> {
  /**
   * Tool name
   */
  name = 'get_tags';
  
  /**
   * Tool description
   */
  description = 'Get a list of all tags from Readwise';
  
  /**
   * JSON Schema for the parameters
   */
  parameters = {
    type: 'object',
    properties: {},
    required: []
  };
  
  /**
   * Constructor
   * @param api - Readwise API client
   * @param logger - Logger instance
   */
  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }
  
  /**
   * Validate the parameters
   * @param params - The parameters to validate
   * @returns Validation result
   */
  validate(): ValidationResult {
    return super.validate();
  }
  
  /**
   * Execute the tool
   * @returns Promise resolving to an object with a result property containing tags
   */
  async execute(): Promise<MCPToolResult<TagResponse>> {
    try {
      this.logger.debug('Executing get_tags tool');
      const tags = await this.api.getTags();
      this.logger.debug(`Retrieved ${tags.count} tags`);
      return { result: tags };
    } catch (error) {
      this.logger.error('Error executing get_tags tool', error);
      return {
        result: { count: 0, tags: [] },
        success: false,
        error: 'An unexpected error occurred while fetching tags'
      };
    }
  }
} 