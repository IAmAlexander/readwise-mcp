import { Logger } from '../../utils/logger.js';
import { ReadwiseAPI } from '../../api/readwise-api.js';
import { Prompt } from '../types.js';

/**
 * Registry of MCP prompts
 */
export class PromptRegistry {
  private promptMap: Map<string, Prompt>;
  private readonly logger: Logger;
  
  /**
   * Create a new PromptRegistry
   * @param logger - Logger instance
   */
  constructor(logger: Logger) {
    this.promptMap = new Map();
    this.logger = logger;
  }
  
  async initialize(api: ReadwiseAPI): Promise<void> {
    this.logger.debug('Initializing prompt registry');
    // Initialize prompts with API
    // Prompts will be added through register()
  }
  
  /**
   * Get all registered prompts
   */
  async getPrompts(): Promise<Prompt[]> {
    return Array.from(this.promptMap.values());
  }
  
  /**
   * Register a prompt
   * @param prompt - The prompt to register
   */
  register(prompt: Prompt): void {
    if (this.promptMap.has(prompt.name)) {
      this.logger.warn(`Prompt ${prompt.name} already registered, overwriting`);
    }
    this.promptMap.set(prompt.name, prompt);
    this.logger.debug(`Registered prompt ${prompt.name}`);
  }
  
  /**
   * Get a prompt by name
   * @param name - The name of the prompt
   * @returns The prompt, or undefined if not found
   */
  get(name: string): Prompt | undefined {
    const prompt = this.promptMap.get(name);
    if (!prompt) {
      this.logger.warn(`Prompt ${name} not found`);
    }
    return prompt;
  }
  
  /**
   * Get the names of all registered prompts
   * @returns The names of all registered prompts
   */
  getNames(): string[] {
    return Array.from(this.promptMap.keys());
  }

  // Alias methods for backward compatibility
  getAllPrompts(): Prompt[] {
    return Array.from(this.promptMap.values());
  }

  getAllPromptNames(): string[] {
    return this.getNames();
  }
}
