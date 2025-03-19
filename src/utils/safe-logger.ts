/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Logger options
 */
export interface LoggerOptions {
  /**
   * Minimum log level to display
   */
  level: LogLevel;
  
  /**
   * Whether to show the log level in the output
   */
  showLevel: boolean;
  
  /**
   * Whether to include timestamps in the output
   */
  timestamps: boolean;
}

/**
 * Safe logger that ensures logs don't interfere with MCP protocol
 */
export class SafeLogger {
  private options: LoggerOptions;
  
  /**
   * Create a new SafeLogger
   * @param transport - The transport type being used
   * @param namespace - Namespace for the logger
   * @param options - Logger options
   */
  constructor(
    private transport: 'stdio' | 'sse',
    private namespace: string,
    options: Partial<LoggerOptions> = {}
  ) {
    // Default options
    this.options = {
      level: LogLevel.INFO,
      showLevel: true,
      timestamps: true,
      ...options
    };
  }
  
  /**
   * Format a log message
   * @param level - The log level
   * @param message - The message to log
   * @param data - Optional data to log
   * @returns The formatted log message
   */
  private format(level: LogLevel, message: string, data?: any): string {
    const parts: string[] = [];
    
    // Add timestamp if enabled
    if (this.options.timestamps) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    // Add namespace
    parts.push(`[${this.namespace}]`);
    
    // Add level if enabled
    if (this.options.showLevel) {
      const levelStr = LogLevel[level];
      parts.push(`[${levelStr}]`);
    }
    
    // Add message
    parts.push(message);
    
    // Format the log message
    let result = parts.join(' ');
    
    // Add data if provided
    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        result += ` ${dataStr}`;
      } catch (error) {
        result += ' [Error serializing data]';
      }
    }
    
    return result;
  }
  
  /**
   * Log a message
   * @param level - The log level
   * @param message - The message to log
   * @param data - Optional data to log
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Skip if level is lower than minimum
    if (level < this.options.level) {
      return;
    }
    
    const formattedMessage = this.format(level, message, data);
    
    // For SSE transport, we can use regular console.log
    if (this.transport === 'sse') {
      if (level === LogLevel.ERROR) {
        console.error(formattedMessage);
      } else if (level === LogLevel.WARN) {
        console.warn(formattedMessage);
      } else {
        console.log(formattedMessage);
      }
    } else {
      // For stdio transport, log to stderr to avoid interfering with protocol
      console.error(formattedMessage);
    }
  }
  
  /**
   * Log a debug message
   * @param message - The message to log
   * @param data - Optional data to log
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Log an info message
   * @param message - The message to log
   * @param data - Optional data to log
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log a warning message
   * @param message - The message to log
   * @param data - Optional data to log
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log an error message
   * @param message - The message to log
   * @param data - Optional data to log
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
}
