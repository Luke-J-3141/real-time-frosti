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
    constructor(x, y, angle, power = 1.0) {
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
        this.power = power;
        this.intensity = power; // Can be modified by absorption, reflection, etc.
        // Pre-calculate direction for performance
        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);
    }
    // Update position along ray path
    propagate(distance) {
      this.x += this.dx * distance;
      this.y += this.dy * distance;
    }
    
    // Attenuate power (for absorption, scattering, etc.)
    attenuate(factor) {
      this.intensity *= factor;
      return this.intensity > 0.001; // Return false if ray is too weak
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
  const nx = -dy / length;  // Normal vector (outward)
  const ny = dx / length;
  
  for (let i = 0; i < emissionRate; i++) {
    // Random position along the surface using uniform distribution
    const t = Math.random();
    const x = x1 + t * dx;
    const y = y1 + t * dy;

    // Calculate emission angle using Lambert's cosine law
    // This gives realistic angular distribution of power from surfaces
    const baseAngle = Math.atan2(ny, nx);
    
    // Generate cosine-weighted random angle (Lambert's law)
    // Sample uniformly in solid angle, then project to hemisphere
    const u1 = Math.random();
    const u2 = Math.random();
    
    // Convert to polar coordinates on hemisphere
    const cosTheta = Math.sqrt(u1); // Cosine weighting
    const phi = 2 * Math.PI * u2;   // Uniform azimuthal angle
    
    // Convert to Cartesian (theta from normal, phi around normal)
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    
    // Maximum emission angle (90° = full hemisphere, smaller for more focused)
    const maxEmissionAngle = Math.PI / 2; // Full hemisphere
    const theta = Math.acos(cosTheta) * (maxEmissionAngle / (Math.PI / 2));
    
    // Random rotation around the normal
    const azimuth = phi;
    
    // Convert spherical coordinates to 2D emission angle
    // Project 3D direction onto 2D plane
    const emissionAngle = baseAngle + (Math.random() - 0.5) * 2 * theta * Math.cos(azimuth);
    
    // Create ray with power proportional to cosine of angle from normal
    const angleFromNormal = Math.abs(emissionAngle - baseAngle);
    const powerWeight = Math.cos(angleFromNormal); // Lambert's law
    
    const ray = new Ray(x, y, emissionAngle);
    ray.power = powerWeight; // Store relative power for rendering/physics
    rays.push(ray);
  }
}
