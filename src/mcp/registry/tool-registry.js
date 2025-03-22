/**
 * Registry of MCP tools
 */
export class ToolRegistry {
    /**
     * Create a new ToolRegistry
     * @param logger - Logger instance
     */
    constructor(logger) {
        this.toolMap = new Map();
        this.logger = logger;
    }
    async initialize(api) {
        this.logger.debug('Initializing tool registry');
        // Initialize tools with API
        // Tools will be added through register()
    }
    async getTools() {
        return Array.from(this.toolMap.values());
    }
    /**
     * Register a tool
     * @param tool - The tool to register
     */
    register(tool) {
        if (this.toolMap.has(tool.name)) {
            this.logger.warn(`Tool with name ${tool.name} already registered, overwriting`);
        }
        else {
            this.logger.debug(`Registering tool: ${tool.name}`);
        }
        this.toolMap.set(tool.name, tool);
    }
    /**
     * Get a tool by name
     * @param name - The name of the tool
     * @returns The tool, or undefined if not found
     */
    get(name) {
        const tool = this.toolMap.get(name);
        if (!tool) {
            this.logger.warn(`Tool not found: ${name}`);
        }
        return tool;
    }
    /**
     * Get all registered tools
     * @returns All registered tools
     */
    getAll() {
        return Array.from(this.toolMap.values());
    }
    /**
     * Get the names of all registered tools
     * @returns The names of all registered tools
     */
    getNames() {
        return Array.from(this.toolMap.keys());
    }
    /**
     * Get all registered tools as a map
     * @returns All registered tools as a map
     */
    getToolMap() {
        return Object.fromEntries(this.toolMap);
    }
}
