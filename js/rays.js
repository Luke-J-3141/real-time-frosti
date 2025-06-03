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
        const bounds = 10000/zoomLevel; // Adjust bounds based on zoom level;
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

    for (let i = 0; i < emissionRate; i++) {
        const t = Math.random();
        const x = x1 + t * (x2 - x1);
        const y = y1 + t * (y2 - y1);

        const baseAngle = Math.atan2(ny, nx);
        const maxSpread = 3;
        const minSpread = 0.5; // Minimum spread even for edge rays
        const edgeThreshold = 0.1; // Consider rays within 10% of edges as "edge rays"
        
        let actualSpread;
        if (t < edgeThreshold || t > (1 - edgeThreshold)) {
            // Edge rays: use minimum spread
            actualSpread = minSpread;
        } else {
            // Interior rays: use full spread
            actualSpread = maxSpread;
        }
        
        const angle = baseAngle + (Math.random() - 0.5) * actualSpread;
        
        rays.push(new Ray(x, y, angle));
    }
}
