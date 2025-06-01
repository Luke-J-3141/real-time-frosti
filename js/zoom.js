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

// Zoom and pan controls
function updateZoomInfo() {
    const zoomPercent = Math.round(zoomLevel * 100);
    document.getElementById('zoomInfo').textContent = 
        `Zoom: ${zoomPercent}% | Pan: Drag to move`;
}

function setZoom(newZoom) {
    zoomLevel = Math.max(0.5, Math.min(3, newZoom));
    updateZoomInfo();
    redraw();
    
}