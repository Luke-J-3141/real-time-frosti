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
    
    // Check if ray crosses the ellipse between current and next position
    const currentDist = getDistanceToEllipse(ray.x, ray.y, h, k, a, b, phi);
    const nextDist = getDistanceToEllipse(nextX, nextY, h, k, a, b, phi);
    
    // Intersection occurs when we cross from outside to inside or vice versa
    if (Math.sign(currentDist) !== Math.sign(nextDist) && Math.abs(currentDist) < raySpeed * 2) {
        // Calculate intersection point using binary search
        let t1 = 0, t2 = 1;
        let intersectionFound = false;
        let intersectionX, intersectionY;
        
        for (let i = 0; i < 10; i++) {
            const t = (t1 + t2) / 2;
            const testX = ray.x + ray.dx * raySpeed * t;
            const testY = ray.y + ray.dy * raySpeed * t;
            const testDist = getDistanceToEllipse(testX, testY, h, k, a, b, phi);
            
            if (Math.abs(testDist) < 0.5) {
                // Found intersection point
                intersectionX = testX;
                intersectionY = testY;
                intersectionFound = true;
                break;
            }
            
            if (Math.sign(testDist) === Math.sign(currentDist)) {
                t1 = t;
            } else {
                t2 = t;
            }
        }
        
        if (intersectionFound) {
            if (ellipse === "Upper"){
                // Check if intersection point is above the mask line (if so, ignore it)
                if (isPointAboveMaskLine(intersectionX, intersectionY, maskLine)) {
                    return null; // Point is masked, no reflection
                }
            } else if (ellipse === "Lower") {
                // Check if intersection point is above the mask line (if so, ignore it)
                if (!isPointAboveMaskLine(intersectionX, intersectionY, maskLine)) {
                    return null; // Point is masked, no reflection
                }
            }
            // Update ray position to intersection point
            ray.x = intersectionX;
            ray.y = intersectionY;
            
            // Calculate normal at intersection point
            return calculateEllipseNormal(ray.x, ray.y, h, k, a, b, phi);
        }
    }
    
    return null;
}

// Define masking lines for each ellipse
function getUpperEllipseMaskLine() {
    const { slopet, interseptt} = getEllipseConstants();
    
    return {
        slope: slopet,
        intercept: interseptt, // y-intercept
    };
}

function getLowerEllipseMaskLine() {
    const {slopel, interseptl} = getEllipseConstants();
    
    return {
        slope: slopel, 
        intercept: interseptl, // y-intercept
    };
}

function isPointAboveMaskLine(x, y, maskLine) {
    // Line equation: y = slope * x + intercept
    const lineY = maskLine.slope * x + maskLine.intercept;
    return y < lineY; // Point is above the line

}
function isPointBelowMaskLine(x, y, maskLine) {
    // Line equation: y = slope * x + intercept
    const lineY = maskLine.slope * x + maskLine.intercept;
    return y > lineY; // Point is above the line

}


// Rest of your existing functions remain the same
function getDistanceToEllipse(x, y, h, k, a, b, phi) {
    // Transform point to ellipse coordinate system
    const dx = x - h;
    const dy = y - k;
    
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    
    // Rotate to align with ellipse axes
    const xRot = dx * cosPhi + dy * sinPhi;
    const yRot = -dx * sinPhi + dy * cosPhi;
    
    // Calculate distance to ellipse (negative inside, positive outside)
    const ellipseValue = (xRot * xRot) / (a * a) + (yRot * yRot) / (b * b);
    return ellipseValue - 1;
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

