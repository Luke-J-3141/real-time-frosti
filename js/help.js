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

        Overlay:
        R - Reset all Overlays
        H - Toggle histogram 
        T - Toggle thermal overlay
        K - Toggle KDE overlay

        Controls for KDE Overlay:
        N - Increase KDE binwidth
        M - Decrease KDE binwidth
        B - change KDE fitting method

        Controls for Thermal Overlay:
        - - Decrease 'Diffusion' rate (-0.1)
        + - Increase 'Diffusion' rate (+0.1)
        [ - Decrease tint strength (-0.1)
        ] - Increase tint strength (+0.1)
        < - Decrease something
        > - Increase something
        O - 
        P - 
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
