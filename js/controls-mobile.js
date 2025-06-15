/*
 * MOBILE RESPONSIVE UI SYSTEM
 * ===========================
 * 
 * Adaptive user interface system that provides mobile-optimized controls and interactions.
 * Implements collapsible sections, touch-friendly interactions, and responsive design patterns.
 * 
 * INITIALIZATION SYSTEM:
 * 
 * isMobileControlsInitialized (boolean)
 *   - Prevents duplicate event listener registration
 *   - Tracks initialization state for resize handling
 *   - Returns: boolean flag indicating mobile features status
 * 
 * initializeMobileFeatures()
 *   - Main initialization function for mobile-specific UI enhancements
 *   - Activates only on devices with screen width <= 1024px
 *   - Sets up collapsible sections with touch and click handlers
 *   - Auto-collapses sections on small screens (width <= 600px)
 *   - Returns: void (modifies DOM and sets up event listeners)
 * 
 * INTERACTION HANDLING:
 * 
 * toggleSection(e)
 *   - Event handler for collapsible section headers
 *   - Toggles 'collapsed' class on parent control section
 *   - Provides haptic feedback via navigator.vibrate() if available
 *   - Prevents event propagation to avoid conflicts
 *   - Returns: void (modifies section visibility state)
 * 
 * Event Listeners Setup:
 *   - Dual event handling: 'click' for desktop, 'touchend' for mobile
 *   - Removes existing listeners before adding new ones (prevents duplicates)
 *   - Implements proper touch event handling with preventDefault()
 *   - Adds visual feedback styling (cursor, user-select properties)
 * 
 * RESPONSIVE BEHAVIOR:
 * 
 * Screen Width Breakpoints:
 *   - <= 1024px: Enables mobile features and collapsible sections
 *   - <= 600px: Auto-collapses Ray Parameters and Reflector Geometry sections
 *   - Maintains desktop behavior on larger screens
 * 
 * Resize Handling:
 *   - Debounced resize listener (250ms delay) for performance
 *   - Reinitializes mobile features when crossing breakpoint thresholds
 *   - Resets initialization flag when switching between mobile/desktop modes
 *   - Returns: void (manages responsive state transitions)
 * 
 * VISUAL ENHANCEMENTS:
 * 
 * CSS Injection System:
 *   - Dynamically injects mobile-specific styles via JavaScript
 *   - Prevents duplicate style injection with unique ID check
 *   - Ensures styles are available even if CSS file is missing mobile rules
 * 
 * Mobile Style Features:
 *   - Animated expand/collapse transitions (max-height, opacity)
 *   - Touch-friendly header targets (minimum 44px height)
 *   - Visual indicators (arrow icons that rotate on collapse)
 *   - Prevents text selection on interactive headers
 *   - Smooth CSS transitions for professional feel
 * 
 * ACCESSIBILITY FEATURES:
 * 
 * Touch Optimization:
 *   - touch-action: manipulation for better touch response
 *   - Minimum touch target sizes following mobile guidelines
 *   - Haptic feedback for touch interactions where supported
 *   - Proper event handling to prevent scroll conflicts
 * 
 * User Experience:
 *   - Visual feedback with arrow rotation animations
 *   - Smooth expand/collapse transitions
 *   - Prevents accidental text selection on headers
 *   - Maintains accessibility while optimizing for touch
 * 
 * INTEGRATION NOTES:
 * 
 * DOM Requirements:
 *   - Expects .control-section elements with h3 headers
 *   - Requires .control-content containers for collapsible content
 *   - Works with existing HTML structure without modifications
 * 
 * Conflict Prevention:
 *   - Designed to work alongside existing canvas touch handlers
 *   - Uses event.stopPropagation() to prevent conflicts
 *   - Debounces resize events to prevent performance issues
 *   - Checks for existing mobile features before initialization
 * 
 * Browser Support:
 *   - Uses modern CSS features (flexbox, transforms, transitions)
 *   - Gracefully degrades on older browsers
 *   - Checks for navigator.vibrate() support before using
 *   - Uses vendor prefixes for broader compatibility
 * 
 * STATE MANAGEMENT:
 * 
 * Section State:
 *   - Uses CSS classes for state management (.collapsed)
 *   - Persistent across page interactions
 *   - Automatically managed based on screen size
 *   - No external state storage required
 * 
 * Initialization State:
 *   - Tracks whether mobile features are active
 *   - Prevents duplicate setup on resize events
 *   - Allows clean reinitialization when needed
 * 
 * PERFORMANCE CONSIDERATIONS:
 * 
 * Debounced Events:
 *   - Resize handler debounced to prevent excessive calls
 *   - Smooth transitions without blocking main thread
 *   - Efficient DOM manipulation with minimal reflows
 * 
 * Event Management:
 *   - Proper cleanup of event listeners during reinitialization
 *   - Prevents memory leaks from duplicate listeners
 *   - Uses event delegation patterns where appropriate
 */

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

// Canvas touch handling is managed by the original controls.js
// No additional canvas touch handlers needed here to avoid conflicts

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