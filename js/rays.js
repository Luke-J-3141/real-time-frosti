/*
================================================================================
RAY CLASS AND EMISSION SYSTEM - PHYSICS SIMULATION CORE
================================================================================

This code implements the core Ray physics class and emission system for the 
ray tracing simulation, handling ray propagation, reflection, aging, and 
intelligent emission patterns.

RAY CLASS:
Constructor: Ray(x, y, angle)
- Creates new ray at position (x,y) with initial direction angle (radians)
- Initializes path tracking, distance measurement, and aging system
- Sets active state and bounce counter

Methods:
- step(speed) → void
  Advances ray by speed units in current direction
  Updates position, age, total distance traveled, and path history
  Checks for termination collision and age-based deactivation
  Automatically deactivates ray when maxAge (rayLifetime) is reached
  
- reflect(normal) → void  
  Performs realistic reflection using physics formula: r = d - 2(d·n)n
  Updates ray direction based on surface normal vector
  Increments bounce counter and deactivates if maxBounces exceeded
  
- getOpacity() → float [0.1, 1.0]
  Returns age-based opacity for visual fading effect
  Newer rays are more opaque, older rays fade toward 0.1 minimum
  
- getColorAtDistance(distance) → string "rgb(r,g,b)"
  Returns distance-based color interpolation from red to yellow
  Creates heat-map effect showing ray energy/distance traveled
  Uses rayLifetime scaling for maximum color transition distance

Properties:
- startX, startY: initial emission coordinates
- x, y: current position  
- dx, dy: normalized direction vector
- active: boolean simulation state
- bounces: reflection counter
- path: array of {x,y} coordinate history
- totalDistance: cumulative distance traveled
- age: simulation steps since creation
- maxAge: lifetime limit (rayLifetime global)

RAY EMISSION SYSTEM:
- emitNewRays() → void
  Generates emissionRate new rays per call from source line
  Implements intelligent angular distribution:
  
  * Edge Ray Behavior (within 0.1 of line endpoints):
    - Angles interpolate between surface normal and center-pointing direction
    - Uses spherical linear interpolation for smooth angle blending
    
  * Interior Ray Behavior (middle 80% of source):  
    - Full angular spread up to maxSpread (2.5 radians) around surface normal
    - Uniform random distribution for natural emission pattern
  
  Calculates source line geometry from computeSourceLine()
  Generates proper surface normal vector for realistic emission

DEPENDENCIES:
Requires external functions: computeSourceLine(), checkTerminationCollision()

GLOBAL VARIABLES USED:
- rays: global array to store active Ray instances
- rayLifetime: maximum age before ray deactivation  
- emissionRate: rays created per emission cycle
- maxBounces: reflection limit before ray termination
- maxSpread: angular spread for interior ray emission (radians)

PHYSICAL ACCURACY:
- Implements proper vector reflection physics
- Maintains energy conservation through opacity/color systems
- Realistic emission patterns with edge effects
- Distance-based visual effects for energy representation
================================================================================
*/


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
        this.totalraysCreated = 0;
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
        const maxDistance = rayLifetime * 10 ; // Maximum distance for full color transition
        const ratio = Math.min(distance / maxDistance, 1);
        
        // Starting color: red (255, 0, 0)
        // Ending color: yellow (255, 255, 0)
        const startR = 255, startG = 0, startB = 0;
        const endR = 255, endG = 255, endB = 0;
            
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
      const maxSpread = 2.5;
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

