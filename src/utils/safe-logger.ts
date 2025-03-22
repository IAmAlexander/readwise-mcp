import { Logger, LogLevel, LogContext } from './logger-interface';

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
  
  /**
   * Whether to use colors in output
   */
  colors?: boolean;
}

const COLORS = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  reset: '\x1b[0m'
} as const;

/**
 * Safe logger that ensures logs don't interfere with MCP protocol
 */
export class SafeLogger implements Logger {
  level: LogLevel;
  transport: (message: string) => void;
  timestamps: boolean;
  colors: boolean;
  
  /**
   * Create a new SafeLogger
   * @param options - Logger options
   */
  constructor(options: {
    level?: LogLevel;
    transport?: (message: string) => void;
    timestamps?: boolean;
    colors?: boolean;
  } = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.transport = options.transport ?? console.error;
    this.timestamps = options.timestamps ?? true;
    this.colors = options.colors ?? true;
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext | Error): string {
    const parts: string[] = [];

    // Add timestamp
    if (this.timestamps) {
      parts.push(new Date().toISOString());
    }

    // Add log level
    const levelStr = level.toUpperCase().padEnd(5);
    if (this.colors) {
      parts.push(`${COLORS[level]}${levelStr}${COLORS.reset}`);
    } else {
      parts.push(levelStr);
    }

    // Add message
    parts.push(message);

    // Add context
    if (context) {
      if (context instanceof Error) {
        parts.push(context.stack || context.message);
      } else {
        parts.push(JSON.stringify(context, null, 2));
      }
    }

    return parts.join(' ');
  }
  
  private logMessage(level: LogLevel, message: string, context?: LogContext | Error): void {
    if (this.shouldLog(level)) {
      const formattedMessage = this.formatMessage(level, message, context);
      this.transport(formattedMessage);
    }
  }
  
  /**
   * Log a debug message
   * @param message - The message to log
   * @param context - Optional log context
   */
  public debug(message: string, context?: LogContext | Error): void {
    this.logMessage(LogLevel.DEBUG, message, context);
  }
  
  /**
   * Log an info message
   * @param message - The message to log
   * @param context - Optional log context
   */
  public info(message: string, context?: LogContext | Error): void {
    this.logMessage(LogLevel.INFO, message, context);
  }
  
  /**
   * Log a warning message
   * @param message - The message to log
   * @param context - Optional log context
   */
  public warn(message: string, context?: LogContext | Error): void {
    this.logMessage(LogLevel.WARN, message, context);
  }
  
  /**
   * Log an error message
   * @param message - The message to log
   * @param error - Optional error object
   * @param context - Optional log context
   */
  public error(message: string, context?: Error | LogContext): void {
    this.logMessage(LogLevel.ERROR, message, context);
  }
}
