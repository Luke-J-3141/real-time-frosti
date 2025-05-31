// <====== Comments ======>
// TODO:

class Ray {
    constructor(x, y, angle) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);
        this.active = true;
        this.bounces = 0;
        this.path = [{x, y}];
        this.totalDistance = 0;
        this.age = 0;
        this.maxAge = rayLifetime;
    }
    
    step(speed) {
        if (!this.active) return;
                
        const oldX = this.x;
        const oldY = this.y;
                
        // Take a step
        this.x += this.dx * speed;
        this.y += this.dy * speed;
                
        // Increment age
        this.age++;
                
        // Check if ray has aged out
        if (this.age > this.maxAge) {
            this.active = false;
            return;
        }
                
        // Calculate distance traveled
        const segmentDistance = Math.sqrt((this.x - oldX) ** 2 + (this.y - oldY) ** 2);
        this.totalDistance += segmentDistance;
                
        this.path.push({x: this.x, y: this.y});
                
        // Check termination line collision FIRST
        if (checkTerminationCollision(this)) {
            return; // Ray was terminated, no need to check other bounds
        }
                
        // Check bounds (expanded for zoomed view)
        const bounds = 1000 / zoomLevel;
        if (Math.abs(this.x) > bounds || Math.abs(this.y) > bounds) {
            this.active = false;
        }
    }

    reflect(normal) {
        // Reflection formula: r = d - 2(d·n)n
        const dot = this.dx * normal.x + this.dy * normal.y;
        this.dx = this.dx - 2 * dot * normal.x;
        this.dy = this.dy - 2 * dot * normal.y;
        this.bounces++;
        
        if (this.bounces >= maxBounces) {
            this.active = false;
        }
    }
    
    getOpacity() {
        // Calculate opacity based on age - newer rays are more opaque
        const ageRatio = this.age / this.maxAge;
        return Math.max(0.1, 1 - ageRatio * 0.8);
    }
    getColorAtDistance(distance) {
        // Create gradient from #3b82f6 (blue) to #228b22 (green) based on distance
        const maxDistance = 800;
        const ratio = Math.min(distance / maxDistance, 1);
        
        // Starting color: #3b82f6 (59, 130, 246)
        // Ending color: #228b22 (34, 139, 34)
        const startR = 45, startG = 100, startB = 200;
            const endR = 25, endG = 110, endB = 25;
                
        // Interpolate between the two colors
        const r = Math.floor(startR + (endR - startR) * ratio);
        const g = Math.floor(startG + (endG - startG) * ratio);
        const b = Math.floor(startB + (endB - startB) * ratio);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
}


function emitNewRays() {
    const { x1, y1, x2, y2 } = computeSourceLine();

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const nx = -dy / length;
    const ny = dx / length;

    // Emit rays based on emission rate
    for (let i = 0; i < emissionRate; i++) {
        // Random position along the source line
        const t = Math.random();
        const x = x1 + t * (x2 - x1);
        const y = y1 + t * (y2 - y1);

        // Add some angular spread for more realistic emission
        const baseAngle = Math.atan2(ny, nx);
        const spread = 1; // Small angular spread
        const angle = baseAngle + (Math.random() - 0.5) * spread;
        
        rays.push(new Ray(x, y, angle));
    }
}

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
