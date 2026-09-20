import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { app } from "./firebase-config.js";

// Cloudflare R2 Storage Service Utility
// Handles interactions with the Cloudflare Worker managing the R2 bucket.

export const CLOUDFLARE_WORKER_URL = 'https://zhukov-studio.dener4826.workers.dev';

/**
 * Checks whether a URL or key represents an image stored in the Cloudflare R2 bucket.
 * @param {string} urlOrKey
 * @returns {boolean}
 */
export function isCloudflareUrl(urlOrKey) {
    if (!urlOrKey || typeof urlOrKey !== 'string') return false;
    const s = urlOrKey.trim();
    if (!s) return false;

    // Direct match against known Cloudflare Worker or R2 public endpoints
    if (s.includes('workers.dev') || s.includes('r2.dev') || s.includes('zhukov-studio')) {
        return true;
    }

    // If it's a relative path or bare filename (and not an external http link or data URI)
    if (!s.startsWith('http://') && !s.startsWith('https://') && !s.startsWith('data:') && !s.startsWith('blob:')) {
        return true;
    }

    return false;
}

/**
 * Extracts the storage key from a Cloudflare R2 direct URL or key string.
 * @param {string} urlOrKey
 * @returns {string|null}
 */
export function extractR2Key(urlOrKey) {
    if (!urlOrKey || typeof urlOrKey !== 'string') return null;
    let s = urlOrKey.trim();
    if (!s) return null;

    if (s.startsWith('http://') || s.startsWith('https://')) {
        try {
            const parsed = new URL(s);
            s = parsed.pathname;
        } catch (_) {}
    }

    // Strip leading slashes
    s = s.replace(/^\/+/, '');

    // Decode URI component (e.g. %20 -> space)
    try {
        s = decodeURIComponent(s);
    } catch (_) {}

    return s || null;
}

/**
 * Deletes one or multiple images from the Cloudflare R2 bucket.
 * Accepts a single URL/key or an array of URLs/keys.
 * Non-Cloudflare URLs are safely ignored.
 *
 * @param {string|string[]} urlsOrKeys
 * @returns {Promise<{ success: boolean, deletedCount: number, error?: string }>}
 */
export async function deleteFromCloudflare(urlsOrKeys) {
    const list = Array.isArray(urlsOrKeys) ? urlsOrKeys : [urlsOrKeys];
    const cfTargets = list.filter(isCloudflareUrl);

    if (cfTargets.length === 0) {
        return { success: true, deletedCount: 0 };
    }

    try {
        // Retrieve current admin user's Firebase Auth ID token
        let idToken = null;
        try {
            const auth = getAuth(app);
            if (auth && auth.currentUser) {
                idToken = await auth.currentUser.getIdToken();
            }
        } catch (authErr) {
            console.warn("Could not retrieve Firebase Auth token for Cloudflare delete:", authErr);
        }

        const headers = {
            'Content-Type': 'application/json'
        };
        if (idToken) {
            headers['Authorization'] = `Bearer ${idToken}`;
        }

        // Use POST with JSON body as primary method:
        // 1. Fully supported by standard CORS configurations
        // 2. Avoids preflight issues where DELETE is rejected by older worker deployments
        let res;
        try {
            res = await fetch(CLOUDFLARE_WORKER_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify({ urls: cfTargets })
            });
        } catch (postErr) {
            // Attempt DELETE as fallback in case POST was blocked
            res = await fetch(CLOUDFLARE_WORKER_URL, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ urls: cfTargets })
            });
        }

        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            return {
                success: true,
                deletedCount: typeof data.deletedCount === 'number' ? data.deletedCount : cfTargets.length
            };
        }

        const errData = await res.json().catch(() => ({}));
        console.warn("Cloudflare R2 image deletion reported error:", errData);
        return {
            success: false,
            deletedCount: 0,
            error: errData.error || `HTTP ${res.status}`
        };
    } catch (err) {
        console.warn("Network or execution error while deleting from Cloudflare R2:", err);
        return {
            success: false,
            deletedCount: 0,
            error: err.message || String(err)
        };
    }
}
