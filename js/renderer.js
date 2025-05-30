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

function drawReflectors() {
    const { ht, hl, kt, kl, ct, cl, dt, dl, phit, phil, slopet, slopel, interseptt, interseptl } = getEllipseConstants();

    ctx.strokeStyle = '#FFD700'; // Gold color
    ctx.lineWidth = Math.min(3, Math.max(0.5, 2 / zoomLevel)); // Dynamic width with upper limit of 3

    // Get mask lines
    const upperMask = getUpperEllipseMaskLine();
    const lowerMask = getLowerEllipseMaskLine();
    
    // Get source plane position (you'll need to get this from your source configuration)

    function drawMaskedEllipse(h, k, a, b, phi, maskLine, drawBelow = true) {
        ctx.beginPath();
        
        const steps = 200;
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
            
            // Point must satisfy both conditions
            const shouldDraw = shouldDrawMask && shouldDrawSourcePlane;

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
    drawMaskedEllipse(ht, kt, ct, dt, phit, upperMask, false); // false = draw above mask
    
    // Draw lower ellipse below its mask line and left of source plane
    drawMaskedEllipse(hl, kl, cl, dl, phil, lowerMask, true);  // true = draw below mask
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
            ctx.lineWidth = Math.min(3, Math.max(0.5, 1.5 / zoomLevel));    ctx.globalAlpha = opacity;
            
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
//render
function drawSource() {
    const { x1, y1, x2, y2 } = computeSourceLine();

    ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = Math.min(3, Math.max(0.5, 3 / zoomLevel));
    
    const screen1 = worldToScreen(x1, y1);
    const screen2 = worldToScreen(x2, y2);
    
    ctx.beginPath();
    ctx.moveTo(screen1.x, screen1.y);
    ctx.lineTo(screen2.x, screen2.y);
    ctx.stroke();

}
//render
function drawDiagonalLines_UC() {
    const { slopet, slopel, interseptt, interseptl } = getEllipseConstants();
    
    ctx.strokeStyle = '#8B00FF';
    ctx.lineWidth = Math.min(3, Math.max(0.5, 1 / zoomLevel));
    ctx.setLineDash([5 / zoomLevel, 5 / zoomLevel]);
    
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


function redraw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);  
    
    renderHistogramOverlay(ctx, terminationBounds);
    drawReflectors();
    drawRays();
    drawSource();
    drawDiagonalLines_UC();
   
}

// Auto-center the view on the geometry
function autoCenter() {
    const { ht, hl, kt, kl, ct, cl, dt, dl } = getEllipseConstants();
    const sourceCoords = computeSourceLine();
    
    // Calculate bounds of all geometry
    const allX = [ht - ct, ht + ct, hl - cl, hl + cl, sourceCoords.x1, sourceCoords.x2];
    const allY = [kt - dt, kt + dt, kl - dl, kl + dl, sourceCoords.y1, sourceCoords.y2];
    
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    
    // Calculate center of geometry
    const centerWorldX = (minX + maxX) / 2;
    const centerWorldY = (minY + maxY) / 2;
    
    // Calculate required zoom to fit everything with some padding
    const geometryWidth = maxX - minX;
    const geometryHeight = maxY - minY;
    const padding = 1.2; // 20% padding
    
    const zoomX = canvasWidth / (geometryWidth * padding);
    const zoomY = canvasHeight / (geometryHeight * padding);
    zoomLevel = Math.min(zoomX, zoomY, 5); // Cap at 5x zoom
    
    // Set pan to center the geometry
    panX = -centerWorldX * zoomLevel;
    panY = centerWorldY * zoomLevel;
    
    updateZoomInfo();
}