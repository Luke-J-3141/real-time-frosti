// histogram-rectangle-overlay.js
// Simple and efficient approach - direct termination data coloring
// Fixed positioning: rectangle appears on surface and extends into material

class HistogramRectangleOverlay {
    constructor(pixelsPerMM = 1) {
        this.PIXELS_PER_MM = pixelsPerMM;
        
        // Rectangle dimensions in mm
        this.RECT_WIDTH_MM = 200;
        this.RECT_HEIGHT_MM = 340;
        
        // Simple configuration
        this.config = {
            baseColor: { r: 173, g: 216, b: 230, a: 0.3 }, // Light blue base
            edgeColor: 'rgba(100, 149, 237, 0.8)',
            edgeWidth: 2,
            tintStrength: 0.2,  // How strong the hit color tint is
            localRadius: 8,     // Radius in mm for local color influence
            visible: true
        };
        
        this.isEnabled = true;
    }
    
    // Convert mm to world coordinates
    mmToWorldUnits(mm) {
        return mm * this.PIXELS_PER_MM * 100;
    }
    
    // Get hit color based on intensity (same as histogram bars)
    getHitColor(intensity) {
        const r = Math.round(255 * intensity);
        const g = Math.round(0 + (50 - 0) * (1 - intensity));
        const b = Math.round(0 + (50 - 0) * (1 - intensity));
        return { r, g, b };
    }
    
    // Calculate local color tint at a specific position (radial from hit points)
    getLocalColorTint(worldX, worldY, stats) {
        if (!stats || stats.distribution.size === 0) {
            return this.config.baseColor;
        }
        
        const localRadiusWorld = this.mmToWorldUnits(this.config.localRadius);
        const maxCount = stats.maxCount;
        
        let totalTint = { r: 0, g: 0, b: 0 };
        let totalWeight = 0;
        
        // Check all bins within radial distance
        for (const [binY, count] of stats.distribution) {
            if (count === 0) continue;
            
            // Calculate radial distance from hit point (binY) to current position
            // Hit occurs at center of rectangle (x=0) at height binY
            const hitX = 0; // Hits occur at center of rectangle
            const hitY = binY;
            
            const deltaX = worldX - hitX;
            const deltaY = worldY - hitY;
            const radialDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (radialDistance > localRadiusWorld) continue;
            
            // Simple linear radial falloff
            const weight = Math.max(0, 1 - (radialDistance / localRadiusWorld));
            const intensity = count / maxCount;
            const hitColor = this.getHitColor(intensity);
            
            totalTint.r += hitColor.r * weight * intensity;
            totalTint.g += hitColor.g * weight * intensity;
            totalTint.b += hitColor.b * weight * intensity;
            totalWeight += weight * intensity;
        }
        
        if (totalWeight === 0) {
            return this.config.baseColor;
        }
        
        // Blend tint with base color
        const baseColor = this.config.baseColor;
        const tintStrength = Math.min(totalWeight * this.config.tintStrength, 1);
        
        const avgTint = {
            r: totalTint.r / totalWeight,
            g: totalTint.g / totalWeight,
            b: totalTint.b / totalWeight
        };
        
        return {
            r: Math.round(baseColor.r + (avgTint.r - baseColor.r) * tintStrength),
            g: Math.round(baseColor.g + (avgTint.g - baseColor.g) * tintStrength),
            b: Math.round(baseColor.b + (avgTint.b - baseColor.b) * tintStrength),
            a: baseColor.a
        };
    }
    
    // Main rendering function - simple and fast
    render(ctx, stats, zoomLevel, panX, panY) {
        if (!this.isEnabled || !this.config.visible) return;
        
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        
        ctx.save();
        ctx.setTransform(
            zoomLevel, 0, 0, -zoomLevel,  // Flip Y-axis by negating zoomLevel
            panX + canvasWidth/2, panY + canvasHeight/2
        );
        
        // Calculate rectangle dimensions in world coordinates
        const rectWidthWorld = this.mmToWorldUnits(this.RECT_WIDTH_MM);
        const rectHeightWorld = this.mmToWorldUnits(this.RECT_HEIGHT_MM);
        
        // FIXED POSITIONING: Place rectangle on surface (right edge at x=0, extending left into material)
        const rectX = -rectWidthWorld;  // Rectangle extends from -width to 0 (surface)
        const rectY = -rectHeightWorld / 2;  // Still centered vertically
        const rectWidth = rectWidthWorld;
        const rectHeight = rectHeightWorld;
        
        // If no stats, just draw base rectangle
        if (!stats || stats.distribution.size === 0) {
            const baseColor = this.config.baseColor;
            ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${baseColor.a})`;
            ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        } else {
            // For radial coloring, we need to sample in 2D grid instead of just vertical gradient
            // Create image data for pixel-level control
            const rectWidthWorld = this.mmToWorldUnits(this.RECT_WIDTH_MM);
            const rectHeightWorld = this.mmToWorldUnits(this.RECT_HEIGHT_MM);
            
            // Sample resolution - balance between quality and performance
            const sampleWidth = 60;  // Horizontal samples
            const sampleHeight = 60; // Vertical samples
            
            // Create temporary canvas for the colored rectangle
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = sampleWidth;
            tempCanvas.height = sampleHeight;
            const tempCtx = tempCanvas.getContext('2d');
            const imageData = tempCtx.createImageData(sampleWidth, sampleHeight);
            
            // Fill image data with radially colored pixels
            for (let y = 0; y < sampleHeight; y++) {
                for (let x = 0; x < sampleWidth; x++) {
                    // Convert pixel coordinates to world coordinates
                    // Map x from [0, sampleWidth] to [-rectWidthWorld, 0] (surface-aligned)
                    const worldX = (x / sampleWidth) * rectWidthWorld - rectWidthWorld;
                    const worldY = (y / sampleHeight - 0.5) * rectHeightWorld;
                    
                    const color = this.getLocalColorTint(worldX, worldY, stats);
                    
                    const index = (y * sampleWidth + x) * 4;
                    imageData.data[index] = color.r;     // Red
                    imageData.data[index + 1] = color.g; // Green
                    imageData.data[index + 2] = color.b; // Blue
                    imageData.data[index + 3] = Math.round(color.a * 255); // Alpha
                }
            }
            
            // Put the image data on temporary canvas
            tempCtx.putImageData(imageData, 0, 0);
            
            // Draw the temporary canvas stretched to fill the rectangle
            ctx.drawImage(tempCanvas, rectX, rectY, rectWidthWorld, rectHeightWorld);
        }
        
        // Draw rectangle border
        ctx.strokeStyle = this.config.edgeColor;
        ctx.lineWidth = this.config.edgeWidth;
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        
        ctx.restore();
    }
    
    // Configuration methods
    setPixelsPerMM(pixelsPerMM) {
        this.PIXELS_PER_MM = pixelsPerMM;
    }
    
    setRectangleDimensions(widthMM, heightMM) {
        this.RECT_WIDTH_MM = widthMM;
        this.RECT_HEIGHT_MM = heightMM;
    }
    
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
    }
    
    // Adjust how localized the color tinting is
    setLocalRadius(radiusMM) {
        this.config.localRadius = radiusMM;
    }
    
    // Adjust how strong the color tint is
    setTintStrength(strength) {
        this.config.tintStrength = Math.max(0, Math.min(1, strength));
    }
    
    toggle() {
        this.config.visible = !this.config.visible;
    }
    
    enable() {
        this.isEnabled = true;
    }
    
    disable() {
        this.isEnabled = false;
    }
}

// Create global instance
window.histogramRectangleOverlay = new HistogramRectangleOverlay(window.PIXELS_PER_MM || 1);

// Simple integration function
function renderHistogramRectangle(ctx, zoomLevel, panX, panY) {
    const stats = typeof getTerminationStats === 'function' ? getTerminationStats() : null;
    window.histogramRectangleOverlay.render(ctx, stats, zoomLevel, panX, panY);
}

// Simple keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') {
        window.histogramRectangleOverlay.toggle();
        console.log('Histogram rectangle overlay:', window.histogramRectangleOverlay.config.visible ? 'ON' : 'OFF');
    }
    
    // Adjust local radius
    if (e.key === '-' || e.key === '_') {
        const currentRadius = window.histogramRectangleOverlay.config.localRadius;
        window.histogramRectangleOverlay.setLocalRadius(Math.max(2, currentRadius - 2));
        console.log('Local radius:', window.histogramRectangleOverlay.config.localRadius + 'mm');
    }
    
    if (e.key === '=' || e.key === '+') {
        const currentRadius = window.histogramRectangleOverlay.config.localRadius;
        window.histogramRectangleOverlay.setLocalRadius(Math.min(30, currentRadius + 2));
        console.log('Local radius:', window.histogramRectangleOverlay.config.localRadius + 'mm');
    }
    
    // Adjust tint strength
    if (e.key === '[') {
        const currentStrength = window.histogramRectangleOverlay.config.tintStrength;
        window.histogramRectangleOverlay.setTintStrength(currentStrength - 0.1);
        console.log('Tint strength:', window.histogramRectangleOverlay.config.tintStrength.toFixed(1));
    }
    
    if (e.key === ']') {
        const currentStrength = window.histogramRectangleOverlay.config.tintStrength;
        window.histogramRectangleOverlay.setTintStrength(currentStrength + 0.1);
        console.log('Tint strength:', window.histogramRectangleOverlay.config.tintStrength.toFixed(1));
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistogramRectangleOverlay;
}