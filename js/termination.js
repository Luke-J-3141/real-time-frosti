/**
 * TERMINATION LINE COLLISION SYSTEM
 * 
 * This module handles ray termination at a vertical line (x = 0) with collision detection,
 * statistics tracking, and performance monitoring. Rays that cross the termination line
 * within specified bounds are terminated and their collision positions are binned and counted.
 * 
 * CONFIGURATION:
 * - terminationBounds: Y-axis bounds for valid terminations (±R_tm)
 * - terminationX: X-coordinate of termination line (0)
 * - binSize: Size of Y-position bins for collision counting (50)
 * 
 * CORE FUNCTIONS:
 * 
 * checkTerminationCollision(ray)
 *   - Checks if ray's last segment crosses termination line within bounds
 *   - Terminates ray and updates position to intersection point if collision detected
 *   - Records collision in binned counter and tracks performance metrics
 *   - Returns: boolean (true if ray was terminated)
 * 
 * getBinnedY(y)
 *   - Converts Y-coordinate to binned position for collision counting
 *   - Returns: number (binned Y-position)
 * 
 * getTerminationStats()
 *   - Calculates termination statistics from collision data
 *   - Returns: object with {totalTerminations, distribution Map, maxCount, mostHitBin}
 * 
 * getTerminationDiagnostics()
 *   - Comprehensive system health analysis with performance and memory metrics
 *   - Generates warnings and recommendations for optimization
 *   - Returns: object with performance metrics, memory usage, health score, status, warnings
 * 
 * clearTerminationCounts()
 *   - Resets all collision counters and performance tracking data
 *   - Returns: void
 * 
 * DATA STRUCTURES:
 * - terminationCounts: Map(y-bin → collision count) for position distribution
 * - Performance tracking: call count, total time, average time per collision check
 * 
 * INTEGRATION NOTES:
 * - Call checkTerminationCollision(ray) in your ray update loop
 * - Use getTerminationDiagnostics() to monitor system health
 * - Clear counts periodically with clearTerminationCounts() to prevent memory buildup
 * - Adjust binSize based on required resolution vs memory usage trade-offs
 */

// Termination line parameters

const R_tm = 170 * PIXELS_PER_MM; // radius of test mass in pixels
let terminationBounds = R_tm; // bounds of TM in y-direction
const terminationX = 0; // x-coordinate of the termination line

// Counter for collision positions
let terminationCounts = new Map(); // Maps y-position to count
const binSize = 50; // Size of y-bins for counting collisions

// Performance tracking
let terminationCallCount = 0;
let totalTerminationTime = 0;

// Function to get binned y-position for counting
function getBinnedY(y) {
    return Math.floor(y / binSize) * binSize;
}

// Function to check if a ray intersects with the termination line
function checkTerminationCollision(ray) {
    const startTime = performance.now();
    terminationCallCount++;
    
    if (!ray.active) {
        totalTerminationTime += (performance.now() - startTime);
        return false;
    }

    const path = ray.path;
    if (path.length < 2) {
        totalTerminationTime += (performance.now() - startTime);
        return false;
    }
    
    // Get the last two points to check for line segment intersection
    const p1 = path[path.length - 2];
    const p2 = path[path.length - 1];
    
    // Check if the ray segment crosses the termination line (x = 0)
    // Only check if the segment crosses x = 0
    if ((p1.x <= terminationX && p2.x >= terminationX) || 
        (p1.x >= terminationX && p2.x <= terminationX)) {
        
        // Calculate intersection point
        const t = (terminationX - p1.x) / (p2.x - p1.x);
        const intersectionY = p1.y + t * (p2.y - p1.y);
        
        // Check if intersection is within the termination bounds
        if (Math.abs(intersectionY) <= terminationBounds) {
            // Terminate the ray
            ray.active = false;
            
            // Update the ray's final position to the intersection point
            ray.x = terminationX;
            ray.y = intersectionY;
            ray.path[ray.path.length - 1] = {x: terminationX, y: intersectionY};
            
            // Increment counter for this y-position bin
            const binnedY = getBinnedY(intersectionY);
            terminationCounts.set(binnedY, (terminationCounts.get(binnedY) || 0) + 1);
            
            totalTerminationTime += (performance.now() - startTime);
            return true;
        }
    }
    
    totalTerminationTime += (performance.now() - startTime);
    return false;
}

// Function to get termination statistics
function getTerminationStats() {
    const stats = {
        totalTerminations: 0,
        distribution: new Map(terminationCounts),
        maxCount: 0,
        mostHitBin: null
    };
    
    for (const [bin, count] of terminationCounts) {
        stats.totalTerminations += count;
        if (count > stats.maxCount) {
            stats.maxCount = count;
            stats.mostHitBin = bin;
        }
    }
    
    return stats;
}

// Comprehensive stats function - call this to diagnose performance/memory issues
function getTerminationDiagnostics() {
    const mapSize = terminationCounts.size;
    const maxPossibleBins = Math.ceil((2 * terminationBounds) / binSize);
    const stats = getTerminationStats();
    const avgTimePerCall = terminationCallCount > 0 ? (totalTerminationTime / terminationCallCount) : 0;
    
    // Generate warnings and recommendations
    const warnings = [];
    const recommendations = [];
    
    if (avgTimePerCall > 0.1) warnings.push('Slow performance: ' + avgTimePerCall.toFixed(3) + 'ms per call');
    if (mapSize > 1000) warnings.push('High memory usage: ' + mapSize + ' map entries');
    if (mapSize > maxPossibleBins * 0.8) warnings.push('Map nearly full: ' + ((mapSize/maxPossibleBins)*100).toFixed(1) + '%');
    
    if (mapSize > 1000) recommendations.push('Increase binSize or clear counts periodically');
    if (avgTimePerCall > 0.1) recommendations.push('Consider optimizing collision detection');
    if (mapSize === 0 && terminationCallCount > 100) recommendations.push('Check if rays are reaching termination line');
    
    // Calculate health score
    let healthScore = 100;
    if (mapSize > 1000) healthScore -= 30;
    if (avgTimePerCall > 0.1) healthScore -= 40;
    if (mapSize > maxPossibleBins * 0.9) healthScore -= 20;
    healthScore = Math.max(0, healthScore);
    
    return {
        // Performance metrics
        totalCalls: terminationCallCount,
        totalTimeMs: totalTerminationTime.toFixed(2),
        avgTimePerCallMs: avgTimePerCall.toFixed(4),
        
        // Memory metrics
        mapEntries: mapSize,
        estimatedMemoryKB: ((mapSize * 48) / 1024).toFixed(2), // rough estimate
        maxPossibleBins: maxPossibleBins,
        memoryUtilization: ((mapSize / maxPossibleBins) * 100).toFixed(1) + '%',
        
        // Statistics
        totalTerminations: stats.totalTerminations,
        
        // Health indicators
        healthScore: healthScore,
        warnings: warnings,
        recommendations: recommendations,
        
        // Quick diagnosis
        status: healthScore > 80 ? 'HEALTHY' : 
                healthScore > 50 ? 'DEGRADED' : 'CRITICAL'
    };
}

// Function to clear termination counts
function clearTerminationCounts() {
    terminationCounts.clear();
    // Reset performance counters too
    terminationCallCount = 0;
    totalTerminationTime = 0;
}