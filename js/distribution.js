
/*
 * HISTOGRAM OVERLAY SYSTEM
 * ========================
 * 
 * Real-time histogram visualization system that overlays ray termination data
 * directly onto the main canvas. Provides performance monitoring and diagnostics.
 * 
 * CORE RENDERING FUNCTIONS:
 * 
 * drawHistogramOnCanvas(ctx)
 *   - Main rendering function for histogram bars on canvas
 *   - Applies canvas transformations to match plot coordinate system
 *   - Uses color interpolation based on count intensity (red to orange gradient)
 *   - Returns: void (renders directly to canvas context)
 * 
 * renderHistogramOverlay(ctx, terminationBounds)
 *   - Wrapper function for histogram rendering in main render loop
 *   - Call after drawing rays but before presenting frame
 *   - Returns: void
 * 
 * getBarColor(count, maxCount)
 *   - Calculates color interpolation for histogram bars
 *   - Maps count intensity to red-orange gradient
 *   - Returns: RGB color string for bar rendering
 * 
 * CONTROL FUNCTIONS:
 * 
 * toggleHistogram()
 *   - Toggles histogram visibility on/off
 *   - Updates global histogramVisible flag
 *   - Returns: void (logs state change to console)
 * 
 * resetHistogram()
 *   - Clears all histogram data and performance counters
 *   - Calls clearTerminationCounts() from physics module
 *   - Returns: void
 * 
 * setHistogramConfig(config)
 *   - Updates histogram visual configuration
 *   - Merges provided config with HISTOGRAM_CONFIG object
 *   - Returns: void
 * 
 * DIAGNOSTICS FUNCTIONS:
 * 
 * getHistogramDiagnostics()
 *   - Comprehensive performance and health analysis
 *   - Calculates rendering metrics, health score, and provides recommendations
 *   - Returns: diagnostic object with {totalRenders, avgRenderTimeMs, barsToRender, 
 *     healthScore, warnings, recommendations, status, renderingImpact, etc.}
 * 
 * CONFIGURATION:
 * 
 * HISTOGRAM_CONFIG object controls visual appearance:
 *   - maxBarLength: 150px maximum bar length
 *   - barWidth: 4px bar height
 *   - barSpacing: 2px gap between bars
 *   - xOffset: 10px distance from hit position
 *   - opacity: 0.7 bar transparency
 *   - Color scheme: red to orange gradient based on count intensity
 * 
 * PERFORMANCE TRACKING:
 * - histogramRenderCount: total number of render calls
 * - totalHistogramRenderTime: cumulative rendering time in milliseconds
 * - Automatic performance warnings when rendering exceeds thresholds
 * - Health scoring system (0-100) based on performance metrics
 * 
 * KEYBOARD CONTROLS:
 * - 'H' key: Toggle histogram visibility
 * - 'R' key: Reset histogram and KDE data
 * 
 * INTEGRATION REQUIREMENTS:
 * - Depends on getTerminationStats() from physics module
 * - Expects global variables: zoomLevel, panX, panY for canvas transformations
 * - Requires clearTerminationCounts() and resetKDE() functions
 * - Canvas context should be available in main render loop
 * 
 * COORDINATE SYSTEM:
 * - Uses plot coordinate system with canvas transformations
 * - Bars grow leftward from origin (x = 0) in plot space
 * - Y-coordinates match bin values directly
 * - Scaling adjusts with zoom level to maintain visual consistency
 * 
 * PERFORMANCE NOTES:
 * - Optimized for real-time rendering in animation loops
 * - Color calculations cached per frame
 * - Canvas state saving/restoration for isolation
 * - Diagnostic warnings for performance degradation scenarios
 */
// <====== Comments ======>
// TODO:
// Correctly create reset histogram function
// 
// 
//
//

// Histogram overlay system for main canvas
let histogramVisible = false;

// Performance tracking for histogram rendering
let histogramRenderCount = 0;
let totalHistogramRenderTime = 0;

// These variables should match your existing distribution plot system
const HISTOGRAM_CONFIG = {
    maxBarLength: 150,        // Maximum bar length in pixels
    barWidth: 4,              // Height of each bar
    barSpacing: 2,            // Gap between bars
    xOffset: 10,              // Distance from hit position (grows leftward)
    opacity: 0.7,             // Bar transparency
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Background for better visibility
    baseBarColor: '#3b82f6',  // Base bar color (blue)
    highCountColor: '#10b981', // High count color (green)
    textColor: '#ffffff'      // Text color
};

// Helper function to interpolate between two colors based on count intensity
function getBarColor(count, maxCount) {
    // Calculate intensity (0 to 1)
    const intensity = count / maxCount;
    
    // Red color: #ff0000 -> rgb(255, 0, 0)
    // Orange color: #ff8000 -> rgb(255, 128, 0)
    
    const baseR = 255, baseG = 0, baseB = 0;
    const highR = 255, highG = 128, highB = 0;
    
    // Interpolate RGB values
    const r = Math.round(baseR + (highR - baseR) * intensity);
    const g = Math.round(baseG + (highG - baseG) * intensity);
    const b = Math.round(baseB + (highB - baseB) * intensity);
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Draw histogram bars on the main canvas  
function drawHistogramOnCanvas(ctx, stats, terminationBounds) {
    const startTime = performance.now();
    histogramRenderCount++;
    
    
    // Check if we have data
    if (!histogramVisible || !stats || stats.distribution.size === 0) {
        totalHistogramRenderTime += (performance.now() - startTime);
        return;
    }
    
    // Get canvas dimensions
    const canvasHeight = ctx.canvas.height;
    const canvasWidth = ctx.canvas.width;
    
    // Get data from your stats
    const bins = Array.from(stats.distribution.keys()).sort((a, b) => a - b);
    const counts = bins.map(bin => stats.distribution.get(bin));
    const maxCount = stats.maxCount;
    
    if (maxCount === 0) {
        totalHistogramRenderTime += (performance.now() - startTime);
        return;
    }
    
    // Save context state
    ctx.save();
    
    // Apply the same transformation as your plot using your existing variables
    // Assuming you have zoomLevel, panX, panY variables available globally
    ctx.setTransform(
        zoomLevel, 0, 0, zoomLevel,
        panX + canvasWidth/2, panY + canvasHeight/2
    );
    
    // Reset alpha for bars
    ctx.globalAlpha = 0.6;
    
    // Draw bars with color based on count
    bins.forEach(bin => {
        const count = stats.distribution.get(bin);
        
        // Set bar color based on count intensity
        ctx.fillStyle = getBarColor(count, maxCount);
        
        // Use the bin value directly as the Y coordinate (in plot space)
        const yPos = bin; // This was an orbitrary offset to center the histogram vertically
        
        // Calculate bar length proportional to count
        // Scale bar length by inverse of zoom to maintain consistent visual size
        const barLength = (count / maxCount) * HISTOGRAM_CONFIG.maxBarLength / zoomLevel;
        
        // Position bars to grow leftward from the origin (x = 0 in plot space)
        const barX = -barLength; // Start position (grows left from origin)
        const barY = (HISTOGRAM_CONFIG.barWidth/2) / zoomLevel - yPos;
        const barHeight = HISTOGRAM_CONFIG.barWidth / zoomLevel;
        
        // Draw bar growing leftward from origin
        ctx.fillRect(barX, barY, barLength, barHeight);
        
    });
    // Restore context state
    ctx.restore();
    
    totalHistogramRenderTime += (performance.now() - startTime);
}

// Call this in your main render loop after drawing rays but before presenting
function renderHistogramOverlay(ctx, terminationBounds) {
    drawHistogramOnCanvas(ctx, terminationBounds);
}

// Toggle histogram visibility
function toggleHistogram() {
    histogramVisible = !histogramVisible;
    console.log('Histogram toggled:', histogramVisible ? 'ON' : 'OFF');
}

// Reset function to clear histogram data 
function resetHistogram() {
    clearTerminationCounts();
    // Reset histogram performance counters too
    histogramRenderCount = 0;
    totalHistogramRenderTime = 0;
}

// Comprehensive histogram diagnostics function
function getHistogramDiagnostics() {
    const stats = getTerminationStats();
    const avgRenderTime = histogramRenderCount > 0 ? (totalHistogramRenderTime / histogramRenderCount) : 0;
    const dataPoints = stats ? stats.distribution.size : 0;
    
    // Generate warnings and recommendations
    const warnings = [];
    const recommendations = [];
    
    if (avgRenderTime > 2.0) warnings.push('Slow histogram rendering: ' + avgRenderTime.toFixed(3) + 'ms per frame');
    if (dataPoints > 500) warnings.push('High histogram complexity: ' + dataPoints + ' bars to render');
    if (histogramVisible && dataPoints === 0) warnings.push('Histogram visible but no data to display');
    
    if (avgRenderTime > 2.0) recommendations.push('Consider reducing histogram detail or optimizing rendering');
    if (dataPoints > 500) recommendations.push('Increase bin size to reduce number of bars');
    if (histogramRenderCount > 1000 && avgRenderTime > 1.0) recommendations.push('Consider limiting histogram update frequency');
    
    // Calculate health score
    let healthScore = 100;
    if (avgRenderTime > 2.0) healthScore -= 40;
    if (dataPoints > 500) healthScore -= 20;
    if (avgRenderTime > 5.0) healthScore -= 30;
    healthScore = Math.max(0, healthScore);
    
    return {
        // Rendering performance
        totalRenders: histogramRenderCount,
        totalRenderTimeMs: totalHistogramRenderTime.toFixed(2),
        avgRenderTimeMs: avgRenderTime.toFixed(4),
        
        // Data metrics
        barsToRender: dataPoints,
        histogramVisible: histogramVisible,
        totalDataPoints: stats ? stats.totalTerminations : 0,
        
        // Canvas metrics
        estimatedPixelsPerFrame: dataPoints * HISTOGRAM_CONFIG.barWidth * HISTOGRAM_CONFIG.maxBarLength,
        configComplexity: Object.keys(HISTOGRAM_CONFIG).length,
        
        // Health indicators
        healthScore: healthScore,
        warnings: warnings,
        recommendations: recommendations,
        
        // Quick diagnosis
        status: healthScore > 80 ? 'HEALTHY' : 
                healthScore > 50 ? 'DEGRADED' : 'CRITICAL',
        
        // Performance impact
        renderingImpact: avgRenderTime > 1.0 ? 'HIGH' : 
                        avgRenderTime > 0.5 ? 'MEDIUM' : 'LOW'
    };
}

// Adjust histogram configuration
function setHistogramConfig(config) {
    Object.assign(HISTOGRAM_CONFIG, config);
}

// Optional: Add keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
        toggleHistogram();
    } else if (e.key === 'r' || e.key === 'R') {
        resetHistogram();
        resetKDE();
        console.log('Histogram and KDE data reset');
    }
});