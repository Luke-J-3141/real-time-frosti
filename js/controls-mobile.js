// Mobile: Collapsible sections
function initializeMobileFeatures() {
    // Only enable collapsible sections on mobile
    if (window.innerWidth <= 1024) {
        document.querySelectorAll('.control-section h3').forEach(header => {
            header.addEventListener('click', function() {
                const section = this.parentElement;
                section.classList.toggle('collapsed');
            });
        });
        
        // Start with Ray Parameters and Reflector Geometry collapsed on small screens
        if (window.innerWidth <= 600) {
            const sections = document.querySelectorAll('.control-section');
            if (sections.length > 1) {
                sections[1].classList.add('collapsed'); // Ray Parameters
                sections[2].classList.add('collapsed'); // Reflector Geometry
            }
        }
    }
}

// Touch event handling for mobile
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    lastMouseX = touch.clientX - rect.left;
    lastMouseY = touch.clientY - rect.top;
    isDragging = true;
});

// Initialize mobile features
initializeMobileFeatures();

// Re-initialize on resize
window.addEventListener('resize', function() {
    setTimeout(initializeMobileFeatures, 100);
});