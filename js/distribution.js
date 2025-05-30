// <====== Comments ======>
// TODO:
// Correctly create reset histogram function
// 
// 
//
//


// Histogram overlay system for main canvas
let histogramVisible = true;

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

// Reset function to clear histogram data 
function resetHistogram() {
    clearTerminationCounts();
}

// Helper function to interpolate between two colors based on count intensity
function getBarColor(count, maxCount) {
    // Calculate intensity (0 to 1)
    const intensity = count / maxCount;
    
    // Base color (blue): #3b82f6 -> rgb(59, 130, 246)
    // High count color (green): #10b981 -> rgb(16, 185, 129)
    
    const baseR = 59, baseG = 130, baseB = 246;
    const highR = 16, highG = 185, highB = 129;
    
    // Interpolate RGB values
    const r = Math.round(baseR + (highR - baseR) * intensity);
    const g = Math.round(baseG + (highG - baseG) * intensity);
    const b = Math.round(baseB + (highB - baseB) * intensity);
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Draw histogram bars on the main canvas  
function drawHistogramOnCanvas(ctx) {
    // Get stats from your physics module
    const stats = getTerminationStats();
    
    // Check if we have data
    if (!histogramVisible || !stats || stats.distribution.size === 0) return;
    
    // Get canvas dimensions
    const canvasHeight = ctx.canvas.height;
    const canvasWidth = ctx.canvas.width;
    
    // Get data from your stats
    const bins = Array.from(stats.distribution.keys()).sort((a, b) => a - b);
    const counts = bins.map(bin => stats.distribution.get(bin));
    const maxCount = stats.maxCount;
    
    if (maxCount === 0) return;
    
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
}

// Call this in your main render loop after drawing rays but before presenting
function renderHistogramOverlay(ctx, terminationBounds) {
    drawHistogramOnCanvas(ctx, terminationBounds);
}

// Toggle histogram visibility
function toggleHistogram() {
    histogramVisible = !histogramVisible;
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
        console.log('Histogram data reset');
    }
});
