// <====== Comments ======>
// TODO:

const R_tm = 2700; // Termination radius

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



function updateValues() {
    sourceLength = parseInt(controls.sourceLength.value);
    targetLength = parseInt(controls.targetLength.value);
    theta = parseFloat(controls.theta.value);
    dist_sor_tar = parseInt(controls.dist_sor_tar.value);
    verticalOffset = parseInt(controls.verticalOffset.value);
    
    emissionRate = parseInt(controls.emissionRate.value);
    maxBounces = parseInt(controls.maxBounces.value);
    raySpeed = parseFloat(controls.raySpeed.value);
    rayLifetime = parseInt(controls.rayLifetime.value);
    
    // Update display values
    values.sourceLengthValue.textContent = sourceLength;
    values.targetLengthValue.textContent = targetLength;
    values.verticalOffsetValue.textContent = verticalOffset;
    values.thetaValue.textContent = theta;
    values.dist_sor_tar_Value.textContent = dist_sor_tar;
    values.emissionRateValue.textContent = emissionRate;
    values.maxBouncesValue.textContent = maxBounces;
    values.raySpeedValue.textContent = raySpeed;
    values.rayLifetimeValue.textContent = rayLifetime;
    
    // Update existing rays' max age
    rays.forEach(ray => {
        ray.maxAge = rayLifetime;
    });
    
    // Calculated values
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
    } else {
        updateValues();
        isRunning = true;
        document.getElementById('startBtn').textContent = 'Pause Simulation';
        animate();
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    isRunning = false;
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('startBtn').textContent = 'Start Simulation';
    rays = [];
    resetHistogram();
    redraw();
});

document.getElementById('clearRay').addEventListener('click', () => {
    rays = [];
    redraw();
});

document.getElementById('clearHist').addEventListener('click', () => {
    resetHistogram();
    redraw();
});

// Zoom controls
document.getElementById('zoomIn').addEventListener('click', () => {
    setZoom(zoomLevel * 1.2);
});

document.getElementById('zoomOut').addEventListener('click', () => {
    setZoom(zoomLevel / 1.2);
});

document.getElementById('zoomReset').addEventListener('click', () => {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
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

// Mouse wheel for zooming
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(zoomLevel * zoomFactor);
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