// KDE (Kernel Density Estimation) fitting functions
// This provides a smooth, continuous curve that can capture more complex distributions than Gaussian

// Kernel functions for KDE
const KERNEL_FUNCTIONS = {
    gaussian: (u) => (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u),
    epanechnikov: (u) => Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0,
    uniform: (u) => Math.abs(u) <= 1 ? 0.5 : 0,
    triangular: (u) => Math.abs(u) <= 1 ? 1 - Math.abs(u) : 0,
    biweight: (u) => Math.abs(u) <= 1 ? (15/16) * Math.pow(1 - u * u, 2) : 0
};

// Function to calculate optimal bandwidth using Silverman's rule of thumb
function calculateOptimalBandwidth(data, weights = null) {
    if (data.length === 0) return 1;
    
    // Calculate weighted statistics
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < data.length; i++) {
        const weight = weights ? weights[i] : 1;
        weightedSum += data[i] * weight;
        totalWeight += weight;
    }
    
    const mean = weightedSum / totalWeight;
    
    // Calculate weighted standard deviation
    let weightedVarianceSum = 0;
    for (let i = 0; i < data.length; i++) {
        const weight = weights ? weights[i] : 1;
        const deviation = data[i] - mean;
        weightedVarianceSum += weight * deviation * deviation;
    }
    
    const variance = weightedVarianceSum / totalWeight;
    const standardDeviation = Math.sqrt(variance);
    
    // Silverman's rule of thumb: h = 1.06 * σ * n^(-1/5)
    const n = totalWeight; // Use total weight as effective sample size
    const bandwidth = 1.06 * standardDeviation * Math.pow(n, -1/5);
    
    return Math.max(bandwidth, 0.1); // Ensure minimum bandwidth
}

// Function to fit KDE to the termination histogram data
function fitKDEToTerminationData(kernelType = 'gaussian', bandwidth = null) {
    const stats = getTerminationStats();
    
    if (stats.totalTerminations === 0) {
        return null;
    }
    
    // Convert termination counts to data points (expanding histogram bins)
    const dataPoints = [];
    const weights = [];
    
    for (const [binY, count] of stats.distribution) {
        // For histogram data, we treat each bin as representing 'count' data points
        // at the bin center position
        for (let i = 0; i < count; i++) {
            dataPoints.push(binY);
        }
        // Alternative: Use weights instead of expanding data
        // dataPoints.push(binY);
        // weights.push(count);
    }
    
    if (dataPoints.length === 0) {
        return null;
    }
    
    // Calculate bandwidth if not provided
    const h = bandwidth || calculateOptimalBandwidth(dataPoints);
    
    // Get kernel function
    const kernel = KERNEL_FUNCTIONS[kernelType] || KERNEL_FUNCTIONS.gaussian;
    
    // Calculate basic statistics for comparison
    const mean = dataPoints.reduce((sum, val) => sum + val, 0) / dataPoints.length;
    const variance = dataPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dataPoints.length;
    const standardDeviation = Math.sqrt(variance);
    
    return {
        dataPoints: dataPoints,
        bandwidth: h,
        kernelType: kernelType,
        kernel: kernel,
        mean: mean,
        standardDeviation: standardDeviation,
        variance: variance,
        totalPoints: dataPoints.length,
        summary: `KDE fit with ${kernelType} kernel, bandwidth: ${h.toFixed(3)}`
    };
}

// Function to evaluate KDE at a given y position
function evaluateKDE(y, kdeParams) {
    if (!kdeParams || !kdeParams.dataPoints) return 0;
    
    const { dataPoints, bandwidth, kernel } = kdeParams;
    const n = dataPoints.length;
    
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const u = (y - dataPoints[i]) / bandwidth;
        sum += kernel(u);
    }
    
    return sum / (n * bandwidth);
}

// Function to generate data points for plotting the KDE curve
function generateKDECurve(kdeParams, yMin = -100, yMax = 100, numPoints = 200) {
    if (!kdeParams) return [];
    
    const points = [];
    const step = (yMax - yMin) / (numPoints - 1);
    
    for (let i = 0; i < numPoints; i++) {
        const y = yMin + i * step;
        const density = evaluateKDE(y, kdeParams);
        points.push({ y: y, density: density });
    }
    
    return points;
}

// Function to find the mode(s) of the KDE (peaks in the distribution)
function findKDEModes(kdeParams, yMin = -100, yMax = 100, resolution = 1000) {
    if (!kdeParams) return [];
    
    const step = (yMax - yMin) / resolution;
    const densities = [];
    const positions = [];
    
    // Calculate density at each point
    for (let i = 0; i <= resolution; i++) {
        const y = yMin + i * step;
        const density = evaluateKDE(y, kdeParams);
        positions.push(y);
        densities.push(density);
    }
    
    // Find local maxima (peaks)
    const modes = [];
    for (let i = 1; i < densities.length - 1; i++) {
        if (densities[i] > densities[i-1] && densities[i] > densities[i+1]) {
            modes.push({
                position: positions[i],
                density: densities[i]
            });
        }
    }
    
    // Sort modes by density (highest first)
    modes.sort((a, b) => b.density - a.density);
    
    return modes;
}

// Function to calculate statistics comparing KDE to original histogram
function calculateKDEFitQuality(kdeParams) {
    if (!kdeParams) return { rSquared: 0, meanAbsoluteError: 0, maxError: 0 };
    
    const stats = getTerminationStats();
    const positions = [];
    const observedCounts = [];
    
    for (const [binY, count] of stats.distribution) {
        positions.push(binY);
        observedCounts.push(count);
    }
    
    if (positions.length === 0) return { rSquared: 0, meanAbsoluteError: 0, maxError: 0 };
    
    // Calculate KDE predictions at bin positions
    const predictedDensities = positions.map(y => evaluateKDE(y, kdeParams));
    
    // Scale KDE densities to match histogram counts
    const maxDensity = Math.max(...predictedDensities);
    const maxCount = Math.max(...observedCounts);
    const scaleFactor = maxCount / maxDensity;
    
    const predictedCounts = predictedDensities.map(density => density * scaleFactor);
    
    // Calculate R²
    const meanObserved = observedCounts.reduce((sum, count) => sum + count, 0) / observedCounts.length;
    let totalSumSquares = 0;
    let residualSumSquares = 0;
    let absoluteErrorSum = 0;
    let maxError = 0;
    
    for (let i = 0; i < positions.length; i++) {
        const observed = observedCounts[i];
        const predicted = predictedCounts[i];
        const error = Math.abs(observed - predicted);
        
        totalSumSquares += Math.pow(observed - meanObserved, 2);
        residualSumSquares += Math.pow(observed - predicted, 2);
        absoluteErrorSum += error;
        maxError = Math.max(maxError, error);
    }
    
    const rSquared = totalSumSquares > 0 ? Math.max(0, 1 - (residualSumSquares / totalSumSquares)) : 0;
    const meanAbsoluteError = absoluteErrorSum / positions.length;
    
    return {
        rSquared: rSquared,
        meanAbsoluteError: meanAbsoluteError,
        maxError: maxError,
        scaleFactor: scaleFactor
    };
}

// Comprehensive KDE analysis function
function performKDEAnalysis(kernelType = 'gaussian', bandwidth = null) {
    const kdeFit = fitKDEToTerminationData(kernelType, bandwidth);
    
    if (!kdeFit) {
        return {
            kde: null,
            modes: [],
            fitQuality: { rSquared: 0, meanAbsoluteError: 0, maxError: 0 },
            comparison: null
        };
    }
    
    
    const fitQuality = calculateKDEFitQuality(kdeFit);
    const modes = findKDEModes(kdeFit);
    
    // Compare with Gaussian fit
    const gaussianFit = fitGaussianToTerminationData();
    const gaussianR2 = gaussianFit ? calculateGaussianFitQuality(gaussianFit) : 0;
    
    return {
        kde: kdeFit,
        modes: modes,
        fitQuality: fitQuality,
        comparison: {
            kdeR2: fitQuality.rSquared,
            gaussianR2: gaussianR2,
            betterFit: fitQuality.rSquared > gaussianR2 ? 'KDE' : 'Gaussian',
            improvement: Math.abs(fitQuality.rSquared - gaussianR2)
        },
        summary: {
            kernelType: kernelType,
            bandwidth: kdeFit.bandwidth.toFixed(3),
            numberOfModes: modes.length,
            primaryMode: modes.length > 0 ? modes[0].position.toFixed(2) : 'N/A',
            rSquared: fitQuality.rSquared.toFixed(4),
            meanAbsoluteError: fitQuality.meanAbsoluteError.toFixed(2)
        }
    };
}

// KDE curve overlay system for main canvas
let kdeVisible = false;
let currentKDEParams = null;

const KDE_CONFIG = {
    lineWidth: 2,
    opacity: 0.8,
    curveColor: '#3b82f6',     // Blue color to distinguish from Gaussian
    fillColor: 'rgba(59, 130, 246, 0.1)',
    pointDensity: 300,         // Higher density for smoother curves
    showFill: true,
    xOffset: 0,
    kernelType: 'gaussian',    // Default kernel
    bandwidth: null            // Auto-calculate if null
};

// Draw KDE curve on the main canvas
function drawKDEOnCanvas(ctx) {
    
    if (!kdeVisible || !currentKDEParams) return;
       
    const canvasHeight = ctx.canvas.height;
    const canvasWidth = ctx.canvas.width;
    
    ctx.save();
    
    // Apply the same transformation as histogram
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
    
    const bins = Array.from(stats.distribution.keys());
    const minY = Math.min(...bins);
    const maxY = Math.max(...bins);
    const yRange = maxY - minY;
    const padding = yRange * 0.2;
    
    // Generate KDE curve points
    const yMin = minY - padding;
    const yMax = maxY + padding;
    const kdePoints = generateKDECurve(currentKDEParams, yMin, yMax, KDE_CONFIG.pointDensity);
    
    if (kdePoints.length === 0) {
        ctx.restore();
        return;
    }
    
    // Scale KDE values to match histogram scale
    const maxDensity = Math.max(...kdePoints.map(p => p.density));
    const scaleFactor = (KDE_CONFIG.maxBarLength || HISTOGRAM_CONFIG.maxBarLength) / zoomLevel;
    
    // Set line style
    ctx.strokeStyle = KDE_CONFIG.curveColor;
    ctx.lineWidth = KDE_CONFIG.lineWidth / zoomLevel;
    ctx.globalAlpha = KDE_CONFIG.opacity;
    
    // Draw filled area under curve
    if (KDE_CONFIG.showFill) {
        ctx.fillStyle = KDE_CONFIG.fillColor;
        ctx.beginPath();
        
        ctx.moveTo(KDE_CONFIG.xOffset / zoomLevel, -kdePoints[0].y);
        
        kdePoints.forEach(point => {
            const x = -((point.density / maxDensity) * scaleFactor) + KDE_CONFIG.xOffset / zoomLevel;
            ctx.lineTo(x, -point.y);
        });
        
        ctx.lineTo(KDE_CONFIG.xOffset / zoomLevel, -kdePoints[kdePoints.length - 1].y);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw the curve outline
    ctx.beginPath();
    kdePoints.forEach((point, index) => {
        const x = -((point.density / maxDensity) * scaleFactor) + KDE_CONFIG.xOffset / zoomLevel;
        
        if (index === 0) {
            ctx.moveTo(x, -point.y);
        } else {
            ctx.lineTo(x, -point.y);
        }
    });
    ctx.stroke();
    
    ctx.restore();
}

// Toggle KDE visibility and update parameters
function toggleKDE() {
    kdeVisible = !kdeVisible;
    if (kdeVisible) {
        // Refresh KDE parameters when toggling on
        currentKDEParams = fitKDEToTerminationData(KDE_CONFIG.kernelType, KDE_CONFIG.bandwidth);
    }
}

// Update KDE configuration
function setKDEConfig(config) {
    Object.assign(KDE_CONFIG, config);
    currentKDEParams = fitKDEToTerminationData(KDE_CONFIG.kernelType, KDE_CONFIG.bandwidth);     
}

// Enhanced keyboard controls for KDE (add to existing event listener)
document.addEventListener('keydown', (e) => {
    if (e.key === 'k' || e.key === 'K') {
        toggleKDE();
        console.log('KDE curve toggled:', kdeVisible);
    } else if (e.key === 'b' || e.key === 'B') {
        // Cycle through different kernels
        const kernels = Object.keys(KERNEL_FUNCTIONS);
        const currentIndex = kernels.indexOf(KDE_CONFIG.kernelType);
        const nextIndex = (currentIndex + 1) % kernels.length;
        KDE_CONFIG.kernelType = kernels[nextIndex];
        currentKDEParams = fitKDEToTerminationData(KDE_CONFIG.kernelType, KDE_CONFIG.bandwidth);
        console.log('KDE kernel changed to:', KDE_CONFIG.kernelType);
    } else if (e.key === 'n' || e.key === 'N') {
        // Adjust bandwidth
        const currentBandwidth = currentKDEParams ? currentKDEParams.bandwidth : 1;
        KDE_CONFIG.bandwidth = currentBandwidth * 1.2; // Increase by 20%
        currentKDEParams = fitKDEToTerminationData(KDE_CONFIG.kernelType, KDE_CONFIG.bandwidth);
        console.log('KDE bandwidth increased to:', KDE_CONFIG.bandwidth.toFixed(3));
    } else if (e.key === 'm' || e.key === 'M') {
        // Decrease bandwidth
        const currentBandwidth = currentKDEParams ? currentKDEParams.bandwidth : 1;
        KDE_CONFIG.bandwidth = currentBandwidth * 0.8; // Decrease by 20%
        currentKDEParams = fitKDEToTerminationData(KDE_CONFIG.kernelType, KDE_CONFIG.bandwidth);
        console.log('KDE bandwidth decreased to:', KDE_CONFIG.bandwidth.toFixed(3));
    }
});

// Utility function to get current KDE info for debugging
function getKDEInfo() {
    const analysis = performKDEAnalysis(KDE_CONFIG.kernelType, KDE_CONFIG.bandwidth);
    
    if (analysis.kde) {
        console.log('Current KDE Parameters:');
        console.log('  Kernel:', analysis.kde.kernelType);
        console.log('  Bandwidth:', analysis.kde.bandwidth.toFixed(3));
        console.log('  Mean:', analysis.kde.mean.toFixed(3));
        console.log('  Std Dev:', analysis.kde.standardDeviation.toFixed(3));
        console.log('  R² (fit quality):', analysis.fitQuality.rSquared.toFixed(4));
        console.log('  Number of modes:', analysis.modes.length);
        
        if (analysis.modes.length > 0) {
            console.log('  Primary mode at:', analysis.modes[0].position.toFixed(3));
        }
        
        if (analysis.comparison) {
            console.log('  Better fit than Gaussian?', analysis.comparison.betterFit === 'KDE');
        }
    } else {
        console.log('No KDE data available');
    }
    
    return analysis;
}

