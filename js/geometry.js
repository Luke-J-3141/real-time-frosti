// <====== Comments ======>
// TODO:


// Enhanced ellipse intersection with masking
function checkEllipseIntersection(ray) {
    const { ht, hl, kt, kl, ct, cl, dt, dl, phit, phil } = getEllipseConstants();
    
    // Define masking lines for each ellipse
    const upperMaskLine = getUpperEllipseMaskLine();
    const lowerMaskLine = getLowerEllipseMaskLine();
    
    // Check intersection with upper ellipse (with masking)
    let result = checkSingleEllipseIntersection(ray, ht, kt, ct, dt, phit, upperMaskLine, "Upper");
    if (result) return result;
    
    // Check intersection with lower ellipse (with masking)
    result = checkSingleEllipseIntersection(ray, hl, kl, cl, dl, phil, lowerMaskLine, "Lower");
    if (result) return result;
    
    return null;
}

function checkSingleEllipseIntersection(ray, h, k, a, b, phi, maskLine, ellipse) {
    
    // Calculate ray's next position
    const nextX = ray.x + ray.dx * raySpeed;
    const nextY = ray.y + ray.dy * raySpeed;
    
    // Use parametric ray equation: P(t) = ray.pos + t * ray.dir * raySpeed
    // where t ∈ [0, 1] represents the ray segment from current to next position
    
    // First, check if we need to look for intersections at all
    const currentDist = getDistanceToEllipse(ray.x, ray.y, h, k, a, b, phi);
    const nextDist = getDistanceToEllipse(nextX, nextY, h, k, a, b, phi);
    
    // More robust intersection detection
    const crossesBoundary = Math.sign(currentDist) !== Math.sign(nextDist);
    const isNearBoundary = Math.abs(currentDist) < raySpeed * 3 || Math.abs(nextDist) < raySpeed * 3;
    
    if (!crossesBoundary && !isNearBoundary) {
        return null; // No intersection possible
    }
    
    // Use analytical solution when possible for better accuracy
    const analyticalIntersection = findAnalyticalIntersection(ray, h, k, a, b, phi, raySpeed);
    if (analyticalIntersection) {
        const { x: intX, y: intY, t } = analyticalIntersection;
        
        // Validate the intersection point
        if (t >= 0 && t <= 1) {
            // Apply masking logic - FIXED: proper masking conditions
            if (ellipse === "Upper" && isPointAboveMaskLine(intX, intY, maskLine)) {
                return null; // Point is below mask line for upper ellipse, ignore

            } else if (ellipse === "Lower" && !isPointAboveMaskLine(intX, intY, maskLine)) {
                return null; // Point is above mask line for lower ellipse, ignore
            }
            
            
            // Update ray position
            ray.x = intX;
            ray.y = intY;
            
            return calculateEllipseNormal(intX, intY, h, k, a, b, phi);
        }
    }
    
    // Fallback to improved binary search if analytical method fails
    else if (crossesBoundary || isNearBoundary) {
        const binarySearchResult = improvedBinarySearch(ray, h, k, a, b, phi, raySpeed, currentDist);
        
        if (binarySearchResult) {
            const { x: intX, y: intY } = binarySearchResult;
            
            // Apply masking logic - FIXED: proper masking conditions
            if (ellipse === "Upper" && isPointAboveMaskLine(intX, intY, maskLine)) {
                return null; // Point is below mask line for upper ellipse, ignore
            } else if (ellipse === "Lower" && !isPointAboveMaskLine(intX, intY, maskLine)) {
                return null; // Point is above mask line for lower ellipse, ignore
            }
            
            // Update ray position
            ray.x = intX;
            ray.y = intY;
            
            return calculateEllipseNormal(intX, intY, h, k, a, b, phi);
        }
    }
    
    return null;
}

function findAnalyticalIntersection(ray, h, k, a, b, phi, raySpeed) {
    // Transform ray to ellipse coordinate system
    const cos_phi = Math.cos(phi);
    const sin_phi = Math.sin(phi);
    
    // Ray origin relative to ellipse center
    const ox = ray.x - h;
    const oy = ray.y - k;
    
    // Ray direction
    const dx = ray.dx * raySpeed;
    const dy = ray.dy * raySpeed;
    
    // Rotate to align with ellipse axes
    const rx = ox * cos_phi + oy * sin_phi;
    const ry = -ox * sin_phi + oy * cos_phi;
    const rdx = dx * cos_phi + dy * sin_phi;
    const rdy = -dx * sin_phi + dy * cos_phi;
    
    // Solve quadratic equation: ((rx + t*rdx)/a)² + ((ry + t*rdy)/b)² = 1
    const A = (rdx * rdx) / (a * a) + (rdy * rdy) / (b * b);
    const B = 2 * ((rx * rdx) / (a * a) + (ry * rdy) / (b * b));
    const C = (rx * rx) / (a * a) + (ry * ry) / (b * b) - 1;
    
    const discriminant = B * B - 4 * A * C;
    
    if (discriminant < 0 || Math.abs(A) < 1e-10) {
        return null; // No intersection or ray parallel to ellipse
    }
    
    const sqrt_disc = Math.sqrt(discriminant);
    const t1 = (-B - sqrt_disc) / (2 * A);
    const t2 = (-B + sqrt_disc) / (2 * A);
    
    // Choose the appropriate intersection point
    let t = null;
    if (t1 >= 0 && t1 <= 1) {
        t = t1;
    } else if (t2 >= 0 && t2 <= 1) {
        t = t2;
    } else if (t1 > 0 && t1 < t2) {
        t = t1; // Closest forward intersection
    } else if (t2 > 0) {
        t = t2;
    }
    
    if (t === null) return null;
    
    // Calculate intersection point
    const intX = ray.x + dx * t;
    const intY = ray.y + dy * t;
    
    return { x: intX, y: intY, t };
}

function improvedBinarySearch(ray, h, k, a, b, phi, raySpeed, currentDist) {
    const EPSILON = 1e-6;
    const MAX_ITERATIONS = 25;
    const DISTANCE_THRESHOLD = 0.05;
    
    let t1 = 0;
    let t2 = 1;
    let bestT = null;
    let bestDist = Infinity;
    
    // Adaptive binary search with best-point tracking
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const t = (t1 + t2) / 2;
        const testX = ray.x + ray.dx * raySpeed * t;
        const testY = ray.y + ray.dy * raySpeed * t;
        const testDist = getDistanceToEllipse(testX, testY, h, k, a, b, phi);
        
        // Track the best point found so far
        const absDist = Math.abs(testDist);
        if (absDist < bestDist) {
            bestDist = absDist;
            bestT = t;
        }
        
        // Check for convergence
        if (absDist < DISTANCE_THRESHOLD) {
            return {
                x: testX,
                y: testY,
                t: t
            };
        }
        
        // Improve search bounds
        if (Math.abs(t2 - t1) < EPSILON) {
            break; // Converged
        }
        
        // Choose search direction based on sign comparison
        if (Math.sign(testDist) === Math.sign(currentDist)) {
            t1 = t;
        } else {
            t2 = t;
        }
    }
    
    // Return best point found if within reasonable threshold
    if (bestT !== null && bestDist < raySpeed) {
        const bestX = ray.x + ray.dx * raySpeed * bestT;
        const bestY = ray.y + ray.dy * raySpeed * bestT;
        return {
            x: bestX,
            y: bestY,
            t: bestT
        };
    }
    
    return null;
}

// Alternative intersection check for very fast rays
function checkFastRayIntersection(ray, h, k, a, b, phi, maskLine, ellipse, numSubSteps = 5) {
    const stepSize = raySpeed / numSubSteps;
    
    for (let i = 0; i < numSubSteps; i++) {
        const subRay = {
            x: ray.x + ray.dx * stepSize * i,
            y: ray.y + ray.dy * stepSize * i,
            dx: ray.dx,
            dy: ray.dy
        };
        
        // Use smaller step size for this sub-ray
        const originalRaySpeed = raySpeed;
        raySpeed = stepSize;
        
        const result = checkSingleEllipseIntersection(subRay, h, k, a, b, phi, maskLine, ellipse);
        
        raySpeed = originalRaySpeed; // Restore original speed
        
        if (result) {
            // Update original ray position
            ray.x = subRay.x;
            ray.y = subRay.y;
            return result;
        }
    }
    
    return null;
}

function getDistanceToEllipse(x, y, h, k, a, b, phi) {
    // Translate point to ellipse center
    const dx = x - h;
    const dy = y - k;
    
    // For rotated ellipse, apply rotation transformation
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    
    // Rotate point to align with ellipse axes
    const xRot = cosPhi * dx + sinPhi * dy;
    const yRot = -sinPhi * dx + cosPhi * dy;
    
    // Apply ellipse equation
    const ellipseValue = (xRot * xRot) / (a * a) + (yRot * yRot) / (b * b) - 1;
    
    return ellipseValue;
}

function calculateEllipseNormal(x, y, h, k, a, b, phi) {
    // Transform point to ellipse coordinate system
    const dx = x - h;
    const dy = y - k;
    
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    
    const xRot = dx * cosPhi + dy * sinPhi;
    const yRot = -dx * sinPhi + dy * cosPhi;
    
    // Calculate normal in ellipse coordinate system
    let normalX = (2 * xRot) / (a * a);
    let normalY = (2 * yRot) / (b * b);
    
    const normalMag = Math.sqrt(normalX * normalX + normalY * normalY);
    if (normalMag > 0) {
        normalX /= normalMag;
        normalY /= normalMag;
    }
    
    // Rotate normal back to world coordinates
    const worldNormalX = normalX * cosPhi - normalY * sinPhi;
    const worldNormalY = normalX * sinPhi + normalY * cosPhi;
    
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

