import { BaseMCPTool } from './base-tool';
import { Logger } from '../../utils/logger';

/**
 * Registry of MCP tools
 */
export class ToolRegistry {
  private tools: Map<string, BaseMCPTool<any, any>> = new Map();
  private logger: Logger;
  
  /**
   * Create a new ToolRegistry
   * @param logger - Logger instance
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  /**
   * Register a tool
   * @param tool - The tool to register
   */
  register(tool: BaseMCPTool<any, any>): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool with name ${tool.name} already registered, overwriting`);
    } else {
      this.logger.debug(`Registering tool: ${tool.name}`);
    }
    
    this.tools.set(tool.name, tool);
  }
  
  /**
   * Get a tool by name
   * @param name - The name of the tool
   * @returns The tool, or undefined if not found
   */
  get(name: string): BaseMCPTool<any, any> | undefined {
    const tool = this.tools.get(name);
    if (!tool) {
      this.logger.warn(`Tool not found: ${name}`);
    }
    return tool;
  }
  
  /**
   * Get all registered tools
   * @returns All registered tools
   */
  getAll(): BaseMCPTool<any, any>[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get the names of all registered tools
   * @returns The names of all registered tools
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }
  
  /**
   * Get all registered tools as a map
   * @returns All registered tools as a map
   */
  getToolMap(): Record<string, BaseMCPTool<any, any>> {
    const toolMap: Record<string, BaseMCPTool<any, any>> = {};
    
    for (const [name, tool] of this.tools.entries()) {
      toolMap[name] = tool;
    }
    
    return toolMap;
  }
}
