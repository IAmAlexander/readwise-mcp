/**
 * Registry of MCP prompts
 */
export class PromptRegistry {
    /**
     * Create a new PromptRegistry
     * @param logger - Logger instance
     */
    constructor(logger) {
        this.prompts = [];
        this.logger = logger;
    }
    async initialize(api) {
        this.logger.debug('Initializing prompt registry');
        // Initialize prompts with API
        this.prompts = [
        // Add your prompts here
        ];
    }
    getPrompts() {
        return this.prompts;
    }
}
