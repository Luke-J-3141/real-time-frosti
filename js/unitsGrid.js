/**
 * GRID AND UNITS SYSTEM
 * 
 * This module provides a hierarchical grid system with unit conversion utilities for precise
 * measurement and visualization. The grid uses adaptive level-of-detail rendering optimized
 * for zoom ranges from 1% to 5000%, with automatic opacity and line weight adjustments.
 * 
 * UNIT CONVERSION:
 * - PIXELS_PER_MM: 100 (conversion constant)
 * - MM_PER_PIXEL: 0.01 (inverse conversion)
 * 
 * CONVERSION FUNCTIONS:
 * 
 * mmToPx(mm)
 *   - Converts millimeters to pixels using the global scale
 *   - Returns: number (pixels)
 * 
 * pxTomm(px)
 *   - Converts pixels to millimeters using the global scale
 *   - Returns: number (millimeters)
 * 
 * GRID SYSTEM:
 * 
 * GRID_LEVELS Configuration:
 *   - 5 hierarchical levels: 15mm, 5mm, 1mm, 0.2mm, 0.04mm spacing
 *   - Each level has: spacing, minZoom, maxZoom, opacity, lineWidth
 *   - Optimized for 25% to 500% zoom range (TODO: needs tweaking)
 *   - Automatic fade-in/fade-out based on zoom level
 * 
 * drawGrid(ctx)
 *   - Renders the hierarchical grid system with proper coordinate transforms
 *   - Calculates visible area to optimize drawing performance
 *   - Draws only grid levels within current zoom range
 *   - Renders coordinate axes (x=0, y=0) with thicker lines
 *   - Applies zoom-compensated line widths for consistent appearance
 *   - Returns: void
 * 
 * updateZoomInfo() [ENHANCED VERSION]
 *   - Updates UI with zoom percentage, pixel scale, and current grid resolution
 *   - Shows finest visible grid level in millimeters
 *   - Displays actual scale in pixels per centimeter
 *   - Returns: void
 * 
 * GRID LEVEL DETAILS:
 * - Level 0: 15mm (1.5cm) - Coarse overview grid
 * - Level 1: 5mm (0.5cm) - Medium detail grid
 * - Level 2: 1mm - Fine detail grid
 * - Level 3: 0.2mm - Very fine detail grid
 * - Level 4: 0.04mm - Ultra-fine detail grid
 * 
 * INTEGRATION NOTES:
 * - Requires zoomLevel, panX, panY, centerX, centerY globals from viewport system
 * - Call drawGrid(ctx) in your main render loop before drawing geometry
 * - Grid provides visual reference for precise measurements
 * - Use mmToPx/pxTomm for converting between design units and screen coordinates
 * - Grid levels automatically adjust opacity and visibility based on zoom
 * - Performance optimized by only drawing visible grid lines
 */
// Unit conversion constants
const PIXELS_PER_MM = 100;
const MM_PER_PIXEL = 1 / PIXELS_PER_MM;

// Unit conversion functions
function mmToPx(mm) {
    return mm * PIXELS_PER_MM;
}

function pxTomm(px) {
    return px * MM_PER_PIXEL;
}

// Grid configuration - hierarchical subdivision optimized for 25% to 500% zoom range
// TO DO: Needs some tweeking for optimal performance
const GRID_LEVELS = [
    { spacing: PIXELS_PER_MM * 15,  minZoom: 0.01, maxZoom: 0.2,  opacity: 0.4, lineWidth: 0.2 }, // 5cm  
    { spacing: PIXELS_PER_MM * 5,  minZoom: 0.1,  maxZoom: 0.5,  opacity: 0.4, lineWidth: 0.2 }, // 2cm
    { spacing: PIXELS_PER_MM,      minZoom: 0.4,  maxZoom: 0.8,  opacity: 0.5, lineWidth: 0.2 }, // 1cm
    { spacing: PIXELS_PER_MM / 5,  minZoom: 0.6,  maxZoom: 5.0,  opacity: 0.4, lineWidth: 0.3 }, // 5mm
    { spacing: PIXELS_PER_MM / 25, minZoom: 3.0,  maxZoom: 90.0,  opacity: 0.3, lineWidth: 0.2 }  // 1mm
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