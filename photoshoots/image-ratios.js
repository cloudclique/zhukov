// Aspect-ratio cache for masonry layouts.
// Knowing every image's ratio up-front lets the layout be computed ONCE with the
// final geometry, so images fade into fixed slots instead of the grid reshuffling.
const STORAGE_KEY = 'zhukov_img_ratios_v1';
const MAX_ENTRIES = 1500;

let store = {};
try {
    store = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
} catch (e) {
    store = {};
}

let saveTimer = null;
const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try {
            const keys = Object.keys(store);
            if (keys.length > MAX_ENTRIES) {
                keys.slice(0, keys.length - MAX_ENTRIES).forEach(k => delete store[k]);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        } catch (e) { }
    }, 400);
};

export const getRatio = (url) => {
    const r = store[url];
    return typeof r === 'number' && r > 0 ? r : 0;
};

export const setRatio = (url, ratio) => {
    if (!url || !ratio || !isFinite(ratio)) return;
    const rounded = Math.round(ratio * 10000) / 10000;
    if (store[url] === rounded) return;
    store[url] = rounded;
    scheduleSave();
};

// Resolves once ratios for the given URLs are known (or after timeoutMs).
// Non-blocking helper; capped at max 6 probes to never saturate mobile network.
export const preloadRatios = (urls, timeoutMs = 600) => {
    const pending = (urls || []).filter(u => u && !getRatio(u)).slice(0, 6);
    if (pending.length === 0) return Promise.resolve();

    const loads = pending.map(url => new Promise(resolve => {
        const probe = new Image();
        probe.decoding = 'async';
        probe.onload = () => {
            if (probe.naturalWidth && probe.naturalHeight) {
                setRatio(url, probe.naturalWidth / probe.naturalHeight);
            }
            resolve();
        };
        probe.onerror = () => resolve();
        probe.src = url;
    }));

    return Promise.race([
        Promise.all(loads),
        new Promise(resolve => setTimeout(resolve, timeoutMs))
    ]);
};
