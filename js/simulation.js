/**
 * SIMULATION LOOP SYSTEM
 * 
 * This system manages the main ray tracing simulation loop, handling ray emission,
 * physics updates, collision detection, and rendering coordination. It provides
 * frame-rate independent simulation with performance monitoring.
 * 
 * GLOBAL STATE:
 * - frameCount: Total simulation frames processed
 * - isRunning: Simulation active state flag
 * - animationId: RequestAnimationFrame ID for loop control
 * - rays: Array of active ray objects
 * - emissionRate: Ray emission frequency control (0-9)
 * - raySpeed: Ray movement speed per frame
 * 
 * CORE FUNCTIONS:
 * 
 * updateSimulation()
 *   - Main simulation physics update function
 *   - Emits new rays based on emission rate (every 10-emissionRate frames)
 *   - Updates all active rays: position, collision detection, reflection
 *   - Processes ray termination and cleanup
 *   - Filters out inactive rays from simulation
 *   - Increments global frame counter
 *   - Returns: void
 * 
 * animate()
 *   - Main animation loop using requestAnimationFrame
 *   - Only runs when isRunning flag is true
 *   - Manages performance monitoring (frame timing, render timing)
 *   - Clears canvas and calls simulation update
 *   - Triggers complete scene redraw
 *   - Optional diagnostic logging (termination, histogram stats)
 *   - Schedules next frame via requestAnimationFrame
 *   - Returns: void
 * 
 * SIMULATION FLOW:
 * 1. Check if simulation is running
 * 2. Start performance frame timing
 * 3. Clear canvas for new frame
 * 4. Update simulation physics:
 *    - Emit new rays (rate-controlled)
 *    - Update existing rays (movement, collisions, reflections)
 *    - Process ray termination
 *    - Clean up inactive rays
 * 5. Start render timing
 * 6. Redraw entire scene
 * 7. End performance monitoring
 * 8. Optional diagnostics output
 * 9. Schedule next frame
 * 
 * RAY PROCESSING:
 * - Each active ray calls ray.step(raySpeed) for movement
 * - Collision detection via checkEllipseIntersection(ray)
 * - Reflection physics via ray.reflect(normal) when collision occurs
 * - Termination checking via deleteRays(ray) function
 * - Inactive rays automatically filtered from simulation
 * 
 * PERFORMANCE FEATURES:
 * - Frame-rate independent timing via perfMonitor
 * - Separate timing for simulation vs rendering phases
 * - Optional diagnostic output for termination and histogram systems
 * - Emission rate control to manage computational load
 * - Automatic cleanup of inactive rays
 * 
 * INTEGRATION NOTES:
 * - Requires perfMonitor global for performance tracking
 * - Uses emitNewRays() function for ray generation
 * - Depends on Ray class with step(), reflect() methods
 * - Requires checkEllipseIntersection() for collision detection
 * - Uses deleteRays() for termination processing
 * - Calls redraw() for complete scene rendering
 * - Can enable diagnostic logging by uncommenting console.log statements
 * - Animation loop controlled by isRunning flag
 * - Use requestAnimationFrame ID for proper cleanup when stopping
 */

function updateSimulation() {
    // Emit new rays
    if (frameCount % (Math.max(1, 10 - emissionRate)) === 0) {
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

        // Disable rays if they are in impossible positions i.e. have clipped through the ellipse
        deleteRays(ray);
    });

    // Remove inactive rays
    rays = rays.filter(ray => ray.active);
    frameCount++;
}

// Main animation loop 
function animate() {
    if (!isRunning) return;
    perfMonitor.frameStart();

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    updateSimulation();

    perfMonitor.renderStart();
    redraw();

    perfMonitor.renderEnd();
    perfMonitor.frameEnd();
    perfMonitor.updateRayCount(rays.length, rays.totalraysCreated);
    animationId = requestAnimationFrame(animate);
}   