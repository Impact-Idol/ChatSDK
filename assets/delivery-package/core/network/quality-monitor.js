/**
 * Network Quality Monitor
 *
 * Measures connection quality using multiple metrics:
 * - Latency (ping time)
 * - Packet loss (failed requests %)
 * - Online/offline status
 * - Quality classification (EXCELLENT/GOOD/FAIR/POOR/OFFLINE)
 *
 * Usage:
 * ```typescript
 * const monitor = new NetworkQualityMonitor({ apiUrl: 'http://localhost:5500' });
 * monitor.subscribe((metrics) => {
 *   console.log(`Connection: ${metrics.quality}, ${metrics.latency}ms`);
 * });
 * ```
 */
export var NetworkQuality;
(function (NetworkQuality) {
    NetworkQuality["EXCELLENT"] = "EXCELLENT";
    NetworkQuality["GOOD"] = "GOOD";
    NetworkQuality["FAIR"] = "FAIR";
    NetworkQuality["POOR"] = "POOR";
    NetworkQuality["OFFLINE"] = "OFFLINE";
})(NetworkQuality || (NetworkQuality = {}));
export class NetworkQualityMonitor {
    constructor(config = {}) {
        this.metrics = {
            quality: NetworkQuality.GOOD,
            latency: 0,
            packetLoss: 0,
            isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
            timestamp: Date.now(),
        };
        this.listeners = [];
        this.pingInterval = null;
        this.isDestroyed = false;
        this.handleOnline = () => {
            this.log('Browser online event detected');
            this.metrics.isOnline = true;
            this.measureLatency(); // Verify connection
        };
        this.handleOffline = () => {
            this.log('Browser offline event detected');
            this.metrics.isOnline = false;
            this.metrics.quality = NetworkQuality.OFFLINE;
            this.metrics.timestamp = Date.now();
            this.notifyListeners();
        };
        this.pingUrl = config.apiUrl ? `${config.apiUrl}/health` : '/health';
        this.intervalMs = config.pingInterval || 10000; // Default 10s
        this.debug = config.debug || false;
        // Check if we're in browser environment
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
            // Listen to browser online/offline events
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);
            // Start periodic ping
            this.startMonitoring();
        }
        this.log('NetworkQualityMonitor initialized', { pingUrl: this.pingUrl, intervalMs: this.intervalMs });
    }
    log(message, data) {
        if (this.debug) {
            console.log(`[NetworkQualityMonitor] ${message}`, data || '');
        }
    }
    startMonitoring() {
        // Initial measurement
        this.measureLatency();
        // Periodic measurements
        this.pingInterval = setInterval(() => {
            if (!this.isDestroyed) {
                this.measureLatency();
            }
        }, this.intervalMs);
    }
    async measureLatency() {
        if (!this.metrics.isOnline) {
            this.log('Skipping ping - browser is offline');
            return;
        }
        const start = Date.now();
        try {
            // Use HEAD request to minimize data transfer
            const response = await fetch(this.pingUrl, {
                method: 'HEAD',
                cache: 'no-cache',
                // Add timeout using AbortController (5s timeout)
                signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
            });
            if (response.ok) {
                const latency = Date.now() - start;
                this.log(`Ping successful: ${latency}ms`);
                this.updateMetrics({ latency, success: true });
            }
            else {
                this.log(`Ping failed: HTTP ${response.status}`);
                this.updateMetrics({ latency: 0, success: false });
            }
        }
        catch (error) {
            this.log(`Ping error: ${error.message}`);
            this.updateMetrics({ latency: 0, success: false });
        }
    }
    updateMetrics(data) {
        if (data.success) {
            // Update latency
            this.metrics.latency = data.latency;
            // Decay packet loss (recovery)
            this.metrics.packetLoss = Math.max(0, this.metrics.packetLoss - 5);
        }
        else {
            // Increase packet loss (failure)
            this.metrics.packetLoss = Math.min(100, this.metrics.packetLoss + 10);
        }
        // Calculate quality based on metrics
        this.metrics.quality = this.calculateQuality();
        this.metrics.timestamp = Date.now();
        this.log('Metrics updated', {
            quality: this.metrics.quality,
            latency: this.metrics.latency,
            packetLoss: this.metrics.packetLoss.toFixed(1),
        });
        this.notifyListeners();
    }
    calculateQuality() {
        // Check if offline
        if (!this.metrics.isOnline || this.metrics.packetLoss > 10) {
            return NetworkQuality.OFFLINE;
        }
        const { latency, packetLoss } = this.metrics;
        // Classify quality based on latency and packet loss
        if (latency < 50 && packetLoss < 1) {
            return NetworkQuality.EXCELLENT;
        }
        if (latency < 150 && packetLoss < 2) {
            return NetworkQuality.GOOD;
        }
        if (latency < 300 && packetLoss < 5) {
            return NetworkQuality.FAIR;
        }
        return NetworkQuality.POOR;
    }
    /**
     * Subscribe to network quality updates
     * @returns Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.push(listener);
        // Immediate callback with current metrics
        listener({ ...this.metrics });
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notifyListeners() {
        const metrics = { ...this.metrics };
        this.listeners.forEach((listener) => {
            try {
                listener(metrics);
            }
            catch (error) {
                console.error('[NetworkQualityMonitor] Listener error:', error);
            }
        });
    }
    /**
     * Get current network metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Manually trigger a ping measurement
     */
    async ping() {
        await this.measureLatency();
        return this.getMetrics();
    }
    /**
     * Clean up resources
     */
    destroy() {
        this.log('Destroying monitor');
        this.isDestroyed = true;
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline);
            window.removeEventListener('offline', this.handleOffline);
        }
        this.listeners = [];
    }
}
