/**
 * Zhukov Studio - About Me Workflow & Interactive Color Palette Picker
 */

document.addEventListener('DOMContentLoaded', () => {
    initColorPalettePicker();
    initMethodologyStepper();
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

    // Canvas setup for crisp rendering on high-DPI displays (compact 150px)
    const ctx = wheelCanvas.getContext('2d');
    const size = 150;
    const dpr = window.devicePixelRatio || 1;
    wheelCanvas.width = size * dpr;
    wheelCanvas.height = size * dpr;
    wheelCanvas.style.width = `${size}px`;
    wheelCanvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const outerRadius = (size / 2) - 6;
    const innerRadius = outerRadius - 18;

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
                      stroke-width="${isBase ? '2' : '1.2'}" 
                      stroke-dasharray="${isBase ? 'none' : '2,2'}" />
            `;

            // Handle circle
            handlesSvg += `
                <g class="wheel-handle-group" data-hue="${hue}">
                    <circle cx="${hx}" cy="${hy}" r="${isBase ? '8.5' : '6.5'}" 
                            fill="${hex}" 
                            stroke="#ffffff" 
                            stroke-width="${isBase ? '2.5' : '1.8'}" 
                            filter="drop-shadow(0 2px 5px rgba(0,0,0,0.5))" />
                    ${isBase ? `<circle cx="${hx}" cy="${hy}" r="2" fill="#ffffff" />` : ''}
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
            swatch.className = `palette-swatch-box palette-swatch-item ${isBase ? 'base-swatch' : ''}`;
            swatch.title = `Click to copy ${hex}`;

            swatch.innerHTML = `
                <div class="swatch-color-preview swatch-color-box" style="background-color: ${hex}; box-shadow: 0 2px 6px ${hex}44;">
                    ${isBase ? '<span class="swatch-base-tag">Key</span>' : ''}
                </div>
                <div class="swatch-meta">
                    <span class="swatch-hex">${hex}</span>
                </div>
                <div class="swatch-copy-hint">Copied!</div>
            `;

            swatch.addEventListener('click', () => {
                navigator.clipboard.writeText(hex).then(() => {
                    swatch.classList.add('copied');
                    const hint = swatch.querySelector('.swatch-copy-hint');
                    if (hint) hint.style.opacity = '1';
                    setTimeout(() => {
                        swatch.classList.remove('copied');
                        if (hint) hint.style.opacity = '0';
                    }, 1200);
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

    function getPointerOrTouchPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    // Handle Wheel Interaction (Calculate Hue from Pointer or Touch Position)
    function handlePointerOnWheel(e) {
        const coords = getPointerOrTouchPos(e);
        if (coords.x === undefined || coords.y === undefined) return;

        const rect = wheelCanvas.getBoundingClientRect();
        const dx = coords.x - rect.left - (rect.width / 2);
        const dy = coords.y - rect.top - (rect.height / 2);

        // Calculate angle from center (0 degrees is Top = -Math.PI/2)
        let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        baseHue = Math.round(angle);
        updateAll();
    }

    // Pointer and Native Touch event listeners on wheel for silky-smooth mobile & desktop tracking
    const wheelContainer = document.querySelector('.palette-wheel-container');
    if (wheelContainer) {
        // Desktop Pointer (Mouse)
        wheelContainer.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') return; // Touch is handled by dedicated touch events below
            isDragging = true;
            try { wheelContainer.setPointerCapture(e.pointerId); } catch (_) {}
            handlePointerOnWheel(e);
        });

        wheelContainer.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch' || !isDragging) return;
            handlePointerOnWheel(e);
        });

        const stopDrag = (e) => {
            if (isDragging) {
                isDragging = false;
                try { wheelContainer.releasePointerCapture(e.pointerId); } catch (_) { }
            }
        };

        wheelContainer.addEventListener('pointerup', stopDrag);
        wheelContainer.addEventListener('pointercancel', stopDrag);

        // Native Touch for Mobile — prevents carousel swiping and page scrolling while rotating wheel
        wheelContainer.addEventListener('touchstart', (e) => {
            isDragging = true;
            e.preventDefault();
            e.stopPropagation();
            handlePointerOnWheel(e);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            handlePointerOnWheel(e);
        }, { passive: false });

        window.addEventListener('touchend', () => {
            if (isDragging) isDragging = false;
        }, { passive: true });

        window.addEventListener('touchcancel', () => {
            if (isDragging) isDragging = false;
        }, { passive: true });
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

function initMethodologyStepper() {
    const stepperLinks = document.querySelectorAll('.stepper-step');
    const stepCards = document.querySelectorAll('.process-step-card');
    const roadmapGrid = document.getElementById('process-roadmap-grid');
    const prevBtn = document.getElementById('mobile-swipe-prev');
    const nextBtn = document.getElementById('mobile-swipe-next');
    const swipeDots = document.querySelectorAll('.swipe-dot');
    const mobileActiveNum = document.getElementById('mobile-active-num');
    const stepperBar = document.querySelector('.methodology-stepper-bar.vertical');

    if (!stepperLinks.length || !stepCards.length) return;

    let currentActiveIndex = 0;
    let isManualClick = false;
    let manualClickTimer = null;

    function isMobile() {
        return window.innerWidth <= 860;
    }

    // Prevent browser from restoring scroll position down the page on reload
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    // Ensure page loads at the very top (never jump down to the bar on page load)
    if (!window.location.hash || window.location.hash === '#methodology') {
        window.scrollTo(0, 0);
    }

    // Central state manager for active step
    function setActiveStep(index, highlightCard = true) {
        if (index < 0 || index >= stepCards.length) return;
        currentActiveIndex = index;
        const targetCard = stepCards[index];
        const targetId = targetCard ? targetCard.id : null;

        // 1. Immediately update Stepper Links (Desktop vertical rail + Mobile top bar)
        stepperLinks.forEach((link, idx) => {
            const isMatch = (idx === index) || (targetId && link.getAttribute('href') === `#${targetId}`);
            link.classList.toggle('active', isMatch);
        });

        // 2. Update Card Active / Spotlight State in Grid
        stepCards.forEach((card, idx) => {
            card.classList.toggle('active-step', idx === index);
        });

        if (highlightCard && targetCard && !isMobile()) {
            targetCard.classList.remove('card-targeted');
            void targetCard.offsetWidth; // Force reflow to re-trigger CSS spotlight animation
            targetCard.classList.add('card-targeted');
        }

        // 3. Update Mobile carousel UI if on mobile
        if (isMobile()) {
            swipeDots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx === index);
            });
            if (mobileActiveNum) {
                mobileActiveNum.textContent = String(index + 1).padStart(2, '0');
            }
            if (prevBtn) prevBtn.disabled = (index === 0);
            if (nextBtn) nextBtn.disabled = (index === stepCards.length - 1);

            if (stepperBar) {
                const activeLink = stepperLinks[index];
                if (activeLink) {
                    const barRect = stepperBar.getBoundingClientRect();
                    const linkRect = activeLink.getBoundingClientRect();
                    const delta = (linkRect.left - barRect.left) - (stepperBar.clientWidth / 2) + (linkRect.width / 2);
                    stepperBar.scrollBy({ left: delta, behavior: 'smooth' });
                }
            }
        }
    }

    // Scroll directly to a step by index (works smoothly on both mobile carousel and desktop)
    function goToStep(index) {
        if (index < 0 || index >= stepCards.length) return;
        const targetEl = stepCards[index];
        if (!targetEl) return;

        if (isMobile() && roadmapGrid) {
            // Scroll strictly inside the horizontal roadmapGrid container (never scrolling window vertically!)
            const gridRect = roadmapGrid.getBoundingClientRect();
            const cardRect = targetEl.getBoundingClientRect();
            const delta = (cardRect.left - gridRect.left) - (roadmapGrid.clientWidth / 2) + (cardRect.width / 2);
            roadmapGrid.scrollBy({ left: delta, behavior: 'smooth' });
        } else {
            const headerOffset = 90;
            const elementPosition = targetEl.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            // If already within view (e.g. Card 1 and Card 2 in the same row), avoid unnecessary jump
            if (Math.abs(elementPosition - headerOffset) > 40) {
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }
    }

    // Click handler for Stepper links (Desktop vertical rail + Mobile top bar)
    stepperLinks.forEach((link, idx) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // 1. Immediately represent clicked item in the roadmap and highlight card!
            setActiveStep(idx, true);

            // 2. Lock scroll spy momentarily so smooth scroll doesn't immediately overwrite choice
            isManualClick = true;
            clearTimeout(manualClickTimer);
            manualClickTimer = setTimeout(() => {
                isManualClick = false;
            }, 1200);

            // 3. Scroll to row if needed
            goToStep(idx);
        });
    });

    // Also allow clicking directly on cards to activate them in the roadmap
    stepCards.forEach((card, idx) => {
        card.addEventListener('click', (e) => {
            if (isMobile()) return;
            // Don't interfere if interacting with wheel, sliders, mode buttons, chips, links
            if (e.target.closest('.palette-mode-btn, #palette-sat-slider, #palette-lum-slider, .palette-wheel-container, .swatch-chip, a, button, input')) {
                setActiveStep(idx, false);
                return;
            }
            setActiveStep(idx, true);
        });
    });

    // Mobile Prev / Next Buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const curIdx = getActiveMobileIndex();
            const nextIdx = Math.max(0, curIdx - 1);
            setActiveStep(nextIdx, false);
            goToStep(nextIdx);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const curIdx = getActiveMobileIndex();
            const nextIdx = Math.min(stepCards.length - 1, curIdx + 1);
            setActiveStep(nextIdx, false);
            goToStep(nextIdx);
        });
    }

    // Mobile Dots Click
    swipeDots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            setActiveStep(idx, false);
            goToStep(idx);
        });
    });

    // Determine which card is currently active on Mobile carousel
    function getActiveMobileIndex() {
        if (!roadmapGrid) return 0;
        const scrollCenter = roadmapGrid.scrollLeft + (roadmapGrid.offsetWidth / 2);
        let closestIndex = 0;
        let minDistance = Infinity;

        stepCards.forEach((card, idx) => {
            const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
            const dist = Math.abs(scrollCenter - cardCenter);
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = idx;
            }
        });

        return closestIndex;
    }

    // Update state for Mobile Carousel
    function updateMobileCarousel() {
        if (!isMobile()) return;
        const activeIdx = getActiveMobileIndex();
        setActiveStep(activeIdx, false);
    }

    // Desktop Vertical Scroll Spy (Row-aware for pairs in the same row: 1/2, 3/4, 5/6, 7)
    function updateDesktopScrollSpy() {
        if (isMobile() || isManualClick) return;

        // Group cards into rows by vertical position (cards within 50px of each other belong to the same row)
        const rows = [];
        let currentRow = [];
        let lastTop = -9999;

        stepCards.forEach((card, idx) => {
            const top = card.offsetTop;
            if (Math.abs(top - lastTop) > 50) {
                if (currentRow.length > 0) rows.push(currentRow);
                currentRow = [{ card, idx }];
                lastTop = top;
            } else {
                currentRow.push({ card, idx });
            }
        });
        if (currentRow.length > 0) rows.push(currentRow);

        const focalLine = 140;
        let activeRow = null;
        let minRowDistance = Infinity;

        rows.forEach(row => {
            const firstCard = row[0].card;
            const rect = firstCard.getBoundingClientRect();
            // Row is eligible if visible in upper reading focal zone
            if (rect.bottom > 100 && rect.top < window.innerHeight * 0.75) {
                const distance = Math.abs(rect.top - focalLine);
                if (distance < minRowDistance) {
                    minRowDistance = distance;
                    activeRow = row;
                }
            }
        });

        if (activeRow) {
            // If current active card is already in this active row (e.g. user clicked 2 and is looking at row 1/2), keep it!
            const isAlreadyInRow = activeRow.some(item => item.idx === currentActiveIndex);
            if (!isAlreadyInRow) {
                // Scrolled into a new row: set active to the first card in that row
                setActiveStep(activeRow[0].idx, false);
            }
        }
    }

    // Event Listeners
    if (roadmapGrid) {
        roadmapGrid.addEventListener('scroll', () => {
            updateMobileCarousel();
        }, { passive: true });
    }
    window.addEventListener('scroll', updateDesktopScrollSpy, { passive: true });

    window.addEventListener('resize', () => {
        if (isMobile()) {
            updateMobileCarousel();
        } else {
            updateDesktopScrollSpy();
        }
    }, { passive: true });

    // Initial sync
    if (isMobile()) {
        updateMobileCarousel();
    } else {
        setActiveStep(0, false);
    }
}



