import { doc, getDoc, setDoc, deleteDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { deleteFromCloudflare } from "../cloudflare-storage.js";
import { invalidateCache } from "../site-cache.js";

/**
 * Checks whether a tag value is a meaningful user-defined model or theme name.
 * Filters out empty values and system placeholders.
 */
function isValidTag(str) {
    if (!str || typeof str !== 'string') return false;
    const lower = str.trim().toLowerCase();
    const invalid = ['unknown', 'none', 'mixed', '/', '-', 'null', 'undefined', 'n/a', ''];
    return !invalid.includes(lower);
}

/**
 * Extracts normalized, clean tag names from a string or array of strings.
 * Handles single names and compound/comma-separated strings.
 */
function extractCleanNames(input) {
    const list = Array.isArray(input) ? input : [input];
    const result = new Set();
    list.forEach(item => {
        if (!item || typeof item !== 'string') return;
        const trimmed = item.trim();
        if (isValidTag(trimmed)) result.add(trimmed);
        const parts = trimmed.split(/[,;/]+/).map(s => s.trim()).filter(isValidTag);
        parts.forEach(p => result.add(p));
    });
    return Array.from(result);
}

/**
 * Case-insensitive deduplication of an array of strings, preserving first seen casing.
 */
function dedupeCi(arr) {
    const map = new Map();
    arr.forEach(item => {
        if (typeof item === 'string' && item.trim()) {
            const key = item.trim().toLowerCase();
            if (!map.has(key)) map.set(key, item.trim());
        }
    });
    return Array.from(map.values());
}

/**
 * Cleans up orphaned category, model, and theme tags from `metadata/tags` in Firestore:
 * 1. If `deletedCategoryId` is passed:
 *    - Removes the category entry from `metadata/tags` (both { id, name } objects and legacy strings).
 *    - Ensures the category is only kept if another active photoshoot set still uses that exact category name.
 * 2. If `candidateModels` are passed:
 *    - Checks all remaining photoshoot sets and single shots.
 *    - If a candidate model is no longer used anywhere, removes it from `metadata/tags` models.
 * 3. If `candidateThemes` are passed:
 *    - Checks all remaining photoshoot sets and single shots.
 *    - If a candidate theme is no longer used anywhere, removes it from `metadata/tags` themes.
 * 4. Saves any updates to `metadata/tags` and invalidates caches.
 *
 * @param {Object} options
 * @param {string|string[]} [options.candidateModels] - Model names to check for orphans
 * @param {string|string[]} [options.candidateThemes] - Theme names to check for orphans
 * @param {string|null} [options.deletedCategoryId] - Set ID that was deleted
 * @param {string|null} [options.deletedCategoryName] - Set name that was deleted
 * @param {string[]} [options.excludedDocIds] - Firestore doc IDs to ignore during scan
 * @param {string[]} [options.excludedUrls] - Image URLs to ignore during scan
 * @param {Object} [options.prefetchedSetsSnap] - Optional pre-fetched photo_sets snapshot
 * @param {Object} [options.prefetchedSinglesSnap] - Optional pre-fetched single_shots snapshot
 * @param {Object} [options.prefetchedTagsSnap] - Optional pre-fetched metadata/tags snapshot
 * @returns {Promise<{ updated: boolean }>}
 */
export async function cleanupOrphanedMetadata({
    candidateModels = [],
    candidateThemes = [],
    deletedCategoryId = null,
    deletedCategoryName = null,
    excludedDocIds = [],
    excludedUrls = [],
    prefetchedSetsSnap = null,
    prefetchedSinglesSnap = null,
    prefetchedTagsSnap = null
} = {}) {
    const tagsRef = doc(db, 'metadata', 'tags');

    // 1. Fetch remaining data in parallel (if not prefetched)
    const [setsSnap, singlesSnap, tagsSnap] = await Promise.all([
        prefetchedSetsSnap ? Promise.resolve(prefetchedSetsSnap) : getDocs(collection(db, 'photo_sets')).catch(err => {
            console.warn("Could not fetch photo_sets for metadata cleanup:", err);
            return { empty: true, forEach: () => {} };
        }),
        prefetchedSinglesSnap ? Promise.resolve(prefetchedSinglesSnap) : getDocs(collection(db, 'single_shots')).catch(err => {
            console.warn("Could not fetch single_shots for metadata cleanup:", err);
            return { empty: true, forEach: () => {} };
        }),
        prefetchedTagsSnap ? Promise.resolve(prefetchedTagsSnap) : getDoc(tagsRef).catch(err => {
            console.warn("Could not fetch metadata/tags for metadata cleanup:", err);
            return { exists: () => false };
        })
    ]);

    if (!tagsSnap || !tagsSnap.exists()) {
        return { updated: false };
    }

    // 2. Prepare exclusion sets
    const excludedIdSet = new Set(
        (Array.isArray(excludedDocIds) ? excludedDocIds : [excludedDocIds])
            .filter(Boolean)
            .map(id => String(id).trim().toLowerCase())
    );
    if (deletedCategoryId) {
        excludedIdSet.add(String(deletedCategoryId).trim().toLowerCase());
    }

    const excludedUrlSet = new Set(
        (Array.isArray(excludedUrls) ? excludedUrls : [excludedUrls])
            .filter(Boolean)
            .map(u => String(u).trim())
    );

    // 3. Scan all remaining sets and single shots to find all models, themes, and categories still in use
    const activeModels = new Set();
    const activeThemes = new Set();
    const remainingCategoryIds = new Set();
    const remainingCategoryNames = new Set();

    setsSnap.forEach(docSnap => {
        const docIdLower = docSnap.id.toLowerCase();
        if (excludedIdSet.has(docIdLower)) return;

        const data = docSnap.data() || {};
        remainingCategoryIds.add(docIdLower);
        const catName = (data.categoryName || docSnap.id || '').trim();
        if (catName) remainingCategoryNames.add(catName.toLowerCase());

        const m = (data.modelName || '').trim();
        if (isValidTag(m)) {
            activeModels.add(m.toLowerCase());
            m.split(/[,;/]+/).map(s => s.trim()).filter(isValidTag).forEach(s => activeModels.add(s.toLowerCase()));
        }

        const t = (data.theme || '').trim();
        if (isValidTag(t)) {
            activeThemes.add(t.toLowerCase());
            t.split(/[,;/]+/).map(s => s.trim()).filter(isValidTag).forEach(s => activeThemes.add(s.toLowerCase()));
        }
    });

    singlesSnap.forEach(docSnap => {
        const docIdLower = docSnap.id.toLowerCase();
        if (excludedIdSet.has(docIdLower)) return;

        const data = docSnap.data() || {};
        if (data.url && excludedUrlSet.has(data.url)) return;
        if (data.thumbUrl && excludedUrlSet.has(data.thumbUrl)) return;

        const m = (data.modelName || '').trim();
        if (isValidTag(m)) {
            activeModels.add(m.toLowerCase());
            m.split(/[,;/]+/).map(s => s.trim()).filter(isValidTag).forEach(s => activeModels.add(s.toLowerCase()));
        }

        const t = (data.theme || '').trim();
        if (isValidTag(t)) {
            activeThemes.add(t.toLowerCase());
            t.split(/[,;/]+/).map(s => s.trim()).filter(isValidTag).forEach(s => activeThemes.add(s.toLowerCase()));
        }
    });

    // 4. Update metadata tags
    const tagsData = tagsSnap.data() || {};
    const existingCategories = Array.isArray(tagsData.categories) ? [...tagsData.categories] : [];
    const existingModels = Array.isArray(tagsData.models) ? [...tagsData.models] : [];
    const existingThemes = Array.isArray(tagsData.themes) ? [...tagsData.themes] : [];

    // A. Categories
    let updatedCategories = [...existingCategories];
    if (deletedCategoryId) {
        const lowerDelId = String(deletedCategoryId).trim().toLowerCase();
        const lowerDelName = (deletedCategoryName || '').trim().toLowerCase();

        updatedCategories = existingCategories.filter(cat => {
            if (!cat) return false;
            if (typeof cat === 'object') {
                const cId = (cat.id || '').trim().toLowerCase();
                const cName = (cat.name || '').trim().toLowerCase();

                // If this entry references the deleted set ID, remove it
                if (cId && cId === lowerDelId) return false;
                if (cName && cName === lowerDelId && !remainingCategoryIds.has(lowerDelId) && !remainingCategoryNames.has(lowerDelId)) return false;

                // If this entry references the deleted set name, check if any other set still uses it
                if (lowerDelName && (cName === lowerDelName || cId === lowerDelName)) {
                    if (!remainingCategoryNames.has(lowerDelName) && !remainingCategoryIds.has(lowerDelName)) {
                        return false;
                    }
                }
                return true;
            }
            if (typeof cat === 'string') {
                const s = cat.trim().toLowerCase();
                if (s === lowerDelId) return false;
                if (lowerDelName && s === lowerDelName) {
                    if (!remainingCategoryNames.has(lowerDelName) && !remainingCategoryIds.has(lowerDelName)) {
                        return false;
                    }
                }
                return true;
            }
            return true;
        });
    }

    // B. Models
    let updatedModels = [...existingModels];
    const cleanCandidateModels = extractCleanNames(candidateModels);
    const modelsToRemove = new Set();

    cleanCandidateModels.forEach(model => {
        const mLower = model.toLowerCase();
        if (!activeModels.has(mLower)) {
            modelsToRemove.add(mLower);
        }
    });

    if (modelsToRemove.size > 0) {
        updatedModels = updatedModels.filter(m => {
            if (typeof m !== 'string') return true;
            return !modelsToRemove.has(m.trim().toLowerCase());
        });
    }

    // C. Themes
    let updatedThemes = [...existingThemes];
    const cleanCandidateThemes = extractCleanNames(candidateThemes);
    const themesToRemove = new Set();

    cleanCandidateThemes.forEach(theme => {
        const tLower = theme.toLowerCase();
        if (!activeThemes.has(tLower)) {
            themesToRemove.add(tLower);
        }
    });

    if (themesToRemove.size > 0) {
        updatedThemes = updatedThemes.filter(t => {
            if (typeof t !== 'string') return true;
            return !themesToRemove.has(t.trim().toLowerCase());
        });
    }

    // Deduplicate models & themes
    updatedModels = dedupeCi(updatedModels);
    updatedThemes = dedupeCi(updatedThemes);

    const categoriesChanged = JSON.stringify(updatedCategories) !== JSON.stringify(existingCategories);
    const modelsChanged = JSON.stringify(updatedModels) !== JSON.stringify(existingModels);
    const themesChanged = JSON.stringify(updatedThemes) !== JSON.stringify(existingThemes);

    if (categoriesChanged || modelsChanged || themesChanged) {
        try {
            await setDoc(tagsRef, {
                categories: updatedCategories,
                models: updatedModels,
                themes: updatedThemes
            }, { merge: true });

            invalidateCache('photoshoots');
            invalidateCache('gallery');
            invalidateCache('archived');
            return { updated: true };
        } catch (saveErr) {
            console.warn("Could not update metadata/tags document:", saveErr);
            return { updated: false };
        }
    }

    return { updated: false };
}

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
 * @param {Object} [options.thumbUrls] - Map of URLs or explicit thumbs
 * @param {string} [options.categoryName] - Optional fallback category name
 * @param {string} [options.modelName] - Optional fallback model name
 * @param {string} [options.theme] - Optional fallback theme name
 * @returns {Promise<{ success: boolean, deletedUrlsCount: number }>}
 */
export async function deletePhotoshootSet(categoryId, { extraUrls = [], thumbUrls = {}, categoryName: fallbackCatName = '', modelName: fallbackModel = '', theme: fallbackTheme = '' } = {}) {
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

    // Apply fallbacks if not populated from document
    if (!categoryName && fallbackCatName) categoryName = fallbackCatName.trim();
    if (!modelName && fallbackModel) modelName = fallbackModel.trim();
    if (!theme && fallbackTheme) theme = fallbackTheme.trim();

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

    // 6. Clean up metadata/tags in Firestore (category, orphaned model, orphaned theme)
    await cleanupOrphanedMetadata({
        candidateModels: [modelName],
        candidateThemes: [theme],
        deletedCategoryId: categoryId,
        deletedCategoryName: categoryName,
        excludedDocIds: [categoryId],
        prefetchedSetsSnap: setsSnap,
        prefetchedSinglesSnap: singlesSnap,
        prefetchedTagsSnap: tagsSnap
    });

    // 7. Invalidate all local caches
    invalidateCache();

    return { success: true, deletedUrlsCount };
}
