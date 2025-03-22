/**
 * Log levels
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel || (LogLevel = {}));
/**
 * Safe logger that ensures logs don't interfere with MCP protocol
 */
export class SafeLogger {
    /**
     * Create a new SafeLogger
     * @param transport - The transport type being used
     * @param namespace - Namespace for the logger
     * @param options - Logger options
     */
    constructor(transport, namespace, options = {
        level: LogLevel.INFO,
        showLevel: true,
        timestamps: false,
        colors: false
    }) {
        this.transport = transport;
        this.namespace = namespace;
        this.level = options.level;
        this.timestamps = options.timestamps;
        this.colors = options.colors || false;
    }
    /**
     * Format a log message
     * @param level - The log level
     * @param message - The message to log
     * @param data - Optional data to log
     * @returns The formatted log message
     */
    formatMessage(level, message, data) {
        const parts = [];
        if (this.timestamps) {
            parts.push(new Date().toISOString());
        }
        parts.push(level.toUpperCase());
        if (this.namespace) {
            parts.push(`[${this.namespace}]`);
        }
        parts.push(message);
        if (data) {
            parts.push(JSON.stringify(data));
        }
        return parts.join(' ');
    }
    /**
     * Log a message
     * @param level - The log level
     * @param message - The message to log
     * @param data - Optional data to log
     */
    log(level, message, data) {
        // Skip if level is lower than minimum
        if (this.level !== level) {
            return;
        }
        const formattedMessage = this.formatMessage(level, message, data);
        // For SSE transport, we can use regular console.log
        if (this.transport === 'sse') {
            if (level === LogLevel.ERROR) {
                console.error(formattedMessage);
            }
            else if (level === LogLevel.WARN) {
                console.warn(formattedMessage);
            }
            else {
                console.log(formattedMessage);
            }
        }
        else {
            // For stdio transport, log to stderr to avoid interfering with protocol
            console.error(formattedMessage);
        }
    }
    /**
     * Log a debug message
     * @param message - The message to log
     * @param data - Optional data to log
     */
    debug(message, data) {
        this.log(LogLevel.DEBUG, message, data);
    }
    /**
     * Log an info message
     * @param message - The message to log
     * @param data - Optional data to log
     */
    info(message, data) {
        this.log(LogLevel.INFO, message, data);
    }
    /**
     * Log a warning message
     * @param message - The message to log
     * @param data - Optional data to log
     */
    warn(message, data) {
        this.log(LogLevel.WARN, message, data);
    }
    /**
     * Log an error message
     * @param message - The message to log
     * @param data - Optional data to log
     */
    error(message, data) {
        this.log(LogLevel.ERROR, message, data);
    }
}
