/**
 * HISTOGRAM RECTANGLE OVERLAY SYSTEM
 * 
 * This system provides a heat diffusion visualization overlay that displays ray termination
 * statistics as a color-coded heat map on a rectangular surface. The overlay uses dynamic
 * range scaling and real-time heat diffusion calculations to visualize impact patterns.
 * 
 * CLASS: HistogramRectangleOverlay
 * 
 * CONSTRUCTOR:
 * - HistogramRectangleOverlay(pixelsPerMM = 1)
 *   Creates overlay instance with unit conversion support
 * 
 * CONFIGURATION:
 * - Rectangle: 200mm × 340mm, positioned with right edge at x=0 (extends into material)
 * - Heat colors: Blue (cold) → Cyan → Green → Yellow → Red (hot)
 * - Dynamic range scaling based on accumulated hit statistics
 * - Configurable diffusion rate, decay rate, transparency, and growth parameters
 * 
 * CORE METHODS:
 * 
 * render(ctx, stats, zoomLevel, panX, panY)
 *   - Main rendering function that draws heat diffusion visualization
 *   - Takes termination statistics and viewport parameters
 *   - Creates high-resolution heat map using temporary canvas
 *   - Returns: void
 * 
 * updateDynamicRange(stats)
 *   - Updates heat intensity scaling based on current hit statistics
 *   - Adjusts maxHeatIntensity and diffusion radius dynamically
 *   - Enables real-time adaptation to varying hit densities
 *   - Returns: void
 * 
 * calculateHeatDiffusion(worldX, worldY, stats)
 *   - Calculates heat intensity at specific world coordinates
 *   - Uses exponential distance-based decay for realistic diffusion
 *   - Combines contributions from all hit locations
 *   - Returns: number (heat intensity)
 * 
 * getHeatColor(normalizedHeat)
 *   - Converts normalized heat value [0,1] to RGB color
 *   - Uses smooth gradient: Blue → Cyan → Green → Yellow → Red
 *   - Returns: object {r, g, b}
 * 
 * getFinalColor(heatIntensity)
 *   - Blends heat color with base color based on intensity
 *   - Applies transparency and color mixing
 *   - Returns: object {r, g, b, a}
 * 
 * CONFIGURATION METHODS:
 * 
 * setPixelsPerMM(pixelsPerMM) - Updates unit conversion factor
 * setRectangleDimensions(widthMM, heightMM) - Changes overlay size
 * updateConfig(newConfig) - Bulk configuration update
 * setDiffusionRate(rate) - Heat spread factor [0-1]
 * setHeatDecayRate(rate) - Distance decay factor [0-1] 
 * setRangeGrowthRate(rate) - Dynamic range growth speed [0.5-20]
 * setHeatTransparency(transparency) - Heat opacity [0-1]
 * 
 * UTILITY METHODS:
 * 
 * toggle() - Toggles overlay visibility
 * enable()/disable() - Controls overlay rendering
 * resetHeat() - Clears accumulated heat data
 * getHeatStats() - Returns current heat statistics object
 * 
 * GLOBAL INTEGRATION:
 * 
 * renderTM(ctx, zoomLevel, panX, panY)
 *   - Simple integration function for rendering overlay
 *   - Automatically fetches termination statistics
 *   - Call this in your main render loop
 *   - Returns: void
 * 
 * KEYBOARD CONTROLS:
 * - 'T': Toggle overlay visibility
 * - '+/-': Adjust diffusion rate
 * - '[/]': Adjust heat decay rate  
 * - ',/.': Adjust range growth rate
 * - 'O/P': Adjust heat transparency
 * - 'R': Reset heat accumulation
 * - 'H': Show heat statistics in console
 * 
 * INTEGRATION NOTES:
 * - Requires termination statistics from getTerminationStats() function
 * - Uses binned Y-position data for heat source locations
 * - Positioned with right edge at x=0, extending left into material
 * - Heat diffusion radius grows dynamically with accumulated hits
 * - Global instance available as window.histogramRectangleOverlay
 * - Compatible with viewport zoom/pan system
 * - Performance optimized with configurable resolution (80×80 default)
 */


class ThermalOverlay {
    constructor(pixelsPerMM = 1) {
        this.PIXELS_PER_MM = pixelsPerMM;
        
        // Rectangle dimensions in mm
        this.RECT_WIDTH_MM = 200;
        this.RECT_HEIGHT_MM = 340;
        
        // Heat diffusion configuration
        this.config = {
            baseColor: { r: 120, g: 180, b: 220, a: 0.1 }, // Light blue base (cold) - more visible on dark background
            edgeColor: 'rgba(150, 200, 255, 0.9)',
            edgeWidth: 2,
            maxHeatIntensity: 1.0,    // Will be dynamically adjusted
            diffusionRate: 0.6,       // How much heat spreads (0-1)
            heatDecayRate: 0.75,      // Heat decay over distance (0-1)
            localRadius: 15,          // Radius in mm for heat diffusion
            rangeGrowthRate: 10.0,     // Much faster range growth for real-time visibility
            heatTransparency: 0.5,    // Heat transparency factor (0-1)
            visible: true
        };
        
        this.isEnabled = true;
        this.totalHitCount = 0;       // Track total accumulated hits
        this.maxObservedCount = 0;    // Track maximum count seen
    }
    
    // Convert mm to world coordinates
    mmToWorldUnits(mm) {
        return mm * this.PIXELS_PER_MM * 100;
    }
    
    // Heat color gradient: Blue (cold) -> Green -> Yellow -> Orange -> Red (hot)
    getHeatColor(normalizedHeat) {
        // Clamp to [0, 1]
        normalizedHeat = Math.max(0, Math.min(1, normalizedHeat));
        
        let r, g, b;
        
        if (normalizedHeat < 0.25) {
            // Blue to Cyan (0 to 0.25) - more transparent
            const t = normalizedHeat / 0.25;
            r = Math.round(20 + (0 - 20) * t);
            g = Math.round(100 + (150 - 100) * t);
            b = Math.round(200 + (255 - 200) * t);
        } else if (normalizedHeat < 0.5) {
            // Cyan to Green (0.25 to 0.5) - more transparent
            const t = (normalizedHeat - 0.25) / 0.25;
            r = Math.round(0 + (50 - 0) * t);
            g = Math.round(150 + (255 - 150) * t);
            b = Math.round(255 + (100 - 255) * t);
        } else if (normalizedHeat < 0.75) {
            // Green to Yellow (0.5 to 0.75) - more transparent
            const t = (normalizedHeat - 0.5) / 0.25;
            r = Math.round(50 + (255 - 50) * t);
            g = Math.round(255);
            b = Math.round(100 + (50 - 100) * t);
        } else {
            // Yellow to Red (0.75 to 1.0) - more transparent
            const t = (normalizedHeat - 0.75) / 0.25;
            r = Math.round(255);
            g = Math.round(255 + (100 - 255) * t);
            b = Math.round(50 + (0 - 50) * t);
        }
        
        return { r, g, b };
    }
    
    // Update dynamic range based on hit statistics
    updateDynamicRange(stats) {
        if (!stats || stats.distribution.size === 0) {
            return;
        }
        
        // Calculate total hits in this frame
        let currentTotalHits = 0;
        let currentMaxCount = 0;
        
        for (const [binY, count] of stats.distribution) {
            currentTotalHits += count;
            currentMaxCount = Math.max(currentMaxCount, count);
        }
        
        // Update tracking variables
        this.totalHitCount = currentTotalHits;
        this.maxObservedCount = Math.max(this.maxObservedCount, currentMaxCount);
        
        // Dynamic range scaling - increases as more hits accumulate
        // Base range starts at 1, grows more aggressively for real-time visibility
        const baseRange = 1.0;
        const rangeMultiplier = Math.log(1 + this.totalHitCount * 0.1) * this.config.rangeGrowthRate; // Increased multiplier
        this.config.maxHeatIntensity = baseRange + rangeMultiplier;
        
        // Also adjust diffusion radius based on total activity (more aggressive growth)
        const baseDiffusionRadius = 15;
        const radiusMultiplier = Math.log(1 + this.totalHitCount * 0.01) * 2.0; // Increased multiplier
        this.config.localRadius = baseDiffusionRadius + radiusMultiplier;
    }
    
    // Calculate heat diffusion at a specific position
    calculateHeatDiffusion(worldX, worldY, stats) {
        if (!stats || stats.distribution.size === 0) {
            return 0;
        }
        
        const diffusionRadiusWorld = this.mmToWorldUnits(this.config.localRadius);
        
        let totalHeat = 0;
        
        // Calculate heat contribution from all hit points
        for (const [binY, count] of stats.distribution) {
            if (count === 0) continue;
            
            // Heat source is at center of rectangle (x=0) at height binY
            const heatSourceX = 0;
            const heatSourceY = binY;
            
            // Calculate distance from heat source
            const deltaX = worldX - heatSourceX;
            const deltaY = worldY - heatSourceY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > diffusionRadiusWorld) continue;
            
            // Heat intensity based on hit count
            const baseHeatIntensity = count; // this.maxObservedCount;
            
            // Distance-based heat decay (exponential falloff for more realistic diffusion)
            const normalizedDistance = distance / diffusionRadiusWorld;
            const heatDecay = Math.pow(this.config.heatDecayRate, normalizedDistance * 10);
            
            // Add heat contribution
            const heatContribution = baseHeatIntensity * heatDecay * this.config.diffusionRate;
            totalHeat += heatContribution;
        }
        
        return totalHeat;
    }
    
    // Get final color including base color blending
    getFinalColor(heatIntensity) {
        const baseColor = this.config.baseColor;
        
        if (heatIntensity <= 0) {
            return baseColor;
        }
        
        // Normalize heat intensity to [0, 1] range
        const normalizedHeat = Math.min(heatIntensity / this.config.maxHeatIntensity, 1.0);
        const heatColor = this.getHeatColor(normalizedHeat);
        
        // Blend heat color with base color
        // Higher heat intensity = more heat color, less base color
        const heatStrength = Math.min(normalizedHeat * 1.2, 1.0) * this.config.heatTransparency; // Apply transparency
        const baseStrength = 1.0 - heatStrength;
        
        return {
            r: Math.round(baseColor.r * baseStrength + heatColor.r * heatStrength),
            g: Math.round(baseColor.g * baseStrength + heatColor.g * heatStrength),
            b: Math.round(baseColor.b * baseStrength + heatColor.b * heatStrength),
            a: Math.max(baseColor.a, normalizedHeat * 0.5 * this.config.heatTransparency) // More transparent heat
        };
    }
    
    // Main rendering function
    render(ctx, stats, zoomLevel, panX, panY) {
        if (!this.isEnabled) return;

        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        
        // Update dynamic parameters
        this.updateDynamicRange(stats);
        
        ctx.save();
        ctx.setTransform(
            zoomLevel, 0, 0, -zoomLevel,  // Flip Y-axis by negating zoomLevel
            panX + canvasWidth/2, panY + canvasHeight/2
        );
        
        // Calculate rectangle dimensions in world coordinates
        const rectWidthWorld = this.mmToWorldUnits(this.RECT_WIDTH_MM);
        const rectHeightWorld = this.mmToWorldUnits(this.RECT_HEIGHT_MM);
        
        // FIXED POSITIONING: Place rectangle on surface (right edge at x=0, extending left into material)
        const rectX = -rectWidthWorld;
        const rectY = -rectHeightWorld / 2;
        const rectWidth = rectWidthWorld;
        const rectHeight = rectHeightWorld;
        
        // If no stats, just draw base rectangle
        if (!stats || stats.distribution.size === 0 || this.config.visible === false) {
            const baseColor = this.config.baseColor;
            ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${baseColor.a})`;
            ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        } else {
            // Create heat diffusion visualization
            const sampleWidth = 80;  // Higher resolution for smoother gradients
            const sampleHeight = 80;
            
            // Create temporary canvas for the heat visualization
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = sampleWidth;
            tempCanvas.height = sampleHeight;
            const tempCtx = tempCanvas.getContext('2d');
            const imageData = tempCtx.createImageData(sampleWidth, sampleHeight);
            
            // Fill image data with heat diffusion
            for (let y = 0; y < sampleHeight; y++) {
                for (let x = 0; x < sampleWidth; x++) {
                    // Convert pixel coordinates to world coordinates
                    const worldX = (x / sampleWidth) * rectWidthWorld - rectWidthWorld;
                    const worldY = (y / sampleHeight - 0.5) * rectHeightWorld;
                    
                    // Calculate heat at this position
                    const heatIntensity = this.calculateHeatDiffusion(worldX, worldY, stats);
                    const color = this.getFinalColor(heatIntensity);
                    
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
    
    // Adjust diffusion parameters
    setDiffusionRate(rate) {
        this.config.diffusionRate = Math.max(0, Math.min(1, rate));
    }
    
    setHeatDecayRate(rate) {
        this.config.heatDecayRate = Math.max(0, Math.min(1, rate));
    }
    
    setRangeGrowthRate(rate) {
        this.config.rangeGrowthRate = Math.max(0.5, Math.min(20.0, rate)); // Much wider range
    }
    
    setHeatTransparency(transparency) {
        this.config.heatTransparency = Math.max(0, Math.min(1, transparency));
    }
    
    // Reset heat accumulation
    resetHeat() {
        this.totalHitCount = 0;
        this.maxObservedCount = 0;
        this.config.maxHeatIntensity = 1.0;
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
    
    // Get current heat statistics
    getHeatStats() {
        return {
            totalHits: this.totalHitCount,
            maxObservedCount: this.maxObservedCount,
            currentMaxHeatIntensity: this.config.maxHeatIntensity,
            currentDiffusionRadius: this.config.localRadius
        };
    }

    clear() {
        this.resetHeat();
        this.config.visible = true; // Reset visibility to default
    }
}

// Create global instance
window.thermalOverlay = new ThermalOverlay(window.PIXELS_PER_MM || 1);

// Simple integration function
function renderTM(ctx, stats, zoomLevel, panX, panY) {
    window.thermalOverlay.render(ctx, stats, zoomLevel, panX, panY);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThermalOverlay;
}