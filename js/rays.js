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
        // Create gradient from red to orange based on distance
        const maxDistance = 800;
        const ratio = Math.min(distance / maxDistance, 1);
        
        // Starting color: red (255, 0, 0)
        // Ending color: orange (255, 165, 0)
        const startR = 255, startG = 0, startB = 0;
        const endR = 255, endG = 165, endB = 0;
            
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
    const nx = -dy / length;  // Normal vector
    const ny = dx / length;
    
    // Center point of the source line
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;

    for (let i = 0; i < emissionRate; i++) {
        const t = Math.random();
        const x = x1 + t * (x2 - x1);
        const y = y1 + t * (y2 - y1);

        const baseAngle = Math.atan2(ny, nx);
        const maxSpread = 3;
        const edgeThreshold = 0.1; // Consider rays within 10% of edges as "edge rays"
        
        let angle;
        if (t < edgeThreshold || t > (1 - edgeThreshold)) {
            // Edge rays: angle ranges from straight (normal) to pointing toward center
            const directionToCenter = Math.atan2(centerY - y, centerX - x);
            
            // Randomly interpolate between normal direction and center direction
            const mixFactor = Math.random(); // 0 = straight, 1 = toward center
            
            // Use spherical linear interpolation for smooth angle blending
            let angleDiff = directionToCenter - baseAngle;
            // Normalize angle difference to [-π, π]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            angle = baseAngle + mixFactor * angleDiff;
        } else {
            // Interior rays: use full spread as before
            angle = baseAngle + (Math.random() - 0.5) * maxSpread;
        }
        
        rays.push(new Ray(x, y, angle));
    }
}

