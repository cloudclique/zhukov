import { doc, getDoc, setDoc, deleteDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { deleteFromCloudflare } from "../cloudflare-storage.js";
import { invalidateCache } from "../site-cache.js";

/**
 * Permanently deletes a photoshoot set:
 * 1. Collects all image URLs belonging to the set.
 * 2. Deletes the photoshoot set document from Firestore (`photo_sets/${categoryId}`).
 * 3. Scans all remaining photoshoot sets and single shots.
 * 4. Deletes images from Cloudflare R2 storage (only those not used elsewhere).
 * 5. Cleans up `metadata/tags` in Firestore:
 *    - Removes the photoshoot category ({ id, name } or legacy string).
 *    - If modelName was only used in this set, removes it from metadata models.
 *    - If theme was only used in this set, removes it from metadata themes.
 * 6. Invalidates local memory and browser caches.
 *
 * @param {string} categoryId - The document ID in photo_sets
 * @param {Object} [options]
 * @param {string[]} [options.extraUrls] - Any additional URLs loaded client-side
 * @returns {Promise<{ success: boolean, deletedUrlsCount: number }>}
 */
export async function deletePhotoshootSet(categoryId, { extraUrls = [], thumbUrls = {} } = {}) {
    if (!categoryId || categoryId === 'single-shots') {
        throw new Error("Invalid photoshoot categoryId: " + categoryId);
    }

    // 1. Gather all data and image URLs from the photoshoot set before deleting the document
    const setRef = doc(db, 'photo_sets', categoryId);
    const setSnap = await getDoc(setRef);

    let categoryName = '';
    let modelName = '';
    let theme = '';
    const urlsCollector = new Set();

    if (Array.isArray(extraUrls)) {
        extraUrls.forEach(u => {
            if (typeof u === 'string' && u.trim()) {
                const s = u.trim();
                urlsCollector.add(s);
                if (s.endsWith('.webp') && !s.endsWith('_thumb.webp')) {
                    urlsCollector.add(s.replace(/\.webp$/, '_thumb.webp'));
                }
            }
        });
    }

    // Include any thumbnails passed explicitly from the caller
    if (thumbUrls && typeof thumbUrls === 'object') {
        Object.keys(thumbUrls).forEach(k => {
            if (typeof k === 'string' && k.trim()) urlsCollector.add(k.trim());
        });
        Object.values(thumbUrls).forEach(v => {
            if (typeof v === 'string' && v.trim()) urlsCollector.add(v.trim());
        });
    }

    if (setSnap.exists()) {
        const data = setSnap.data() || {};
        categoryName = (data.categoryName || '').trim();
        modelName = (data.modelName || '').trim();
        theme = (data.theme || '').trim();

        const collect = (val) => {
            if (!val) return;
            const addTarget = (target) => {
                if (typeof target === 'string' && target.trim()) {
                    const s = target.trim();
                    urlsCollector.add(s);
                    if (s.endsWith('.webp') && !s.endsWith('_thumb.webp')) {
                        urlsCollector.add(s.replace(/\.webp$/, '_thumb.webp'));
                    }
                }
            };

            if (typeof val === 'string') {
                addTarget(val);
            } else if (Array.isArray(val)) {
                val.forEach(item => {
                    if (typeof item === 'string') {
                        addTarget(item);
                    } else if (typeof item === 'object' && item !== null) {
                        if (item.url) addTarget(item.url);
                        if (item.thumbUrl) addTarget(item.thumbUrl);
                        if (item.src) addTarget(item.src);
                    }
                });
            } else if (typeof val === 'object' && val !== null) {
                if (val.url) addTarget(val.url);
                if (val.thumbUrl) addTarget(val.thumbUrl);
                if (val.src) addTarget(val.src);
                // Handle map of url -> thumbUrl (collect BOTH keys and values)
                Object.keys(val).forEach(k => {
                    if (typeof k === 'string' && (k.startsWith('http') || k.includes('.webp'))) addTarget(k);
                });
                Object.values(val).forEach(v => {
                    if (typeof v === 'string') addTarget(v);
                });
            }
        };

        collect(data.urls);
        collect(data.thumbUrls);
        collect(data.adultUrls);
        collect(data.archivedUrls);
        collect(data.archived_photos);
        collect(data.photos);
        collect(data.images);
        collect(data.cover);
        collect(data.coverUrl);
        collect(data.coverPhoto);
    }

    // Fall back to categoryId if categoryName is empty
    if (!categoryName) {
        categoryName = categoryId;
    }

    // 2. Delete the document from Firestore
    await deleteDoc(setRef);

    // 3. Scan remaining photo_sets and single_shots, and fetch metadata/tags
    const tagsRef = doc(db, 'metadata', 'tags');
    const [setsSnap, singlesSnap, tagsSnap] = await Promise.all([
        getDocs(collection(db, 'photo_sets')).catch(err => {
            console.warn("Could not fetch photo_sets during set deletion:", err);
            return { empty: true, forEach: () => {} };
        }),
        getDocs(collection(db, 'single_shots')).catch(err => {
            console.warn("Could not fetch single_shots during set deletion:", err);
            return { empty: true, forEach: () => {} };
        }),
        getDoc(tagsRef).catch(err => {
            console.warn("Could not fetch metadata/tags during set deletion:", err);
            return { exists: () => false };
        })
    ]);

    // 4. Determine safe URLs to delete from Cloudflare (ensure no image is referenced in another set/shot)
    const remainingUrls = new Set();
    const collectRemaining = (val) => {
        if (!val) return;
        const addRemaining = (target) => {
            if (typeof target === 'string' && target.trim()) {
                const s = target.trim();
                remainingUrls.add(s);
                if (s.endsWith('.webp') && !s.endsWith('_thumb.webp')) {
                    remainingUrls.add(s.replace(/\.webp$/, '_thumb.webp'));
                }
            }
        };

        if (typeof val === 'string') {
            addRemaining(val);
        } else if (Array.isArray(val)) {
            val.forEach(item => {
                if (typeof item === 'string') {
                    addRemaining(item);
                } else if (typeof item === 'object' && item !== null) {
                    if (item.url) addRemaining(item.url);
                    if (item.thumbUrl) addRemaining(item.thumbUrl);
                    if (item.src) addRemaining(item.src);
                }
            });
        } else if (typeof val === 'object' && val !== null) {
            if (val.url) addRemaining(val.url);
            if (val.thumbUrl) addRemaining(val.thumbUrl);
            if (val.src) addRemaining(val.src);
            Object.keys(val).forEach(k => {
                if (typeof k === 'string' && (k.startsWith('http') || k.includes('.webp'))) addRemaining(k);
            });
            Object.values(val).forEach(v => {
                if (typeof v === 'string') addRemaining(v);
            });
        }
    };

    setsSnap.forEach(docSnap => {
        if (docSnap.id === categoryId || docSnap.id.toLowerCase() === categoryId.toLowerCase()) return;
        const d = docSnap.data() || {};
        collectRemaining(d.urls);
        collectRemaining(d.thumbUrls);
        collectRemaining(d.adultUrls);
        collectRemaining(d.archivedUrls);
        collectRemaining(d.archived_photos);
        collectRemaining(d.photos);
        collectRemaining(d.images);
        collectRemaining(d.cover);
        collectRemaining(d.coverUrl);
        collectRemaining(d.coverPhoto);
    });

    singlesSnap.forEach(docSnap => {
        const d = docSnap.data() || {};
        if (d.url) collectRemaining(d.url);
        if (d.thumbUrl) collectRemaining(d.thumbUrl);
    });

    const urlsToDelete = Array.from(urlsCollector).filter(u => !remainingUrls.has(u));

    // 5. Delete images from Cloudflare R2 bucket
    let deletedUrlsCount = 0;
    if (urlsToDelete.length > 0) {
        try {
            const CHUNK_SIZE = 50;
            for (let i = 0; i < urlsToDelete.length; i += CHUNK_SIZE) {
                const chunk = urlsToDelete.slice(i, i + CHUNK_SIZE);
                const res = await deleteFromCloudflare(chunk);
                if (res && typeof res.deletedCount === 'number') {
                    deletedUrlsCount += res.deletedCount;
                } else {
                    deletedUrlsCount += chunk.length;
                }
            }
        } catch (cfErr) {
            console.warn("Error deleting images from Cloudflare during set deletion:", cfErr);
        }
    }

    // 6. Clean up metadata/tags in Firestore
    if (tagsSnap.exists()) {
        try {
            const tagsData = tagsSnap.data() || {};
            const existingCategories = Array.isArray(tagsData.categories) ? [...tagsData.categories] : [];
            const existingModels = Array.isArray(tagsData.models) ? [...tagsData.models] : [];
            const existingThemes = Array.isArray(tagsData.themes) ? [...tagsData.themes] : [];

            const lowerCatId = categoryId.toLowerCase();
            const lowerCatName = categoryName.toLowerCase();

            // A. Remove photoshoot category tag from categories
            const updatedCategories = existingCategories.filter(cat => {
                if (!cat) return false;
                if (typeof cat === 'object') {
                    const cId = (cat.id || '').trim().toLowerCase();
                    const cName = (cat.name || '').trim().toLowerCase();
                    if (cId && (cId === lowerCatId || (lowerCatName && cId === lowerCatName))) return false;
                    if (lowerCatName && cName && cName === lowerCatName) return false;
                    if (cName && cName === lowerCatId) return false;
                    return true;
                }
                if (typeof cat === 'string') {
                    const s = cat.trim().toLowerCase();
                    if (s === lowerCatId || (lowerCatName && s === lowerCatName)) return false;
                    return true;
                }
                return true;
            });

            // B. If modelName was only in this set, remove it from models metadata
            let updatedModels = [...existingModels];
            const isModelValid = modelName && modelName.toLowerCase() !== 'unknown' && modelName !== '/';
            if (isModelValid) {
                const targetModelLower = modelName.toLowerCase();
                let modelStillInUse = false;

                setsSnap.forEach(docSnap => {
                    if (docSnap.id === categoryId) return;
                    const m = (docSnap.data()?.modelName || '').trim().toLowerCase();
                    if (m && (m === targetModelLower || m.split(',').map(s => s.trim()).includes(targetModelLower))) {
                        modelStillInUse = true;
                    }
                });

                if (!modelStillInUse) {
                    singlesSnap.forEach(docSnap => {
                        const m = (docSnap.data()?.modelName || '').trim().toLowerCase();
                        if (m && (m === targetModelLower || m.split(',').map(s => s.trim()).includes(targetModelLower))) {
                            modelStillInUse = true;
                        }
                    });
                }

                if (!modelStillInUse) {
                    updatedModels = updatedModels.filter(m => {
                        if (typeof m !== 'string') return true;
                        return m.trim().toLowerCase() !== targetModelLower;
                    });
                }
            }

            // C. If theme was only in this set, remove it from themes metadata
            let updatedThemes = [...existingThemes];
            const isThemeValid = theme && theme.toLowerCase() !== 'none';
            if (isThemeValid) {
                const targetThemeLower = theme.toLowerCase();
                let themeStillInUse = false;

                setsSnap.forEach(docSnap => {
                    if (docSnap.id === categoryId) return;
                    const t = (docSnap.data()?.theme || '').trim().toLowerCase();
                    if (t && (t === targetThemeLower || t.split(',').map(s => s.trim()).includes(targetThemeLower))) {
                        themeStillInUse = true;
                    }
                });

                if (!themeStillInUse) {
                    singlesSnap.forEach(docSnap => {
                        const t = (docSnap.data()?.theme || '').trim().toLowerCase();
                        if (t && (t === targetThemeLower || t.split(',').map(s => s.trim()).includes(targetThemeLower))) {
                            themeStillInUse = true;
                        }
                    });
                }

                if (!themeStillInUse) {
                    updatedThemes = updatedThemes.filter(t => {
                        if (typeof t !== 'string') return true;
                        return t.trim().toLowerCase() !== targetThemeLower;
                    });
                }
            }

            await setDoc(tagsRef, {
                categories: updatedCategories,
                models: updatedModels,
                themes: updatedThemes
            }, { merge: true });
        } catch (metaErr) {
            console.warn("Could not update metadata tags during set deletion:", metaErr);
        }
    }

    // 7. Invalidate all local caches
    invalidateCache();

    return { success: true, deletedUrlsCount };
}
