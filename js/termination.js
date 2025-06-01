
// Termination line parameters
let terminationBounds = R_tm; // ±b in y-direction
const terminationX = 0; // x-coordinate of the termination line

// Counter for collision positions
let terminationCounts = new Map(); // Maps y-position to count
const binSize = 2; // Size of y-bins for counting collisions


// Function to get binned y-position for counting
function getBinnedY(y) {
    return Math.floor(y / binSize) * binSize;
}

// Function to check if a ray intersects with the termination line
function checkTerminationCollision(ray) {
    if (!ray.active) return false;

    const path = ray.path;
    if (path.length < 2) return false;
    
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
            
            return true;
        }
    }
    
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

// Function to clear termination counts
function clearTerminationCounts() {
    terminationCounts.clear();
}

