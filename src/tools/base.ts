import { Tool, MCPResponse, ValidationResult } from '../mcp/types';
import { Logger } from '../utils/logger';
import { toMCPResponse } from '../utils/response';

export abstract class BaseTool implements Tool {
  name: string;
  description: string;
  protected logger: Logger;

  constructor(name: string, description: string, logger: Logger) {
    this.name = name;
    this.description = description;
    this.logger = logger;
  }

  abstract validate(parameters: any): ValidationResult;
  
  abstract executeInternal(parameters: any): Promise<any>;

  async execute(parameters: any): Promise<MCPResponse> {
    try {
      const result = await this.executeInternal(parameters);
      return toMCPResponse(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Error executing ${this.name}:`, error);
      return {
        content: [{
          type: 'text',
          text: `Error executing ${this.name}: ${error.message}`
        }],
        isError: true
      };
    }
  }
} 