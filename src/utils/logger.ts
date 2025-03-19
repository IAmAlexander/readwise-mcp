/**
 * Logger levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Logger options
 */
export interface LoggerOptions {
  /**
   * Minimum log level
   * @default LogLevel.INFO
   */
  level?: LogLevel;
  
  /**
   * Transport type
   * @default 'stdout'
   */
  transport?: 'stdout' | 'stderr' | 'none';
  
  /**
   * Whether to include timestamps in log messages
   * @default true
   */
  timestamps?: boolean;
  
  /**
   * Whether to colorize log messages
   * @default true
   */
  colors?: boolean;
}

/**
 * Logger class for safe logging in MCP environment
 */
export class Logger {
  private level: LogLevel;
  private transport: 'stdout' | 'stderr' | 'none';
  private timestamps: boolean;
  private colors: boolean;
  
  /**
   * ANSI color codes
   */
  private static COLORS = {
    reset: '\x1b[0m',
    debug: '\x1b[90m', // gray
    info: '\x1b[36m',  // cyan
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
    bold: '\x1b[1m'
  };
  
  /**
   * Create a new Logger instance
   * @param options - Logger options
   */
  constructor(options: LoggerOptions = {}) {
    this.level = options.level || LogLevel.INFO;
    this.transport = options.transport || 'stdout';
    this.timestamps = options.timestamps !== undefined ? options.timestamps : true;
    this.colors = options.colors !== undefined ? options.colors : true;
  }
  
  /**
   * Log a debug message
   * @param message - Message to log
   * @param data - Additional data to log
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Log an info message
   * @param message - Message to log
   * @param data - Additional data to log
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log a warning message
   * @param message - Message to log
   * @param data - Additional data to log
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log an error message
   * @param message - Message to log
   * @param error - Error to log
   */
  error(message: string, error?: any): void {
    this.log(LogLevel.ERROR, message, error);
  }
  
  /**
   * Log a message with the specified level
   * @param level - Log level
   * @param message - Message to log
   * @param data - Additional data to log
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Don't log if level is below minimum level
    if (!this.shouldLog(level)) {
      return;
    }
    
    let logMessage = this.formatMessage(level, message);
    
    // Output the log message to the appropriate transport
    this.output(logMessage);
    
    // Log additional data if provided
    if (data !== undefined) {
      try {
        if (data instanceof Error) {
          // Format error objects
          const errorData = {
            name: data.name,
            message: data.message,
            stack: data.stack
          };
          this.output(JSON.stringify(errorData, null, 2));
        } else if (typeof data === 'object') {
          // Pretty-print objects
          this.output(JSON.stringify(data, null, 2));
        } else {
          // Output other data types as-is
          this.output(String(data));
        }
      } catch (error) {
        // If data can't be serialized, output as string
        this.output(`[Unserializable data: ${typeof data}]`);
      }
    }
  }
  
  /**
   * Format a log message
   * @param level - Log level
   * @param message - Message to format
   * @returns Formatted message
   */
  private formatMessage(level: LogLevel, message: string): string {
    let formattedLevel = level.toUpperCase().padEnd(5);
    let timestamp = this.timestamps ? new Date().toISOString() + ' ' : '';
    
    if (this.colors && this.transport !== 'none') {
      const color = Logger.COLORS[level] || '';
      return `${color}${timestamp}[${formattedLevel}]${Logger.COLORS.reset} ${message}`;
    } else {
      return `${timestamp}[${formattedLevel}] ${message}`;
    }
  }
  
  /**
   * Output a message to the appropriate transport
   * @param message - Message to output
   */
  private output(message: string): void {
    switch (this.transport) {
      case 'stdout':
        console.log(message);
        break;
      case 'stderr':
        console.error(message);
        break;
      case 'none':
        // Don't output anything
        break;
    }
  }
  
  /**
   * Check if a log level should be logged
   * @param level - Log level to check
   * @returns Whether the level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const levelIndex = levels.indexOf(level);
    const minimumLevelIndex = levels.indexOf(this.level);
    
    return levelIndex >= minimumLevelIndex;
  }
  
  /**
   * Create a logger suitable for MCP transport
   * @param transport - Transport type
   * @param debug - Whether to enable debug logging
   * @returns Logger instance
   */
  static forTransport(transport: 'stdio' | 'sse', debug: boolean = false): Logger {
    return new Logger({
      level: debug ? LogLevel.DEBUG : LogLevel.INFO,
      transport: transport === 'stdio' ? 'stderr' : 'stdout',
      timestamps: true,
      colors: true
    });
  }
} 