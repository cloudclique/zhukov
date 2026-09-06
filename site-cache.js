// ==========================================================
// ZHUKOV Studio - High-Performance Local Cache & Memory Engine
// ==========================================================

const CACHE_PREFIX = 'zhukov_mem_';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-Memory Fast Cache Map (Fastest Tier: 0ms RAM lookup)
const memoryCache = new Map();

/**
 * Retrieve cached JSON data from memory or localStorage.
 * @param {string} key Cache key identifier
 * @param {number} [maxAgeMs] Optional max age in milliseconds (defaults to item's stored TTL or 24h)
 * @returns {any|null} Parsed data if fresh or valid, otherwise null
 */
export function getCachedData(key, maxAgeMs = DEFAULT_TTL_MS) {
    const fullKey = CACHE_PREFIX + key;

    // 1. Check in-memory RAM cache first
    if (memoryCache.has(fullKey)) {
        const memEntry = memoryCache.get(fullKey);
        if (Date.now() - memEntry.timestamp < (memEntry.ttl || maxAgeMs)) {
            return memEntry.data;
        }
        memoryCache.delete(fullKey);
    }

    // 2. Check localStorage
    try {
        const raw = localStorage.getItem(fullKey);
        if (!raw) return null;

        const entry = JSON.parse(raw);
        if (!entry || typeof entry !== 'object' || !entry.timestamp) return null;

        const age = Date.now() - entry.timestamp;
        const ttl = entry.ttl || maxAgeMs;

        if (age < ttl) {
            // Populate memory cache for rapid repeat access
            memoryCache.set(fullKey, entry);
            return entry.data;
        } else {
            // Expired
            localStorage.removeItem(fullKey);
            return null;
        }
    } catch (err) {
        console.warn('Cache read error for key:', key, err);
        return null;
    }
}

/**
 * Save data to memory and localStorage with TTL.
 * @param {string} key Cache key identifier
 * @param {any} data Any JSON-serializable data
 * @param {number} [ttlMs] Time to live in milliseconds
 */
export function setCachedData(key, data, ttlMs = DEFAULT_TTL_MS) {
    const fullKey = CACHE_PREFIX + key;
    const entry = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs
    };

    // Store in RAM
    memoryCache.set(fullKey, entry);

    // Store in LocalStorage with automatic cleanup on QuotaExceeded
    try {
        localStorage.setItem(fullKey, JSON.stringify(entry));
    } catch (err) {
        if (err.name === 'QuotaExceededError' || err.code === 22) {
            console.warn('Storage quota exceeded. Pruning older cache entries...');
            pruneOldCache();
            try {
                localStorage.setItem(fullKey, JSON.stringify(entry));
            } catch (retryErr) {
                console.warn('Failed to cache after pruning:', retryErr);
            }
        } else {
            console.warn('Cache write error for key:', key, err);
        }
    }
}

/**
 * Invalidate cached items matching a specific key or prefix pattern.
 * @param {string} [pattern] Key string or regex-like prefix. If omitted, clears all zhukov cache.
 */
export function invalidateCache(pattern = '') {
    // Clear RAM
    for (const k of memoryCache.keys()) {
        if (!pattern || k.includes(pattern)) {
            memoryCache.delete(k);
        }
    }

    // Clear LocalStorage
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(CACHE_PREFIX)) {
                if (!pattern || k.includes(pattern)) {
                    keysToRemove.push(k);
                }
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (err) {
        console.warn('Cache invalidation error:', err);
    }
}

/**
 * Prune oldest cache entries to free up space.
 */
function pruneOldCache() {
    try {
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(CACHE_PREFIX)) {
                try {
                    const parsed = JSON.parse(localStorage.getItem(k) || '{}');
                    entries.push({ key: k, timestamp: parsed.timestamp || 0 });
                } catch (e) {
                    entries.push({ key: k, timestamp: 0 });
                }
            }
        }

        // Sort oldest first
        entries.sort((a, b) => a.timestamp - b.timestamp);

        // Remove oldest 50%
        const toRemove = entries.slice(0, Math.ceil(entries.length / 2));
        toRemove.forEach(e => {
            localStorage.removeItem(e.key);
            memoryCache.delete(e.key);
        });
    } catch (err) {
        console.warn('Pruning error:', err);
    }
}

/**
 * Fast deep/structural equality check between two objects/arrays.
 * Used for SWR to prevent re-rendering when fetched data matches cached data.
 */
export function isDataEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch (e) {
        return false;
    }
}

/**
 * Register Site Service Worker for offline asset and image caching.
 */
export function registerSiteServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(reg => {
                    reg.onupdatefound = () => {
                        const installingWorker = reg.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('ZHUKOV Cache: New resources installed in background.');
                                }
                            };
                        }
                    };
                })
                .catch(err => {
                    console.log('ZHUKOV SW Registration note:', err.message || err);
                });
        });
    }
}
