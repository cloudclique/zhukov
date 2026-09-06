/**
 * Zhukov Studio - About Me Workflow & Interactive Color Palette Picker
 */

document.addEventListener('DOMContentLoaded', () => {
    initColorPalettePicker();
});

function initColorPalettePicker() {
    const wheelCanvas = document.getElementById('palette-wheel-canvas');
    const wheelOverlay = document.getElementById('palette-wheel-overlay');
    const modeBtns = document.querySelectorAll('.palette-mode-btn');
    const satSlider = document.getElementById('palette-sat-slider');
    const lumSlider = document.getElementById('palette-lum-slider');
    const satValueDisplay = document.getElementById('palette-sat-val');
    const lumValueDisplay = document.getElementById('palette-lum-val');
    const swatchesContainer = document.getElementById('palette-swatches-container');
    const modeNameDisplay = document.getElementById('palette-current-mode-name');

    if (!wheelCanvas || !wheelOverlay) return;

    // Palette State
    const modes = ['analogous', 'complementary', 'triadic'];
    const modeLabels = {
        'analogous': 'Analogous (3 Colors)',
        'complementary': 'Complementary (2 Colors)',
        'triadic': 'Split-Complementary (3 Colors)'
    };

    let currentModeIndex = 0; // 0: analogous, 1: complementary, 2: triadic
    let baseHue = 45; // default warm gold / amber hue
    let saturation = 100; // percentage
    let luminance = 78; // percentage
    let isDragging = false;

    // Canvas setup for crisp rendering on high-DPI displays (compact 220px)
    const ctx = wheelCanvas.getContext('2d');
    const size = 220;
    const dpr = window.devicePixelRatio || 1;
    wheelCanvas.width = size * dpr;
    wheelCanvas.height = size * dpr;
    wheelCanvas.style.width = `${size}px`;
    wheelCanvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const outerRadius = (size / 2) - 8;
    const innerRadius = outerRadius - 24;

    // Draw the Hue Ring on Canvas
    function drawHueRing() {
        ctx.clearRect(0, 0, size, size);

        // Draw segmented conic color ring for smooth spectrum
        const segments = 360;
        const angleStep = (2 * Math.PI) / segments;

        for (let i = 0; i < segments; i++) {
            const startAngle = i * angleStep - Math.PI / 2;
            const endAngle = (i + 1.2) * angleStep - Math.PI / 2;
            const hue = i;

            ctx.beginPath();
            ctx.arc(center, center, outerRadius, startAngle, endAngle, false);
            ctx.arc(center, center, innerRadius, endAngle, startAngle, true);
            ctx.closePath();

            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${luminance}%)`;
            ctx.fill();
        }

        // Inner dark core with subtle ambient glow
        ctx.beginPath();
        ctx.arc(center, center, innerRadius - 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        // Outer ring subtle border
        ctx.beginPath();
        ctx.arc(center, center, outerRadius + 1, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Helper: Normalize Hue (0 - 360)
    function normalizeHue(h) {
        return (h % 360 + 360) % 360;
    }

    // Helper: HSL to Hex
    function hslToHex(h, s, l) {
        s /= 100;
        l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x;
        }

        const toHex = (n) => {
            const val = Math.round((n + m) * 255).toString(16);
            return val.length === 1 ? '0' + val : val;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }

    // Calculate active hues based on mode (sharper angle for split-complementary triangle)
    function getActiveHues() {
        const mode = modes[currentModeIndex];
        if (mode === 'analogous') {
            return [
                normalizeHue(baseHue - 35),
                normalizeHue(baseHue),
                normalizeHue(baseHue + 35)
            ];
        } else if (mode === 'complementary') {
            return [
                normalizeHue(baseHue),
                normalizeHue(baseHue + 180)
            ];
        } else if (mode === 'triadic') {
            // Sharper triangular angle: Base Hue + 150° and Base Hue + 210° (split-complementary fork)
            return [
                normalizeHue(baseHue),
                normalizeHue(baseHue + 150),
                normalizeHue(baseHue + 210)
            ];
        }
        return [baseHue];
    }

    // Render SVG Handles and connecting spokes overlay
    function updateOverlay() {
        const hues = getActiveHues();
        const midRadius = (innerRadius + outerRadius) / 2;

        let spokesSvg = '';
        let handlesSvg = '';

        // Center hub point
        spokesSvg += `<circle cx="${center}" cy="${center}" r="4" fill="rgba(255,255,255,0.7)" />`;

        hues.forEach((hue, index) => {
            // angle in radians (0 at top = -Math.PI/2)
            const angleRad = (hue * Math.PI) / 180 - Math.PI / 2;
            const hx = center + midRadius * Math.cos(angleRad);
            const hy = center + midRadius * Math.sin(angleRad);
            const isBase = (index === 1 && modes[currentModeIndex] === 'analogous') || (index === 0 && modes[currentModeIndex] !== 'analogous');

            const hex = hslToHex(hue, saturation, luminance);

            // Spoke line from center to handle
            spokesSvg += `
                <line x1="${center}" y1="${center}" x2="${hx}" y2="${hy}" 
                      stroke="rgba(255, 255, 255, ${isBase ? '0.9' : '0.45'})" 
                      stroke-width="${isBase ? '2.5' : '1.5'}" 
                      stroke-dasharray="${isBase ? 'none' : '3,3'}" />
            `;

            // Handle circle
            handlesSvg += `
                <g class="wheel-handle-group" data-hue="${hue}">
                    <circle cx="${hx}" cy="${hy}" r="${isBase ? '12' : '9.5'}" 
                            fill="${hex}" 
                            stroke="#ffffff" 
                            stroke-width="${isBase ? '3' : '2'}" 
                            filter="drop-shadow(0 2px 8px rgba(0,0,0,0.6))" />
                    ${isBase ? `<circle cx="${hx}" cy="${hy}" r="3" fill="#ffffff" />` : ''}
                </g>
            `;
        });

        wheelOverlay.innerHTML = spokesSvg + handlesSvg;
    }

    // Update Swatches container (3 or 2 boxes)
    function updateSwatches() {
        const hues = getActiveHues();
        swatchesContainer.innerHTML = '';

        hues.forEach((hue, idx) => {
            const hex = hslToHex(hue, saturation, luminance);
            const isBase = (idx === 1 && modes[currentModeIndex] === 'analogous') || (idx === 0 && modes[currentModeIndex] !== 'analogous');

            const swatch = document.createElement('div');
            swatch.className = `palette-swatch-box ${isBase ? 'base-swatch' : ''}`;
            swatch.title = `Click to copy ${hex}`;

            swatch.innerHTML = `
                <div class="swatch-color-preview" style="background-color: ${hex}; box-shadow: 0 4px 14px ${hex}44;">
                    ${isBase ? '<span class="swatch-base-tag">Key</span>' : ''}
                </div>
                <div class="swatch-meta">
                    <span class="swatch-hex">${hex}</span>
                    <span class="swatch-hsl">${Math.round(hue)}°</span>
                </div>
                <div class="swatch-copy-hint">Copied!</div>
            `;

            swatch.addEventListener('click', () => {
                navigator.clipboard.writeText(hex).then(() => {
                    swatch.classList.add('copied');
                    setTimeout(() => swatch.classList.remove('copied'), 1200);
                }).catch(() => { });
            });

            swatchesContainer.appendChild(swatch);
        });

        if (modeNameDisplay) {
            modeNameDisplay.textContent = modeLabels[modes[currentModeIndex]];
        }

        // Update active class on mode selector buttons
        modeBtns.forEach(btn => {
            const mode = btn.getAttribute('data-mode');
            if (mode === modes[currentModeIndex]) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Update Slider Track Gradients
    function updateSliderTracks() {
        if (satSlider) {
            satSlider.value = saturation;
            if (satValueDisplay) satValueDisplay.textContent = `${saturation}%`;
            satSlider.style.background = `linear-gradient(to right, hsl(${baseHue}, 0%, ${luminance}%), hsl(${baseHue}, 100%, ${luminance}%))`;
        }
        if (lumSlider) {
            lumSlider.value = luminance;
            if (lumValueDisplay) lumValueDisplay.textContent = `${luminance}%`;
            lumSlider.style.background = `linear-gradient(to right, hsl(${baseHue}, ${saturation}%, 15%), hsl(${baseHue}, ${saturation}%, 50%), hsl(${baseHue}, ${saturation}%, 90%))`;
        }
    }

    // Full render update
    function updateAll() {
        drawHueRing();
        updateOverlay();
        updateSwatches();
        updateSliderTracks();
    }

    // Handle Wheel Interaction (Calculate Hue from Pointer Position)
    function handlePointerOnWheel(e) {
        const rect = wheelCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left - (rect.width / 2);
        const y = clientY - rect.top - (rect.height / 2);

        // Calculate angle from center (0 degrees is Top = -Math.PI/2)
        let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        baseHue = Math.round(angle);
        updateAll();
    }

    // Pointer event listeners on wheel
    const wheelContainer = document.querySelector('.palette-wheel-container');
    if (wheelContainer) {
        wheelContainer.addEventListener('pointerdown', (e) => {
            isDragging = true;
            wheelContainer.setPointerCapture(e.pointerId);
            handlePointerOnWheel(e);
        });

        wheelContainer.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            handlePointerOnWheel(e);
        });

        const stopDrag = (e) => {
            if (isDragging) {
                isDragging = false;
                try {
                    wheelContainer.releasePointerCapture(e.pointerId);
                } catch (_) { }
            }
        };

        wheelContainer.addEventListener('pointerup', stopDrag);
        wheelContainer.addEventListener('pointercancel', stopDrag);
    }

    // Harmony Mode Buttons (Direct click on icons)
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetMode = btn.getAttribute('data-mode');
            const targetIndex = modes.indexOf(targetMode);
            if (targetIndex !== -1) {
                currentModeIndex = targetIndex;
                updateAll();
            }
        });
    });

    // Saturation Slider listener
    if (satSlider) {
        satSlider.addEventListener('input', (e) => {
            saturation = parseInt(e.target.value, 10);
            updateAll();
        });
    }

    // Luminance Slider listener
    if (lumSlider) {
        lumSlider.addEventListener('input', (e) => {
            luminance = parseInt(e.target.value, 10);
            updateAll();
        });
    }

    // Initial Render
    updateAll();
}

// Global Image Protection on About Page
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG' || e.target.closest('img') || e.target.closest('.fan-card') || e.target.closest('.process-image-container')) {
        e.preventDefault();
        return false;
    }
}, { capture: true });

document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG' || e.target.closest('img')) {
        e.preventDefault();
        return false;
    }
}, { capture: true });
