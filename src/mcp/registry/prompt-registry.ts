import { BaseMCPPrompt } from './base-prompt';
import { Logger } from '../../utils/logger';

/**
 * Registry of MCP prompts
 */
export class PromptRegistry {
  private prompts: Map<string, BaseMCPPrompt<any, any>> = new Map();
  private logger: Logger;
  
  /**
   * Create a new PromptRegistry
   * @param logger - Logger instance
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  /**
   * Register a prompt
   * @param prompt - The prompt to register
   */
  register(prompt: BaseMCPPrompt<any, any>): void {
    if (this.prompts.has(prompt.name)) {
      this.logger.warn(`Prompt with name ${prompt.name} already registered, overwriting`);
    } else {
      this.logger.debug(`Registering prompt: ${prompt.name}`);
    }
    
    this.prompts.set(prompt.name, prompt);
  }
  
  /**
   * Get a prompt by name
   * @param name - The name of the prompt
   * @returns The prompt, or undefined if not found
   */
  get(name: string): BaseMCPPrompt<any, any> | undefined {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      this.logger.warn(`Prompt not found: ${name}`);
    }
    return prompt;
  }
  
  /**
   * Get all registered prompts
   * @returns All registered prompts
   */
  getAll(): BaseMCPPrompt<any, any>[] {
    return Array.from(this.prompts.values());
  }
  
  /**
   * Get the names of all registered prompts
   * @returns The names of all registered prompts
   */
  getNames(): string[] {
    return Array.from(this.prompts.keys());
  }
}
