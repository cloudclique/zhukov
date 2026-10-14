// =========================================================================
// ZHUKOV Studio — Universal Modular Header & Footer Component Loader
// Loads /header.html and /footer.html into placeholder slots with 0ms cache
// =========================================================================

// =========================================================================
// BANNER CONFIGURATION (In-Page Element Under Header)
// - BANNER_IMAGE_URL: Displayed on mid & full screen ratios (desktop / tablet).
// - BANNER_MOBILE_IMAGE_URL: Displayed when in mobile ratio (phones / <= 768px).
//   (If BANNER_MOBILE_IMAGE_URL is empty, BANNER_IMAGE_URL is used as fallback).
// Leave as '' (empty) if no banner should be displayed.
// =========================================================================
const BANNER_IMAGE_URL = '';
const BANNER_MOBILE_IMAGE_URL = '';

// Optional: Link to open when the banner is clicked (leave '' if none)
const BANNER_DESTINATION_URL = 'https://zhukov.studio/moodboard/?id=qYezpeHSVaOXWVRIXaCN';

(function () {
    const HEADER_CACHE_KEY = 'zhukov_cached_header_v41';
    const FOOTER_CACHE_KEY = 'zhukov_cached_footer_v50';
    const COOKIE_CONSENT_KEY = 'zhukov_cookies_consent';
    const THEME_KEY = 'zhukov_theme';

    function ensureBannerFullWidthStyles() {
        if (document.getElementById('zhukov-banner-fullwidth-styles')) return;
        const style = document.createElement('style');
        style.id = 'zhukov-banner-fullwidth-styles';
        style.textContent = `
            .site-banner-container {
                width: 100% !important;
                min-width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
                position: relative !important;
                z-index: 10;
            }
            .site-banner-container.is-active-visible {
                display: block !important;
                visibility: visible !important;
            }
            .site-banner-single,
            .site-banner-slider {
                position: relative !important;
                width: 100% !important;
                min-width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                line-height: 0 !important;
                box-sizing: border-box !important;
            }
            .site-banner-track {
                display: flex !important;
                width: 100% !important;
                min-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                list-style: none !important;
                box-sizing: border-box !important;
                transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .site-banner-slide {
                flex: 0 0 100% !important;
                width: 100% !important;
                min-width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
            }
            .site-banner-link {
                display: block !important;
                width: 100% !important;
                min-width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
            }
            .site-banner-img {
                display: block !important;
                width: 100% !important;
                min-width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: 560px !important;
                object-fit: cover !important;
                object-position: center !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
            }
            .site-banner-nav-btn {
                position: absolute !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                width: 42px !important;
                height: 42px !important;
                border-radius: 50% !important;
                background: rgba(15, 15, 18, 0.65) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                color: #ffffff !important;
                border: 1px solid rgba(255, 255, 255, 0.3) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                font-size: 1.5rem !important;
                line-height: 1 !important;
                z-index: 25 !important;
                opacity: 0.85 !important;
                transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3) !important;
            }
            .site-banner-container:hover .site-banner-nav-btn,
            .site-banner-slider:hover .site-banner-nav-btn {
                opacity: 1 !important;
            }
            .site-banner-nav-btn:hover {
                background: rgba(15, 15, 18, 0.95) !important;
                border-color: #c5a059 !important;
                color: #c5a059 !important;
                transform: translateY(-50%) scale(1.1) !important;
            }
            .site-banner-nav-btn.prev {
                left: 1.5rem !important;
            }
            .site-banner-nav-btn.next {
                right: 1.5rem !important;
            }
            .site-banner-dots {
                position: absolute !important;
                bottom: 14px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                z-index: 25 !important;
                background: rgba(15, 15, 18, 0.5) !important;
                padding: 6px 14px !important;
                border-radius: 20px !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                pointer-events: auto !important;
            }
            .site-banner-dot {
                width: 8px !important;
                height: 8px !important;
                border-radius: 50% !important;
                background: rgba(255, 255, 255, 0.5) !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                cursor: pointer !important;
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .site-banner-dot:hover {
                background: rgba(255, 255, 255, 0.9) !important;
            }
            .site-banner-dot.active {
                background: #c5a059 !important;
                width: 24px !important;
                border-radius: 10px !important;
                box-shadow: 0 0 10px rgba(197, 160, 89, 0.6) !important;
            }
            @media (max-width: 768px) {
                .site-banner-nav-btn {
                    width: 32px !important;
                    height: 32px !important;
                    font-size: 1.15rem !important;
                    opacity: 0.75 !important;
                }
                .site-banner-nav-btn.prev { left: 0.5rem !important; }
                .site-banner-nav-btn.next { right: 0.5rem !important; }
                .site-banner-dots {
                    bottom: 8px !important;
                    padding: 4px 10px !important;
                    gap: 6px !important;
                }
                .site-banner-dot { width: 6px !important; height: 6px !important; }
                .site-banner-dot.active { width: 16px !important; }
            }
        `;
        if (document.head) {
            document.head.appendChild(style);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (!document.getElementById('zhukov-banner-fullwidth-styles') && document.head) {
                    document.head.appendChild(style);
                }
            });
        }
    }
    ensureBannerFullWidthStyles();

    // Purge legacy cache keys
    try {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('zhukov_cached_header_') && k !== HEADER_CACHE_KEY) {
                localStorage.removeItem(k);
            }
            if (k.startsWith('zhukov_cached_footer_') && k !== FOOTER_CACHE_KEY) {
                localStorage.removeItem(k);
            }
        });
        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith('zhukov_cached_header_') && k !== HEADER_CACHE_KEY) {
                sessionStorage.removeItem(k);
            }
            if (k.startsWith('zhukov_cached_footer_') && k !== FOOTER_CACHE_KEY) {
                sessionStorage.removeItem(k);
            }
        });
    } catch (e) { }

    // Immediate Light Theme & Auth State Enforcer — sets classes before first paint
    try {
        localStorage.removeItem(THEME_KEY);
        const isLoggedIn = localStorage.getItem('zhukov_logged_in') === 'true';
        const isAdmin = localStorage.getItem('zhukov_is_admin') === 'true';
        const hasMoodboards = localStorage.getItem('zhukov_has_moodboards') === 'true';
        if (isLoggedIn) document.documentElement.classList.add('is-logged-in');
        else document.documentElement.classList.remove('is-logged-in');
        if (isAdmin) document.documentElement.classList.add('is-admin');
        else document.documentElement.classList.remove('is-admin');
        if (isLoggedIn && (isAdmin || hasMoodboards)) document.documentElement.classList.add('has-moodboards');
        else document.documentElement.classList.remove('has-moodboards');
    } catch (e) { }
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('theme-dark');
    if (document.body) {
        document.body.classList.remove('theme-dark');
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
        '/mood-dash/': 'MOODBOARDS',
        '/mood-dash/index.html': 'MOODBOARDS',
        '/mood-dash.html': 'MOODBOARDS',
        '/about/': 'ABOUT ME / WORKFLOW & GEAR',
        '/about/index.html': 'ABOUT ME / WORKFLOW & GEAR',
        '/contact/': 'CONTACT / BOOKING / IMPRESS',
        '/contact/index.html': 'CONTACT / BOOKING / IMPRESS',
        '/upload/': 'CONTENT MANAGEMENT SYSTEM',
        '/upload/index.html': 'CONTENT MANAGEMENT SYSTEM',
        '/promotion/': 'SPECIAL PROMOTION',
        '/promotion/index.html': 'SPECIAL PROMOTION',
        '/promotion.html': 'SPECIAL PROMOTION'
    };

    // Determine current nav identifier
    function getCurrentNavId() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/photoshoots/archived')) return 'archived';
        if (path.includes('/photoshoots/')) return 'photoshoots';
        if (path.includes('/moodboard/')) return 'moodboard';
        if (path.includes('/mood-dash')) return 'moodboard';
        if (path.includes('/about/')) return 'about';
        if (path.includes('/contact/')) return 'contact';
        if (path.includes('/upload/')) return 'upload';
        if (path.includes('/promotion')) return 'promotion';
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
        const promotionLink = document.getElementById('promotion-nav-link');
        const moodboardLink = document.getElementById('moodboard-nav-link');

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

        if (promotionLink) {
            if (isAdmin) promotionLink.classList.remove('hidden');
            else promotionLink.classList.add('hidden');
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

        // Instant Link Prefetching for 0ms transitions across site
        document.querySelectorAll('.vogue-nav-links a').forEach(link => {
            const prefetchTarget = () => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/') && !document.querySelector(`link[rel="prefetch"][href="${href}"]`)) {
                    const prefetch = document.createElement('link');
                    prefetch.rel = 'prefetch';
                    prefetch.href = href;
                    document.head.appendChild(prefetch);
                }
            };
            link.addEventListener('mouseenter', prefetchTarget, { passive: true, once: true });
            link.addEventListener('touchstart', prefetchTarget, { passive: true, once: true });
        });

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
    window.updateHeaderAuthState = function (user, isAdmin, hasMoodboards) {
        const loginBtn = document.getElementById('login-btn-header');
        const logoutBtn = document.getElementById('logout-btn');
        const uploadLink = document.getElementById('upload-nav-link');
        const archivedLink = document.getElementById('archived-nav-link');
        const promotionLink = document.getElementById('promotion-nav-link');
        const moodboardLink = document.getElementById('moodboard-nav-link');

        if (user) {
            localStorage.setItem('zhukov_logged_in', 'true');
            if (isAdmin) localStorage.setItem('zhukov_is_admin', 'true');
            else localStorage.removeItem('zhukov_is_admin');

            document.documentElement.classList.add('is-logged-in');
            document.documentElement.classList.toggle('is-admin', !!isAdmin);

            if (isAdmin) {
                localStorage.setItem('zhukov_has_moodboards', 'true');
            } else if (hasMoodboards !== undefined) {
                if (hasMoodboards) localStorage.setItem('zhukov_has_moodboards', 'true');
                else localStorage.removeItem('zhukov_has_moodboards');
            } else if (typeof window.checkUserHasMoodboards === 'function') {
                window.checkUserHasMoodboards(user, false);
            }
            const canAccessMoodboard = Boolean(isAdmin || (hasMoodboards !== undefined ? hasMoodboards : localStorage.getItem('zhukov_has_moodboards') === 'true'));
            document.documentElement.classList.toggle('has-moodboards', canAccessMoodboard);

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
            if (promotionLink) {
                if (isAdmin) promotionLink.classList.remove('hidden');
                else promotionLink.classList.add('hidden');
            }
            if (moodboardLink) {
                if (canAccessMoodboard) moodboardLink.classList.remove('hidden');
                else moodboardLink.classList.add('hidden');
            }
        } else {
            localStorage.removeItem('zhukov_logged_in');
            localStorage.removeItem('zhukov_is_admin');
            localStorage.removeItem('zhukov_has_moodboards');
            document.documentElement.classList.remove('is-logged-in', 'is-admin', 'has-moodboards');
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (uploadLink) uploadLink.classList.add('hidden');
            if (archivedLink) archivedLink.classList.add('hidden');
            if (promotionLink) promotionLink.classList.add('hidden');
            if (moodboardLink) moodboardLink.classList.add('hidden');
        }
    };

    // Default in-memory templates for 0ms cold-start rendering without network delay
    const DEFAULT_HEADER_TEMPLATE = `<!-- Top Editorial Bar -->
<div class="vogue-top-bar" id="vogue-top-bar">
    <div class="top-bar-left">SINCE 2025</div>
    <div class="top-bar-center" id="vogue-top-bar-center">HIGH FASHION & EDITORIAL PHOTOGRAPHY</div>
    <div class="top-bar-right">GERMANY & WORLD</div>
</div>

<!-- Vogue Masthead & Sticky Navigation Header -->
<header class="vogue-header" id="vogue-header">
    <div class="vogue-masthead-container">
        <a href="/" class="brand-logo vogue-masthead-logo" aria-label="ZHUKOV Studio">
            <svg class="vogue-logo-img masthead-logo-img" viewBox="0 0 1204.4 422.6" width="188" height="66" aria-label="ZHUKOV Studio" role="img">
                <g id="zhukov-brand-logo-paths">
                    <path fill="currentColor" d="M9.1,302.7c-3.8,0-6.5-1.1-8-3.3s-1.4-5,.2-8.6L119.5,27c1.6-4.4.1-6.5-4.5-6.5h-40.9c-10.1,0-19.3,3.2-27.6,9.6-8.3,6.4-15.2,18.6-20.7,36.6l-6.1,20.4c-.8,3.6-2.7,5.3-5.7,5.3s-5.9-2.3-5.3-6.9L16,9.4c.5-6.3,2.9-9.4,6.9-9.4s3.7.7,5.3,2c1.6,1.4,4.4,2.7,8.4,4.1,4,1.4,10.3,2.1,19,2.1h90.4c3.8,0,6.5,1,8,3.1,1.5,2.1,1.4,5-.2,8.8L35.7,283.9c-1.6,4.4-.1,6.5,4.5,6.5h45.4c7.6,0,15.1-1.1,22.5-3.3s13.9-6.8,19.6-13.7,9.9-17.4,12.7-31.3l5.3-27.4c.8-3.5,2.9-5.3,6.1-5.3s5.4,2.3,4.9,6.9l-4.9,76.9c-.6,6.3-4,9.4-10.2,9.4H9.1Z"/>
                    <path fill="currentColor" d="M181.3,302.7c-4.1,0-6.1-1.5-6.1-4.5s1.8-4.1,5.3-4.9l9.4-1.6c5.7-1.1,9.5-2.6,11.2-4.5,1.8-1.9,2.7-5.7,2.7-11.5V35.2c0-5.7-.9-9.5-2.7-11.5-1.8-1.9-5.5-3.4-11.2-4.5l-9.4-1.6c-3.6-.8-5.3-2.4-5.3-4.9s2.1-4.5,6.1-4.5h74.9c4.1,0,6.1,1.6,6.1,4.9s-1.5,4-4.5,4.5l-11,1.6c-5.7.8-9.5,2.3-11.2,4.5-1.8,2.2-2.7,6.1-2.7,11.9v102.7c0,3.8,1.9,5.7,5.7,5.7h81c3.8,0,5.7-1.9,5.7-5.7V35.6c0-5.7-.9-9.7-2.7-11.9-1.8-2.2-5.5-3.7-11.2-4.5l-11-1.6c-3-.5-4.5-2.1-4.5-4.5s2-4.9,6.1-4.9h74.9c4.1,0,6.1,1.5,6.1,4.5s-1.8,4.1-5.3,4.9l-9.4,1.6c-5.7,1.1-9.5,2.6-11.2,4.5-1.8,1.9-2.7,5.7-2.7,11.5v240.5c0,5.7.9,9.5,2.7,11.5,1.8,1.9,5.5,3.4,11.2,4.5l9.4,1.6c3.5.8,5.3,2.5,5.3,4.9s-2,4.5-6.1,4.5h-74.9c-4.1,0-6.1-1.6-6.1-4.9s1.5-4,4.5-4.5l11-1.6c5.7-.8,9.5-2.3,11.2-4.5,1.8-2.2,2.7-6.1,2.7-11.9v-113.3c0-3.8-1.9-5.7-5.7-5.7h-81c-3.8,0-5.7,1.9-5.7,5.7v113.3c0,5.7.9,9.7,2.7,11.9,1.8,2.2,5.5,3.7,11.2,4.5l11,1.6c3,.5,4.5,2,4.5,4.5s-2,4.9-6.1,4.9h-74.9Z"/>
                    <path fill="currentColor" d="M503.2,306.4c-14.7,0-27.8-3.5-39.1-10.4-11.3-7-20.1-16.6-26.4-29-6.3-12.4-9.4-26.7-9.4-42.8V35.2c0-5.7-.9-9.5-2.7-11.5-1.8-1.9-5.5-3.4-11.2-4.5l-9.4-1.6c-3.5-.8-5.3-2.4-5.3-4.9s2-4.5,6.1-4.5h74.9c4.1,0,6.1,1.6,6.1,4.9s-1.5,4-4.5,4.5l-11,1.6c-5.5.8-9.1,2.3-11,4.5-1.9,2.2-2.9,6.1-2.9,11.9v189c0,20.7,4.6,36.8,13.9,48.3,9.3,11.5,22.2,17.2,38.9,17.2s30-5.7,39.3-17.2c9.3-11.5,13.9-27.5,13.9-48.3V43.8c0-14.7-4.6-22.9-13.9-24.5l-11-1.6c-3-.5-4.5-2.1-4.5-4.5s2-4.9,6.1-4.9h58.9c4.1,0,6.1,1.5,6.1,4.5s-1.8,4.1-5.3,4.9l-9.4,1.6c-9.3,1.6-13.9,9.7-13.9,24.1v180.8c0,24.8-6.7,44.7-20,59.7s-31.1,22.5-53.2,22.5h0Z"/>
                    <path fill="currentColor" d="M623.9,302.7c-4.1,0-6.1-1.5-6.1-4.5s1.8-4.1,5.3-4.9l9.4-1.6c5.7-1.1,9.5-2.6,11.2-4.5,1.8-1.9,2.7-5.7,2.7-11.5V35.2c0-5.7-.9-9.5-2.7-11.5-1.8-1.9-5.5-3.4-11.2-4.5l-9.4-1.6c-3.5-.8-5.3-2.4-5.3-4.9s2-4.5,6.1-4.5h74.9c4.1,0,6.1,1.6,6.1,4.9s-1.5,4-4.5,4.5l-11,1.6c-5.7.8-9.5,2.3-11.2,4.5-1.8,2.2-2.7,6.1-2.7,11.9v110.5c0,2.7.8,4.4,2.5,4.9,1.6.6,3.1-.4,4.5-2.9l67.1-105.1c9-13.9,8.2-21.8-2.5-23.7l-9.4-1.6c-3.5-.8-5.3-2.6-5.3-5.3s1.9-4.1,5.7-4.1h69.5c3.8,0,5.7,1.5,5.7,4.5s-1.8,4.6-5.3,4.9l-7.8.8c-8.5.8-15.4,3.3-20.9,7.4-5.5,4.1-11.6,11.5-18.4,22.1l-46.2,72.4c-2.7,4.6-2.9,9.1-.4,13.5l76.9,144.8c2.2,4.4,4.4,7.5,6.8,9.4,2.3,1.9,5.1,3.1,8.4,3.7l9.8,1.6c3.3.3,4.9,1.9,4.9,4.9s-1.9,4.5-5.7,4.5h-72.8c-3.8,0-5.7-1.5-5.7-4.5s1.8-4.4,5.3-4.9l7-.8c10.6-1.4,12.8-8,6.5-20l-58.9-112.1c-1.1-2.2-2.3-3.3-3.7-3.5-1.4-.1-2.7.9-4.1,3.1l-8.6,13.5c-1.9,2.7-3.2,5.3-3.9,7.8-.7,2.5-1,5.6-1,9.4v84.7c0,5.7.9,9.7,2.7,11.9,1.8,2.2,5.5,3.7,11.2,4.5l11,1.6c3,.5,4.5,2,4.5,4.5s-2,4.9-6.1,4.9h-74.9Z"/>
                    <path fill="currentColor" d="M904.5,306.4c-13.1,0-25.4-3.9-36.8-11.7s-21.5-18.5-30.1-32.1c-8.6-13.6-15.3-29.7-20-48.1-4.8-18.4-7.2-38.2-7.2-59.5s2.4-41,7.2-59.3c4.8-18.3,11.5-34.3,20-48.1,8.6-13.8,18.6-24.5,30.1-32.1,11.5-7.6,23.7-11.5,36.8-11.5s25.3,3.8,36.6,11.5c11.3,7.6,21.3,18.3,30.1,32.1s15.5,29.8,20.2,48.1,7.2,38,7.2,59.3-2.4,41.1-7.2,59.5c-4.8,18.4-11.5,34.4-20.2,48.1-8.7,13.6-18.8,24.3-30.1,32.1s-23.5,11.7-36.6,11.7ZM904.5,295.4c19.4,0,34.5-11.6,45.4-34.8s16.4-58.4,16.4-105.5-5.5-82.3-16.4-105.3c-10.9-23-26-34.6-45.4-34.6s-34.2,11.5-45.2,34.6c-11,23.1-16.6,58.2-16.6,105.3s5.5,82.4,16.6,105.5c11,23.2,26.1,34.8,45.2,34.8Z"/>
                    <path fill="currentColor" d="M1103.8,306.8c-1.1,0-2.3-.4-3.7-1.2-1.4-.8-2.3-2.6-2.9-5.3l-64.6-259.4c-1.9-7.6-4-13-6.3-16-2.3-3-6.2-5-11.7-6.1l-6.1-1.2c-3.8-.8-5.7-2.6-5.7-5.3s2-4.1,6.1-4.1h70c3.8,0,5.7,1.5,5.7,4.5s-2.3,4.6-6.9,4.9l-7.8.8c-4.6.3-7.6,1.7-8.8,4.3-1.2,2.6-1.2,6.9.2,12.9l47.4,196.8c.5,1.6,1.4,2.5,2.7,2.5s2-.8,2.2-2.5l47.1-188.2c3.8-15.5-.3-24.1-12.3-25.8l-6.1-.8c-4.6-.8-6.9-2.4-6.9-4.9s1.9-4.5,5.7-4.5h57.3c4.1,0,6.1,1.4,6.1,4.1s-1.9,4.5-5.7,5.3l-6.1,1.2c-5.2,1.1-9.2,3.8-12.1,8s-5.2,10.2-7.2,17.8l-63.4,255.7c-.6,2.7-1.4,4.5-2.7,5.3s-2.4,1.2-3.5,1.2h0Z"/>
                    <path fill="currentColor" d="M35.8,422.6c-4,0-7.5-.6-10.6-1.7-3.1-1.1-5.6-2.9-7.6-5.1-2-2.3-3.3-5.1-4-8.4l8.8-2.1c.8,3.2,2.4,5.5,4.7,7s5.1,2.2,8.6,2.2,7.2-.9,9.6-2.6c2.4-1.7,3.6-3.8,3.6-6.1s-.7-3.7-2.1-5-3.5-2.3-6.4-3l-9.6-2.3c-5.2-1.2-9.1-3.2-11.7-5.8s-3.8-5.9-3.8-10,.9-6.2,2.8-8.8,4.4-4.5,7.6-5.9,6.9-2.1,11-2.1,7.3.6,10.1,1.8,5,2.8,6.8,4.9c1.7,2.1,3,4.5,3.9,7.2l-8.4,2.2c-.8-2.1-2.1-3.9-4-5.6s-4.6-2.5-8.3-2.5-6.3.8-8.6,2.4c-2.3,1.6-3.4,3.6-3.4,6s.8,3.9,2.3,5.1,4,2.3,7.4,3.1l8.7,2.1c5.2,1.2,9.1,3.2,11.6,5.8,2.5,2.6,3.8,5.9,3.8,9.8s-1,6.4-2.9,9-4.6,4.7-8,6.2c-3.4,1.5-7.4,2.3-11.9,2.3h0Z"/>
                    <path fill="currentColor" d="M94.7,363.7v8h-29.8v-8h29.8ZM73.5,350h9.3v56.5c0,2.6.5,4.5,1.6,5.6,1.1,1.2,2.8,1.8,5.2,1.8s1.3,0,2.2-.2c.9-.1,1.8-.3,2.5-.4l1.9,7.9c-1,.3-2.1.6-3.3.8-1.2.2-2.4.3-3.6.3-5,0-8.9-1.3-11.7-4s-4.2-6.3-4.2-11v-57.2h0Z"/>
                    <path fill="currentColor" d="M126.1,422.1c-3.9,0-7.3-.8-10.2-2.4s-5.2-4-6.9-7.2-2.4-7.3-2.4-12.1v-36.7h9.3v35.9c0,4.4,1.2,7.9,3.5,10.4,2.3,2.5,5.5,3.8,9.6,3.8s5.2-.6,7.4-1.8c2.2-1.2,3.9-3,5.2-5.3,1.3-2.3,1.9-5.1,1.9-8.4v-34.6h9.3v57.7h-9v-14h1.2c-1.8,5.4-4.3,9.2-7.6,11.4s-7.1,3.3-11.3,3.3h0Z"/>
                    <path fill="currentColor" d="M190.7,422.6c-4.8,0-9-1.2-12.7-3.7-3.7-2.4-6.6-5.9-8.6-10.4-2.1-4.5-3.1-9.8-3.1-15.9s1-11.4,3.1-15.8c2.1-4.5,5-7.9,8.6-10.3,3.7-2.4,7.9-3.6,12.7-3.6s6.7.6,8.9,1.9,3.9,2.6,5.1,4.2c1.2,1.6,2.1,2.9,2.7,3.9h.7v-28.5h9.3v76.9h-9v-8.9h-1c-.6,1.1-1.5,2.4-2.8,4s-2.9,3-5.2,4.3-5.2,1.9-8.9,1.9h0ZM192.1,414.3c3.5,0,6.5-.9,8.9-2.8s4.2-4.4,5.5-7.7c1.2-3.3,1.9-7,1.9-11.3s-.6-8-1.8-11.2c-1.2-3.2-3-5.7-5.4-7.5-2.4-1.8-5.4-2.7-8.9-2.7s-6.7,1-9.1,2.8c-2.4,1.9-4.2,4.5-5.4,7.7-1.2,3.2-1.8,6.8-1.8,10.8s.6,7.7,1.8,11,3.1,5.9,5.5,7.9c2.4,2,5.4,2.9,9,2.9h0Z"/>
                    <path fill="currentColor" d="M238.5,354.2c-1.8,0-3.3-.6-4.5-1.8-1.3-1.2-1.9-2.6-1.9-4.3s.6-3.2,1.9-4.4c1.3-1.2,2.8-1.8,4.5-1.8s3.3.6,4.6,1.8c1.3,1.2,1.9,2.6,1.9,4.4s-.6,3.1-1.9,4.3-2.8,1.8-4.6,1.8ZM233.8,421.4v-57.7h9.3v57.7h-9.3Z"/>
                    <path fill="currentColor" d="M282.9,422.6c-5.2,0-9.8-1.2-13.8-3.7s-7-6-9.2-10.4c-2.2-4.5-3.3-9.7-3.3-15.6s1.1-11.3,3.3-15.8c2.2-4.5,5.3-8,9.2-10.5,3.9-2.5,8.5-3.7,13.8-3.7s9.9,1.2,13.8,3.7,7,6,9.2,10.5c2.2,4.5,3.3,9.8,3.3,15.8s-1.1,11.1-3.3,15.6c-2.2,4.5-5.3,8-9.2,10.4-4,2.5-8.6,3.7-13.8,3.7ZM282.9,414.3c3.9,0,7.1-1,9.6-3,2.5-2,4.4-4.6,5.6-7.9,1.2-3.2,1.8-6.8,1.8-10.6s-.6-7.4-1.8-10.7-3.1-5.9-5.6-8c-2.5-2-5.7-3-9.6-3s-7,1-9.5,3-4.3,4.7-5.5,7.9c-1.2,3.3-1.8,6.8-1.8,10.7s.6,7.3,1.8,10.6c1.2,3.2,3,5.9,5.5,7.9,2.5,2,5.6,3,9.5,3h0Z"/>
                </g>
            </svg>
        </a>
        <button id="mobile-menu-btn" class="vogue-mobile-menu-btn" aria-label="Toggle navigation menu" aria-expanded="false">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        </button>
    </div>
    <div class="vogue-nav-bar" id="header-nav-container">
        <a href="/" class="brand-logo vogue-scrolled-logo" aria-label="ZHUKOV Studio Home">
            <svg class="vogue-logo-img scrolled-logo-img" viewBox="0 0 1204.4 422.6" width="85" height="30" aria-label="ZHUKOV Studio" role="img">
                <use href="#zhukov-brand-logo-paths"></use>
            </svg>
        </a>
        <nav class="vogue-nav-links">
            <a href="/" class="vogue-nav-link" data-nav="home">Home</a>
            <a href="/photoshoots/" class="vogue-nav-link" data-nav="photoshoots">Photoshoots</a>
            <a href="/mood-dash/" id="moodboard-nav-link" class="vogue-nav-link hidden" data-nav="moodboard">Moodboard</a>
            <a href="/about/" class="vogue-nav-link" data-nav="about">About Me</a>
            <a href="/contact/" class="vogue-nav-link" data-nav="contact">Contact</a>
            <a href="/promotion/" id="promotion-nav-link" class="vogue-nav-link hidden" data-nav="promotion">Promotions</a>
            <a href="/upload/" id="upload-nav-link" class="vogue-nav-link hidden" data-nav="upload">Upload</a>
            <a href="/photoshoots/archived.html" id="archived-nav-link" class="vogue-nav-link hidden" data-nav="archived">Archived</a>
        </nav>
        <div class="vogue-nav-actions">
            <button id="login-btn-header" class="vogue-auth-btn hidden">Sign In</button>
            <button id="logout-btn" class="vogue-auth-btn hidden">Logout</button>
        </div>
    </div>
</header>
<style>
.site-banner-container { width: 100% !important; min-width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; box-sizing: border-box !important; position: relative !important; z-index: 10; }
.site-banner-single, .site-banner-slider { position: relative !important; width: 100% !important; min-width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; line-height: 0 !important; box-sizing: border-box !important; }
.site-banner-track { display: flex !important; width: 100% !important; min-width: 100% !important; margin: 0 !important; padding: 0 !important; list-style: none !important; box-sizing: border-box !important; transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1); }
.site-banner-slide { flex: 0 0 100% !important; width: 100% !important; min-width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; line-height: 0 !important; overflow: hidden !important; box-sizing: border-box !important; }
.site-banner-link { display: block !important; width: 100% !important; min-width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; line-height: 0 !important; overflow: hidden !important; box-sizing: border-box !important; }
.site-banner-img { display: block !important; width: 100% !important; min-width: 100% !important; max-width: 100% !important; height: auto !important; max-height: 560px !important; object-fit: cover !important; object-position: center !important; margin: 0 auto !important; box-sizing: border-box !important; }
.site-banner-nav-btn { position: absolute !important; top: 50% !important; transform: translateY(-50%) !important; width: 42px !important; height: 42px !important; border-radius: 50% !important; background: rgba(15, 15, 18, 0.65) !important; backdrop-filter: blur(10px) !important; -webkit-backdrop-filter: blur(10px) !important; color: #ffffff !important; border: 1px solid rgba(255, 255, 255, 0.3) !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; font-size: 1.5rem !important; line-height: 1 !important; z-index: 25 !important; opacity: 0.85 !important; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3) !important; }
.site-banner-container:hover .site-banner-nav-btn, .site-banner-slider:hover .site-banner-nav-btn { opacity: 1 !important; }
.site-banner-nav-btn:hover { background: rgba(15, 15, 18, 0.95) !important; border-color: #c5a059 !important; color: #c5a059 !important; transform: translateY(-50%) scale(1.1) !important; }
.site-banner-nav-btn.prev { left: 1.5rem !important; }
.site-banner-nav-btn.next { right: 1.5rem !important; }
.site-banner-dots { position: absolute !important; bottom: 14px !important; left: 50% !important; transform: translateX(-50%) !important; display: flex !important; align-items: center !important; gap: 8px !important; z-index: 25 !important; background: rgba(15, 15, 18, 0.5) !important; padding: 6px 14px !important; border-radius: 20px !important; backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important; border: 1px solid rgba(255, 255, 255, 0.15) !important; pointer-events: auto !important; }
.site-banner-dot { width: 8px !important; height: 8px !important; border-radius: 50% !important; background: rgba(255, 255, 255, 0.5) !important; border: none !important; padding: 0 !important; margin: 0 !important; cursor: pointer !important; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; }
.site-banner-dot:hover { background: rgba(255, 255, 255, 0.9) !important; }
.site-banner-dot.active { background: #c5a059 !important; width: 24px !important; border-radius: 10px !important; box-shadow: 0 0 10px rgba(197, 160, 89, 0.6) !important; }
@media (max-width: 768px) {
    .site-banner-nav-btn { width: 32px !important; height: 32px !important; font-size: 1.15rem !important; opacity: 0.75 !important; }
    .site-banner-nav-btn.prev { left: 0.5rem !important; }
    .site-banner-nav-btn.next { right: 0.5rem !important; }
    .site-banner-dots { bottom: 8px !important; padding: 4px 10px !important; gap: 6px !important; }
    .site-banner-dot { width: 6px !important; height: 6px !important; }
    .site-banner-dot.active { width: 16px !important; }
}
</style>
<div class="site-banner-container" id="header-banner-container">
    <a class="site-banner-link" href="">
        <img class="site-banner-img" src="" alt="Banner" loading="eager">
    </a>
</div>`;

    const DEFAULT_FOOTER_TEMPLATE = `<!-- Editorial Vogue Footer -->
<footer class="vogue-footer" id="site-footer">
    <div class="vogue-footer-container">
        <div class="footer-columns-row">
            <div class="footer-col">
                <h5 class="footer-col-heading">LOCATED IN</h5>
                <ul class="footer-info-list">
                    <li><strong>GERMANY</strong> • Available Worldwide</li>
                </ul>
            </div>
            <div class="footer-col">
                <h5 class="footer-col-heading">CONTACT</h5>
                <ul class="footer-links-list">
                    <li>
                        <a href="mailto:contact@zhukov.studio">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                            <span>contact@zhukov.studio</span>
                        </a>
                    </li>
                    <li>
                        <a href="https://t.me/zhukovstudio" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>
                            <span>zhukovstudio</span>
                        </a>
                    </li>
                </ul>
            </div>
            <div class="footer-col">
                <h5 class="footer-col-heading">SOCIAL</h5>
                <ul class="footer-links-list">
                    <li>
                        <a href="https://www.instagram.com/zhukov.studio_/" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                            <span>zhukov.studio_</span>
                        </a>
                    </li>
                    <li>
                        <a href="https://x.com/cloudclique_" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            <span>cloudclique_</span>
                        </a>
                    </li>
                </ul>
            </div>
            <div class="footer-col">
                <h5 class="footer-col-heading">LEGAL</h5>
                <ul class="footer-links-list">
                    <li><a href="/contact/#impressum">Impressum</a></li>
                    <li><button type="button" class="footer-cookie-link" id="footer-cookie-btn">Cookie Settings</button></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom-row">
            <div class="footer-copy">© 2026 ZHUKOV STUDIO. ALL RIGHTS RESERVED.</div>
            <div class="footer-meta"></div>
        </div>
    </div>
</footer>`;

    function getPreparedHeaderHtml(template) {
        const path = window.location.pathname;
        const title = PAGE_TITLES[path] || PAGE_TITLES['/' + path.replace(/^\//, '')] || 'HIGH FASHION & EDITORIAL PHOTOGRAPHY';
        const activeNav = getCurrentNavId();

        let html = template || DEFAULT_HEADER_TEMPLATE;

        // Bake in title into string before mounting to eliminate text-swap flash
        html = html.replace(
            /<div class="top-bar-center" id="vogue-top-bar-center">[\s\S]*?<\/div>/,
            `<div class="top-bar-center" id="vogue-top-bar-center">${title}</div>`
        );

        // Bake in active nav class into string before mounting
        html = html.replace(
            /(<a\s+[^>]*class="[^"]*vogue-nav-link)([^"]*)("[\s\S]*?data-nav="([^"]+)"[^>]*>)/g,
            (match, prefix, classRest, suffix, navId) => {
                let classes = ('vogue-nav-link ' + classRest).replace(/\s+active\b/g, '').trim().split(/\s+/);
                if (navId === activeNav) {
                    if (!classes.includes('active')) classes.push('active');
                }
                const classAttr = `class="${classes.join(' ')}"`;
                return match.replace(/class="[^"]*"/, classAttr);
            }
        );

        // If on moodboard or mood-dash, strip banner from string
        if (window.location.pathname.toLowerCase().includes('/moodboard') || window.location.pathname.toLowerCase().includes('/mood-dash')) {
            html = html.replace(/<div class="site-banner-container"[\s\S]*?<\/div>/gi, '');
        }

        return html;
    }

    let headerMounted = false;
    let footerMounted = false;

    function ensureSiteBannerContainer() {
        const isExcludedPage = window.location.pathname.toLowerCase().includes('/moodboard') ||
            window.location.pathname.toLowerCase().includes('/mood-dash');
        if (isExcludedPage) {
            document.querySelectorAll('.site-banner-container').forEach(el => el.remove());
            return null;
        }

        let container = document.getElementById('header-banner-container') || document.querySelector('.site-banner-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'site-banner-container';
            container.id = 'header-banner-container';
            container.style.display = 'none';

            const headerSlot = document.getElementById('site-header-slot') || document.getElementById('site-header');
            if (headerSlot && headerSlot.parentNode) {
                headerSlot.parentNode.insertBefore(container, headerSlot.nextSibling);
            } else {
                const header = document.getElementById('vogue-header');
                if (header && header.parentNode) {
                    header.parentNode.insertBefore(container, header.nextSibling);
                } else if (document.body) {
                    document.body.insertBefore(container, document.body.firstChild);
                }
            }
        } else {
            // Ensure container stays right after the header slot in standard document flow
            const headerSlot = document.getElementById('site-header-slot') || document.getElementById('site-header');
            if (headerSlot && headerSlot.parentNode && headerSlot.contains(container)) {
                headerSlot.parentNode.insertBefore(container, headerSlot.nextSibling);
            }
        }
        return container;
    }

    function relocateBannerToPageFlow() {
        const isMoodboard = window.location.pathname.toLowerCase().includes('/moodboard') || window.location.pathname.toLowerCase().includes('/mood-dash');
        if (isMoodboard) {
            document.querySelectorAll('.site-banner-container').forEach(el => el.remove());
            return;
        }

        const headerSlot = document.getElementById('site-header-slot') || document.getElementById('site-header');
        if (!headerSlot) return;

        let banner = headerSlot.querySelector('.site-banner-container') || document.getElementById('header-banner-container') || document.querySelector('.site-banner-container');
        if (!banner) {
            banner = ensureSiteBannerContainer();
        } else if (headerSlot.parentNode && headerSlot.contains(banner)) {
            headerSlot.parentNode.insertBefore(banner, headerSlot.nextSibling);
        }
    }

    // Mounts header once with 0ms flash-free prepared content
    function mountHeaderNow() {
        if (headerMounted) return;
        const headerSlot = document.getElementById('site-header-slot') || document.getElementById('site-header');
        if (!headerSlot) return;

        headerMounted = true;

        if (headerSlot.children.length === 0) {
            let raw = localStorage.getItem(HEADER_CACHE_KEY) || sessionStorage.getItem(HEADER_CACHE_KEY);
            // Integrity check: Ensure cached template contains all required standard links and site-banner-container
            if (!raw || !raw.includes('data-nav="about"') || !raw.includes('data-nav="contact"') || !raw.includes('site-banner-container')) {
                raw = DEFAULT_HEADER_TEMPLATE;
                try {
                    localStorage.setItem(HEADER_CACHE_KEY, DEFAULT_HEADER_TEMPLATE);
                    sessionStorage.setItem(HEADER_CACHE_KEY, DEFAULT_HEADER_TEMPLATE);
                } catch (e) { }
            }
            headerSlot.innerHTML = getPreparedHeaderHtml(raw);
        }

        relocateBannerToPageFlow();
        initHeaderBehavior();
        updateBannerSlots();
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

    // Mounts footer once with 0ms content and strict integrity guarantee
    function mountFooterNow() {
        if (footerMounted) return;
        const footerSlot = document.getElementById('site-footer-slot') || document.getElementById('site-footer');
        if (!footerSlot) return;

        footerMounted = true;

        if (footerSlot.children.length === 0) {
            let raw = localStorage.getItem(FOOTER_CACHE_KEY) || sessionStorage.getItem(FOOTER_CACHE_KEY);
            // Strict integrity check: cached footer must contain all 4 editorial columns & legal links
            if (!raw || !raw.includes('LOCATED IN') || !raw.includes('CONTACT') || !raw.includes('SOCIAL') || !raw.includes('LEGAL') || !raw.includes('Impressum') || !raw.includes('Cookie Settings') || !raw.includes('zhukov.studio_')) {
                raw = DEFAULT_FOOTER_TEMPLATE;
                try {
                    localStorage.setItem(FOOTER_CACHE_KEY, DEFAULT_FOOTER_TEMPLATE);
                    sessionStorage.setItem(FOOTER_CACHE_KEY, DEFAULT_FOOTER_TEMPLATE);
                } catch (e) { }
            }
            footerSlot.innerHTML = raw;
        }

        initFooterBehavior();
        document.dispatchEvent(new CustomEvent('footerLoaded', { detail: { footerSlot } }));
    }

    // Stale-while-revalidate background fetch with live DOM synchronization
    async function fetchFreshTemplates() {
        try {
            // Append version query param to bypass SW cache and ensure fresh network fetch
            const resH = await fetch('/header.html?v=' + Date.now());
            if (resH.ok) {
                const textH = await resH.text();
                // Validate completeness before updating cache
                if (textH.includes('data-nav="about"') && textH.includes('data-nav="contact"') && textH.includes('site-banner-container')) {
                    localStorage.setItem(HEADER_CACHE_KEY, textH);
                    sessionStorage.setItem(HEADER_CACHE_KEY, textH);
                    const headerSlot = document.getElementById('site-header-slot') || document.getElementById('site-header');
                    if (headerSlot && (!document.querySelector('.site-banner-container') || !headerSlot.querySelector('.vogue-header'))) {
                        headerSlot.innerHTML = getPreparedHeaderHtml(textH);
                        relocateBannerToPageFlow();
                        initHeaderBehavior();
                        updateBannerSlots();
                    }
                }
            }
        } catch (e) { }

        try {
            const resF = await fetch('/footer.html?v=' + Date.now());
            if (resF.ok) {
                const textF = await resF.text();
                if (textF.includes('site-footer') && textF.includes('LOCATED IN') && textF.includes('CONTACT') && textF.includes('SOCIAL') && textF.includes('LEGAL')) {
                    localStorage.setItem(FOOTER_CACHE_KEY, textF);
                    sessionStorage.setItem(FOOTER_CACHE_KEY, textF);
                    const footerSlot = document.getElementById('site-footer-slot') || document.getElementById('site-footer');
                    if (footerSlot && footerSlot.innerHTML !== textF) {
                        footerSlot.innerHTML = textF;
                        initFooterBehavior();
                    }
                }
            }
        } catch (e) { }
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
        } catch (e) { }
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
            } catch (e) { }
        }

        // 2. Preferences consent enforcement
        if (consent.preferences === false) {
            // Remove non-essential UI preferences from localStorage when consent is revoked
            try {
                localStorage.removeItem('zhukov_gallery_ratio_mode');
            } catch (e) { }
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
                            Stores layout and visual preferences, such as Gallery aspect ratio mode (1:1 square vs flow view) and light/dark theme selection.
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
    let bannerSliderAutoTimer = null;
    let bannerCurrentSlide = 0;
    let isBannerSliderPaused = false;

    const SITE_BANNERS_STORAGE_KEY = 'zhukov_site_banners';
    const SITE_BANNERS_SPEED_KEY = 'zhukov_site_banner_speed';

    function getStoredBannerSets() {
        try {
            const raw = localStorage.getItem(SITE_BANNERS_STORAGE_KEY);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) { }

        // Fallback to legacy single banner constants if present
        const legacyDesktop = (typeof BANNER_IMAGE_URL === 'string') ? BANNER_IMAGE_URL.trim() : '';
        const legacyMobile = (typeof BANNER_MOBILE_IMAGE_URL === 'string') ? BANNER_MOBILE_IMAGE_URL.trim() : '';
        const legacyLink = (typeof BANNER_DESTINATION_URL === 'string') ? BANNER_DESTINATION_URL.trim() : '';

        if (legacyDesktop || legacyMobile) {
            return [{
                id: 'banner_default_1',
                title: 'Featured Promotion',
                desktopUrl: legacyDesktop,
                mobileUrl: legacyMobile,
                linkEnabled: Boolean(legacyLink),
                linkUrl: legacyLink,
                openInNewTab: false,
                active: true
            }];
        }
        return [];
    }

    function getBannerAutoInterval() {
        try {
            const raw = localStorage.getItem(SITE_BANNERS_SPEED_KEY);
            if (raw !== null) {
                const val = parseInt(raw, 10);
                if (!isNaN(val)) return val;
            }
        } catch (_) { }
        return 6000;
    }

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

    // Responsive Mobile Ratio Detector (<= 768px)
    function isMobileBannerRatio() {
        return (window.innerWidth > 0 && window.innerWidth <= 768) ||
            (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    }

    function stopBannerAutoSlider() {
        if (bannerSliderAutoTimer) {
            clearInterval(bannerSliderAutoTimer);
            bannerSliderAutoTimer = null;
        }
    }

    function startBannerAutoSlider(totalSlides, interval) {
        stopBannerAutoSlider();
        if (totalSlides <= 1 || interval <= 0) return;

        bannerSliderAutoTimer = setInterval(() => {
            if (isBannerSliderPaused) return;
            window.nextSiteBannerSlide();
        }, interval);
    }

    window.goToSiteBannerSlide = function (targetIndex, e) {
        if (e && e.stopPropagation) e.stopPropagation();
        const tracks = document.querySelectorAll('.site-banner-track');
        if (tracks.length === 0) return;

        const slides = tracks[0].querySelectorAll('.site-banner-slide');
        const count = slides.length;
        if (count <= 1) return;

        bannerCurrentSlide = ((targetIndex % count) + count) % count;

        tracks.forEach(track => {
            track.style.transform = `translateX(-${bannerCurrentSlide * 100}%)`;
        });

        // Update dot states
        document.querySelectorAll('.site-banner-dots').forEach(dotsContainer => {
            dotsContainer.querySelectorAll('.site-banner-dot').forEach((dot, idx) => {
                dot.classList.toggle('active', idx === bannerCurrentSlide);
            });
        });
    };

    window.nextSiteBannerSlide = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        window.goToSiteBannerSlide(bannerCurrentSlide + 1);
    };

    window.prevSiteBannerSlide = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        window.goToSiteBannerSlide(bannerCurrentSlide - 1);
    };

    function escapeHtmlAttr(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }



    // Parse UTC Date-Time string into UTC epoch milliseconds
    function parseUtcDateTime(str) {
        if (!str || typeof str !== 'string' || !str.trim()) return null;
        const clean = str.trim();
        const utcStr = clean.endsWith('Z') ? clean : (clean.includes('T') ? (clean.length === 16 ? clean + ':00Z' : clean + 'Z') : clean + 'T00:00:00Z');
        const t = Date.parse(utcStr);
        return isNaN(t) ? null : t;
    }

    // Check whether banner is active according to its UTC schedule window
    function isBannerScheduledActive(banner) {
        if (!banner || banner.scheduleEnabled !== true) return true;
        const nowUtc = Date.now();

        if (banner.scheduleStart && typeof banner.scheduleStart === 'string' && banner.scheduleStart.trim()) {
            const startMs = parseUtcDateTime(banner.scheduleStart);
            if (startMs !== null && nowUtc < startMs) {
                return false; // Scheduled for future
            }
        }

        if (banner.scheduleEnd && typeof banner.scheduleEnd === 'string' && banner.scheduleEnd.trim()) {
            const endMs = parseUtcDateTime(banner.scheduleEnd);
            if (endMs !== null && nowUtc > endMs) {
                return false; // Expired
            }
        }

        return true;
    }

    // Check whether a banner is visible on the current page / gallery
    function isBannerVisibleOnCurrentPage(banner) {
        if (!banner || banner.active === false) return false;
        if (!isBannerScheduledActive(banner)) return false;

        // Default: 'all' or empty scope means visible on all site pages
        if (!banner.visibilityScope || banner.visibilityScope === 'all') {
            return true;
        }

        const path = window.location.pathname.toLowerCase();
        const searchParams = new URLSearchParams(window.location.search);
        const targetPages = Array.isArray(banner.targetPages) ? banner.targetPages : [];

        const isHome = path === '/' || path === '/index.html' || path === '' ||
            (path.endsWith('/index.html') && !path.includes('/about') && !path.includes('/contact') && !path.includes('/photoshoots') && !path.includes('/promotion'));
        const isAbout = path.includes('/about');
        const isContact = path.includes('/contact');
        const isPromotion = path.includes('/promotion');
        const isPhotoshootsMain = path === '/photoshoots/' || path === '/photoshoots/index.html' ||
            (path.includes('/photoshoots') && !path.includes('gallery.html') && !path.includes('archived.html'));
        const isGalleryPage = path.includes('/photoshoots/gallery.html');
        const isArchived = path.includes('/photoshoots/archived.html');

        if (isHome && targetPages.includes('home')) return true;
        if (isAbout && targetPages.includes('about')) return true;
        if (isContact && targetPages.includes('contact')) return true;
        if (isPromotion && targetPages.includes('promotion')) return true;

        if (targetPages.includes('photoshoots')) {
            // If all galleries are selected or no scope specified:
            if (!banner.galleriesScope || banner.galleriesScope === 'all') {
                if (isPhotoshootsMain || isGalleryPage || isArchived) return true;
            } else if (banner.galleriesScope === 'specific') {
                const targetGalleries = Array.isArray(banner.targetGalleries) ? banner.targetGalleries : [];

                // If visiting the main photoshoots catalog or archive page:
                if (isPhotoshootsMain || isArchived) {
                    if (targetGalleries.includes('main_catalog') || targetGalleries.includes('all_galleries') || targetGalleries.includes('archived')) {
                        return true;
                    }
                }

                // If visiting a specific photoshoot gallery (e.g. /photoshoots/gallery.html?id=XYZ):
                if (isGalleryPage) {
                    const currentId = searchParams.get('id');
                    if (currentId && targetGalleries.includes(currentId)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Universal Header Banner Handler: Multiple Sets with Horizontal Carousel Scrolling
    function updateBannerSlots() {
        // Exclude banner completely on moodboard & mood-dash pages
        const isExcludedPage = window.location.pathname.toLowerCase().includes('/moodboard') ||
            window.location.pathname.toLowerCase().includes('/mood-dash');

        if (isExcludedPage) {
            document.querySelectorAll('.site-banner-container').forEach(container => {
                container.style.display = 'none';
                container.classList.remove('is-active-visible');
            });
            document.documentElement.style.setProperty('--site-banner-height', '0px');
            document.body.classList.remove('has-site-banner');
            stopBannerAutoSlider();
            return;
        }

        ensureBannerFullWidthStyles();
        ensureSiteBannerContainer();

        const isMobile = isMobileBannerRatio();
        const allSets = getStoredBannerSets();
        const activeSets = allSets.filter(b => b && b.active !== false && (b.desktopUrl || b.mobileUrl) && isBannerVisibleOnCurrentPage(b));

        const containers = document.querySelectorAll('.site-banner-container');
        if (activeSets.length === 0) {
            containers.forEach(container => {
                container.style.display = 'none';
                container.classList.remove('is-active-visible');
                container.innerHTML = '';
            });
            document.documentElement.style.setProperty('--site-banner-height', '0px');
            document.body.classList.remove('has-site-banner');
            stopBannerAutoSlider();
            return;
        }

        containers.forEach(container => {
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.classList.add('is-active-visible');

            if (activeSets.length === 1) {
                // Single Banner Set: clean static display without slider overhead
                const b = activeSets[0];
                const targetUrl = isMobile ? (b.mobileUrl || b.desktopUrl) : (b.desktopUrl || b.mobileUrl);
                const hasLink = Boolean(b.linkEnabled && b.linkUrl && b.linkUrl.trim() !== '');
                const targetBlank = b.openInNewTab ? 'target="_blank" rel="noopener"' : '';

                container.innerHTML = `
                    <div class="site-banner-single">
                        ${hasLink ? `<a class="site-banner-link" href="${escapeHtmlAttr(b.linkUrl.trim())}" ${targetBlank}>` : `<div class="site-banner-link is-inert">`}
                            <img class="site-banner-img" src="${escapeHtmlAttr(targetUrl)}" alt="${escapeHtmlAttr(b.altText || b.title || 'Site Banner')}" loading="eager">
                        ${hasLink ? `</a>` : `</div>`}
                    </div>
                `;
            } else {
                // Multiple Banner Sets: Horizontal Sliding Carousel
                let slidesHtml = '';
                let dotsHtml = '';

                activeSets.forEach((b, idx) => {
                    const targetUrl = isMobile ? (b.mobileUrl || b.desktopUrl) : (b.desktopUrl || b.mobileUrl);
                    const hasLink = Boolean(b.linkEnabled && b.linkUrl && b.linkUrl.trim() !== '');
                    const targetBlank = b.openInNewTab ? 'target="_blank" rel="noopener"' : '';
                    const isActive = idx === bannerCurrentSlide;

                    slidesHtml += `
                        <li class="site-banner-slide ${isActive ? 'active' : ''}" data-slide-index="${idx}">
                            ${hasLink ? `<a class="site-banner-link" href="${escapeHtmlAttr(b.linkUrl.trim())}" ${targetBlank}>` : `<div class="site-banner-link is-inert">`}
                                <img class="site-banner-img" src="${escapeHtmlAttr(targetUrl)}" alt="${escapeHtmlAttr(b.altText || b.title || `Site Banner ${idx + 1}`)}" loading="eager">
                            ${hasLink ? `</a>` : `</div>`}
                        </li>
                    `;

                    dotsHtml += `
                        <button type="button" class="site-banner-dot ${isActive ? 'active' : ''}" data-dot-index="${idx}" onclick="window.goToSiteBannerSlide(${idx}, event)" aria-label="Go to slide ${idx + 1}"></button>
                    `;
                });

                container.innerHTML = `
                    <div class="site-banner-slider" id="site-banner-slider">
                        <ul class="site-banner-track" id="site-banner-track" style="transform: translateX(-${bannerCurrentSlide * 100}%);">
                            ${slidesHtml}
                        </ul>
                        <button type="button" class="site-banner-nav-btn prev" aria-label="Previous banner" onclick="window.prevSiteBannerSlide(event)">‹</button>
                        <button type="button" class="site-banner-nav-btn next" aria-label="Next banner" onclick="window.nextSiteBannerSlide(event)">›</button>
                        <div class="site-banner-dots">
                            ${dotsHtml}
                        </div>
                    </div>
                `;

                // Pause on hover
                const sliderEl = container.querySelector('.site-banner-slider');
                if (sliderEl) {
                    sliderEl.addEventListener('mouseenter', () => { isBannerSliderPaused = true; });
                    sliderEl.addEventListener('mouseleave', () => { isBannerSliderPaused = false; });

                    // Mobile touch swipe gestures
                    let touchStartX = 0;
                    let touchStartY = 0;
                    sliderEl.addEventListener('touchstart', (e) => {
                        if (e.touches && e.touches[0]) {
                            touchStartX = e.touches[0].clientX;
                            touchStartY = e.touches[0].clientY;
                            isBannerSliderPaused = true;
                        }
                    }, { passive: true });

                    sliderEl.addEventListener('touchend', (e) => {
                        isBannerSliderPaused = false;
                        if (e.changedTouches && e.changedTouches[0]) {
                            const diffX = e.changedTouches[0].clientX - touchStartX;
                            const diffY = e.changedTouches[0].clientY - touchStartY;
                            if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
                                if (diffX < 0) window.nextSiteBannerSlide();
                                else window.prevSiteBannerSlide();
                            }
                        }
                    }, { passive: true });
                }
            }

            // Sync image loading and ResizeObserver
            const imgs = container.querySelectorAll('.site-banner-img');
            imgs.forEach(img => {
                if (img.complete && img.naturalHeight > 0) {
                    syncBannerHeight();
                } else {
                    img.addEventListener('load', () => syncBannerHeight(), { once: true });
                }
            });

            if (window.ResizeObserver && !bannerResizeObserver) {
                bannerResizeObserver = new ResizeObserver(() => syncBannerHeight());
                bannerResizeObserver.observe(container);
            }
        });

        syncBannerHeight();

        // Start auto-slide if multiple banner sets exist
        if (activeSets.length > 1) {
            startBannerAutoSlider(activeSets.length, getBannerAutoInterval());
        } else {
            stopBannerAutoSlider();
        }
    }

    // Expose programmatic update to other scripts
    window.updateSiteBannerSlots = updateBannerSlots;
    window.updateSiteBanners = function (newBanners, newSpeed) {
        if (Array.isArray(newBanners)) {
            localStorage.setItem(SITE_BANNERS_STORAGE_KEY, JSON.stringify(newBanners));
        }
        if (typeof newSpeed === 'number') {
            localStorage.setItem(SITE_BANNERS_SPEED_KEY, String(newSpeed));
        }
        bannerCurrentSlide = 0;
        updateBannerSlots();
    };

    // Stale-while-revalidate background sync with Firestore cloud settings
    async function syncCloudBanners() {
        try {
            const res = await fetch('https://firestore.googleapis.com/v1/projects/zhukovphotograpy/databases/(default)/documents/settings/site_banners?t=' + Date.now());
            if (res.ok) {
                const docData = await res.json();
                if (docData && docData.fields) {
                    let cloudBanners = null;
                    if (docData.fields.bannersJson && docData.fields.bannersJson.stringValue) {
                        try { cloudBanners = JSON.parse(docData.fields.bannersJson.stringValue); } catch (_) { }
                    }
                    if (!Array.isArray(cloudBanners) && docData.fields.banners && docData.fields.banners.arrayValue && docData.fields.banners.arrayValue.values) {
                        try {
                            cloudBanners = docData.fields.banners.arrayValue.values.map(v => {
                                const f = v.mapValue?.fields || {};
                                return {
                                    id: f.id?.stringValue || '',
                                    title: f.title?.stringValue || '',
                                    desktopUrl: f.desktopUrl?.stringValue || '',
                                    mobileUrl: f.mobileUrl?.stringValue || '',
                                    linkEnabled: f.linkEnabled ? f.linkEnabled.booleanValue : false,
                                    linkUrl: f.linkUrl?.stringValue || '',
                                    openInNewTab: f.openInNewTab ? f.openInNewTab.booleanValue : false,
                                    visibilityScope: f.visibilityScope?.stringValue || 'all',
                                    targetPages: f.targetPages?.arrayValue?.values?.map(p => p.stringValue) || [],
                                    galleriesScope: f.galleriesScope?.stringValue || 'all',
                                    targetGalleries: f.targetGalleries?.arrayValue?.values?.map(g => g.stringValue) || [],
                                    scheduleEnabled: f.scheduleEnabled ? f.scheduleEnabled.booleanValue : false,
                                    scheduleStart: f.scheduleStart?.stringValue || '',
                                    scheduleEnd: f.scheduleEnd?.stringValue || '',
                                    altText: f.altText?.stringValue || '',
                                    active: f.active ? f.active.booleanValue : true
                                };
                            });
                        } catch (_) { }
                    }
                    if (Array.isArray(cloudBanners)) {
                        localStorage.setItem(SITE_BANNERS_STORAGE_KEY, JSON.stringify(cloudBanners));
                    }
                    if (docData.fields.autoScrollInterval && docData.fields.autoScrollInterval.integerValue) {
                        localStorage.setItem(SITE_BANNERS_SPEED_KEY, docData.fields.autoScrollInterval.integerValue);
                    }
                    updateBannerSlots();
                }
            }
        } catch (_) { }
    }
    syncCloudBanners();
    setTimeout(syncCloudBanners, 600);

    window.addEventListener('resize', () => updateBannerSlots());
    window.addEventListener('orientationchange', () => updateBannerSlots());
    window.addEventListener('load', () => updateBannerSlots());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) updateBannerSlots(); });
    setInterval(() => updateBannerSlots(), 45000); // Periodically check for scheduled banner starts and expirations

    const bannerMobileMql = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;
    if (bannerMobileMql) {
        if (bannerMobileMql.addEventListener) {
            bannerMobileMql.addEventListener('change', () => updateBannerSlots());
        } else if (bannerMobileMql.addListener) {
            bannerMobileMql.addListener(() => updateBannerSlots());
        }
    }

    // =========================================================================
    // =========================================================================
    // Light Mode Enforcer (Dark page style permanently removed from all pages)
    // =========================================================================
    function updateThemeUI() {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            btn.style.display = 'none';
        }
    }

    function applyTheme() {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('theme-dark');
        if (document.body) {
            document.body.classList.remove('theme-dark');
        }
        try {
            localStorage.removeItem(THEME_KEY);
        } catch (e) { }
        updateThemeUI();
        document.dispatchEvent(new CustomEvent('zhukovThemeChanged', { detail: { theme: 'light' } }));
    }

    function toggleTheme() {
        applyTheme();
    }

    window.toggleZhukovTheme = toggleTheme;
    window.setZhukovTheme = applyTheme;

    function initThemeToggle() {
        applyTheme();

        // Listen for storage changes across tabs to keep light theme synchronized
        window.addEventListener('storage', (e) => {
            if (e.key === THEME_KEY) {
                applyTheme();
            }
        });
    }

    // Immediate streaming observer mounts header and footer before first paint
    const componentObserver = new MutationObserver(() => {
        if (!headerMounted && (document.getElementById('site-header-slot') || document.getElementById('site-header'))) {
            mountHeaderNow();
        }
        if (!footerMounted && (document.getElementById('site-footer-slot') || document.getElementById('site-footer'))) {
            mountFooterNow();
        }
        if (headerMounted && footerMounted) {
            componentObserver.disconnect();
        }
    });

    if (document.documentElement) {
        componentObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Try synchronous mount immediately
    mountHeaderNow();
    mountFooterNow();

    function onDOMReady() {
        componentObserver.disconnect();
        mountHeaderNow();
        mountFooterNow();
        initThemeToggle();
        initCookieConsent();
        updateBannerSlots();
        syncCloudBanners();
        fetchFreshTemplates();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
        onDOMReady();
    }
})();
