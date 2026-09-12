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
    const FOOTER_CACHE_KEY = 'zhukov_cached_footer_v18';
    const COOKIE_CONSENT_KEY = 'zhukov_cookies_consent';

    // Page-specific top bar text mapping
    const PAGE_TITLES = {
        '/': 'FASHION & GLAMOUR & PORTRAITURE',
        '/index.html': 'FASHION & GLAMOUR & PORTRAITURE',
        '/photoshoots/': 'CURATED PORTFOLIO & PHOTOSHOOTS',
        '/photoshoots/index.html': 'CURATED PORTFOLIO & PHOTOSHOOTS',
        '/photoshoots/gallery.html': 'EDITORIAL MAGAZINE SPREAD',
        '/photoshoots/archived.html': 'ADMINISTRATIVE ARCHIVE',
        '/moodboard/': 'MOODBOARD STUDIO',
        '/moodboard/index.html': 'MOODBOARD STUDIO',
        '/about/': 'STUDIO PROFILE & ROADMAP',
        '/about/index.html': 'STUDIO PROFILE & ROADMAP',
        '/contact/': 'EDITORIAL & PRIVATE BOOKINGS',
        '/contact/index.html': 'EDITORIAL & PRIVATE BOOKINGS',
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
        }

        function syncHeaderHeight() {
            const slot = document.getElementById('site-header-slot');
            if (slot && window.innerWidth > 768 && !isScrolled) {
                const h = slot.offsetHeight;
                if (h > 150) {
                    document.documentElement.style.setProperty('--site-header-unscrolled-height', `${h}px`);
                }
            }
        }
        syncHeaderHeight();
        window.addEventListener('resize', syncHeaderHeight);

        // Wheel interceptor: first scroll from top shrinks header while anchoring content right beneath it
        window.addEventListener('wheel', (e) => {
            const winScroll = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;

            // At very top, first scroll down only shrinks header and anchors top element to bottom of shrunk header
            if (!isScrolled && winScroll <= 1 && e.deltaY > 0) {
                e.preventDefault();
                setScrolledState(true);
                window.scrollTo(0, 0);
                return;
            }

            // At very top, scrolling up expands header and anchors top element to bottom of extended header
            if (isScrolled && winScroll <= 0 && e.deltaY < 0) {
                e.preventDefault();
                setScrolledState(false);
                window.scrollTo(0, 0);
                return;
            }
        }, { passive: false });

        // Touch gesture handler for mobile devices
        let touchStartY = 0;
        window.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length === 1) {
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!e.touches || e.touches.length !== 1) return;
            const currentY = e.touches[0].clientY;
            const deltaY = touchStartY - currentY;
            const winScroll = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;

            if (!isScrolled && winScroll <= 1 && deltaY > 15) {
                setScrolledState(true);
            } else if (isScrolled && winScroll <= 0 && deltaY < -15) {
                setScrolledState(false);
            }
        }, { passive: true });

        // Standard scroll handler (for keyboard navigation, scrollbar drag, hash links)
        let ticking = false;
        function updateScrollState() {
            const dv = document.getElementById('dashboard-view');
            const dvScroll = dv ? dv.scrollTop : 0;
            const winScroll = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
            const scrollY = Math.max(dvScroll, winScroll);

            if (!isScrolled && scrollY > 20) {
                setScrolledState(true);
            } else if (isScrolled && scrollY <= 0) {
                setScrolledState(false);
            }
            ticking = false;
        }

        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(updateScrollState);
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('scroll', onScroll, { passive: true });

        const dv = document.getElementById('dashboard-view');
        if (dv) {
            dv.addEventListener('scroll', onScroll, { passive: true });
        }

        updateScrollState();

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

    // Load Footer Component
    async function loadFooter() {
        const footerSlot = document.getElementById('site-footer-slot') || document.getElementById('site-footer');
        if (!footerSlot) return;

        // Instant render from cache if available
        const cached = sessionStorage.getItem(FOOTER_CACHE_KEY);
        if (cached && footerSlot.children.length === 0) {
            footerSlot.innerHTML = cached;
        }

        // Fetch fresh footer
        try {
            const res = await fetch('/footer.html?v=' + Date.now());
            if (res.ok) {
                const html = await res.text();
                if (html !== cached || footerSlot.children.length === 0) {
                    sessionStorage.setItem(FOOTER_CACHE_KEY, html);
                    footerSlot.innerHTML = html;
                }
            }
        } catch (err) {
            console.warn('Could not fetch /footer.html:', err);
        }

        document.dispatchEvent(new CustomEvent('footerLoaded', { detail: { footerSlot } }));
    }

    // Necessary Cookies Consent Banner for first-time visitors
    function initCookieConsent() {
        if (localStorage.getItem(COOKIE_CONSENT_KEY)) return;
        if (document.getElementById('cookie-consent-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.className = 'cookie-consent-container';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('aria-label', 'Cookie Consent');
        banner.innerHTML = `
            <div class="cookie-consent-card">
                <div class="cookie-header-row">
                    <span class="cookie-tag">PRIVACY &amp; SECURITY</span>
                    <button class="cookie-close-btn" id="cookie-close-x" aria-label="Dismiss">&times;</button>
                </div>
                <h3 class="cookie-title">Necessary Cookies</h3>
                <p class="cookie-desc">
                    We use strictly necessary cookies and local storage to enable core site features, secure authentication, and layout preferences. No tracking or marketing cookies are used.
                </p>
                <div class="cookie-actions">
                    <button id="cookie-accept-btn" class="cookie-btn cookie-btn-accept">Accept Necessary</button>
                    <button id="cookie-details-toggle" class="cookie-link-btn" type="button">Details</button>
                </div>
                <div id="cookie-details-box" class="cookie-details-content" style="display: none;">
                    <ul>
                        <li><strong>Authentication:</strong> Firebase authentication session</li>
                        <li><strong>Preferences:</strong> Local UI preferences &amp; fast modular caching</li>
                        <li><strong>Performance:</strong> High-speed offline asset delivery</li>
                    </ul>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        setTimeout(() => {
            banner.classList.add('show');
        }, 500);

        const closeConsent = () => {
            localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
            banner.classList.remove('show');
            banner.classList.add('hide');
            setTimeout(() => {
                banner.remove();
            }, 350);
        };

        const acceptBtn = banner.querySelector('#cookie-accept-btn');
        if (acceptBtn) acceptBtn.addEventListener('click', closeConsent);

        const closeX = banner.querySelector('#cookie-close-x');
        if (closeX) closeX.addEventListener('click', closeConsent);

        const detailsToggle = banner.querySelector('#cookie-details-toggle');
        const detailsBox = banner.querySelector('#cookie-details-box');
        if (detailsToggle && detailsBox) {
            detailsToggle.addEventListener('click', () => {
                const isHidden = detailsBox.style.display === 'none';
                detailsBox.style.display = isHidden ? 'block' : 'none';
                detailsToggle.textContent = isHidden ? 'Hide Details' : 'Details';
            });
        }
    }

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

    // Auto-mount when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadHeader().then(updateBannerSlots);
            loadFooter();
            initCookieConsent();
            updateBannerSlots();
        });
    } else {
        loadHeader().then(updateBannerSlots);
        loadFooter();
        initCookieConsent();
        updateBannerSlots();
    }
})();
