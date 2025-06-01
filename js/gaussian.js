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
