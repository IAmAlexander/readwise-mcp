import { LogLevel, type Logger } from './logger-interface';
import { SafeLogger } from './safe-logger';

// Create default logger for MCP
const logger = new SafeLogger({
  level: LogLevel.INFO,
  transport: console.error, // Use stderr for MCP
  timestamps: true,
  colors: true
});

export { logger, LogLevel };
export type { Logger }; 