// =========================================================================
// ZHUKOV Studio — Universal Modular Header & Footer Component Loader
// Loads /header.html and /footer.html into placeholder slots with 0ms cache
// =========================================================================

// =========================================================================
// BANNER CONFIGURATION (Under Header)
// Paste your banner image URL into BANNER_IMAGE_URL below.
// Example: const BANNER_IMAGE_URL = 'https://example.com/banner.jpg';
// Leave as '' (empty) if no banner should be displayed.
// =========================================================================
const BANNER_IMAGE_URL = '';

// Optional: Link to open when the banner is clicked (leave '' if none)
const BANNER_DESTINATION_URL = '';

(function () {
    const HEADER_CACHE_KEY = 'zhukov_cached_header_v19';
    const FOOTER_CACHE_KEY = 'zhukov_cached_footer_v19';
    const COOKIE_CONSENT_KEY = 'zhukov_cookies_consent';
    const THEME_KEY = 'zhukov_theme';

    // 0ms Immediate Theme Initialization to eliminate Flash of Unstyled Content (FOUC)
    const initialTheme = localStorage.getItem(THEME_KEY);
    if (initialTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('theme-dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('theme-dark');
    }

    // Page-specific top bar text mapping
    const PAGE_TITLES = {
        '/': 'EDITORIAL & GLAMOUR & SENSUAL',
        '/index.html': 'EDITORIAL & GLAMOUR & SENSUAL',
        '/photoshoots/': 'PHOTOSHOOTS',
        '/photoshoots/index.html': 'PHOTOSHOOTS',
        '/photoshoots/gallery.html': ' ',
        '/photoshoots/archived.html': 'ARCHIVE',
        '/moodboard/': 'MOODBOARDS',
        '/moodboard/index.html': 'MOODBOARDS',
        '/about/': 'ABOUT ME / WORKFLOW & GEAR',
        '/about/index.html': 'ABOUT ME / WORKFLOW & GEAR',
        '/contact/': 'CONTACT / BOOKING / IMPRESS',
        '/contact/index.html': 'CONTACT / BOOKING / IMPRESS',
        '/upload/': 'CONTENT MANAGEMENT SYSTEM',
        '/upload/index.html': 'CONTENT MANAGEMENT SYSTEM'
    };

    // Determine current nav identifier
    function getCurrentNavId() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/photoshoots/archived')) return 'archived';
        if (path.includes('/photoshoots/')) return 'photoshoots';
        if (path.includes('/moodboard/')) return 'moodboard';
        if (path.includes('/about/')) return 'about';
        if (path.includes('/contact/')) return 'contact';
        if (path.includes('/upload/')) return 'upload';
        return 'home';
    }

    // Initialize Header Interactions (Mobile Menu, Shrink on Scroll, Active Links)
    function initHeaderBehavior() {
        const header = document.getElementById('vogue-header');
        const topBar = document.getElementById('vogue-top-bar');
        const topBarCenter = document.getElementById('vogue-top-bar-center');
        const navContainer = document.getElementById('header-nav-container');
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const loginBtn = document.getElementById('login-btn-header');
        const logoutBtn = document.getElementById('logout-btn');
        const uploadLink = document.getElementById('upload-nav-link');
        const archivedLink = document.getElementById('archived-nav-link');

        // Set Top Bar text for current page
        if (topBarCenter) {
            const path = window.location.pathname;
            const title = PAGE_TITLES[path] || PAGE_TITLES['/' + path.replace(/^\//, '')] || 'HIGH FASHION & EDITORIAL PHOTOGRAPHY';
            topBarCenter.textContent = title;
        }

        // Set Active Nav Link
        const activeNavId = getCurrentNavId();
        document.querySelectorAll('.vogue-nav-link').forEach(link => {
            const dataNav = link.getAttribute('data-nav');
            if (dataNav === activeNavId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Set Auth State (Instant localStorage check)
        const isLoggedIn = localStorage.getItem('zhukov_logged_in') === 'true';
        const isAdmin = localStorage.getItem('zhukov_is_admin') === 'true';

        if (loginBtn && logoutBtn) {
            if (isLoggedIn) {
                loginBtn.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
            } else {
                loginBtn.classList.remove('hidden');
                logoutBtn.classList.add('hidden');
            }
        }

        if (uploadLink) {
            if (isAdmin) uploadLink.classList.remove('hidden');
            else uploadLink.classList.add('hidden');
        }

        if (archivedLink) {
            if (isAdmin) archivedLink.classList.remove('hidden');
            else archivedLink.classList.add('hidden');
        }

        // Mobile Menu Toggle
        if (mobileBtn && navContainer) {
            mobileBtn.onclick = (e) => {
                e.stopPropagation();
                const isOpen = navContainer.classList.toggle('open');
                mobileBtn.classList.toggle('active', isOpen);
                mobileBtn.setAttribute('aria-expanded', isOpen);
                document.body.classList.toggle('mobile-menu-open', isOpen);
            };

            navContainer.querySelectorAll('a').forEach(a => {
                a.onclick = () => {
                    navContainer.classList.remove('open');
                    mobileBtn.classList.remove('active');
                    mobileBtn.setAttribute('aria-expanded', 'false');
                    document.body.classList.remove('mobile-menu-open');
                };
            });

            document.addEventListener('click', (e) => {
                if (!navContainer.contains(e.target) && !mobileBtn.contains(e.target)) {
                    navContainer.classList.remove('open');
                    mobileBtn.classList.remove('active');
                    mobileBtn.setAttribute('aria-expanded', 'false');
                    document.body.classList.remove('mobile-menu-open');
                }
            });
        }

        // Two-Stage Header Controller: Anchors top element cleanly to bottom of header in both states
        let isScrolled = false;
        let isTouchMode = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
        let wheelFoldDelta = 0;
        let wheelFoldActive = false;
        let wheelResetTimer = null;

        if (isTouchMode && window.innerWidth > 768) {
            document.body.classList.add('touch-scroll-mode');
        }

        function resetTouchInlineStyles() {
            if (topBar) {
                topBar.style.maxHeight = '';
                topBar.style.opacity = '';
                topBar.style.paddingTop = '';
                topBar.style.paddingBottom = '';
                topBar.style.borderBottomColor = '';
            }
            const masthead = header ? header.querySelector('.vogue-masthead-container') : null;
            if (masthead) {
                masthead.style.maxHeight = '';
                masthead.style.opacity = '';
                masthead.style.paddingTop = '';
                masthead.style.paddingBottom = '';
            }
            const scrolledLogo = header ? header.querySelector('.vogue-scrolled-logo') : null;
            if (scrolledLogo) {
                scrolledLogo.style.opacity = '';
                scrolledLogo.style.transform = '';
                scrolledLogo.style.pointerEvents = '';
            }
        }

        function getScrollY() {
            const dv = document.getElementById('dashboard-view');
            const dvScroll = dv ? dv.scrollTop : 0;
            const winScroll = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
            return Math.max(dvScroll, winScroll);
        }

        function resetScrollToTop() {
            window.scrollTo(0, 0);
            const dv = document.getElementById('dashboard-view');
            if (dv) dv.scrollTop = 0;
        }

        function scrollByDelta(delta) {
            const dv = document.getElementById('dashboard-view');
            if (dv && dv.scrollHeight > dv.clientHeight) {
                dv.scrollTop += delta;
            } else {
                window.scrollBy(0, delta);
            }
        }

        function updateTouchHeaderTransform() {
            if (window.innerWidth <= 768) return;
            const scrollY = getScrollY();
            const unscrolledH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-unscrolled-height')) || 206;
            const scrolledH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-scrolled-height')) || 67;
            const maxCollapse = Math.max(1, unscrolledH - scrolledH);
            const progress = Math.min(1, Math.max(0, scrollY / maxCollapse));

            if (topBar) {
                const topBarProg = Math.min(1, progress * 2.5);
                topBar.style.maxHeight = `${(1 - topBarProg) * 40}px`;
                topBar.style.opacity = `${1 - topBarProg}`;
                topBar.style.paddingTop = `${(1 - topBarProg) * 0.45}rem`;
                topBar.style.paddingBottom = `${(1 - topBarProg) * 0.45}rem`;
                topBar.style.borderBottomColor = topBarProg >= 0.9 ? 'transparent' : '';
            }

            const masthead = header ? header.querySelector('.vogue-masthead-container') : null;
            if (masthead) {
                masthead.style.maxHeight = `${(1 - progress) * 120}px`;
                masthead.style.opacity = `${1 - Math.min(1, progress * 1.3)}`;
                masthead.style.paddingTop = `${(1 - progress) * 1.1}rem`;
                masthead.style.paddingBottom = `${(1 - progress) * 0.8}rem`;
            }

            const scrolledLogo = header ? header.querySelector('.vogue-scrolled-logo') : null;
            if (scrolledLogo) {
                const logoProg = Math.min(1, Math.max(0, (progress - 0.25) / 0.75));
                scrolledLogo.style.opacity = `${logoProg}`;
                scrolledLogo.style.transform = `translateY(-50%) translateX(${-15 * (1 - logoProg)}px)`;
                scrolledLogo.style.pointerEvents = logoProg > 0.5 ? 'auto' : 'none';
            }

            if (header) {
                if (progress >= 0.95) {
                    header.classList.add('is-scrolled');
                } else {
                    header.classList.remove('is-scrolled');
                }
            }

            isScrolled = (progress >= 0.95);
        }

        function setScrolledState(scrolled) {
            if (scrolled === isScrolled) return;
            isScrolled = scrolled;
            document.body.classList.toggle('header-is-scrolled', isScrolled);
            if (header) {
                header.classList.toggle('is-scrolled', isScrolled);
            }
            if (topBar) {
                topBar.classList.toggle('is-scrolled', isScrolled);
            }
            if (navContainer) {
                navContainer.classList.toggle('is-scrolled', isScrolled);
            }
            syncHeaderHeight();
            setTimeout(syncHeaderHeight, 260);
        }

        function syncHeaderHeight() {
            const slot = document.getElementById('site-header-slot');
            if (slot && window.innerWidth > 768) {
                const h = slot.offsetHeight;
                if (!isScrolled) {
                    if (h > 150) {
                        document.documentElement.style.setProperty('--site-header-unscrolled-height', `${h}px`);
                    }
                } else {
                    if (h > 40 && h < 120) {
                        document.documentElement.style.setProperty('--site-header-scrolled-height', `${h}px`);
                    }
                }
            }
        }
        syncHeaderHeight();
        window.addEventListener('resize', () => {
            syncHeaderHeight();
            if (isTouchMode) updateTouchHeaderTransform();
        });

        // Wheel interceptor for desktop (mouse): folds in one go on 1 scroll down, unfolds in one go on 1 scroll up
        window.addEventListener('wheel', (e) => {
            if (isTouchMode) {
                isTouchMode = false;
                document.body.classList.remove('touch-scroll-mode');
                resetTouchInlineStyles();
            }

            const scrollY = getScrollY();

            // 1. Initial scroll down at top: fold header in one go and allow continuous scroll
            if (!isScrolled && scrollY <= 2 && e.deltaY > 0) {
                wheelFoldActive = true;
                wheelFoldDelta += e.deltaY;
                setScrolledState(true);

                // Absorb the initial fold delta (100px) to keep scroll at 0 for a single notch
                if (wheelFoldDelta <= 100) {
                    e.preventDefault();
                    resetScrollToTop();
                } else {
                    const excess = wheelFoldDelta - 100;
                    if (excess > 0 && excess <= e.deltaY) {
                        scrollByDelta(excess);
                        e.preventDefault();
                    }
                }

                clearTimeout(wheelResetTimer);
                wheelResetTimer = setTimeout(() => {
                    wheelFoldActive = false;
                    wheelFoldDelta = 0;
                }, 250);
                return;
            }

            // 2. If wheelFoldActive and user continues scrolling down at the top:
            if (wheelFoldActive && e.deltaY > 0 && scrollY <= 2) {
                wheelFoldDelta += e.deltaY;
                if (wheelFoldDelta <= 100) {
                    e.preventDefault();
                    resetScrollToTop();
                }
                clearTimeout(wheelResetTimer);
                wheelResetTimer = setTimeout(() => {
                    wheelFoldActive = false;
                    wheelFoldDelta = 0;
                }, 250);
                return;
            }

            // 3. Scroll up near top: 1 scroll up unfolds the header back to full masthead
            if (isScrolled && (scrollY <= 60 || scrollY + e.deltaY <= 0) && e.deltaY < 0) {
                e.preventDefault();
                setScrolledState(false);
                resetScrollToTop();
                wheelFoldActive = false;
                wheelFoldDelta = 0;
                clearTimeout(wheelResetTimer);
                return;
            }
        }, { passive: false });

        // Touch event handlers for mobile/tablet devices
        window.addEventListener('touchstart', (e) => {
            if (!isTouchMode) {
                isTouchMode = true;
                if (window.innerWidth > 768) {
                    document.body.classList.add('touch-scroll-mode');
                }
            }
        }, { passive: true });

        // Standard scroll handler (for touch smooth transformation, keyboard navigation, scrollbar drag)
        let ticking = false;
        function updateScrollState() {
            if (isTouchMode) {
                updateTouchHeaderTransform();
                ticking = false;
                return;
            }

            const scrollY = getScrollY();

            if (!isScrolled && scrollY > 60) {
                setScrolledState(true);
            }
            ticking = false;
        }

        function onScroll() {
            if (isTouchMode) {
                updateTouchHeaderTransform();
                return;
            }
            if (!ticking) {
                requestAnimationFrame(updateScrollState);
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('scroll', onScroll, { passive: true, capture: true });

        function attachDashboardScroll() {
            const dv = document.getElementById('dashboard-view');
            if (dv && !dv.__zhukovScrollAttached) {
                dv.__zhukovScrollAttached = true;
                dv.addEventListener('scroll', onScroll, { passive: true });
            }
        }
        attachDashboardScroll();
        document.addEventListener('DOMContentLoaded', attachDashboardScroll);
        window.addEventListener('load', attachDashboardScroll);

        if (isTouchMode) {
            updateTouchHeaderTransform();
        } else {
            updateScrollState();
        }

        // Dispatch headerLoaded event for page scripts
        document.dispatchEvent(new CustomEvent('headerLoaded', {
            detail: { header, topBar, loginBtn, logoutBtn, uploadLink, archivedLink }
        }));
    }

    // Expose Global Auth Synchronizer for Page Scripts / Firebase Listeners
    window.updateHeaderAuthState = function (user, isAdmin) {
        const loginBtn = document.getElementById('login-btn-header');
        const logoutBtn = document.getElementById('logout-btn');
        const uploadLink = document.getElementById('upload-nav-link');
        const archivedLink = document.getElementById('archived-nav-link');

        if (user) {
            localStorage.setItem('zhukov_logged_in', 'true');
            if (isAdmin) localStorage.setItem('zhukov_is_admin', 'true');
            else localStorage.removeItem('zhukov_is_admin');

            if (loginBtn) loginBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (uploadLink) {
                if (isAdmin) uploadLink.classList.remove('hidden');
                else uploadLink.classList.add('hidden');
            }
            if (archivedLink) {
                if (isAdmin) archivedLink.classList.remove('hidden');
                else archivedLink.classList.add('hidden');
            }
        } else {
            localStorage.removeItem('zhukov_logged_in');
            localStorage.removeItem('zhukov_is_admin');
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (uploadLink) uploadLink.classList.add('hidden');
            if (archivedLink) archivedLink.classList.add('hidden');
        }
    };

    // Load Header Component
    async function loadHeader() {
        const headerSlot = document.getElementById('site-header-slot') || document.getElementById('site-header');
        if (!headerSlot) return;

        // Instant render from cache if available
        const cached = sessionStorage.getItem(HEADER_CACHE_KEY);
        if (cached && headerSlot.children.length === 0) {
            headerSlot.innerHTML = cached;
            initHeaderBehavior();
        }

        // Fetch fresh header
        try {
            const res = await fetch('/header.html?v=' + Date.now());
            if (res.ok) {
                const html = await res.text();
                if (html !== cached || headerSlot.children.length === 0) {
                    sessionStorage.setItem(HEADER_CACHE_KEY, html);
                    headerSlot.innerHTML = html;
                    initHeaderBehavior();
                }
            }
        } catch (err) {
            console.warn('Could not fetch /header.html:', err);
        }
    }

    function initFooterBehavior() {
        const cookieBtn = document.getElementById('footer-cookie-btn');
        if (cookieBtn) {
            cookieBtn.onclick = (e) => {
                e.preventDefault();
                if (typeof window.openCookiePreferences === 'function') {
                    window.openCookiePreferences();
                }
            };
        }
    }

    // Load Footer Component
    async function loadFooter() {
        const footerSlot = document.getElementById('site-footer-slot') || document.getElementById('site-footer');
        if (!footerSlot) return;

        // Instant render from cache if available
        const cached = sessionStorage.getItem(FOOTER_CACHE_KEY);
        if (cached && footerSlot.children.length === 0) {
            footerSlot.innerHTML = cached;
            initFooterBehavior();
        }

        // Fetch fresh footer
        try {
            const res = await fetch('/footer.html?v=' + Date.now());
            if (res.ok) {
                const html = await res.text();
                if (html !== cached || footerSlot.children.length === 0) {
                    sessionStorage.setItem(FOOTER_CACHE_KEY, html);
                    footerSlot.innerHTML = html;
                    initFooterBehavior();
                }
            }
        } catch (err) {
            console.warn('Could not fetch /footer.html:', err);
        }

        initFooterBehavior();
        document.dispatchEvent(new CustomEvent('footerLoaded', { detail: { footerSlot } }));
    }

    // =========================================================================
    // =========================================================================
    // Comprehensive Privacy & Cookie Consent Controller
    // Accounts for all storage features: Auth, SWR & Local Cache,
    // IndexedDB, Service Worker, UI Preferences, and Anonymous Analytics.
    // =========================================================================
    function getStoredConsent() {
        try {
            const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
            if (!raw) return null;
            if (raw === 'accepted' || raw === 'all') {
                return { necessary: true, preferences: true, analytics: true, timestamp: Date.now() };
            }
            if (raw === 'necessary') {
                return { necessary: true, preferences: false, analytics: false, timestamp: Date.now() };
            }
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return {
                    necessary: true,
                    preferences: parsed.preferences === true,
                    analytics: parsed.analytics === true,
                    timestamp: parsed.timestamp || Date.now()
                };
            }
        } catch (e) {}
        return null;
    }

    function showCookieToast(message) {
        let toast = document.querySelector('.cookie-toast');
        if (toast) toast.remove();
        toast = document.createElement('div');
        toast.className = 'cookie-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 400);
            }, 2500);
        });
    }

    function applyConsentSettings(consent) {
        if (!consent) return;

        // 1. Analytics consent enforcement
        const analyticsDisabled = !consent.analytics;
        window['ga-disable-G-NZFRW735QB'] = analyticsDisabled;

        if (typeof window.gtag === 'function') {
            window.gtag('consent', 'update', {
                analytics_storage: consent.analytics ? 'granted' : 'denied'
            });
        }

        // Clean up GA cookies if analytics consent is revoked
        if (analyticsDisabled) {
            try {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    const eqPos = cookie.indexOf('=');
                    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                    if (name.startsWith('_ga') || name.startsWith('_gid') || name.startsWith('_gat')) {
                        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
                        document.cookie = `${name}=; Path=/; Domain=.${window.location.hostname}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
                    }
                }
            } catch (e) {}
        }

        // 2. Preferences consent enforcement
        if (consent.preferences === false) {
            // Remove non-essential UI preferences from localStorage when consent is revoked
            try {
                localStorage.removeItem('zhukov_gallery_ratio_mode');
            } catch (e) {}
        }

        document.dispatchEvent(new CustomEvent('zhukovCookieConsentUpdated', {
            detail: consent
        }));
    }

    function showCookieConsentBanner(force = false) {
        const existingConsent = getStoredConsent();
        if (!force && existingConsent) {
            applyConsentSettings(existingConsent);
            return;
        }

        let banner = document.getElementById('cookie-consent-banner');
        if (banner) banner.remove();

        banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.className = 'cookie-consent-container';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('aria-label', 'Cookie and Data Storage Preferences');

        // When opened via settings/footer (force=true), show details open by default so user sees their saved preferences
        const isDetailsOpen = Boolean(force);
        const initialPref = existingConsent ? existingConsent.preferences === true : true;
        const initialAnalytics = existingConsent ? existingConsent.analytics === true : true;

        banner.innerHTML = `
            <div class="cookie-consent-card">
                <div class="cookie-header-row">
                    <span class="cookie-tag">PRIVACY &amp; LOCAL STORAGE</span>
                    <button class="cookie-close-btn" id="cookie-close-x" aria-label="Dismiss">&times;</button>
                </div>
                <h3 class="cookie-title">Privacy &amp; Data Storage</h3>
                <p class="cookie-desc">
                    We use local storage, session caching, and minimal cookies to deliver high-performance offline portfolios, preserve your viewing preferences, and securely authenticate studio administration.
                </p>

                <div id="cookie-details-box" class="cookie-details-content" style="${isDetailsOpen ? 'display: block;' : 'display: none;'}">
                    <div class="cookie-category-item">
                        <div class="cookie-cat-header">
                            <span class="cookie-cat-title">Strictly Necessary</span>
                            <span class="cookie-cat-status">Always Active</span>
                        </div>
                        <p class="cookie-cat-desc">
                            Required for core operations: Firebase Auth admin session, 0ms SWR caching (<code class="cookie-code">site-cache.js</code> &amp; Firestore IndexedDB), and offline Service Worker delivery.
                        </p>
                    </div>

                    <div class="cookie-category-item">
                        <div class="cookie-cat-header">
                            <span class="cookie-cat-title">Viewing Preferences</span>
                            <label class="cookie-switch" aria-label="Toggle Preferences Storage">
                                <input type="checkbox" id="cookie-pref-checkbox" ${initialPref ? 'checked' : ''}>
                                <span class="cookie-slider"></span>
                            </label>
                        </div>
                        <p class="cookie-cat-desc">
                            Stores layout and visual preferences, such as Gallery aspect ratio mode (1:1 square vs original) and light/dark theme selection.
                        </p>
                    </div>

                    <div class="cookie-category-item">
                        <div class="cookie-cat-header">
                            <span class="cookie-cat-title">Anonymous Analytics</span>
                            <label class="cookie-switch" aria-label="Toggle Analytics Storage">
                                <input type="checkbox" id="cookie-analytics-checkbox" ${initialAnalytics ? 'checked' : ''}>
                                <span class="cookie-slider"></span>
                            </label>
                        </div>
                        <p class="cookie-cat-desc">
                            Anonymous performance and traffic telemetry (Firebase Measurement) to monitor page speeds and gallery engagement without personal profiling.
                        </p>
                    </div>
                </div>

                <div class="cookie-actions">
                    <button id="cookie-accept-all-btn" class="cookie-btn cookie-btn-accept">Accept All</button>
                    <button id="cookie-save-preferences-btn" class="cookie-btn cookie-btn-secondary" style="${isDetailsOpen ? 'display: inline-block;' : 'display: none;'}">Save Preferences</button>
                    <button id="cookie-accept-necessary-btn" class="cookie-btn cookie-btn-secondary">Necessary Only</button>
                    <button id="cookie-details-toggle" class="cookie-link-btn" type="button">${isDetailsOpen ? 'Hide Details' : 'Customize'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        requestAnimationFrame(() => {
            setTimeout(() => banner.classList.add('show'), 50);
        });

        const closeBanner = (consentObj, toastMessage) => {
            localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentObj));
            applyConsentSettings(consentObj);
            banner.classList.remove('show');
            banner.classList.add('hide');
            setTimeout(() => banner.remove(), 350);
            if (toastMessage) {
                showCookieToast(toastMessage);
            }
        };

        const prefCheckbox = banner.querySelector('#cookie-pref-checkbox');
        const analyticsCheckbox = banner.querySelector('#cookie-analytics-checkbox');
        const acceptAllBtn = banner.querySelector('#cookie-accept-all-btn');
        const savePreferencesBtn = banner.querySelector('#cookie-save-preferences-btn');
        const acceptNecessaryBtn = banner.querySelector('#cookie-accept-necessary-btn');
        const closeX = banner.querySelector('#cookie-close-x');
        const detailsToggle = banner.querySelector('#cookie-details-toggle');
        const detailsBox = banner.querySelector('#cookie-details-box');

        // 1. Accept All: enables everything
        if (acceptAllBtn) {
            acceptAllBtn.addEventListener('click', () => {
                if (prefCheckbox) prefCheckbox.checked = true;
                if (analyticsCheckbox) analyticsCheckbox.checked = true;
                closeBanner({
                    necessary: true,
                    preferences: true,
                    analytics: true,
                    timestamp: Date.now()
                }, 'All cookies and local storage accepted.');
            });
        }

        // 2. Save Preferences: explicitly saves current switch states
        if (savePreferencesBtn) {
            savePreferencesBtn.addEventListener('click', () => {
                const pref = Boolean(prefCheckbox?.checked);
                const analytics = Boolean(analyticsCheckbox?.checked);
                closeBanner({
                    necessary: true,
                    preferences: pref,
                    analytics: analytics,
                    timestamp: Date.now()
                }, 'Cookie preferences saved successfully.');
            });
        }

        // 3. Necessary Only: disables non-essential
        if (acceptNecessaryBtn) {
            acceptNecessaryBtn.addEventListener('click', () => {
                if (prefCheckbox) prefCheckbox.checked = false;
                if (analyticsCheckbox) analyticsCheckbox.checked = false;
                closeBanner({
                    necessary: true,
                    preferences: false,
                    analytics: false,
                    timestamp: Date.now()
                }, 'Only strictly necessary storage enabled.');
            });
        }

        // 4. Close button
        if (closeX) {
            closeX.addEventListener('click', () => {
                banner.classList.remove('show');
                banner.classList.add('hide');
                setTimeout(() => banner.remove(), 350);
            });
        }

        // 5. Details Toggle
        if (detailsToggle && detailsBox) {
            detailsToggle.addEventListener('click', () => {
                const isHidden = detailsBox.style.display === 'none';
                detailsBox.style.display = isHidden ? 'block' : 'none';
                detailsToggle.textContent = isHidden ? 'Hide Details' : 'Customize';
                if (savePreferencesBtn) {
                    savePreferencesBtn.style.display = isHidden ? 'inline-block' : 'none';
                }
            });
        }
    }

    function initCookieConsent() {
        showCookieConsentBanner(false);
    }

    window.openCookiePreferences = () => showCookieConsentBanner(true);

    // Synchronize banner height into CSS variable --site-banner-height
    let bannerResizeObserver = null;

    function syncBannerHeight() {
        let maxBannerHeight = 0;
        document.querySelectorAll('.site-banner-container').forEach(container => {
            if (container.style.display !== 'none') {
                const h = container.offsetHeight || 0;
                if (h > maxBannerHeight) maxBannerHeight = h;
            }
        });
        document.documentElement.style.setProperty('--site-banner-height', `${maxBannerHeight}px`);
        document.body.classList.toggle('has-site-banner', maxBannerHeight > 0);
        return maxBannerHeight;
    }

    // Universal Header Banner Handler: applies BANNER_IMAGE_URL if set, or HTML src
    function updateBannerSlots() {
        let hasActiveBanner = false;

        document.querySelectorAll('.site-banner-container').forEach(container => {
            const img = container.querySelector('.site-banner-img');
            const link = container.querySelector('.site-banner-link');

            // Determine target image URL: constant at top of file takes priority, then img src
            const targetUrl = (typeof BANNER_IMAGE_URL === 'string' && BANNER_IMAGE_URL.trim() !== '')
                ? BANNER_IMAGE_URL.trim()
                : (img ? (img.getAttribute('src') || '').trim() : '');

            if (!img || !targetUrl) {
                container.style.display = 'none';
                if (img) img.removeAttribute('src');
            } else {
                hasActiveBanner = true;
                if (img.getAttribute('src') !== targetUrl) {
                    img.src = targetUrl;
                }
                if (link && typeof BANNER_DESTINATION_URL === 'string' && BANNER_DESTINATION_URL.trim() !== '') {
                    link.href = BANNER_DESTINATION_URL.trim();
                    link.style.pointerEvents = 'auto';
                    link.style.cursor = 'pointer';
                }
                container.style.display = 'block';

                if (img.complete && img.naturalHeight > 0) {
                    syncBannerHeight();
                } else {
                    img.onload = () => syncBannerHeight();
                }

                if (window.ResizeObserver && !bannerResizeObserver) {
                    bannerResizeObserver = new ResizeObserver(() => {
                        syncBannerHeight();
                    });
                    bannerResizeObserver.observe(container);
                }
            }
        });

        if (!hasActiveBanner) {
            document.documentElement.style.setProperty('--site-banner-height', '0px');
            document.body.classList.remove('has-site-banner');
        } else {
            syncBannerHeight();
        }
    }

    window.addEventListener('resize', syncBannerHeight);
    window.addEventListener('load', syncBannerHeight);

    // =========================================================================
    // Universal Floating Dark / Light Mode Switch Controller
    // =========================================================================
    function updateThemeUI(isDark) {
        const btn = document.getElementById('theme-toggle-btn');
        if (!btn) return;
        btn.classList.toggle('is-dark', isDark);
        btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        btn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        const tooltip = btn.querySelector('.theme-toggle-tooltip');
        if (tooltip) {
            tooltip.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        }
    }

    function applyTheme(theme, save = true) {
        const isDark = theme === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('theme-dark', isDark);
        if (document.body) {
            document.body.classList.toggle('theme-dark', isDark);
        }
        if (save) {
            try {
                localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
            } catch (e) { }
        }
        updateThemeUI(isDark);
        document.dispatchEvent(new CustomEvent('zhukovThemeChanged', { detail: { theme: isDark ? 'dark' : 'light' } }));
    }

    function toggleTheme() {
        const current = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
    }

    window.toggleZhukovTheme = toggleTheme;
    window.setZhukovTheme = applyTheme;

    function initThemeToggle() {
        const isDark = localStorage.getItem(THEME_KEY) === 'dark';
        applyTheme(isDark ? 'dark' : 'light', false);

        // Theme toggle button is hidden across all pages as requested

        // Listen for storage changes across tabs
        window.addEventListener('storage', (e) => {
            if (e.key === THEME_KEY) {
                applyTheme(e.newValue === 'dark' ? 'dark' : 'light', false);
            }
        });
    }

    // Auto-mount when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initThemeToggle();
            loadHeader().then(updateBannerSlots);
            loadFooter();
            initCookieConsent();
            updateBannerSlots();
        });
    } else {
        initThemeToggle();
        loadHeader().then(updateBannerSlots);
        loadFooter();
        initCookieConsent();
        updateBannerSlots();
    }
})();
