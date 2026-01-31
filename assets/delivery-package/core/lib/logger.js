/**
 * ChatSDK Logger
 *
 * Provides structured logging with multiple levels and context.
 * Integrates with Chrome DevTools extension for real-time inspection.
 *
 * Features:
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR)
 * - Structured context with module, action, metadata
 * - Circular buffer for log storage
 * - Console output with formatting
 * - DevTools extension integration
 * - Query param and localStorage activation
 *
 * Usage:
 * ```typescript
 * import { logger } from './lib/logger';
 *
 * logger.debug('Connection established', {
 *   module: 'websocket',
 *   action: 'connect',
 *   metadata: { url: 'ws://localhost:8001' },
 * });
 * ```
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (LogLevel = {}));
class Logger {
    constructor() {
        this.level = LogLevel.INFO;
        this.logs = [];
        this.maxLogs = 1000;
        this.enabled = true;
    }
    /**
     * Set log level
     */
    setLevel(level) {
        this.level = level;
    }
    /**
     * Enable/disable logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Debug log (verbose, for development)
     */
    debug(message, context) {
        this.log(LogLevel.DEBUG, message, context);
    }
    /**
     * Info log (general information)
     */
    info(message, context) {
        this.log(LogLevel.INFO, message, context);
    }
    /**
     * Warning log (potential issues)
     */
    warn(message, context) {
        this.log(LogLevel.WARN, message, context);
    }
    /**
     * Error log (failures and exceptions)
     */
    error(message, error, context) {
        this.log(LogLevel.ERROR, message, { ...context, error });
    }
    log(level, message, context) {
        if (!this.enabled || level < this.level)
            return;
        const entry = {
            timestamp: Date.now(),
            level: LogLevel[level],
            message,
            // Bug #2 fix: Only use default if module key is not present at all
            module: context && 'module' in context ? context.module : 'core',
            action: context?.action,
            // Bug #3 fix: Deep clone metadata to prevent mutation issues
            metadata: context?.metadata
                ? JSON.parse(JSON.stringify(context.metadata))
                : undefined,
            // Bug #1 fix: Always store error object, even if message is empty
            error: context?.error
                ? {
                    name: context.error.name,
                    message: context.error.message || '(no message)',
                    stack: context.error.stack,
                }
                : undefined,
        };
        // Store in memory (circular buffer)
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        // Output to console with formatting
        this.outputToConsole(entry);
        // Send to DevTools extension (if installed)
        this.sendToDevTools(entry);
    }
    outputToConsole(entry) {
        const emoji = {
            DEBUG: '🔍',
            INFO: 'ℹ️',
            WARN: '⚠️',
            ERROR: '❌',
        }[entry.level];
        const style = {
            DEBUG: 'color: gray',
            INFO: 'color: blue',
            WARN: 'color: orange',
            ERROR: 'color: red; font-weight: bold',
        }[entry.level];
        const prefix = `${emoji} [ChatSDK:${entry.module ?? 'unknown'}]`;
        const timestamp = new Date(entry.timestamp).toISOString();
        const parts = [`%c${prefix} ${entry.message}`, style];
        if (entry.action) {
            parts.push(`\n  Action: ${entry.action}`);
        }
        if (entry.metadata) {
            parts.push(`\n  Data:`);
            parts.push(JSON.stringify(entry.metadata, null, 2));
        }
        parts.push(`\n  Time: ${timestamp}`);
        console.log(...parts);
        if (entry.error) {
            console.error('  Error:', entry.error);
        }
    }
    sendToDevTools(entry) {
        // Send to Chrome extension via postMessage
        if (typeof window !== 'undefined') {
            try {
                window.postMessage({
                    type: 'CHATSDK_LOG',
                    payload: entry,
                }, '*');
            }
            catch (err) {
                // Silently fail if postMessage is blocked
            }
        }
    }
    /**
     * Get all stored logs
     */
    getLogs() {
        return [...this.logs];
    }
    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
    }
    /**
     * Export logs as JSON
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
    /**
     * Get log statistics
     */
    getStats() {
        const byLevel = {};
        const byModule = {};
        this.logs.forEach((log) => {
            byLevel[log.level] = (byLevel[log.level] || 0) + 1;
            const moduleKey = log.module ?? 'unknown';
            byModule[moduleKey] = (byModule[moduleKey] || 0) + 1;
        });
        return {
            total: this.logs.length,
            byLevel,
            byModule,
        };
    }
}
export const logger = new Logger();
// Enable debug mode via query param or localStorage
if (typeof window !== 'undefined') {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('chatsdk_debug') === 'true' ||
            localStorage.getItem('chatsdk_debug') === 'true';
        if (debugMode) {
            logger.setLevel(LogLevel.DEBUG);
            console.log('🔍 ChatSDK Debug Mode Enabled');
            console.log('💡 Tip: Use logger.getStats() to see log statistics');
            console.log('💡 Tip: Use logger.exportLogs() to download logs');
            // Expose logger globally for debugging
            window.__CHATSDK_LOGGER__ = logger;
        }
    }
    catch (err) {
        // Silently fail in environments without window
    }
}
