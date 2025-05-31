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



// Function to fit a Gaussian to the termination histogram data
function fitGaussianToTerminationData() {
    const stats = getTerminationStats();
    
    if (stats.totalTerminations === 0) {
        return null;
    }
    
    // Convert termination counts to arrays for easier processing
    const positions = [];
    const counts = [];
    
    for (const [binY, count] of stats.distribution) {
        positions.push(binY);
        counts.push(count);
    }
    
    if (positions.length === 0) {
        return null;
    }
    
    // Calculate basic statistics
    const totalHits = counts.reduce((sum, count) => sum + count, 0);
    
    // Calculate weighted mean (μ)
    let weightedSum = 0;
    for (let i = 0; i < positions.length; i++) {
        weightedSum += positions[i] * counts[i];
    }
    const mean = weightedSum / totalHits;
    
    // Calculate weighted variance (σ²)
    let weightedVarianceSum = 0;
    for (let i = 0; i < positions.length; i++) {
        const deviation = positions[i] - mean;
        weightedVarianceSum += counts[i] * deviation * deviation;
    }
    const variance = weightedVarianceSum / totalHits;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate amplitude (A) - peak height of the Gaussian
    // For a properly normalized Gaussian: A = N / (σ * √(2π))
    // But we'll use the maximum count as a practical approximation
    const amplitude = Math.max(...counts);
    
    // Alternative amplitude calculation for better fit:
    // const amplitude = totalHits / (standardDeviation * Math.sqrt(2 * Math.PI));
    
    return {
        amplitude: amplitude,
        mean: mean,
        standardDeviation: standardDeviation,
        variance: variance,
        totalHits: totalHits,
        equation: `f(y) = ${amplitude.toFixed(2)} * exp(-((y - ${mean.toFixed(2)})² / (2 * ${standardDeviation.toFixed(2)}²)))`,
        parameters: {
            A: amplitude,
            μ: mean,
            σ: standardDeviation
        }
    };
}

// Function to evaluate the fitted Gaussian at a given y position
function evaluateGaussian(y, gaussianParams) {
    if (!gaussianParams) return 0;
    
    const { amplitude, mean, standardDeviation } = gaussianParams;
    const exponent = -Math.pow(y - mean, 2) / (2 * Math.pow(standardDeviation, 2));
    return amplitude * Math.exp(exponent);
}

// Function to calculate average number of reflector hits per ray
function calculateAverageReflectorHits() {
    if (rays.length === 0) {
        return {
            averageHits: 0,
            totalRays: 0,
            totalBounces: 0,
            hitDistribution: {}
        };
    }
    
    let totalBounces = 0;
    let rayCount = 0;
    const hitDistribution = {};
    
    // Count bounces for all rays (both active and inactive)
    for (const ray of rays) {
        const bounces = ray.bounces;
        totalBounces += bounces;
        rayCount++;
        
        // Track distribution of hit counts
        if (hitDistribution[bounces]) {
            hitDistribution[bounces]++;
        } else {
            hitDistribution[bounces] = 1;
        }
    }
    
    const averageHits = rayCount > 0 ? totalBounces / rayCount : 0;
    
    return {
        averageHits: averageHits,
        totalRays: rayCount,
        totalBounces: totalBounces,
        hitDistribution: hitDistribution
    };
}

// Function to generate data points for plotting the fitted Gaussian
function generateGaussianCurve(gaussianParams, yMin = -100, yMax = 100, numPoints = 200) {
    if (!gaussianParams) return [];
    
    const points = [];
    const step = (yMax - yMin) / (numPoints - 1);
    
    for (let i = 0; i < numPoints; i++) {
        const y = yMin + i * step;
        const value = evaluateGaussian(y, gaussianParams);
        points.push({ y: y, value: value });
    }
    
    return points;
}

// Function to calculate R² (coefficient of determination) for the Gaussian fit
function calculateGaussianFitQuality(gaussianParams) {
    if (!gaussianParams) return 0;
    
    const stats = getTerminationStats();
    const positions = [];
    const observedCounts = [];
    
    for (const [binY, count] of stats.distribution) {
        positions.push(binY);
        observedCounts.push(count);
    }
    
    if (positions.length === 0) return 0;
    
    // Calculate mean of observed values
    const meanObserved = observedCounts.reduce((sum, count) => sum + count, 0) / observedCounts.length;
    
    // Calculate total sum of squares and residual sum of squares
    let totalSumSquares = 0;
    let residualSumSquares = 0;
    
    for (let i = 0; i < positions.length; i++) {
        const observed = observedCounts[i];
        const predicted = evaluateGaussian(positions[i], gaussianParams);
        
        totalSumSquares += Math.pow(observed - meanObserved, 2);
        residualSumSquares += Math.pow(observed - predicted, 2);
    }
    
    // Calculate R²
    const rSquared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
    return Math.max(0, rSquared); // Ensure R² is not negative
}

// Comprehensive analysis function that returns all statistics
function performFullRayAnalysis() {
    const gaussianFit = fitGaussianToTerminationData();
    const reflectorStats = calculateAverageReflectorHits();
    const terminationStats = getTerminationStats();
    
    let fitQuality = 0;
    if (gaussianFit) {
        fitQuality = calculateGaussianFitQuality(gaussianFit);
    }
    
    return {
        gaussian: gaussianFit,
        reflectorHits: reflectorStats,
        termination: terminationStats,
        fitQuality: fitQuality,
        summary: {
            equation: gaussianFit ? gaussianFit.equation : "No data available",
            averageReflectorHits: reflectorStats.averageHits.toFixed(3),
            totalTerminations: terminationStats.totalTerminations,
            gaussianPeak: gaussianFit ? gaussianFit.mean.toFixed(2) : "N/A",
            gaussianWidth: gaussianFit ? (2 * gaussianFit.standardDeviation).toFixed(2) : "N/A",
            rSquared: fitQuality.toFixed(4)
        }
    };
}

// Function to display analysis results in console (for debugging/testing)
function displayAnalysisResults() {
    const analysis = performFullRayAnalysis();
    
    console.log("=== Ray Termination Analysis ===");
    console.log("Gaussian Equation:", analysis.summary.equation);
    console.log("Average Reflector Hits per Ray:", analysis.summary.averageReflectorHits);
    console.log("Total Terminations:", analysis.summary.totalTerminations);
    console.log("Gaussian Peak Position:", analysis.summary.gaussianPeak);
    console.log("Gaussian FWHM (2σ):", analysis.summary.gaussianWidth);
    console.log("R² (Fit Quality):", analysis.summary.rSquared);
    
    if (analysis.gaussian) {
        console.log("Gaussian Parameters:");
        console.log("  Amplitude (A):", analysis.gaussian.amplitude.toFixed(3));
        console.log("  Mean (μ):", analysis.gaussian.mean.toFixed(3));
        console.log("  Standard Deviation (σ):", analysis.gaussian.standardDeviation.toFixed(3));
    }
    
    return analysis;
}
