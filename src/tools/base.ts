import type { Logger } from '../utils/logger-interface.js';
import { toMCPResponse } from '../utils/response.js';
import type { MCPResponse, ValidationResult } from '../mcp/types.js';

export abstract class BaseMCPTool<TParams, TResult> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: Record<string, any>;

  protected readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  validate(_params: TParams): ValidationResult {
    return { valid: true, errors: [], success: true } as any;
  }

  abstract execute(params: TParams): Promise<{ result: TResult }>;

  async executeAsMCP(params: TParams): Promise<MCPResponse> {
    const result = await this.execute(params);
    return toMCPResponse(result.result as any);
  }
} 