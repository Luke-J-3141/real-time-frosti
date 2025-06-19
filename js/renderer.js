/*
================================================================================
RAY TRACING VISUALIZATION SYSTEM - CORE RENDERING FUNCTIONS
================================================================================

This code implements a 2D ray tracing visualization system with elliptical 
reflectors, interactive zoom/pan controls, and statistical analysis overlays.

COORDINATE SYSTEM FUNCTIONS:
- screenToWorld(screenX, screenY) → {x, y}
  Converts mouse/screen coordinates to world coordinate system accounting for zoom/pan
  
- worldToScreen(worldX, worldY) → {x, y}  
  Converts world coordinates to screen pixels for canvas rendering

DRAWING FUNCTIONS:
- drawReflectors()
  Renders upper and lower elliptical reflectors with masking (portions hidden by mask lines)
  Uses gold color (#FFD700), dynamic line width based on zoom level
  Only draws ellipse segments left of source plane and respecting mask boundaries
  
- drawRays()
  Renders ray paths with color-coded segments based on distance traveled
  Supports opacity control and dynamic line width
  Each ray segment can have different colors based on distance
  
- drawSource()
  Draws the light source as an orange line segment (#FFA500)
  Source position computed by computeSourceLine() function
  
- drawDiagonalLines_UC()
  Renders purple dashed reference lines (#8B00FF) 
  Shows upper/lower boundary lines with slopes/intercepts from ellipse constants
  Lines extend to source plane boundaries
  
- drawMirroredElements()
  Creates horizontally mirrored copy of all elements below centerline
  Uses canvas transform to flip vertically around y=0 world coordinate
  Includes all drawing functions plus overlay elements (histograms, KDE, TM rendering)
  
- redraw()
  Master rendering function - clears canvas and calls all drawing functions
  Renders: grid, reflectors, rays, source, reference lines, statistical overlays
  Handles canvas state management and coordinate transformations

DEPENDENCIES:
Requires external functions: getEllipseConstants(), getEllipseMaskLine(), 
isPointAboveMaskLine(), isLeftOfSourcePlane(), computeSourceLine(),
renderHistogramOverlay(), renderTM(), drawKDEOnCanvas(), drawGrid()

GLOBAL VARIABLES USED:
- ctx: 2D canvas rendering context
- rays: array of ray objects with path, color, and opacity methods
- centerX, centerY: canvas center coordinates  
- panX, panY: current pan offset
- zoomLevel: current zoom factor
- canvasWidth, canvasHeight: canvas dimensions
- terminationBounds: bounds for statistical analysis
- z0, b, theta: geometric parameters for boundary calculations
================================================================================
*/


// <====== Comments ======>
// TODO:

// Transform screen coordinates to world coordinates
function screenToWorld(screenX, screenY) {
    return {
        x: (screenX - centerX - panX) / zoomLevel,
        y: -(screenY - centerY - panY) / zoomLevel
    };
}
// Transform world coordinates to screen coordinates
function worldToScreen(worldX, worldY) {
    return {
        x: centerX + panX + worldX * zoomLevel,
        y: centerY + panY - worldY * zoomLevel
    };
}

function drawReflectors() {
    const { ht, hl, kt, kl, ct, cl, dt, dl, phit, phil } = getEllipseConstants();

    ctx.strokeStyle = '#FFD700'; // Gold color
    ctx.lineWidth = Math.min(2, Math.max(1, 2 / zoomLevel)); // Dynamic width with upper limit of 3

    // Get mask lines
    const upperMask = getEllipseMaskLine("upper");
    const lowerMask = getEllipseMaskLine("lower");
    
    function drawMaskedEllipse(h, k, a, b, phi, maskLine, drawBelow = true) {
        ctx.beginPath();
        
        const steps = 5000;
        let firstPoint = true;
        
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * 2 * Math.PI;
            const x = h + a * Math.cos(t) * Math.cos(phi) - b * Math.sin(t) * Math.sin(phi);
            const y = k + a * Math.cos(t) * Math.sin(phi) + b * Math.sin(t) * Math.cos(phi);
            
            // Check if point should be drawn based on mask
            const shouldDrawMask = drawBelow ? 
                isPointAboveMaskLine(x, y, maskLine) : // Draw below mask (not above)
                !isPointAboveMaskLine(x, y, maskLine);   // Draw above mask
            
            // Additional check: only draw if point is to the left of source plane
            const shouldDrawSourcePlane = isLeftOfSourcePlane(x, y);
            
            // Constraint checks (only apply if enabled)
            const proximityLimits = isaboveProximity();
            const shouldDrawProximity = enableProximityConstraint || x >= proximityLimits.x;
            const shouldDrawAperture =   enableApertureConstraint || y >= proximityLimits.y;
            
            // Point must satisfy all conditions
            const shouldDraw = shouldDrawMask && shouldDrawSourcePlane && shouldDrawProximity && shouldDrawAperture;

            if (shouldDraw) {
                const screen = worldToScreen(x, y);
                
                if (firstPoint) {
                    ctx.moveTo(screen.x, screen.y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(screen.x, screen.y);
                }
            } else {
                // When we hit a masked point, we need to start a new path segment
                if (!firstPoint) {
                    ctx.stroke();
                    ctx.beginPath();
                    firstPoint = true;
                }
            }
        }

        // Complete any remaining path
        if (!firstPoint) {
            ctx.stroke();
        }
    }

    // Draw upper ellipse above its mask line and left of source plane
    drawMaskedEllipse(ht, kt, ct, dt, phit, upperMask, true); // false = draw above mask
    
    // Draw lower ellipse below its mask line and left of source plane
    drawMaskedEllipse(hl, kl, cl, dl, phil, lowerMask, false);  // true = draw below mask
}

function drawRays() {
    rays.forEach(ray => {
        if (ray.path.length < 2) return;


        const opacity = ray.getOpacity();
        
        let totalDistance = 0;
        for (let i = 1; i < ray.path.length; i++) {
            const prevPoint = ray.path[i-1];
            const currPoint = ray.path[i];
            
            const segmentDist = Math.sqrt(
                (currPoint.x - prevPoint.x) ** 2 + 
                (currPoint.y - prevPoint.y) ** 2
            );
            
            ctx.strokeStyle = ray.getColorAtDistance(totalDistance);
            ctx.lineWidth = Math.min(1, Math.max(1, 2 / zoomLevel));    ctx.globalAlpha = opacity;
            
            const screenPrev = worldToScreen(prevPoint.x, prevPoint.y);
            const screenCurr = worldToScreen(currPoint.x, currPoint.y);
            
            ctx.beginPath();
            ctx.moveTo(screenPrev.x, screenPrev.y);
            ctx.lineTo(screenCurr.x, screenCurr.y);
            ctx.stroke();
            
            totalDistance += segmentDist;
        }
    });
    
    ctx.globalAlpha = 1;
}

function drawSource() {
    const { x1, y1, x2, y2 } = computeSourceLine();

    ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = Math.min(2, Math.max(1, 3 / zoomLevel));
    
    const screen1 = worldToScreen(x1, y1);
    const screen2 = worldToScreen(x2, y2);
    
    ctx.beginPath();
    ctx.moveTo(screen1.x, screen1.y);
    ctx.lineTo(screen2.x, screen2.y);
    ctx.stroke();

}

// Draw diagonal lines without constraints
function drawDiagonalLines_UC() {
    const { slopet, slopel, interseptt, interseptl } = getEllipseConstants();
    
    ctx.strokeStyle = '#8B00FF';
    ctx.lineWidth = Math.min(2, Math.max(1, 1 / zoomLevel));
    ctx.setLineDash([5 , 5 ]);
    
    // Calculate visible bounds based on current zoom and pan
    const bounds = 1000 / zoomLevel;

    // Draw line with slope slopet and intercept interseptt
    function localDrawLine(slope, intercept, rightX = bounds) {
        if (Math.abs(slope) < 1000) { // Avoid nearly vertical lines
            let leftY = intercept;
            let rightY = slope * rightX + intercept;
            
            let screenLeft = worldToScreen(0, leftY);
            let screenRight = worldToScreen(rightX, rightY);
            
            ctx.beginPath();
            ctx.moveTo(screenLeft.x, screenLeft.y);
            ctx.lineTo(screenRight.x, screenRight.y);
            ctx.stroke();
        }
    }
    localDrawLine(slopet, interseptt, z0 + b*Math.sin(theta));
    localDrawLine(slopel, interseptl, z0 - b*Math.sin(theta));
    // Reset line dash
    ctx.setLineDash([]);
}

// Draw diagonal lines with constraints
function drawDiagonalLines_C() {
    const { x1, y1, x2, y2 } = computeSourceLine();
    const { ht, hl, kt, kl, ct, cl, dt, dl, phit, phil } = getEllipseConstants();
    
    ctx.strokeStyle = '#FF1493'; // Deep pink color to distinguish from other lines
    ctx.lineWidth = Math.min(2, Math.max(1, 1 / zoomLevel));
    ctx.setLineDash([3, 3]); // Shorter dash pattern
    
    // Function to find the endpoint of the drawn reflector (furthest from source plane)
    function findLastReflectorPoint(h, k, a, b, phi, maskLine, drawBelow = true) {
        const steps = 5000;
        const validPoints = [];
        
        // First, collect all valid points that would be drawn
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * 2 * Math.PI;
            const x = h + a * Math.cos(t) * Math.cos(phi) - b * Math.sin(t) * Math.sin(phi);
            const y = k + a * Math.cos(t) * Math.sin(phi) + b * Math.sin(t) * Math.cos(phi);
            
            // Apply the same constraints as in drawReflectors()
            const shouldDrawMask = drawBelow ? 
                isPointAboveMaskLine(x, y, maskLine) : 
                !isPointAboveMaskLine(x, y, maskLine);
            
            const shouldDrawSourcePlane = isLeftOfSourcePlane(x, y);
            
            const proximityLimits = isaboveProximity();
            const shouldDrawProximity = enableProximityConstraint || x >= proximityLimits.x;
            const shouldDrawAperture = enableApertureConstraint || y >= proximityLimits.y;
            
            const shouldDraw = shouldDrawMask && shouldDrawSourcePlane && shouldDrawProximity && shouldDrawAperture;
            
            if (shouldDraw) {
                validPoints.push({ x, y, t });
            }
        }
        
        if (validPoints.length === 0) return null;
        
        // Get source plane position for distance calculation
        const { x1, y1, x2, y2 } = computeSourceLine();
        const sourceCenterX = (x1 + x2) / 2;
        const sourceCenterY = (y1 + y2) / 2;
        
        // Find the point with maximum distance from source plane center
        let maxDistance = -1;
        let farthestPoint = null;
        
        validPoints.forEach(point => {
            const distance = Math.sqrt(
                (point.x - sourceCenterX) ** 2 + 
                (point.y - sourceCenterY) ** 2
            );
            
            if (distance > maxDistance) {
                maxDistance = distance;
                farthestPoint = point;
            }
        });
        
        return farthestPoint;
    }
    
    // Get mask lines
    const upperMask = getEllipseMaskLine("upper");
    const lowerMask = getEllipseMaskLine("lower");
    
    // Find the last drawn points of both reflectors
    const upperLastPoint = findLastReflectorPoint(ht, kt, ct, dt, phit, upperMask, true);
    const lowerLastPoint = findLastReflectorPoint(hl, kl, cl, dl, phil, lowerMask, false);
    
    // Draw diagonal lines from source plane edges to x=0, passing through reflector end points
    function drawDiagonalLine(sourcePoint, reflectorPoint) {
        if (!reflectorPoint) return;
        
        // Calculate the line equation from source point through reflector point
        const dx = reflectorPoint.x - sourcePoint.x;
        const dy = reflectorPoint.y - sourcePoint.y;
        
        // Find intersection with x=0 line
        if (Math.abs(dx) > 1e-10) { // Avoid division by zero
            const t = -sourcePoint.x / dx; // Parameter when x = 0
            const intersectionY = sourcePoint.y + t * dy;
            
            // Draw line from source point to x=0 intersection
            const screenSource = worldToScreen(sourcePoint.x, sourcePoint.y);
            const screenIntersection = worldToScreen(0, intersectionY);
            
            ctx.beginPath();
            ctx.moveTo(screenSource.x, screenSource.y);
            ctx.lineTo(screenIntersection.x, screenIntersection.y);
            ctx.stroke();
        }
    }
    
    // Draw diagonal lines: upper edge to lower reflector, lower edge to upper reflector
    // Determine which source point is upper and which is lower
    const upperSourcePoint = y1 > y2 ? { x: x1, y: y1 } : { x: x2, y: y2 };
    const lowerSourcePoint = y1 > y2 ? { x: x2, y: y2 } : { x: x1, y: y1 };
    
    // Draw from upper source edge to lower reflector endpoint
    if (lowerLastPoint) {
        drawDiagonalLine(upperSourcePoint, lowerLastPoint);
    }
    
    // Draw from lower source edge to upper reflector endpoint
    if (upperLastPoint) {
        drawDiagonalLine(lowerSourcePoint, upperLastPoint);
    }
    
    // Reset line dash
    ctx.setLineDash([]);
}

// Draw mirrored elements below the horizontal centerline
// Currenly this function is unable to draw the KDE distribution
function drawMirroredElements(stats) {
    // Save the current canvas state
    ctx.save();
    
    // Transform to mirror across the horizontal centerline (y = 0 in world coordinates)
    // First translate to center, then scale vertically by -1, then translate back
    ctx.translate(centerX + panX, centerY + panY);
    ctx.scale(1, -1);
    ctx.translate(-(centerX + panX), -(centerY + panY));
    
    // Now draw all elements - they will appear mirrored below the horizontal centerline
    drawReflectors();
    drawRays();
    drawSource();
    if (enableApertureConstraint || enableProximityConstraint) {
        drawDiagonalLines_UC();
    }
    if (!enableApertureConstraint || !enableProximityConstraint) {
        drawDiagonalLines_C();
    }

    const inverseStats = {
        ...stats,
        distribution: new Map()
    };
    
    for (const [key, value] of stats.distribution) {
        inverseStats.distribution.set(-key, value);
    }

    renderHistogramOverlay(ctx, inverseStats,  terminationBounds);
    renderTM(ctx, inverseStats, zoomLevel, panX, panY);
   
    // Restore the canvas state
    ctx.restore();
}

// Main drawing function called by the animation loop and after any state changes
function redraw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);  
    ctx.save();
    drawGrid(ctx);

    drawReflectors();
    drawRays();
    drawSource();
    if (enableApertureConstraint || enableProximityConstraint) {
        drawDiagonalLines_UC();
    }
    if (!enableApertureConstraint || !enableProximityConstraint) {
        drawDiagonalLines_C();
    }
    
    // Get stats from your physics module
    const stats = getTerminationStats();
    
    // Update distribution plot
    renderHistogramOverlay(ctx, stats, terminationBounds);
    renderTM(ctx, stats, zoomLevel, panX, panY);
    drawKDEOnCanvas(ctx, stats);

    drawMirroredElements(stats);
    ctx.restore();
}

