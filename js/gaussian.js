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

// Gaussian curve overlay system for main canvas
let gaussianVisible = false;

const GAUSSIAN_CONFIG = {
    lineWidth: 2,              // Thickness of the Gaussian curve
    opacity: 0.8,              // Curve transparency
    curveColor: '#ef4444',     // Red color for the curve
    fillColor: 'rgba(239, 68, 68, 0.1)', // Semi-transparent fill under curve
    pointDensity: 200,         // Number of points to draw the curve
    showFill: true,            // Whether to fill under the curve
    xOffset: 0                 // Horizontal offset from origin
};

// Draw Gaussian curve on the main canvas
function drawGaussianOnCanvas(ctx) {
    // Get the fitted Gaussian parameters
    const gaussianParams = fitGaussianToTerminationData();
    
    // Check if we have valid Gaussian data
    if (!gaussianVisible || !gaussianParams) return;
    
    // Get canvas dimensions
    const canvasHeight = ctx.canvas.height;
    const canvasWidth = ctx.canvas.width;
    
    // Save context state
    ctx.save();
    
    // Apply the same transformation as your histogram
    ctx.setTransform(
        zoomLevel, 0, 0, zoomLevel,
        panX + canvasWidth/2, panY + canvasHeight/2
    );
    
    // Get termination stats to determine y-range
    const stats = getTerminationStats();
    if (!stats || stats.distribution.size === 0) {
        ctx.restore();
        return;
    }
    
    // Determine y-range from actual data
    const bins = Array.from(stats.distribution.keys());
    const minY = Math.min(...bins);
    const maxY = Math.max(...bins);
    const yRange = maxY - minY;
    const padding = yRange * 0.2; // Add 20% padding
    
    // Generate Gaussian curve points
    const yMin = minY - padding;
    const yMax = maxY + padding;
    const gaussianPoints = generateGaussianCurve(gaussianParams, yMin, yMax, GAUSSIAN_CONFIG.pointDensity);
    
    if (gaussianPoints.length === 0) {
        ctx.restore();
        return;
    }
    
    // Scale the Gaussian values to match histogram scale
    const maxGaussianValue = Math.max(...gaussianPoints.map(p => p.value));
    const scaleFactor = (GAUSSIAN_CONFIG.maxBarLength || HISTOGRAM_CONFIG.maxBarLength) / zoomLevel;
    
    // Set line style
    ctx.strokeStyle = GAUSSIAN_CONFIG.curveColor;
    ctx.lineWidth = GAUSSIAN_CONFIG.lineWidth / zoomLevel;
    ctx.globalAlpha = GAUSSIAN_CONFIG.opacity;
    
    // Draw filled area under curve if enabled
    if (GAUSSIAN_CONFIG.showFill) {
        ctx.fillStyle = GAUSSIAN_CONFIG.fillColor;
        ctx.beginPath();
        
        // Start from baseline
        const firstPoint = gaussianPoints[0];
        const firstX = -((firstPoint.value / maxGaussianValue) * scaleFactor) + GAUSSIAN_CONFIG.xOffset / zoomLevel;
        ctx.moveTo(GAUSSIAN_CONFIG.xOffset / zoomLevel, firstPoint.y);
        
        // Draw curve
        gaussianPoints.forEach(point => {
            const x = -((point.value / maxGaussianValue) * scaleFactor) + GAUSSIAN_CONFIG.xOffset / zoomLevel;
            ctx.lineTo(x, point.y);
        });
        
        // Close path to baseline
        const lastPoint = gaussianPoints[gaussianPoints.length - 1];
        ctx.lineTo(GAUSSIAN_CONFIG.xOffset / zoomLevel, lastPoint.y);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw the curve outline
    ctx.beginPath();
    gaussianPoints.forEach((point, index) => {
        const x = -((point.value / maxGaussianValue) * scaleFactor) + GAUSSIAN_CONFIG.xOffset / zoomLevel;
        
        if (index === 0) {
            ctx.moveTo(x, point.y);
        } else {
            ctx.lineTo(x, point.y);
        }
    });
    ctx.stroke();
    
    // Restore context state
    ctx.restore();
}

// Toggle Gaussian visibility
function toggleGaussian() {
    gaussianVisible = !gaussianVisible;
}

// Adjust Gaussian configuration
function setGaussianConfig(config) {
    Object.assign(GAUSSIAN_CONFIG, config);
}

// Enhanced keyboard controls (add to your existing event listener or replace it)
document.addEventListener('keydown', (e) => {

    if (e.key === 'g' || e.key === 'G') {
        toggleGaussian();
        console.log('Gaussian curve toggled:', gaussianVisible);
    } else if (e.key === 'f' || e.key === 'F') {
        // Toggle fill under Gaussian curve
        GAUSSIAN_CONFIG.showFill = !GAUSSIAN_CONFIG.showFill;
        console.log('Gaussian fill toggled:', GAUSSIAN_CONFIG.showFill);
    }
});

// Utility function to get current Gaussian fit info for debugging
function getGaussianInfo() {
    const gaussianParams = fitGaussianToTerminationData();
    if (gaussianParams) {
        console.log('Current Gaussian Parameters:');
        console.log('  Peak:', gaussianParams.mean.toFixed(3));
        console.log('  Width (σ):', gaussianParams.standardDeviation.toFixed(3));
        console.log('  Amplitude:', gaussianParams.amplitude.toFixed(3));
        console.log('  Equation:', gaussianParams.equation);
        
        const fitQuality = calculateGaussianFitQuality(gaussianParams);
        console.log('  R² (fit quality):', fitQuality.toFixed(4));
    } else {
        console.log('No Gaussian data available');
    }
    return gaussianParams;
}