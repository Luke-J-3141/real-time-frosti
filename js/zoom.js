/**
 * VIEWPORT CONTROLS SYSTEM
 * 
 * This module provides camera controls for a 2D canvas including zoom, pan, and auto-centering
 * functionality. It handles coordinate transformations between screen and world space and
 * provides smooth zooming centered on cursor position.
 * 
 * GLOBAL STATE:
 * - zoomLevel: Current zoom multiplier (0.01 minimum, no upper limit)
 * - panX, panY: Camera offset in screen coordinates
 * - canvasWidth, canvasHeight: Canvas dimensions for calculations
 * 
 * CORE FUNCTIONS:
 * 
 * autoCenter()
 *   - Automatically centers and zooms the view to fit all geometry (ellipses + source line)
 *   - Calculates optimal zoom with 20% padding, capped at 5x for auto-center
 *   - Updates pan to center geometry in viewport
 *   - Returns: void
 * 
 * screenToWorld(screenX, screenY)
 *   - Converts screen/canvas coordinates to world coordinates
 *   - Accounts for current zoom and pan transformations
 *   - Returns: object {x, y} in world coordinates
 * 
 * zoomAtCursor(cursorX, cursorY, zoomFactor)
 *   - Zooms in/out while keeping cursor position fixed in world space
 *   - Prevents zoom levels below 1% to avoid display issues
 *   - Automatically updates display and zoom info
 *   - Returns: void
 * 
 * updateZoomInfo()
 *   - Updates UI display with current zoom percentage and pan instructions
 *   - Returns: void
 * 
 * setZoom(newZoom)
 *   - Sets absolute zoom level with minimum 1% constraint
 *   - Triggers display update
 *   - Returns: void
 * 
 * handleMouseWheel(event)
 *   - Mouse wheel event handler for smooth zooming
 *   - Zooms at cursor position with 10% increments
 *   - Prevents default scroll behavior
 *   - Returns: void
 * 
 * COORDINATE SYSTEM:
 * - World coordinates: Actual geometry coordinates (can be negative)
 * - Screen coordinates: Canvas pixel coordinates (0,0 at top-left)
 * - Transformations: worldX = (screenX - panX) / zoomLevel
 * 
 * INTEGRATION NOTES:
 * - Requires canvas element and zoomInfo UI element
 * - Call autoCenter() after geometry changes to reframe view
 * - Use screenToWorld() for mouse interaction with world objects
 * - Mouse wheel listener is automatically attached to canvas
 * - Works with ellipse geometry system (requires getEllipseConstants, computeSourceLine)
 */

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
    zoomLevel = Math.min(zoomX, zoomY, 5); // Cap at 5x zoom for auto-center
    
    // Set pan to center the geometry
    panX = -centerWorldX * zoomLevel;
    panY = centerWorldY * zoomLevel;
    
    updateZoomInfo();
}

// Convert screen coordinates to world coordinates
function screenToWorld(screenX, screenY) {
    const worldX = (screenX - panX) / zoomLevel;
    const worldY = (screenY - panY) / zoomLevel; 
    return { x: worldX, y: worldY };
}

// Zoom on cursor position with unlimited zoom - FIXED VERSION
function zoomAtCursor(cursorX, cursorY, zoomFactor) {
    // Get world coordinates of cursor position before zoom
    const worldPos = screenToWorld(cursorX, cursorY);
    
    // Apply zoom
    zoomLevel = Math.max(0.01, zoomLevel * zoomFactor); // Minimum zoom of 1% to prevent issues
    
    // Calculate new pan to keep cursor position fixed in world coordinates
    // The cursor should map to the same world position after zoom
    panX = cursorX - worldPos.x * zoomLevel;
    panY = cursorY - worldPos.y * zoomLevel; 
    
    updateZoomInfo();
    redraw();
}

// Zoom and pan controls
function updateZoomInfo() {
    const zoomPercent = Math.round(zoomLevel * 100);
    document.getElementById('zoomInfo').textContent = 
        `Zoom: ${zoomPercent}% | Pan: Drag to move`;
}

function setZoom(newZoom) {
    zoomLevel = Math.max(0.01, newZoom); // Remove upper limit, keep minimum at 1%
    updateZoomInfo();
    redraw();
}

// Mouse wheel zoom handler
function handleMouseWheel(event) {
    event.preventDefault();
    
    // Get cursor position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const cursorX = event.clientX - rect.right;
    const cursorY = event.clientY - rect.top;
    
    // Determine zoom factor
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1; // Zoom out/in by 10%
    
    zoomAtCursor(cursorX, cursorY, zoomFactor);
}

// Make sure to add the event listener
canvas.addEventListener('wheel', handleMouseWheel, { passive: false });