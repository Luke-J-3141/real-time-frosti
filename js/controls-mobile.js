// Mobile: Collapsible sections - Improved version
let isMobileControlsInitialized = false;

function initializeMobileFeatures() {
    // Prevent multiple initializations
    if (isMobileControlsInitialized) return;
    
    // Only enable collapsible sections on mobile/tablet
    if (window.innerWidth <= 1024) {
        document.querySelectorAll('.control-section h3').forEach(header => {
            // Remove any existing listeners to prevent duplicates
            header.removeEventListener('click', toggleSection);
            header.removeEventListener('touchend', toggleSection);
            
            // Add click listener for desktop/mouse
            header.addEventListener('click', toggleSection);
            
            // Add touch listener for mobile with proper event handling
            header.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleSection.call(this, e);
            });
            
            // Add visual feedback for mobile
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            header.style.webkitUserSelect = 'none';
        });
        
        // Start with sections collapsed on small screens
        if (window.innerWidth <= 600) {
            const sections = document.querySelectorAll('.control-section');
            if (sections.length > 1) {
                sections[1].classList.add('collapsed'); // Ray Parameters
                if (sections.length > 2) {
                    sections[2].classList.add('collapsed'); // Reflector Geometry
                }
            }
        }
        
        isMobileControlsInitialized = true;
    }
}

// Separate toggle function to avoid context issues
function toggleSection(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const section = this.parentElement;
    section.classList.toggle('collapsed');
    
    // Add haptic feedback on mobile if available
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }
}

// Improved touch event handling for canvas - Smooth movement
let touchStartTime = 0;
let touchMoved = false;

canvas.addEventListener('touchstart', function(e) {
    // Only prevent default for single touch (allow pinch zoom, etc.)
    if (e.touches.length === 1) {
        e.preventDefault();
    }
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    lastMouseX = touch.clientX - rect.left;
    lastMouseY = touch.clientY - rect.top;
    isDragging = true;
    touchStartTime = Date.now();
    touchMoved = false;
}, { passive: false });

canvas.addEventListener('touchmove', function(e) {
    if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const mouseX = touch.clientX - rect.left;
        const mouseY = touch.clientY - rect.top;
        
        const deltaX = mouseX - lastMouseX;
        const deltaY = mouseY - lastMouseY;
        
        // Reduced threshold for smoother movement
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
            touchMoved = true;
            panX += deltaX / zoomLevel;
            panY += deltaY / zoomLevel;
            
            lastMouseX = mouseX;
            lastMouseY = mouseY;
            
            updateZoomInfo();
            if (!isRunning) {
                redraw();
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
    if (e.touches.length === 0) {
        e.preventDefault();
        isDragging = false;
        
        // Handle tap vs drag
        const touchDuration = Date.now() - touchStartTime;
        if (!touchMoved && touchDuration < 300) {
            // This was a tap, not a drag - could handle tap events here if needed
        }
    }
}, { passive: false });

// Prevent context menu on long press
canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Initialize mobile features
initializeMobileFeatures();

// Improved resize handling with debouncing
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        // Reset initialization flag on significant size changes
        const newIsMobile = window.innerWidth <= 1024;
        const wasInitializedForMobile = isMobileControlsInitialized;
        
        if (newIsMobile !== wasInitializedForMobile) {
            isMobileControlsInitialized = false;
            initializeMobileFeatures();
        }
    }, 250);
});

// Additional mobile-specific styles (add to your CSS)
const mobileStyles = `
    @media (max-width: 1024px) {
        .control-section h3 {
            position: relative;
            padding-right: 30px;
            touch-action: manipulation;
        }
        
        .control-section h3:after {
            content: '▼';
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            transition: transform 0.2s ease;
            font-size: 0.8em;
        }
        
        .control-section.collapsed h3:after {
            transform: translateY(-50%) rotate(-90deg);
        }
        
        .control-section .control-content {
            transition: max-height 0.3s ease, opacity 0.2s ease;
            overflow: hidden;
        }
        
        .control-section.collapsed .control-content {
            max-height: 0 !important;
            opacity: 0;
            padding-top: 0;
            padding-bottom: 0;
        }
        
        /* Improve touch targets */
        .control-section h3 {
            min-height: 44px;
            display: flex;
            align-items: center;
        }
        
        /* Prevent text selection on headers */
        .control-section h3 {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
    }
`;

// Inject mobile styles
if (!document.getElementById('mobile-controls-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'mobile-controls-styles';
    styleSheet.textContent = mobileStyles;
    document.head.appendChild(styleSheet);
}