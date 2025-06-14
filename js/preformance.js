// performance.js - Performance monitoring for FROSTI Ray Tracing
class PerformanceMonitor {
    constructor() {
        this.enabled = false;
        this.overlay = null;
        this.stats = {
            fps: 0,
            frameTime: 0,
            renderTime: 0,
            rayCount: 0,
            totalRays: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            frameHistory: [],
            renderHistory: [],
            maxHistoryLength: 60
        };
        
        this.timers = {
            frameStart: 0,
            renderStart: 0,
            lastFrame: performance.now()
        };
        
        this.updateInterval = null;
        this.createOverlay();
        this.bindHotkeys();
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'performance-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.85);
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #333;
            z-index: 1001;
            min-width: 200px;
            display: none;
            user-select: none;
            pointer-events: none;
            line-height: 1.3;
        `;
        document.body.appendChild(this.overlay);
    }
    
    bindHotkeys() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                this.toggle();
            }
        });
    }
    
    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.start();
        } else {
            this.stop();
        }
    }
    
    start() {
        this.overlay.style.display = 'block';
        this.timers.lastFrame = performance.now();
        this.updateInterval = setInterval(() => this.updateDisplay(), 100);
        console.log('Performance monitor started - Press P to toggle');
    }
    
    stop() {
        this.overlay.style.display = 'none';
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('Performance monitor stopped');
    }
    
    // Call this at the start of each frame
    frameStart() {
        if (!this.enabled) return;
        this.timers.frameStart = performance.now();
    }
    
    // Call this at the end of each frame
    frameEnd() {
        if (!this.enabled) return;
        
        const now = performance.now();
        const frameTime = now - this.timers.frameStart;
        const deltaTime = now - this.timers.lastFrame;
        
        // Update frame stats
        this.stats.frameTime = frameTime;
        this.stats.fps = deltaTime > 0 ? 1000 / deltaTime : 0;
        
        // Update history
        this.stats.frameHistory.push(frameTime);
        if (this.stats.frameHistory.length > this.stats.maxHistoryLength) {
            this.stats.frameHistory.shift();
        }
        
        this.timers.lastFrame = now;
    }
    
    // Call this at the start of rendering operations
    renderStart() {
        if (!this.enabled) return;
        this.timers.renderStart = performance.now();
    }
    
    // Call this at the end of rendering operations
    renderEnd() {
        if (!this.enabled) return;
        
        const renderTime = performance.now() - this.timers.renderStart;
        this.stats.renderTime = renderTime;
        
        this.stats.renderHistory.push(renderTime);
        if (this.stats.renderHistory.length > this.stats.maxHistoryLength) {
            this.stats.renderHistory.shift();
        }
    }
    
    // Update ray count (call whenever rays array changes)
    updateRayCount(currentRays, totalRaysCreated = null) {
        if (!this.enabled) return;
        this.stats.rayCount = currentRays;
        if (totalRaysCreated !== null) {
            this.stats.totalRays = totalRaysCreated;
        }
    }
    
    // Get memory usage (approximate)
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
            };
        }
        return null;
    }
    
    // Calculate average from history array
    getAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }
    
    // Get performance statistics
    getStats() {
        const memory = this.getMemoryUsage();
        const avgFrameTime = this.getAverage(this.stats.frameHistory);
        const avgRenderTime = this.getAverage(this.stats.renderHistory);
        const avgFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
        
        return {
            current: {
                fps: Math.round(this.stats.fps * 10) / 10,
                frameTime: Math.round(this.stats.frameTime * 100) / 100,
                renderTime: Math.round(this.stats.renderTime * 100) / 100,
                rayCount: this.stats.rayCount,
                totalRays: this.stats.totalRays
            },
            average: {
                fps: Math.round(avgFps * 10) / 10,
                frameTime: Math.round(avgFrameTime * 100) / 100,
                renderTime: Math.round(avgRenderTime * 100) / 100
            },
            memory: memory
        };
    }
    
    updateDisplay() {
        if (!this.enabled || !this.overlay) return;
        
        const stats = this.getStats();
        const renderPercent = stats.current.frameTime > 0 ? 
            Math.round((stats.current.renderTime / stats.current.frameTime) * 100) : 0;
        
        let html = `<div style="color: #00ff00; font-weight: bold; margin-bottom: 8px;">⚡ PERFORMANCE MONITOR</div>`;
        
        // Current frame stats
        html += `<div style="color: #ffff00;">CURRENT FRAME:</div>`;
        html += `FPS: ${stats.current.fps.toFixed(1)}<br>`;
        html += `Frame: ${stats.current.frameTime.toFixed(2)}ms<br>`;
        html += `Render: ${stats.current.renderTime.toFixed(2)}ms (${renderPercent}%)<br>`;
        html += `<br>`;
        
        // Average stats
        html += `<div style="color: #ffff00;">AVERAGES (${this.stats.frameHistory.length}f):</div>`;
        html += `FPS: ${stats.average.fps.toFixed(1)}<br>`;
        html += `Frame: ${stats.average.frameTime.toFixed(2)}ms<br>`;
        html += `Render: ${stats.average.renderTime.toFixed(2)}ms<br>`;
        html += `<br>`;
        
        // Ray statistics
        html += `<div style="color: #ffff00;">RAY STATS:</div>`;
        html += `Active: ${stats.current.rayCount}<br>`;
        html += `Total: ${stats.current.totalRays}<br>`;
        html += `<br>`;
        
        // Memory usage
        if (stats.memory) {
            const memUsagePercent = Math.round((stats.memory.used / stats.memory.total) * 100);
            html += `<div style="color: #ffff00;">MEMORY:</div>`;
            html += `Used: ${stats.memory.used}MB (${memUsagePercent}%)<br>`;
            html += `Total: ${stats.memory.total}MB<br>`;
            html += `Limit: ${stats.memory.limit}MB<br>`;
            html += `<br>`;
        }
        
        // Performance indicators
        html += `<div style="color: #ffff00;">STATUS:</div>`;
        if (stats.current.fps >= 55) {
            html += `<span style="color: #00ff00;">● OPTIMAL</span><br>`;
        } else if (stats.current.fps >= 30) {
            html += `<span style="color: #ffaa00;">● GOOD</span><br>`;
        } else if (stats.current.fps >= 15) {
            html += `<span style="color: #ff6600;">● SLOW</span><br>`;
        } else {
            html += `<span style="color: #ff0000;">● CRITICAL</span><br>`;
        }
        
        html += `<br><div style="color: #888; font-size: 10px;">Press P to toggle</div>`;
        
        this.overlay.innerHTML = html;
    }
    
    // Method to log performance data to console
    logStats() {
        const stats = this.getStats();
        console.group('🚀 Performance Statistics');
        console.log('Current FPS:', stats.current.fps);
        console.log('Average FPS:', stats.average.fps);
        console.log('Frame Time:', stats.current.frameTime + 'ms');
        console.log('Render Time:', stats.current.renderTime + 'ms');
        console.log('Active Rays:', stats.current.rayCount);
        console.log('Total Rays Created:', stats.current.totalRays);
        if (stats.memory) {
            console.log('Memory Usage:', stats.memory.used + 'MB / ' + stats.memory.total + 'MB');
        }
        console.groupEnd();
    }
    
    // Reset all statistics
    reset() {
        this.stats.frameHistory = [];
        this.stats.renderHistory = [];
        this.stats.totalRays = 0;
        console.log('Performance statistics reset');
    }
}

// Create global performance monitor instance
const perfMonitor = new PerformanceMonitor();

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.perfMonitor = perfMonitor;
}

// Console API for manual control
console.log(`
🚀 Performance Monitor Loaded!

Controls:
- Press 'P' to toggle performance overlay
- perfMonitor.start() - Start monitoring
- perfMonitor.stop() - Stop monitoring  
- perfMonitor.logStats() - Log stats to console
- perfMonitor.reset() - Reset statistics

Integration:
Add these calls to your animation loop:
- perfMonitor.frameStart() at start of frame
- perfMonitor.frameEnd() at end of frame
- perfMonitor.renderStart() before rendering
- perfMonitor.renderEnd() after rendering
- perfMonitor.updateRayCount(rays.length, totalRaysCreated)
`);