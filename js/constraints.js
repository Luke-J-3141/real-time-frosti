/*
================================================================================
GEOMETRY UTILITIES AND RAY MANAGEMENT - SPATIAL CALCULATIONS & RAY CULLING
================================================================================

This code implements geometric utility functions for spatial relationships,
aperture boundaries, and ray lifecycle management within the optical system.
Provides point-line relationships, elliptical aperture detection, and 
performance optimization through ray culling.

GEOMETRIC RELATIONSHIP FUNCTIONS:
- isLeftOfSourcePlane(x, y) → boolean
  Determines spatial relationship between point and source line
  Uses cross product method: (x2-x1)*(y-y1) - (y2-y1)*(x-x1)
  Returns true if point is to the left of source line (when viewed start→end)
  Used for determining which side of source plane geometry elements should render
  
- isOutsideAperture(x, y) → boolean
  Tests if point lies outside both elliptical aperture boundaries
  Performs coordinate transformation to ellipse-local coordinates
  Uses standard ellipse equation: (x'/a)² + (y'/b)² ≤ 1
  Applies rotation transformation: x' = (x-h)cos(φ) + (y-k)sin(φ)
  Returns true only if point is outside BOTH upper and lower ellipses
  Critical for aperture masking and ray termination logic

RAY MANAGEMENT FUNCTIONS:
- deleteRays(ray) → void (modifies ray.active)
  Performance optimization function for ray lifecycle management
  Deactivates rays that have passed aperture boundary (x > z0/2)
  Combined spatial and aperture checking for efficiency
  Prevents unnecessary computation on rays outside optical system
  Modifies ray.active property to stop further processing

APERTURE BOUNDARY DETECTION:
The isOutsideAperture function implements dual-ellipse aperture geometry:

Upper Ellipse Parameters: (ht, kt, ct, dt, phit)
- Center: (ht, kt)
- Semi-axes: ct (horizontal), dt (vertical)  
- Rotation angle: phit

Lower Ellipse Parameters: (hl, kl, cl, dl, phil)
- Center: (hl, kl)
- Semi-axes: cl (horizontal), dl (vertical)
- Rotation angle: phil

Coordinate Transformation Process:
1. Translate point to ellipse center: (x-h, y-k)
2. Apply rotation matrix for angle φ:
   x' = (x-h)cos(φ) + (y-k)sin(φ)
   y' = -(x-h)sin(φ) + (y-k)cos(φ)
3. Test ellipse equation: (x'/c)² + (y'/d)² ≤ 1

PROXIMITY CONSTRAINT FUNCTIONS (TODO - INCOMPLETE):
- isaboveProximity() → TBD
  Intended for proximity-based rendering optimization
  y_proximity = 600 units from TM (Target/Mirror)
  Will control reflector visibility based on distance constraints
  
- isaboveAperture() → TBD  
  Intended for aperture-based rendering optimization
  x_proximity = 1630 units for aperture distance
  Will provide toggle functionality for with/without aperture rendering

RAY CULLING STRATEGY:
The deleteRays function implements a two-stage culling approach:
1. Spatial filter: Only check rays beyond x > z0/2 (performance optimization)
2. Aperture test: Apply full elliptical boundary detection
This reduces computational overhead by avoiding expensive ellipse calculations
for rays that haven't reached the aperture region.

COORDINATE SYSTEM NOTES:
- Uses right-handed coordinate system
- Cross product sign determines left/right relationship
- Ellipse rotations follow standard mathematical convention
- Aperture boundaries define optical system limits

PERFORMANCE CONSIDERATIONS:
- isLeftOfSourcePlane: O(1) - simple cross product calculation
- isOutsideAperture: O(1) - fixed ellipse evaluations regardless of ray count
- deleteRays: O(1) per ray - early exit optimization with spatial pre-filter
- Ellipse calculations use trigonometric functions (cos/sin) - relatively expensive

INTEGRATION DEPENDENCIES:
Requires external functions:
- computeSourceLine() → {x1, y1, x2, y2}
- getEllipseConstants() → {ht, hl, kt, kl, ct, cl, dt, dl, phit, phil}

Global variables used:
- z0: Geometric reference distance for spatial filtering

USAGE PATTERNS:
```javascript
// Typical ray processing loop
rays.forEach(ray => {
    if (ray.active) {
        deleteRays(ray);  // Cull rays outside aperture
        if (ray.active) {
            // Continue ray processing...
        }
    }
});

// Geometry visibility checking
if (isLeftOfSourcePlane(elementX, elementY)) {
    // Render element (visible from source perspective)
}
```
================================================================================
*/


function isLeftOfSourcePlane(x, y) {
    const { x1, y1, x2, y2 } = computeSourceLine();
    
    // Calculate the cross product to determine which side of the line the point is on
    // For a line from (x1,y1) to (x2,y2) and point (x,y):
    // cross product = (x2-x1)*(y-y1) - (y2-y1)*(x-x1)
    const crossProduct = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
    
    // If cross product > 0, point is to the left of the line (when looking from start to end)
    // If cross product < 0, point is to the right of the line
    // If cross product = 0, point is on the line
    return crossProduct > 0;
}

// if ray is outside of the aperture and has greater x than given value
function deleteRays(ray){
    if (ray.x > z0 / 2 && isOutsideAperture(ray.x, ray.y)) {
        ray.active = false;
    }
        
}

function isOutsideAperture(x, y) {
    // Get the ellipse constants
    const { ht, hl, kt, kl, ct, cl, dt, dl, phit, phil } = getEllipseConstants();

    // Check if the point is outside both ellipses
    function insideEllipse(x, y, h, k, c, d, phi) {
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);
        const xPrime = (x - h) * cosPhi + (y - k) * sinPhi;
        const yPrime = -(x - h) * sinPhi + (y - k) * cosPhi;
        return ((xPrime ** 2) / (c ** 2)) + ((yPrime ** 2) / (d ** 2)) <= 1;
    }

    const insideUpper = insideEllipse(x, y, ht, kt, ct, dt, phit);
    const insideLower = insideEllipse(x, y, hl, kl, cl, dl, phil);

    // Check if the point is outside both ellipses
    return !insideUpper && !insideLower;
}

// TODO add proximity constraints 

// Only Draw reflectors and calculate reflection if ellipse is above constraint
// On toggle so can see with or without
function isaboveProximity() {
    const y_proximity = 600; // Distance from TM for proximity

    
}

function isaboveAperture() {
    const x_proximity = 1630; // Distance for aperture


}