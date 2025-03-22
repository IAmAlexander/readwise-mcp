/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Log context type
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Logger interface
 */
export interface Logger {
  level: LogLevel;
  transport: (message: string) => void;
  timestamps: boolean;
  colors: boolean;

  debug(message: string, context?: LogContext | Error): void;
  info(message: string, context?: LogContext | Error): void;
  warn(message: string, context?: LogContext | Error): void;
  error(message: string, context?: Error | LogContext): void;
} 