/*
 * UI CONTROLS AND EVENT HANDLING SYSTEM
 * =====================================
 * 
 * Comprehensive user interface control system for ray tracing simulation.
 * Handles parameter input, simulation control, visualization toggles, and interactive navigation.
 * 
 * CONSTANTS:
 * 
 * R_tm = 170 * PIXELS_PER_MM
 *   - Termination radius in pixels for ray termination detection
 * 
 * CONTROL OBJECTS:
 * 
 * controls object
 *   - Maps to HTML input elements for simulation parameters
 *   - Includes: sourceLength, targetLength, theta, dist_sor_tar, verticalOffset,
 *     emissionRate, maxBounces, raySpeed, rayLifetime
 *   - Returns: DOM element references for direct value access
 * 
 * values object
 *   - Maps to HTML display elements showing current parameter values
 *   - Mirrors controls structure with "Value" suffix
 *   - Returns: DOM element references for updating displayed values
 * 
 * PARAMETER MANAGEMENT:
 * 
 * updateValues()
 *   - Reads all control values and updates global simulation parameters
 *   - Converts pixel values to millimeter display units using pxTomm()
 *   - Updates existing ray properties (maxAge) for live parameter changes
 *   - Calculates derived values (a, b, z0, voffset) for physics calculations
 *   - Returns: void (updates global variables and display elements)
 * 
 * SIMULATION CONTROL EVENTS:
 * 
 * startBtn click event
 *   - Toggles simulation running state (start/pause)
 *   - Updates button text and manages animation frame requests
 *   - Calls updateValues() before starting simulation
 *   - Returns: void (manages global isRunning state)
 * 
 * resetBtn click event
 *   - Stops simulation and clears all rays
 *   - Resets histogram and KDE data
 *   - Triggers redraw to clear canvas
 *   - Returns: void (resets simulation to initial state)
 * 
 * clearRay click event
 *   - Removes all active rays without stopping simulation
 *   - Preserves accumulated data (histogram/KDE)
 *   - Returns: void (clears rays array and redraws)
 * 
 * resetOverlays click event
 *   - Clears histogram and KDE overlay data
 *   - Preserves active rays and simulation state
 *   - Returns: void (resets data visualizations)
 * 
 * VISUALIZATION TOGGLE EVENTS:
 * 
 * toggleKDE click event
 *   - Toggles KDE (Kernel Density Estimation) overlay visibility
 *   - Returns: void (calls toggleKDE() function)
 * 
 * toggleHistogram click event
 *   - Toggles histogram overlay visibility
 *   - Returns: void (calls toggleHistogram() function)
 * 
 * toggleThermalOverlay click event
 *   - Toggles thermal/heat map overlay visibility
 *   - Returns: void (calls overlay.toggle() method)
 * 
 * ZOOM CONTROL EVENTS:
 * 
 * zoomIn click event
 *   - Increases zoom level by factor of 1.2
 *   - Returns: void (calls setZoom() with new level)
 * 
 * zoomOut click event
 *   - Decreases zoom level by factor of 1.2
 *   - Returns: void (calls setZoom() with new level)
 * 
 * zoomReset click event
 *   - Resets view to auto-centered position and default zoom
 *   - Updates zoom information display
 *   - Returns: void (calls autoCenter(), updateZoomInfo(), redraw())
 * 
 * MOUSE INTERACTION EVENTS:
 * 
 * mousedown event
 *   - Initiates panning mode and records initial mouse position
 *   - Sets isDragging flag and captures clientX/clientY coordinates
 *   - Returns: void (starts pan operation)
 * 
 * mousemove event
 *   - Updates pan offset based on mouse movement during drag
 *   - Calculates delta from last position and updates panX/panY
 *   - Triggers redraw if simulation is paused
 *   - Returns: void (updates view position)
 * 
 * mouseup/mouseleave events
 *   - Terminates panning mode
 *   - Returns: void (clears isDragging flag)
 * 
 * TOUCH INTERACTION EVENTS (Mobile Support):
 * 
 * touchstart event
 *   - Handles single-finger panning and two-finger zoom initiation
 *   - Calculates initial touch distance for pinch-to-zoom
 *   - Prevents default browser touch behavior
 *   - Returns: void (initializes touch interaction)
 * 
 * touchmove event
 *   - Processes single-finger panning similar to mouse
 *   - Handles two-finger pinch-to-zoom with distance calculation
 *   - Updates zoom level based on touch distance ratio
 *   - Returns: void (updates view position or zoom)
 * 
 * touchend event
 *   - Terminates touch interaction and resets state
 *   - Returns: void (clears touch flags)
 * 
 * INTEGRATION DEPENDENCIES:
 * - Requires global variables: isRunning, animationId, rays, zoomLevel, panX, panY
 * - Depends on functions: animate(), redraw(), resetHistogram(), resetKDE(), 
 *   toggleKDE(), toggleHistogram(), setZoom(), autoCenter(), updateZoomInfo()
 * - Expects DOM elements with specific IDs for controls and value displays
 * - Uses pxTomm() conversion function for unit display
 * - Integrates with window.histogramRectangleOverlay for thermal overlay
 * 
 * INPUT VALIDATION:
 * - Automatic type conversion (parseInt, parseFloat) for numeric inputs
 * - Live parameter updates affect existing rays in simulation
 * - Unit conversion between pixels (internal) and millimeters (display)
 * 
 * RESPONSIVE DESIGN:
 * - Touch support for mobile devices
 * - Pinch-to-zoom gesture recognition
 * - Prevented default touch behaviors to avoid conflicts
 * - Smooth interaction experience across input methods
 */

// <====== Comments ======>
// TODO:

const R_tm = 170 * PIXELS_PER_MM; // Termination radius

// Control elements
const controls = {
    sourceLength: document.getElementById('sourceLength'),
    targetLength: document.getElementById('targetLength'),
    theta: document.getElementById('theta'),
    dist_sor_tar: document.getElementById('dist_sor_tar'),
    verticalOffset: document.getElementById('verticalOffset'),
    emissionRate: document.getElementById('emissionRate'),
    maxBounces: document.getElementById('maxBounces'),
    raySpeed: document.getElementById('raySpeed'),
    rayLifetime: document.getElementById('rayLifetime'),
};

const values = {
    sourceLengthValue: document.getElementById('sourceLengthValue'),
    targetLengthValue: document.getElementById('targetLengthValue'),
    thetaValue: document.getElementById('thetaValue'),
    dist_sor_tar_Value: document.getElementById('dist_sor_tar_Value'),
    verticalOffsetValue: document.getElementById('verticalOffsetValue'),
    emissionRateValue: document.getElementById('emissionRateValue'),
    maxBouncesValue: document.getElementById('maxBouncesValue'),
    raySpeedValue: document.getElementById('raySpeedValue'),
    rayLifetimeValue: document.getElementById('rayLifetimeValue'),
};

// Update your control value display functions
function updateValues() {
    // Get raw pixel values from controls
    sourceLength = parseInt(controls.sourceLength.value);
    targetLength = parseInt(controls.targetLength.value);
    theta = parseFloat(controls.theta.value);
    dist_sor_tar = parseInt(controls.dist_sor_tar.value);
    verticalOffset = parseInt(controls.verticalOffset.value);
    
    emissionRate = parseInt(controls.emissionRate.value);
    maxBounces = parseInt(controls.maxBounces.value);
    raySpeed = parseFloat(controls.raySpeed.value);
    rayLifetime = parseInt(controls.rayLifetime.value);
    
    // Update display values with cm units
    values.sourceLengthValue.textContent = `${pxTomm(sourceLength).toFixed(1)} mm`;
    values.targetLengthValue.textContent = `${pxTomm(targetLength).toFixed(1)} mm`;
    values.verticalOffsetValue.textContent = `${pxTomm(verticalOffset).toFixed(1)} mm`;
    values.thetaValue.textContent = theta;
    values.dist_sor_tar_Value.textContent = `${pxTomm(dist_sor_tar).toFixed(1)} mm`;
    values.emissionRateValue.textContent = emissionRate;
    values.maxBouncesValue.textContent = maxBounces;
    values.raySpeedValue.textContent = `${pxTomm(raySpeed).toFixed(2)} mm/frame`;
    values.rayLifetimeValue.textContent = rayLifetime;
    
    // Update existing rays' max age
    rays.forEach(ray => {
        ray.maxAge = rayLifetime;
    });
    
    // Calculated values (keep in pixels for internal calculations)
    b = sourceLength / 2;
    a = targetLength / 2;
    z0 = dist_sor_tar;
    voffset = verticalOffset;
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', () => {
    
    if (isRunning) {
        isRunning = false;
        if (animationId) cancelAnimationFrame(animationId);
        document.getElementById('startBtn').textContent = 'Start Simulation';
        console.log('Simulation paused');
    } else {
        updateValues();
        isRunning = true;
        document.getElementById('startBtn').textContent = 'Pause Simulation';
        console.log('Simulation started');
        animate();
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    isRunning = false;
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('startBtn').textContent = 'Start Simulation';
    rays = [];
    console.log('Simulation reset and stopped');
    resetHistogram();
    resetKDE();
    redraw();
});

document.getElementById('clearRay').addEventListener('click', () => {
    console.log('Rays cleared');
    rays = [];
    redraw();
});

document.getElementById('resetOverlays').addEventListener('click', () => {
    console.log('All overlays reset');
    resetHistogram();
    resetKDE();
    redraw();
});

document.getElementById('toggleKDE').addEventListener('click', () => {
    toggleKDE();
});

document.getElementById('toggleHistogram').addEventListener('click', () => {
    toggleHistogram();
});

document.getElementById('toggleThermalOverlay').addEventListener('click', () => {
    const overlay = window.histogramRectangleOverlay;
    overlay.toggle();
});


// Zoom controls
document.getElementById('zoomIn').addEventListener('click', () => {
    setZoom(zoomLevel * 1.2);
});

document.getElementById('zoomOut').addEventListener('click', () => {
    setZoom(zoomLevel / 1.2);
});

document.getElementById('zoomReset').addEventListener('click', () => {
    autoCenter();
    updateZoomInfo();
    redraw();
});

// Mouse controls for panning
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        
        panX += deltaX;
        panY += deltaY;
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        if (!isRunning) {
            redraw();
        }
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
});



// Touch controls for mobile
let lastTouchDistance = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        isDragging = true;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchDistance = Math.sqrt(
            (touch2.clientX - touch1.clientX) ** 2 + 
            (touch2.clientY - touch1.clientY) ** 2
        );
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
        const deltaX = e.touches[0].clientX - lastMouseX;
        const deltaY = e.touches[0].clientY - lastMouseY;
        
        panX += deltaX;
        panY += deltaY;
        
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
        
        if (!isRunning) {
            redraw();
        }
    } else if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
            (touch2.clientX - touch1.clientX) ** 2 + 
            (touch2.clientY - touch1.clientY) ** 2
        );
        
        if (lastTouchDistance > 0) {
            const zoomFactor = currentDistance / lastTouchDistance;
            setZoom(zoomLevel * zoomFactor);
        }
        
        lastTouchDistance = currentDistance;
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isDragging = false;
    lastTouchDistance = 0;
});

