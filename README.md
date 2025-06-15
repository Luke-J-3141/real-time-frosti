# FROSTI Ray Tracing - Interactive Physics Simulation Application

A comprehensive web-based ray tracing physics simulation built with vanilla JavaScript and HTML5 Canvas. Features real-time ray propagation, interactive reflector geometry controls, and multiple data visualization overlays in a responsive mobile-first interface.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Core Architecture](#core-architecture)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Performance](#performance)
- [Browser Support](#browser-support)
- [Contributing](#contributing)

## Overview

FROSTI is an advanced 2D ray tracing visualization system designed for educational physics simulations and optical system design. It provides real-time ray propagation through elliptical reflector geometries with comprehensive statistical analysis and visualization capabilities.

### Key Capabilities
- **Real-time Ray Tracing**: Hardware-accelerated canvas rendering with efficient ray-object intersection algorithms
- **Interactive Geometry**: Live adjustment of elliptical reflector parameters with immediate visual feedback
- **Statistical Analysis**: KDE (Kernel Density Estimation), histogram overlays, and thermal visualization
- **Mobile-First Design**: Responsive interface optimized for both desktop and mobile interactions
- **Performance Monitoring**: Built-in profiling tools with FPS tracking and memory usage monitoring

## Features

### Physics Simulation
- **Ray Emission System**: Intelligent angular distribution with edge ray behavior modeling
- **Reflection Physics**: Realistic vector reflection using proper physics formulas
- **Collision Detection**: Precise ray-ellipse intersection with masking capabilities
- **Termination Analysis**: Ray lifecycle management with statistical tracking

### Interactive Controls
- **Parameter Adjustment**: Real-time control of emission rate, bounce limits, ray speed, and lifetime
- **Geometry Manipulation**: Source width, tilt angle, distance, and target positioning
- **Viewport Navigation**: Zoom, pan, and auto-centering with touch support
- **Keyboard Shortcuts**: Comprehensive hotkey system for advanced control

### Data Visualization
- **KDE Overlay**: Smooth probability density curves with multiple kernel functions
- **Histogram Display**: Real-time binned frequency distribution of ray impacts
- **Thermal Overlay**: Heat diffusion visualization with dynamic range scaling
- **Grid System**: Hierarchical measurement grid with unit conversion (mm/px)

### Mobile Optimization
- **Responsive Layout**: Single-column mobile, side-by-side desktop arrangement
- **Touch Interactions**: Pinch-to-zoom, pan gestures, and haptic feedback
- **Collapsible Panels**: Mobile-friendly accordion interface for parameter controls
- **Adaptive UI**: Screen size-based feature activation and layout adjustments

## Core Architecture

### Module Structure
```
FROSTI/
├── Core Controls/
│   ├── controls-mobile.js    # Mobile-optimized UI controls
│   ├── unitsGrid.js         # Grid system and unit conversion
│   └── controls.js          # Main control interface
├── Physics Engine/
│   ├── geometry.js          # Geometric calculations and ray culling
│   ├── rays.js              # Ray class and emission system
│   ├── renderer.js          # Canvas rendering functions
│   └── simulation.js        # Main simulation loop
├── Visualization/
│   ├── distribution.js      # Histogram overlay system
│   ├── KDE.js               # Kernel Density Estimation
│   └── testmass_vis.js      # Thermal overlay visualization
├── Interaction/
│   ├── zoom.js              # Viewport controls and navigation
│   ├── termination.js       # Ray termination and collision detection
│   └── constraints.js       # Geometric constraints and boundaries
└── Utilities/
    └── performance.js       # Performance monitoring and diagnostics
```

### State Management
- **Viewport State**: `zoomLevel`, `panX`, `panY`, `centerX`, `centerY`
- **Simulation State**: `rays[]`, `isRunning`, `animationId`, `frameCount`
- **Physics Parameters**: `theta`, `dist_sor_tar`, `sourceLength`, `targetLength`
- **Interaction State**: `isDragging`, touch coordinates, gesture recognition

## Installation & Setup

### Prerequisites
- Modern web browser with HTML5 Canvas support
- No external dependencies required (vanilla JavaScript)

### Quick Start
1. Clone or download the repository
2. Open `index.html` in a web browser
3. The application will initialize automatically

### File Structure
```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <canvas id="canvas"></canvas>
    <!-- Control panels -->
    
    <!-- Module loading in dependency order -->
    <script src="controls-mobile.js"></script>
    <script src="unitsGrid.js"></script>
    <script src="controls.js"></script>
    <script src="geometry.js"></script>
    <script src="rays.js"></script>
    <script src="renderer.js"></script>
    <script src="simulation.js"></script>
    <script src="distribution.js"></script>
    <script src="KDE.js"></script>
    <script src="testmass_vis.js"></script>
    <script src="zoom.js"></script>
    <script src="termination.js"></script>
    <script src="constraints.js"></script>
    <script src="performance.js"></script>
</body>
</html>
```

## Usage

### Basic Operation
1. **Start Simulation**: Click "Start" to begin ray emission
2. **Adjust Parameters**: Use sliders to modify ray behavior and geometry
3. **Navigate View**: Mouse wheel to zoom, click and drag to pan
4. **Toggle Overlays**: Use buttons or hotkeys to show/hide visualizations

### Control Interface

#### Simulation Controls
- **Start/Pause**: Toggle simulation execution
- **Reset**: Clear all rays and restart simulation
- **Clear Rays**: Remove active rays without stopping simulation
- **Reset Overlays**: Clear statistical data visualizations

#### Ray Parameters
- **Emission Rate**: 1-5 rays per emission cycle
- **Max Bounces**: 0-5 reflections before termination
- **Ray Speed**: 5-50 units per frame
- **Ray Lifetime**: 100-800 simulation steps

#### Reflector Geometry
- **Source Width**: Adjustable emission line length
- **Tilt Angle**: Reflector orientation in degrees
- **Distance**: Source-to-target separation
- **Target Width**: Detection area width
- **Vertical Offset**: Source line vertical positioning

### Keyboard Shortcuts

#### Overlay Controls
- `H` - Toggle histogram visibility
- `K` - Toggle KDE curve overlay
- `T` - Toggle thermal overlay
- `R` - Reset all statistical data
- `Z` - Show/hide help overlay

#### KDE Controls
- `B` - Cycle through kernel functions
- `N/M` - Increase/decrease bandwidth
- `K` - Toggle KDE visibility

#### Performance
- `P` - Toggle performance monitor
- `,/.` - Adjust thermal range growth rate
- `+/-` - Adjust thermal diffusion rate
- `[/]` - Adjust heat decay rate
- `O/P` - Adjust heat transparency

#### Navigation
- Mouse wheel - Zoom in/out
- Click + drag - Pan viewport
- Auto-center available via reset zoom button

## API Reference

### Core Classes

#### Ray Class
```javascript
// Constructor
new Ray(x, y, angle)

// Methods
ray.step(speed)           // Advance ray position
ray.reflect(normal)       // Apply reflection physics
ray.getOpacity()          // Get age-based opacity [0.1, 1.0]
ray.getColorAtDistance(d) // Get distance-based color

// Properties
ray.x, ray.y             // Current position
ray.dx, ray.dy           // Direction vector
ray.active               // Simulation state
ray.bounces              // Reflection count
ray.path                 // Position history
ray.totalDistance        // Distance traveled
ray.age                  // Simulation time alive
```

#### PerformanceMonitor Class
```javascript
// Usage in animation loop
perfMonitor.frameStart()
// ... simulation code ...
perfMonitor.renderStart()
// ... rendering code ...
perfMonitor.renderEnd()
perfMonitor.updateRayCount(rays.length)
perfMonitor.frameEnd()

// Access statistics
const stats = perfMonitor.getStats()
// Returns: {current: {fps, frameTime, renderTime}, average: {...}, memory: {...}}
```

#### HistogramRectangleOverlay Class
```javascript
// Configuration
overlay.setDiffusionRate(0.3)
overlay.setHeatDecayRate(0.7)
overlay.setHeatTransparency(0.8)

// Rendering
overlay.render(ctx, stats, zoomLevel, panX, panY)

// Control
overlay.toggle()
overlay.resetHeat()
```

### Key Functions

#### Coordinate System
```javascript
screenToWorld(screenX, screenY)  // Returns {x, y} in world coordinates
worldToScreen(worldX, worldY)    // Returns {x, y} in screen pixels
```

#### Geometry Calculations
```javascript
checkEllipseIntersection(ray)    // Returns normal vector or null
isLeftOfSourcePlane(x, y)        // Returns boolean
isOutsideAperture(x, y)         // Returns boolean
```

#### Viewport Controls
```javascript
zoomAtCursor(cursorX, cursorY, zoomFactor)  // Zoom while preserving cursor position
autoCenter()                                 // Auto-fit geometry to viewport
setZoom(newZoom)                            // Set absolute zoom level
```

#### Statistical Analysis
```javascript
getTerminationStats()           // Returns {totalTerminations, distribution, maxCount}
fitKDEToTerminationData()      // Returns KDE parameters object
evaluateKDE(y, kdeParams)      // Returns probability density at y-coordinate
```

## Performance

### Optimization Features
- **Hardware Acceleration**: Canvas rendering optimized for GPU acceleration
- **Ray Culling**: Automatic removal of rays outside optical system boundaries
- **Adaptive Quality**: Frame-rate monitoring with quality adjustments
- **Memory Management**: Efficient data structures for long-running simulations
- **Hierarchical Rendering**: Level-of-detail grid system based on zoom level

### Performance Monitoring
The built-in performance monitor tracks:
- **FPS**: Current and 60-frame rolling average
- **Frame Time**: Total time per animation frame
- **Render Time**: Time spent in drawing operations
- **Memory Usage**: JavaScript heap size (Chrome/Edge)
- **Ray Statistics**: Active and total ray counts

### Recommended Limits
- **Emission Rate**: Keep ≤ 5 for smooth performance
- **Max Bounces**: Limit to 5 or fewer for complex geometries
- **Ray Lifetime**: Balance between visual effect and memory usage
- **Zoom Range**: Optimal performance between 25% and 500% zoom

## Browser Support

### Minimum Requirements
- **HTML5 Canvas**: All modern browsers (IE9+)
- **ES6 Features**: Arrow functions, const/let, classes
- **Touch Events**: Mobile Safari, Chrome Mobile, Firefox Mobile
- **Performance API**: Chrome 6+, Firefox 7+, Safari 8+

### Tested Browsers
- Chrome 80+
- Firefox 70+
- Safari 13+
- Edge 80+
- Mobile Safari (iOS 12+)
- Chrome Mobile (Android 8+)

### Feature Compatibility
- **Memory Monitoring**: Chrome/Edge only (uses `performance.memory`)
- **Haptic Feedback**: Mobile devices with vibration support
- **High-DPI Displays**: Automatic detection and scaling
- **Hardware Acceleration**: Available on supported devices

## Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make changes following the existing code style
4. Test across multiple browsers and devices
5. Submit a pull request with detailed description

### Code Style Guidelines
- Use vanilla JavaScript (no frameworks)
- Follow existing naming conventions
- Document complex physics calculations
- Include performance considerations in comments
- Maintain mobile-first responsive design principles

### Performance Testing
When contributing performance-sensitive code:
1. Test with `perfMonitor` enabled
2. Verify smooth operation at 60fps
3. Check memory usage growth over time
4. Test on both desktop and mobile devices
5. Document any performance trade-offs

### Areas for Contribution
- Additional kernel functions for KDE analysis
- New visualization overlay types
- Physics model extensions
- Mobile interaction improvements
- Accessibility enhancements
- Unit test coverage

---

## License

This project is open source. Please see the LICENSE file for details.

## Acknowledgments

Built with modern web technologies for educational and research purposes in optical physics and ray tracing visualization.