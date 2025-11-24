import { ValidationResult, validationSuccess } from '../../types/validation.js';
import type { MCPToolResult } from '../../types/index.js';
import type { Logger } from '../../utils/logger-interface.js';

// Re-export MCPToolResult for backward compatibility
export type { MCPToolResult } from '../../types/index.js';

/**
 * Base class for all MCP tools
 */
export abstract class BaseMCPTool<TParams, TResult> {
  /**
   * Tool name
   */
  abstract readonly name: string;
  
  /**
   * Tool description
   */
  abstract readonly description: string;
  
  /**
   * Tool parameters schema
   */
  abstract readonly parameters: Record<string, any>;
  
  /**
   * Logger instance
   */
  protected readonly logger: Logger;
  
  /**
   * Create a new BaseMCPTool
   * @param logger - Logger instance
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  /**
   * Validate tool parameters
   * @param params - Parameters to validate
   * @returns Validation result
   */
  validate(params: TParams): ValidationResult {
    // Default implementation returns success, override to add validation
    return validationSuccess();
  }
  
  /**
   * Execute the tool
   * @param params - Tool parameters
   * @returns Tool result wrapped in an object with a result property for MCP compliance
   */
  abstract execute(params: TParams): Promise<MCPToolResult<TResult>>;
} 