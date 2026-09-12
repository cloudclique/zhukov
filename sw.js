// ==========================================================
// ZHUKOV Studio - Service Worker & Asset Caching Engine
// ==========================================================

const CACHE_NAME_STATIC = 'zhukov-static-v37';
const CACHE_NAME_IMAGES = 'zhukov-images-v1';

// Core static assets to pre-cache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/header.html',
    '/footer.html',
    '/site-components.js',
    '/styles.css',
    '/script.js',
    '/site-cache.js',
    '/photoshoots/',
    '/photoshoots/index.html',
    '/photoshoots/photoshoots.css',
    '/photoshoots/script.js',
    '/photoshoots/gallery.html',
    '/photoshoots/gallery.css',
    '/photoshoots/gallery.js',
    '/photoshoots/archived.html',
    '/photoshoots/archived.js',
    '/about/',
    '/about/index.html',
    '/about/about.css',
    '/about/about.js',
    '/contact/',
    '/contact/index.html',
    '/contact/contact.css',
    '/upload/',
    '/upload/index.html',
    '/upload/upload.css',
    '/upload/upload.js',
    '/moodboard/',
    '/moodboard/index.html',
    '/moodboard/moodboard.css',
    '/moodboard/moodboard.js'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME_STATIC).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('SW Precache non-critical item failed:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME_STATIC && name !== CACHE_NAME_IMAGES) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Bypass non-GET requests, Firebase APIs, Auth endpoints, and Firestore
    if (request.method !== 'GET') return;
    if (url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('firebaseinstallations.googleapis.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('securetoken.googleapis.com') ||
        url.hostname.includes('google-analytics.com')) {
        return;
    }

    // 1. Image Caching Strategy: Cache-First with Network Fallback
    const isImage = request.destination === 'image' || 
                    url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)$/i) ||
                    url.hostname.includes('ibb.co') ||
                    url.hostname.includes('firebasestorage.googleapis.com');

    if (isImage) {
        event.respondWith(
            caches.open(CACHE_NAME_IMAGES).then(async (cache) => {
                const cachedResponse = await cache.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }

                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (err) {
                    return cachedResponse || Response.error();
                }
            })
        );
        return;
    }

    // 2. Google Fonts: Cache-First
    if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
        event.respondWith(
            caches.open(CACHE_NAME_STATIC).then(async (cache) => {
                const cached = await cache.match(request);
                if (cached) return cached;
                const fetched = await fetch(request);
                if (fetched && fetched.status === 200) {
                    cache.put(request, fetched.clone());
                }
                return fetched;
            })
        );
        return;
    }

    // 3. Static Assets & Pages: Stale-While-Revalidate
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.open(CACHE_NAME_STATIC).then(async (cache) => {
                const cached = await cache.match(request);
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => cached);

                return cached || fetchPromise;
            })
        );
    }
});
