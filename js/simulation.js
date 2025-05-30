
function updateSimulation() {
    // Emit new rays
    if (frameCount % (Math.max(1, 8 - emissionRate)) === 0) {
        emitNewRays();
    }
    
    
    // Update existing rays
    rays.forEach(ray => {
        if (!ray.active) return;
        
        ray.step(raySpeed);
        
        const normal = checkEllipseIntersection(ray);
        if (normal) {
            ray.reflect(normal);
        }
    });
    
    // Remove inactive rays
    rays = rays.filter(ray => ray.active);
    
    // Update distribution plot
    renderHistogramOverlay(ctx, terminationBounds);
    
    frameCount++;
}
//simulation
function animate() {
    if (!isRunning) return;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    updateSimulation();
    redraw();

    animationId = requestAnimationFrame(animate);
}   