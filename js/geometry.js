/*
 * ELLIPSE RAY INTERSECTION MODULE
 * ==============================
 * 
 * This module provides functions for detecting intersections between rays and rotated ellipses
 * with masking capabilities. Designed for optical ray tracing applications.
 * 
 * MAIN FUNCTIONS:
 * 
 * checkEllipseIntersection(ray)
 *   - Primary intersection function that checks both upper and lower ellipses
 *   - Applies masking lines to limit valid intersection regions
 *   - Returns: normal vector of closest valid intersection, or null if no intersection
 * 
 * checkSingleEllipseIntersection(ray, h, k, a, b, phi, maskLine, ellipse)
 *   - Tests intersection with a single ellipse using given parameters
 *   - Validates intersection within ray segment and mask boundaries
 *   - Returns: intersection object {x, y, normal, distance, t} or null
 * 
 * findEllipseIntersection(ray, h, k, a, b, phi)
 *   - Core mathematical intersection calculation using quadratic formula
 *   - Handles numerical stability and edge cases (tangent rays, zero coefficients)
 *   - Returns: intersection point {x, y, t, distance} or null
 * 
 * MASKING FUNCTIONS:
 * 
 * getEllipseMaskLine(ellipseType)
 *   - Creates masking line definition for "upper" or "lower" ellipse
 *   - Converts slope-intercept to standard line equation form
 *   - Returns: line object {a, b, c, slope, intercept, endX, startX}
 * 
 * isPointWithinMask(x, y, maskLine, ellipse)
 *   - Determines if intersection point should be masked (excluded)
 *   - Handles boundary conditions and tolerance for edge cases
 *   - Returns: boolean indicating if point is valid (not masked)
 * 
 * isPointAboveMaskLine(x, y, maskLine)
 *   - Geometric test for point position relative to mask line
 *   - Returns: boolean true if point is above the line
 * 
 * getDistanceToMaskLine(x, y, maskLine)
 *   - Calculates signed perpendicular distance from point to mask line
 *   - Returns: signed distance value (positive/negative indicates side)
 * 
 * UTILITY FUNCTIONS:
 * 
 * calculateEllipseNormal(x, y, h, k, a, b, phi)
 *   - Computes outward-pointing normal vector at intersection point
 *   - Transforms between ellipse and world coordinate systems
 *   - Returns: normalized normal vector {x, y} or null if invalid
 * 
 * getEllipseConstants()
 *   - Calculates ellipse parameters based on global variables (theta, z0, a, b, etc.)
 *   - Handles geometric transformations and slope calculations
 *   - Returns: object with all ellipse parameters {ht, hl, kt, kl, ct, cl, dt, dl, phit, phil, slopet, slopel, interseptt, interseptl}
 * 
 * computeSourceLine()
 *   - Defines the source line geometry for ray generation
 *   - Returns: line endpoints {x1, y1, x2, y2}
 * 
 * DEPENDENCIES:
 * - Expects global variables: theta, z0, a, b, voffset, raySpeed, dist_sor_tar, sourceLength, verticalOffset, EPS
 * - Ray object format: {x, y, dx, dy} where (x,y) is origin and (dx,dy) is direction
 * 
 * NUMERICAL FEATURES:
 * - Enhanced numerical stability for near-tangent rays and edge cases
 * - Tolerance handling for boundary conditions
 * - Robust quadratic equation solving with improved root computation
 */

// <====== Comments ======>
// TODO:


// Improved ellipse intersection with better edge case handling
function checkEllipseIntersection(ray) {
    const { ht, hl, kt, kl, ct, cl, dt, dl, phit, phil } = getEllipseConstants();
    
    // Define masking lines for each ellipse
    const upperMaskLine = getEllipseMaskLine("upper");
    const lowerMaskLine = getEllipseMaskLine("lower");
    
    // Get proximity constraints
    const proximityLimits = isaboveProximity();
    
    // Check both ellipses and return the closest valid intersection
    const intersections = [];
    
    // Check upper ellipse
    const upperResult = checkSingleEllipseIntersection(ray, ht, kt, ct, dt, phit, upperMaskLine, "Upper");
    
    if (upperResult) {
        // Apply constraints if enabled
        const meetProximityConstraint = enableProximityConstraint || upperResult.x >= proximityLimits.x;
        const meetApertureConstraint = enableApertureConstraint || upperResult.y >= proximityLimits.y;
        
        if (meetProximityConstraint && meetApertureConstraint) {
            intersections.push({...upperResult});
        }
    }
    
    // Check lower ellipse
    const lowerResult = checkSingleEllipseIntersection(ray, hl, kl, cl, dl, phil, lowerMaskLine, "Lower");
    
    if (lowerResult) {
        // Apply constraints if enabled
        const meetProximityConstraint =  enableProximityConstraint || lowerResult.x >= proximityLimits.x;
        const meetApertureConstraint = enableApertureConstraint || lowerResult.y >= proximityLimits.y;
        
        if (meetProximityConstraint && meetApertureConstraint) {
            intersections.push({...lowerResult});
        }
    }
    
    // Return closest intersection if any
    if (intersections.length === 0) return null;
    
    // Sort by distance and return closest
    intersections.sort((a, b) => a.distance - b.distance);

    return intersections[0].normal;
}

function checkSingleEllipseIntersection(ray, h, k, a, b, phi, maskLine, ellipse) {
    // Validate ellipse parameters
    if (a <= 0 || b <= 0) return null;
    
    // Calculate intersection using quadratic formula with better numerical stability
    const intersection = findEllipseIntersection(ray, h, k, a, b, phi);
    if (!intersection) return null;
    
    const { x: intX, y: intY, t, distance } = intersection;
    
    // Validate intersection is within ray segment (with small tolerance)
    const tolerance = 1e-6;
    if (t < -tolerance || t > 1 + tolerance) return null;
    
    // Apply masking logic with better boundary handling
    if (!isPointWithinMask(intX, intY, maskLine, ellipse)) {
        return null;
    }
    
    // Calculate normal with validation
    const normal = calculateEllipseNormal(intX, intY, h, k, a, b, phi);
    if (!normal || (Math.abs(normal.x) < 1e-10 && Math.abs(normal.y) < 1e-10)) {
        return null; // Invalid normal
    }

    return {
        x: intX,
        y: intY,
        normal: normal,
        distance: distance,
        t: t
    };
}

function findEllipseIntersection(ray, h, k, a, b, phi) {
    // Use double precision for critical calculations
    const cos_phi = Math.cos(phi);
    const sin_phi = Math.sin(phi);
    
    // Ray origin relative to ellipse center
    const ox = ray.x - h;
    const oy = ray.y - k;
    
    // Ray direction (normalized for better numerical stability)
    let dx = ray.dx * raySpeed;
    let dy = ray.dy * raySpeed;
    const rayLength = Math.sqrt(dx * dx + dy * dy);
    if (rayLength < 1e-12) return null; // Zero-length ray
    
    // Rotate to ellipse coordinate system
    const rx = ox * cos_phi + oy * sin_phi;
    const ry = -ox * sin_phi + oy * cos_phi;
    const rdx = dx * cos_phi + dy * sin_phi;
    const rdy = -dx * sin_phi + dy * cos_phi;
    
    // Quadratic coefficients for ellipse intersection
    const a2 = a * a;
    const b2 = b * b;
    
    const A = (rdx * rdx) / a2 + (rdy * rdy) / b2;
    const B = 2 * ((rx * rdx) / a2 + (ry * rdy) / b2);
    const C = (rx * rx) / a2 + (ry * ry) / b2 - 1;
    
    // Handle near-zero A coefficient (ray nearly tangent to ellipse)
    if (Math.abs(A) < 1e-12) {
        if (Math.abs(B) < 1e-12) return null; // Ray doesn't intersect
        const t = -C / B;
        if (t >= 0 && t <= 1) {
            const intX = ray.x + dx * t;
            const intY = ray.y + dy * t;
            const distance = Math.sqrt((intX - ray.x) ** 2 + (intY - ray.y) ** 2);
            return { x: intX, y: intY, t, distance };
        }
        return null;
    }
    
    // Solve quadratic equation with improved numerical stability
    const discriminant = B * B - 4 * A * C;
    if (discriminant < 0) return null; // No real intersection
    
    const sqrtDisc = Math.sqrt(discriminant);
    const invA2 = 1 / (2 * A);
    
    // Use more numerically stable method for computing roots
    let t1, t2;
    if (B >= 0) {
        t1 = (-B - sqrtDisc) * invA2;
        t2 = C / (A * t1);
    } else {
        t2 = (-B + sqrtDisc) * invA2;
        t1 = C / (A * t2);
    }
    
    // Choose the appropriate intersection
    let bestT = null;
    let bestDistance = Infinity;
    
    // Check both intersections and pick the closest valid one
    for (const t of [t1, t2]) {
        if (t >= 0 && t <= 1) {
            const distance = t * rayLength;
            if (distance < bestDistance) {
                bestT = t;
                bestDistance = distance;
            }
        }
    }
    
    if (bestT === null) return null;
    
    const intX = ray.x + dx * bestT;
    const intY = ray.y + dy * bestT;
    
    return { x: intX, y: intY, t: bestT, distance: bestDistance };
}

// Convert slope-intercept form to standard line equation (ax + by + c = 0)
function getEllipseMaskLine(ellipseType) {
    const { slopet, slopel, interseptt, interseptl } = getEllipseConstants();
    
    let slope, intercept, endX;
    
    if (ellipseType === "upper") {
        slope = slopet;
        intercept = interseptt;
        endX = z0 + b * Math.sin(theta);
    } else if (ellipseType === "lower") {
        slope = slopel;
        intercept = interseptl;
        endX = z0 - b * Math.sin(theta);
    } else {
        return null;
    }
    
    // Convert from y = mx + c to ax + by + c = 0 form
    // y = mx + c becomes -mx + y - c = 0
    // So a = -slope, b = 1, c = -intercept
    return {
        a: -slope,
        b: 1,
        c: -intercept,
        slope: slope,
        intercept: intercept,
        endX: endX,
        startX: 0
    };
}

// Check if point is above the mask line
function isPointAboveMaskLine(x, y, maskLine) {
    if (!maskLine) return false;
    
    // Using the line equation ax + by + c = 0
    // If ax + by + c > 0, point is on one side, if < 0, on the other
    // For our coordinate system, we want to check if point is above y = mx + c
    // Which means y > mx + c, or y - mx - c > 0
    const lineValue = maskLine.a * x + maskLine.b * y + maskLine.c;
    return lineValue > 0;
}

// Get signed distance from point to mask line
function getDistanceToMaskLine(x, y, maskLine) {
    if (!maskLine) return 0;
    
    const denominator = Math.sqrt(maskLine.a * maskLine.a + maskLine.b * maskLine.b);
    if (denominator === 0) return 0;
    
    return (maskLine.a * x + maskLine.b * y + maskLine.c) / denominator;
}

// Enhanced masking check with better boundary handling
function isPointWithinMask(x, y, maskLine, ellipse) {
    if (!maskLine) return true; // No masking
    
    // Check if point is within the horizontal bounds of the mask line
    const withinBounds = x >= maskLine.startX && x <= maskLine.endX;
    if (!withinBounds) {
        // For points outside the mask line bounds, use a more permissive check
        // This prevents edge effects at the ends of the mask lines
        return true;
    }
    
    const isAbove = isPointAboveMaskLine(x, y, maskLine);
    const distanceToLine = Math.abs(getDistanceToMaskLine(x, y, maskLine));
    
    // Small tolerance for points very close to the mask line
    const tolerance = 1e-6;
    const onLine = distanceToLine < tolerance;
    
    if (ellipse === "Upper") {
        // For upper ellipse, mask the upper part (keep points below or on mask line)
        return isAbove || onLine;
    } else if (ellipse === "Lower") {
        // For lower ellipse, mask the lower part (keep points above or on mask line)
        return !isAbove || onLine;
    }
    
    return true;
}

// 
function calculateEllipseNormal(x, y, h, k, a, b, phi) {
    // Transform point to ellipse coordinate system
    const dx = x - h;
    const dy = y - k;
    
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    
    const xRot = dx * cosPhi + dy * sinPhi;
    const yRot = -dx * sinPhi + dy * cosPhi;
    
    // Calculate gradient (normal direction) in ellipse coordinate system
    let normalX = (2 * xRot) / (a * a);
    let normalY = (2 * yRot) / (b * b);
    
    // Normalize with validation
    const normalMag = Math.sqrt(normalX * normalX + normalY * normalY);
    if (normalMag < 1e-10) return null; // Invalid normal
    
    normalX /= normalMag;
    normalY /= normalMag;
    
    // Rotate normal back to world coordinates
    const worldNormalX = normalX * cosPhi - normalY * sinPhi;
    const worldNormalY = normalX * sinPhi + normalY * cosPhi;
    
    // Ensure normal points outward from ellipse
    const centerToPoint = { x: dx, y: dy };
    const dotProduct = worldNormalX * centerToPoint.x + worldNormalY * centerToPoint.y;
    
    if (dotProduct < 0) {
        // Flip normal to point outward
        return { x: -worldNormalX, y: -worldNormalY };
    }
    
    return { x: worldNormalX, y: worldNormalY };
}

function getEllipseConstants() {
    
    let sinT = Math.sin(theta);
    let cosT = Math.cos(theta);
    
    // Prevent division by zero when cosT approaches 0
    let tanT = Math.abs(cosT) < EPS ? Math.sign(sinT) * 1e6 : sinT / cosT;

    let ht = 0.5 * z0 + 0.5 * b * sinT;
    let hl = 0.5 * z0 - 0.5 * b * sinT;

    let kt = 0.5 * (z0 * tanT - b * cosT - a) + voffset;
    let kl = 0.5 * (z0 * tanT + b * cosT + a) + voffset;

    let lt = 0.5 * Math.sqrt(Math.pow(z0 + b * sinT, 2) + Math.pow(a - b * cosT + z0 * tanT, 2));
    let ll = 0.5 * Math.sqrt(Math.pow(z0 - b * sinT, 2) + Math.pow(b * cosT + z0 * tanT - a, 2));

    let ct = 0.5 * Math.sqrt(Math.pow(z0 - b * sinT, 2) + Math.pow(a + b * cosT + z0 * tanT, 2)) + b;
    let cl = 0.5 * Math.sqrt(Math.pow(z0 + b * sinT, 2) + Math.pow(z0 * tanT - a - b * cosT, 2)) + b;

    let dtSq = ct ** 2 - lt ** 2;  
    let dlSq = cl ** 2 - ll ** 2;  

    let dt = Math.sqrt(Math.max(dtSq, 0));
    let dl = Math.sqrt(Math.max(dlSq, 0));

    let phit = Math.atan2(z0 * tanT - b * cosT + a, z0 + b * sinT);
    let phil = Math.atan2(z0 * tanT + b * cosT - a, z0 - b * sinT);

    let slopel = (z0 * tanT + b * cosT + a) / (z0 - b * sinT);
    let slopet = (z0 * tanT - b * cosT - a) / (z0 + b * sinT);

    return { ht, hl, kt, kl, ct, cl, dt, dl, phit, phil, slopet, slopel, interseptt: a + voffset, interseptl: -a + voffset};
};

function computeSourceLine() {            
    // Tangent vector (perpendicular to normal)
    let tx = -Math.sin(theta);
    let ty = Math.cos(theta);
    
    // Midpoint of the source line
    let midX = dist_sor_tar;
    let midY = dist_sor_tar * Math.tan(theta) + verticalOffset
    
    const halfLength = sourceLength / 2;
    return {
    x1: midX - halfLength * tx,
    y1: midY - halfLength * ty,
    x2: midX + halfLength * tx,
    y2: midY + halfLength * ty,
    };
}

