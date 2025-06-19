// Hotkey help display
let helpVisible = false;
let helpElement = null;

function createHelpDisplay() {
    if (helpElement) return helpElement;
    
    helpElement = document.createElement('div');
    helpElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 14px;
        line-height: 1.4;
        z-index: 10;
        white-space: pre-line;
        border: 2px solid #4a90e2;
    `;
    

    helpElement.textContent = `
        HOTKEY ASSIGNMENTS:

        General:
        R - Reset all overlays
        C - Toggle constraints (ON/OFF)

        Overlays:
        H - Toggle histogram 
        K - Toggle KDE overlay
        T - Toggle thermal overlay

        < - - ADVANCED Controls - - >
        KDE Controls:
        B - Cycle through KDE kernel types
        N - Increase KDE bandwidth (+20%)
        M - Decrease KDE bandwidth (-20%)

        Thermal Overlay Controls:
        - - Decrease diffusion rate (-0.1)
        + - Increase diffusion rate (+0.1)
        [ - Decrease heat decay rate (-0.05)
        ] - Increase heat decay rate (+0.05)
        < - Decrease range growth rate (-1.0)
        > - Increase range growth rate (+1.0)
        O - Decrease heat transparency (-0.1)
        P - Increase heat transparency (+0.1)
    `;
        
    document.body.appendChild(helpElement);
    return helpElement;
}

function toggleHelp() {
    if (helpVisible) {
        hideHelp();
    } else {
        showHelp();
    }
}

function showHelp() {
    if (!helpVisible) {
        createHelpDisplay();
        helpElement.style.display = 'block';
        helpVisible = true;
    }
}

function hideHelp() {
    if (helpVisible && helpElement) {
        helpElement.style.display = 'none';
        helpVisible = false;
    }
}

// Simple keyboard controls
document.addEventListener('keydown', (e) => {
    // Show help when Z or Escape is pressed
    if (e.key === 'Escape' ) {
        toggleHelp();
        return;
    }
});
