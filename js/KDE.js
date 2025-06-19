/*
================================================================================
KDE (KERNEL DENSITY ESTIMATION) SYSTEM - SMOOTH STATISTICAL CURVE FITTING
================================================================================

This code implements a comprehensive Kernel Density Estimation system for 
creating smooth, continuous probability density curves from ray termination 
histogram data. Provides multiple kernel functions, automatic bandwidth 
selection, and real-time visualization overlay.

KERNEL FUNCTIONS (KERNEL_FUNCTIONS):
Available kernel types for density estimation:
- gaussian: Standard normal distribution kernel (most common)
- epanechnikov: Optimal efficiency kernel with compact support
- uniform: Rectangular kernel (simple, less smooth)
- triangular: Linear decay kernel
- biweight: Quartic kernel with smooth tapering

Each kernel function takes normalized distance u and returns density weight.

CORE FITTING FUNCTIONS:
- calculateOptimalBandwidth(data, weights?) → number
  Implements Silverman's rule of thumb: h = 1.06 * σ * n^(-1/5)
  Supports weighted data for histogram bin counts
  Returns optimal smoothing parameter for given dataset
  Ensures minimum bandwidth of 0.1 to prevent over-fitting

- fitKDEToTerminationData(kernelType?, bandwidth?) → object | null
  Converts termination histogram into KDE parameters
  Expands histogram bins into individual data points
  Calculates statistics: mean, variance, standard deviation
  Returns: {dataPoints, bandwidth, kernel, mean, standardDeviation, totalPoints}

- evaluateKDE(y, kdeParams) → number
  Calculates probability density at specific y-coordinate
  Sums weighted kernel contributions from all data points
  Formula: density = (1/nh) * Σ K((y-xi)/h) where K is kernel function

CURVE GENERATION FUNCTIONS:
- generateKDECurve(kdeParams, yMin, yMax, numPoints) → array
  Creates smooth curve data points for visualization
  Returns array of {y, density} coordinate pairs
  Default: 200 points from yMin=-100 to yMax=100

- findKDEModes(kdeParams, yMin, yMax, resolution) → array
  Identifies local maxima (peaks) in the density function
  Uses numerical derivative to find peaks
  Returns array of {position, density} sorted by peak height
  Useful for identifying multi-modal distributions

VISUALIZATION SYSTEM:
- drawKDEOnCanvas(ctx) → void
  Renders KDE curve overlay on main canvas
  Applies same transformation matrix as histogram
  Supports filled area under curve and outline stroke
  Scales density values to match histogram bar lengths
  Automatically determines y-range from termination data

INTERACTIVE CONTROLS:
- toggleKDE() → void
  Shows/hides KDE overlay (hotkey: 'K')
  Automatically refreshes parameters when enabled

- setKDEConfig(config) → void  
  Updates visualization parameters and refits curve
  Accepts partial config objects for specific updates

- resetKDE() → void
  Clears all KDE data and hides overlay

KEYBOARD SHORTCUTS:
- 'K': Toggle KDE curve visibility on/off
- 'B': Cycle through kernel functions (gaussian → epanechnikov → uniform → triangular → biweight)
- 'N': Increase bandwidth by 20% (smoother curve)
- 'M': Decrease bandwidth by 20% (more detailed curve)

CONFIGURATION (KDE_CONFIG):
- lineWidth: Curve stroke thickness (default: 2)
- opacity: Curve transparency (default: 0.8)
- curveColor: Stroke color (default: '#dc2626' red)
- fillColor: Fill under curve (default: semi-transparent red)
- pointDensity: Curve smoothness (default: 300 points)
- showFill: Enable/disable area fill (default: true)
- kernelType: Active kernel function (default: 'gaussian')
- bandwidth: Manual bandwidth override (default: null for auto-calculation)

GLOBAL STATE:
- kdeVisible: boolean - Current visibility state
- currentKDEParams: object - Active KDE parameters and data
- KDE_CONFIG: object - Visualization configuration

STATISTICAL APPLICATIONS:
- Smooth representation of discrete histogram data
- Multi-modal distribution detection via mode finding
- Probability density estimation for continuous variables
- Comparison with parametric distributions (Gaussian, etc.)
- Bandwidth sensitivity analysis for data exploration

INTEGRATION WITH HISTOGRAM:
- Automatically scales to match histogram bar lengths
- Uses same coordinate transformation for overlay alignment
- Derives y-range from termination statistics
- Supports same zoom/pan interactions as histogram

MATHEMATICAL FOUNDATION:
KDE Formula: f̂(y) = (1/nh) * Σᵢ₌₁ⁿ K((y-yᵢ)/h)
Where:
- n: number of data points
- h: bandwidth (smoothing parameter)  
- K: kernel function
- yᵢ: individual data points
- y: evaluation point

DEPENDENCIES:
Requires external functions: getTerminationStats()
Uses global variables: zoomLevel, panX, panY, HISTOGRAM_CONFIG
================================================================================
*/


// Kernel functions for KDE
// Can swich between different kernel types with the 'b' key
const KERNEL_FUNCTIONS = {
    gaussian: (u) => (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u),
    epanechnikov: (u) => Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0,
    uniform: (u) => Math.abs(u) <= 1 ? 0.5 : 0,
    triangular: (u) => Math.abs(u) <= 1 ? 1 - Math.abs(u) : 0,
    biweight: (u) => Math.abs(u) <= 1 ? (15/16) * Math.pow(1 - u * u, 2) : 0
};

// KDE curve overlay system for main canvas
// Global state for KDE visibility and current parameters
let kdeVisible = false;
let currentKDEParams = null;

// Default KDE configuration parameters 
// These can be modified via setKDEConfig() function
const KDE_CONFIG = {
    lineWidth: 2,
    opacity: 0.8,
    curveColor: '#dc2626',     // Red color
    fillColor: 'rgba(220, 38, 38, 0.1)',
    pointDensity: 300,         // Higher density for smoother curves
    showFill: true,
    xOffset: 0,
    kernelType: 'gaussian',    // Default kernel
    bandwidth: null            // Auto-calculate if null
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

// Function to fit KDE to the termination data
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

// Draw KDE curve on the main canvas
function drawKDEOnCanvas(ctx, stats) {
    
    if (!kdeVisible ) return;
   
       
    const canvasHeight = ctx.canvas.height;
    const canvasWidth = ctx.canvas.width;
    
    ctx.save();
    
    // Apply the same transformation as histogram
    ctx.setTransform(
        zoomLevel, 0, 0, zoomLevel,
        panX + canvasWidth/2, panY + canvasHeight/2
    );
    
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
    currentKDEParams = fitKDEToTerminationData(KDE_CONFIG.kernelType, KDE_CONFIG.bandwidth);
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
    setKDEConfig();
}

// Toggle KDE visibility and update parameters
function toggleKDE() {
    kdeVisible = !kdeVisible;
    console.log('KDE toggled:', kdeVisible ? 'ON' : 'OFF');
    if (kdeVisible) {
        // Refresh KDE parameters when toggling on
        currentKDEParams = fitKDEToTerminationData(KDE_CONFIG.kernelType, KDE_CONFIG.bandwidth);
    }
}

// Reset KDE parameters with out hiding the overlay
function resetKDE() {
    currentKDEParams = null;
    KDE_CONFIG.bandwidth = null; // Reset to auto-calculate
}

// Update KDE configuration
function setKDEConfig(config) {
    Object.assign(KDE_CONFIG, config);
    currentKDEParams = fitKDEToTerminationData(KDE_CONFIG.kernelType, KDE_CONFIG.bandwidth);     
}

