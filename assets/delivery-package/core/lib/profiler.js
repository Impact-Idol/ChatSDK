/**
 * Performance Profiler
 *
 * Tracks key metrics: message send time, render time, WebSocket latency, etc.
 *
 * Usage:
 * ```typescript
 * import { profiler } from './lib/profiler';
 *
 * const end = profiler.start('message.send');
 * await sendMessage(data);
 * end();
 *
 * // View stats
 * profiler.report();
 * ```
 */
class Profiler {
    constructor() {
        this.metrics = new Map();
        this.marks = [];
        this.maxMarks = 1000;
        this.enabled = false;
    }
    /**
     * Enable/disable profiler
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Start timing an operation
     * Returns a function to end the timer
     */
    start(label, metadata) {
        if (!this.enabled)
            return () => { };
        const startTime = performance.now();
        return () => {
            const duration = performance.now() - startTime;
            this.record(label, duration, metadata);
        };
    }
    /**
     * Record a duration for a label
     */
    record(label, duration, metadata) {
        if (!this.enabled)
            return;
        // Store in metrics map
        if (!this.metrics.has(label)) {
            this.metrics.set(label, []);
        }
        this.metrics.get(label).push(duration);
        // Store mark
        this.marks.push({
            label,
            startTime: performance.now() - duration,
            duration,
            metadata,
        });
        // Limit marks to prevent memory issues
        if (this.marks.length > this.maxMarks) {
            this.marks.shift();
        }
    }
    /**
     * Measure time with async function
     */
    async measure(label, fn) {
        const end = this.start(label);
        try {
            return await fn();
        }
        finally {
            end();
        }
    }
    /**
     * Measure time with sync function
     */
    measureSync(label, fn) {
        const end = this.start(label);
        try {
            return fn();
        }
        finally {
            end();
        }
    }
    /**
     * Get statistics for a label
     */
    getStats(label) {
        const values = this.metrics.get(label);
        if (!values || values.length === 0)
            return null;
        const sorted = [...values].sort((a, b) => a - b);
        const total = values.reduce((a, b) => a + b, 0);
        return {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: total / values.length,
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            total,
        };
    }
    /**
     * Get all statistics
     */
    getAllStats() {
        const stats = new Map();
        this.metrics.forEach((_, label) => {
            const labelStats = this.getStats(label);
            if (labelStats) {
                stats.set(label, labelStats);
            }
        });
        return stats;
    }
    /**
     * Get recent marks
     */
    getMarks(limit = 100) {
        return this.marks.slice(-limit);
    }
    /**
     * Print performance report to console
     */
    report() {
        if (!this.enabled) {
            console.log('Profiler is disabled. Enable with profiler.setEnabled(true)');
            return;
        }
        const allStats = this.getAllStats();
        if (allStats.size === 0) {
            console.log('No performance data collected yet.');
            return;
        }
        const data = Array.from(allStats.entries())
            .map(([label, stats]) => ({
            label,
            count: stats.count,
            min: `${stats.min.toFixed(2)}ms`,
            max: `${stats.max.toFixed(2)}ms`,
            avg: `${stats.avg.toFixed(2)}ms`,
            p50: `${stats.p50.toFixed(2)}ms`,
            p95: `${stats.p95.toFixed(2)}ms`,
            p99: `${stats.p99.toFixed(2)}ms`,
        }))
            .sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg)); // Sort by avg desc
        console.log('📊 ChatSDK Performance Report');
        console.table(data);
    }
    /**
     * Export data as JSON
     */
    export() {
        const allStats = this.getAllStats();
        const data = {};
        allStats.forEach((stats, label) => {
            data[label] = stats;
        });
        return JSON.stringify({
            timestamp: Date.now(),
            stats: data,
            recentMarks: this.marks.slice(-100),
        }, null, 2);
    }
    /**
     * Clear all metrics
     */
    clear() {
        this.metrics.clear();
        this.marks = [];
    }
    /**
     * Get summary statistics
     */
    getSummary() {
        let totalOperations = 0;
        let totalDuration = 0;
        let slowestOperation = null;
        this.metrics.forEach((values, label) => {
            totalOperations += values.length;
            const labelTotal = values.reduce((a, b) => a + b, 0);
            totalDuration += labelTotal;
            const max = Math.max(...values);
            if (!slowestOperation || max > slowestOperation.duration) {
                slowestOperation = { label, duration: max };
            }
        });
        return {
            totalOperations,
            totalDuration,
            averageDuration: totalOperations > 0 ? totalDuration / totalOperations : 0,
            slowestOperation,
        };
    }
}
export const profiler = new Profiler();
// Enable profiler in debug mode
if (typeof window !== 'undefined') {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('chatsdk_debug') === 'true' ||
            localStorage.getItem('chatsdk_debug') === 'true';
        if (debugMode) {
            profiler.setEnabled(true);
            console.log('📊 ChatSDK Profiler Enabled');
            console.log('💡 Tip: Use profiler.report() to see performance stats');
            // Expose profiler globally for debugging
            window.__CHATSDK_PROFILER__ = profiler;
        }
    }
    catch (err) {
        // Silently fail in environments without window
    }
}
/**
 * Decorator to automatically profile async methods
 * Supports both legacy (experimentalDecorators) and TC39 Stage 3 decorators
 */
export function Profile(label) {
    // Check if it's being called as a new-style decorator (TC39 Stage 3)
    return function (target, contextOrPropertyKey, descriptor) {
        // New-style decorator (TC39 Stage 3): target is the method, contextOrPropertyKey is DecoratorContext
        if (typeof target === 'function' && contextOrPropertyKey?.kind === 'method') {
            const context = contextOrPropertyKey;
            const originalMethod = target;
            const profileLabel = label || String(context.name);
            return async function (...args) {
                const end = profiler.start(profileLabel);
                try {
                    return await originalMethod.apply(this, args);
                }
                finally {
                    end();
                }
            };
        }
        // Legacy decorator (experimentalDecorators): target is prototype, contextOrPropertyKey is string, descriptor is PropertyDescriptor
        if (descriptor && typeof descriptor.value === 'function') {
            const originalMethod = descriptor.value;
            const propertyKey = contextOrPropertyKey;
            const profileLabel = label || `${target.constructor.name}.${propertyKey}`;
            descriptor.value = async function (...args) {
                const end = profiler.start(profileLabel);
                try {
                    return await originalMethod.apply(this, args);
                }
                finally {
                    end();
                }
            };
            return descriptor;
        }
        throw new Error('Profile decorator can only be applied to methods');
    };
}
