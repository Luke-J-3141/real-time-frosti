// Unit conversion constants
const PIXELS_PER_CM = 100;
const CM_PER_PIXEL = 1 / PIXELS_PER_CM;

// Unit conversion functions
function mmToPx(cm) {
    return cm * PIXELS_PER_CM;
}

function pxTomm(px) {
    return px * CM_PER_PIXEL;
}

// Grid configuration - hierarchical subdivision optimized for 25% to 500% zoom range
// TO DO: Needs some tweeking for optimal performance
const GRID_LEVELS = [
    { spacing: PIXELS_PER_CM * 15,  minZoom: 0.2, maxZoom: 0.5,  opacity: 0.7, lineWidth: 0.6 }, // 5cm  
    { spacing: PIXELS_PER_CM * 5,  minZoom: 0.4,  maxZoom: 1.0,  opacity: 0.6, lineWidth: 0.5 }, // 2cm
    { spacing: PIXELS_PER_CM,      minZoom: 0.8,  maxZoom: 2.0,  opacity: 0.5, lineWidth: 0.4 }, // 1cm
    { spacing: PIXELS_PER_CM / 5,  minZoom: 1.5,  maxZoom: 5.0,  opacity: 0.4, lineWidth: 0.3 }, // 5mm
    { spacing: PIXELS_PER_CM / 25, minZoom: 3.0,  maxZoom: 5.0,  opacity: 0.3, lineWidth: 0.2 }  // 1mm
];

// Add grid drawing function for reference
function drawGrid(ctx) {
    ctx.save();
    
    // Transform for zoom and pan
    ctx.setTransform(zoomLevel, 0, 0, zoomLevel, centerX + panX, centerY + panY);
    
    // Calculate visible area in world coordinates
    const viewWidth = canvasWidth / zoomLevel;
    const viewHeight = canvasHeight / zoomLevel;
    const minX = -centerX - panX / zoomLevel - viewWidth / 2;
    const maxX = centerX - panX / zoomLevel + viewWidth / 2;
    const minY = -centerY - panY / zoomLevel - viewHeight / 2;
    const maxY = centerY - panY / zoomLevel + viewHeight / 2;
    
    // Draw grid levels from coarsest to finest, but only within zoom range
    GRID_LEVELS.forEach(level => {
        if (zoomLevel >= level.minZoom && zoomLevel <= level.maxZoom) {
            ctx.strokeStyle = `rgba(180, 180, 180, ${level.opacity})`;
            ctx.lineWidth = level.lineWidth / zoomLevel;
            ctx.beginPath();
            
            // Vertical lines
            for (let x = Math.floor(minX / level.spacing) * level.spacing; x <= maxX; x += level.spacing) {
                ctx.moveTo(x, minY);
                ctx.lineTo(x, maxY);
            }
            
            // Horizontal lines
            for (let y = Math.floor(minY / level.spacing) * level.spacing; y <= maxY; y += level.spacing) {
                ctx.moveTo(minX, y);
                ctx.lineTo(maxX, y);
            }
            
            ctx.stroke();
        }
    });
    
    // Draw axes (thicker lines at x=0 and y=0)
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.lineWidth = 3 / zoomLevel;
    ctx.beginPath();
    // Y-axis
    ctx.moveTo(0, minY);
    ctx.lineTo(0, maxY);
    // X-axis
    ctx.moveTo(minX, 0);
    ctx.lineTo(maxX, 0);
    ctx.stroke();
    
    ctx.restore();
}

// Update zoom info to show scale and current grid level
function updateZoomInfo() {
    const zoomInfo = document.getElementById('zoomInfo');
    const actualScale = (zoomLevel * PIXELS_PER_CM).toFixed(1);
    
    // Find the finest grid level currently visible
    const visibleLevels = GRID_LEVELS.filter(level => zoomLevel >= level.minZoom);
    const finestGrid = visibleLevels.length > 0 ? visibleLevels[0] : GRID_LEVELS[GRID_LEVELS.length - 1];
    const gridSize = (finestGrid.spacing / PIXELS_PER_CM * 10).toFixed(1); // Convert to mm
    
    zoomInfo.textContent = `Zoom: ${(zoomLevel * 100).toFixed(0)}% | Scale: ${actualScale} px/cm | Grid: ${gridSize}mm | Pan: Drag to move`;
}