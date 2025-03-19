import { ValidationResult, validationSuccess } from '../../types/validation';
import { Logger } from '../../utils/logger';

/**
 * Base class for MCP prompts
 */
export abstract class BaseMCPPrompt<TParams, TResult> {
  /**
   * Prompt name
   */
  abstract readonly name: string;
  
  /**
   * Prompt description
   */
  abstract readonly description: string;
  
  /**
   * Prompt parameters schema
   */
  abstract readonly parameters: Record<string, any>;
  
  /**
   * Logger instance
   */
  protected readonly logger: Logger;
  
  /**
   * Create a new BaseMCPPrompt
   * @param logger - Logger instance
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  /**
   * Validate prompt parameters
   * @param params - Parameters to validate
   * @returns Validation result
   */
  validate(params: TParams): ValidationResult {
    // Default implementation returns success, override to add validation
    return validationSuccess();
  }
  
  /**
   * Execute the prompt
   * @param params - Prompt parameters
   * @returns Prompt result
   */
  abstract execute(params: TParams): Promise<TResult>;
} 