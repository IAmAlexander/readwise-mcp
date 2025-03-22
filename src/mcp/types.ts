/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error type
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Tool parameter schema
 */
export interface ToolParameters {
  [key: string]: unknown;
}

/**
 * Tool interface
 */
export interface Tool {
  name: string;
  description: string;
  validate?(parameters: any): ValidationResult;
  execute(parameters: any): Promise<MCPResponse>;
}

/**
 * Prompt interface
 */
export interface Prompt {
  name: string;
  description: string;
  validate?(parameters: any): ValidationResult;
  execute(parameters: any): Promise<MCPResponse>;
}

export interface MCPContentItem {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: {
    text: string;
    uri: string;
    mimeType?: string;
  } | {
    uri: string;
    blob: string;
    mimeType?: string;
  };
  [key: string]: unknown;
}

export interface MCPResponse {
  content: MCPContentItem[];
  _meta?: Record<string, unknown>;
  isError?: boolean;
  [key: string]: unknown;
} 