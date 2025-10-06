import type { Logger } from '../../utils/logger-interface.js';
import { ReadwiseAPI } from '../../api/readwise-api.js';
import { Tool } from '../types.js';

/**
 * Registry of MCP tools
 */
export class ToolRegistry {
  private readonly logger: Logger;
  private readonly tools: Map<string, Tool>;
  
  /**
   * Create a new ToolRegistry
   * @param logger - Logger instance
   */
  constructor(logger: Logger) {
    this.logger = logger;
    this.tools = new Map();
  }
  
  public async initialize(): Promise<void> {
    this.logger.info('Initializing tool registry');
  }
  
  public async getTools(): Promise<Tool[]> {
    return Array.from(this.tools.values());
  }
  
  /**
   * Register a tool
   * @param tool - The tool to register
   */
  public register(tool: any): void {
    this.logger.debug(`Registering tool: ${tool.name}`);
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool ${tool.name} already registered, overwriting`);
    }
    this.tools.set(tool.name, tool as unknown as Tool);
  }
  
  /**
   * Get a tool by name
   * @param name - The name of the tool
   * @returns The tool, or undefined if not found
   */
  public get(name: string): Tool | undefined {
    const tool = this.tools.get(name);
    if (!tool) {
      this.logger.warn(`Tool ${name} not found`);
    }
    return tool;
  }
  
  /**
   * Get all registered tools
   * @returns All registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get the names of all registered tools
   * @returns The names of all registered tools
   */
  public getNames(): string[] {
    return Array.from(this.tools.keys());
  }
  
  /**
   * Get all registered tools as a map
   * @returns All registered tools as a map
   */
  getToolMap(): Record<string, Tool> {
    return Object.fromEntries(this.tools);
  }
  
  // Alias methods for backward compatibility
  getAllToolNames(): string[] {
    return this.getNames();
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public clear(): void {
    this.tools.clear();
  }
}
