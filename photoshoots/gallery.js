import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, arrayRemove, arrayUnion, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";
import { getCachedData, setCachedData, invalidateCache, isDataEqual, registerSiteServiceWorker } from "../site-cache.js";
import { deleteFromCloudflare } from "../cloudflare-storage.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', async () => {
    registerSiteServiceWorker();

    // Auth UI Elements
    const loginBtn = document.getElementById('login-btn-header');
    const logoutBtn = document.getElementById('logout-btn');

    // Gallery UI
    const headerContainer = document.getElementById('gallery-header');
    const gridContainer = document.getElementById('masonry-grid');
    const loadingState = document.getElementById('loading-state');

    // Lightbox UI
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxSetName = document.getElementById('lightbox-set-name');
    const closeBtn = document.querySelector('#lightbox-close, .lightbox .close, .close');

    // Data & Auth State
    let isAdmin = false;
    try {
        if (localStorage.getItem('zhukov_is_admin') === 'true') {
            isAdmin = true;
        }
    } catch (e) { }
    let currentRatioMode = 'original';
    try {
        currentRatioMode = localStorage.getItem('zhukov_gallery_ratio_mode') || 'original';
    } catch (e) { }
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('id');

    // --- Firebase Authentication Logic ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            localStorage.setItem('zhukov_logged_in', 'true');
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    isAdmin = true;
                } else {
                    isAdmin = false;
                }
            } catch (error) {
                console.error("Auth check error:", error);
                isAdmin = false;
            }
            if (window.updateHeaderAuthState) {
                window.updateHeaderAuthState(user, isAdmin);
            }
            if (categoryId) loadGallery();
        } else {
            localStorage.removeItem('zhukov_logged_in');
            isAdmin = false;
            if (window.updateHeaderAuthState) {
                window.updateHeaderAuthState(null, false);
            }
            if (categoryId) loadGallery();
        }
    });

    // Delegated click listeners for header auth buttons
    document.addEventListener('click', (e) => {
        const loginTarget = e.target.closest('#login-btn-header');
        if (loginTarget) {
            localStorage.setItem('zhukov_logged_in', 'true');
            signInWithPopup(auth, provider).catch(error => console.error(error));
        }

        const logoutTarget = e.target.closest('#logout-btn');
        if (logoutTarget) {
            localStorage.removeItem('zhukov_logged_in');
            signOut(auth).catch(error => console.error(error));
        }
    });

    // --- 3D Tilt Effect Helper (Mouse / Desktop Only) ---
    const isHoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const attachTiltEffect = (element) => {
        if (!isHoverCapable) return;
        element.classList.add('tilt-card');

        const onMouseMove = (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const deltaX = (x - centerX) / centerX;
            const deltaY = (y - centerY) / centerY;

            // Scale tilt inversely with element size — big images tilt less
            const maxTilt = Math.max(1.5, Math.min(10, 1800 / (rect.width + rect.height)));
            const rotateX = (-deltaY * maxTilt).toFixed(2);
            const rotateY = (deltaX * maxTilt).toFixed(2);

            element.classList.add('is-tilting');
            element.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
        };

        const onMouseLeave = () => {
            element.classList.remove('is-tilting');
            element.style.transform = '';
        };

        element.addEventListener('mousemove', onMouseMove);
        element.addEventListener('mouseleave', onMouseLeave);
    };

    // --- Editorial Fine-Art Lightbox Logic ---
    let activeOriginImg = null;
    let lastLightboxOpenTime = 0;
    let isLightboxHistoryActive = false;
    let isHandlingHistoryBack = false;

    // Reset any stale lightbox state if page was restored/reloaded with state active
    if (window.history && window.history.state && window.history.state.zhukovLightbox) {
        try {
            window.history.replaceState(null, '', window.location.href);
        } catch (e) {}
    }

    const openLightbox = (imgElement, setName = 'GALLERY') => {
        if (!lightbox || !lightboxImg) return;
        lastLightboxOpenTime = Date.now();
        activeOriginImg = imgElement;
        document.body.classList.add('lightbox-open');

        // Manage browser history for phone back action / gesture
        if (!isLightboxHistoryActive) {
            try {
                history.pushState({ zhukovLightbox: true }, '', window.location.href);
                isLightboxHistoryActive = true;
            } catch (e) {}
        }

        const targetSrc = imgElement.dataset.fullUrl || imgElement.dataset.src || imgElement.src;
        lightboxImg.src = targetSrc;
        if (lightboxSetName) {
            lightboxSetName.textContent = (setName || 'GALLERY').toUpperCase();
        }

        lightbox.style.display = 'flex';
        requestAnimationFrame(() => {
            lightbox.classList.add('show');
        });
    };

    const closeLightbox = (force = false, fromPopstate = false) => {
        if (!lightbox) return;
        if (!force && Date.now() - lastLightboxOpenTime < 350) return;

        // If closed via UI action (close button, backdrop tap, Escape key) rather than browser popstate,
        // pop the history entry we pushed so browser history remains clean.
        if (!fromPopstate && isLightboxHistoryActive) {
            isLightboxHistoryActive = false;
            isHandlingHistoryBack = true;
            try {
                history.back();
            } catch (e) {
                isHandlingHistoryBack = false;
            }
        } else {
            isLightboxHistoryActive = false;
        }

        lightbox.classList.remove('show');
        document.body.classList.remove('lightbox-open');

        setTimeout(() => {
            lightbox.style.display = 'none';
            if (lightboxImg) lightboxImg.src = '';
            activeOriginImg = null;
        }, 300);
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeLightbox(true);
        });
    }

    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            closeLightbox();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (lightbox && e.key === 'Escape' && lightbox.classList.contains('show')) {
            closeLightbox(true);
        }
    });

    window.addEventListener('popstate', (e) => {
        if (isHandlingHistoryBack) {
            isHandlingHistoryBack = false;
            return;
        }
        if (lightbox && (lightbox.classList.contains('show') || isLightboxHistoryActive)) {
            closeLightbox(true, true);
        }
    });

    // --- Fetch & Render Data ---
    let loadGalleryReqId = 0;
    let cachedActiveData = null;

    const loadGallery = async () => {
        if (!categoryId) {
            loadingState.innerText = "Error: No photoshoot selected.";
            return;
        }

        const currentReqId = ++loadGalleryReqId;
        const cacheKey = `gallery_${categoryId}_admin_${isAdmin}`;

        // Helper to escape HTML
        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        };

        // Helper to format URLs in description into domain + favicon badges
        const formatDescription = (rawText) => {
            if (!rawText) return '';
            const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
            const parts = rawText.split(urlRegex);
            return parts.map(part => {
                if (part.match(urlRegex)) {
                    try {
                        const urlObj = new URL(part);
                        const domain = urlObj.hostname.replace(/^www\./, '');
                        const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlObj.hostname)}&sz=32`;
                        return `<a href="${escapeHtml(part)}" target="_blank" rel="noopener noreferrer" class="desc-link"><img src="${faviconUrl}" class="site-icon" alt="" />${domain}</a>`;
                    } catch (e) {
                        return `<a href="${escapeHtml(part)}" target="_blank" rel="noopener noreferrer" class="desc-link">${escapeHtml(part)}</a>`;
                    }
                }
                return escapeHtml(part);
            }).join('').replace(/\n/g, '<br>');
        };

        // 1. Instant Cache Render
        const cached = getCachedData(cacheKey);
        if (cached) {
            cachedActiveData = cached;
        } else {
            // Skeleton Loading State on cold load
            loadingState.style.display = 'none';
            headerContainer.innerHTML = `
                <div class="skeleton skeleton-title" style="margin-bottom: 0.5rem; width: 300px;"></div>
                <div class="skeleton skeleton-meta" style="width: 200px;"></div>
            `;

            gridContainer.innerHTML = '';
            const spans = [20, 25, 18, 30, 22, 28, 19, 24, 27, 21, 26, 23];
            spans.forEach(span => {
                gridContainer.innerHTML += `<div class="masonry-item skeleton" style="grid-row: span ${span}; min-height: ${span * 10}px; border-radius: 12px;"></div>`;
            });
        }

        try {
            let categoryName = "Photoshoot";
            let metaInfo = "";
            let description = "";
            let urls = [];
            const archivedUrlsSet = new Set();

            if (categoryId === 'single-shots') {
                categoryName = "Single Shots";
                metaInfo = "Mixed Models | Mixed Themes";

                const [singleSnap, orderDoc] = await Promise.all([
                    getDocs(collection(db, 'single_shots')),
                    getDoc(doc(db, 'settings', 'single_shots_order')).catch(() => null)
                ]);
                const singleItems = [];
                singleSnap.forEach(docSnap => {
                    const d = docSnap.data();
                    if (!isAdmin && d.archived === true) return; // Hide archived items from public
                    if (d.archived === true) archivedUrlsSet.add(d.url);
                    singleItems.push(d);
                });

                // Apply custom order if saved, falling back to newest to oldest
                const customOrder = (orderDoc && orderDoc.exists() && Array.isArray(orderDoc.data().order)) ? orderDoc.data().order : [];
                const orderMap = new Map();
                customOrder.forEach((url, idx) => orderMap.set(url, idx));

                singleItems.sort((a, b) => {
                    const idxA = orderMap.has(a.url) ? orderMap.get(a.url) : -1;
                    const idxB = orderMap.has(b.url) ? orderMap.get(b.url) : -1;
                    if (idxA !== idxB) {
                        if (idxA === -1) return -1; // New/unranked photos appear at the top
                        if (idxB === -1) return 1;
                        return idxA - idxB;
                    }
                    return new Date(b.date || 0) - new Date(a.date || 0);
                });
                urls = singleItems.map(item => item.url);
            } else {
                const setRef = doc(db, 'photo_sets', categoryId);
                const setSnap = await getDoc(setRef);

                if (setSnap.exists()) {
                    const data = setSnap.data();

                    const archivedUrls = Array.isArray(data.archivedUrls) ? data.archivedUrls : (Array.isArray(data.archived_photos) ? data.archived_photos : []);
                    const allImagesArchived = data.urls && Array.isArray(data.urls) && data.urls.length > 0 && data.urls.every(u => archivedUrls.includes(u));

                    // Block non-admins from viewing archived sets or sets where all images are archived
                    if ((data.archived === true || allImagesArchived) && !isAdmin) {
                        loadingState.style.display = 'block';
                        loadingState.innerText = "This photoshoot is no longer available.";
                        headerContainer.innerHTML = '';
                        gridContainer.innerHTML = '';
                        invalidateCache(cacheKey);
                        return;
                    }

                    categoryName = data.categoryName || categoryId;
                    description = data.description || '';

                    const modelName = data.modelName || 'Unknown';
                    const theme = data.theme || 'None';
                    const dateStr = data.date ? new Date(data.date).toLocaleDateString() : 'No Date';

                    if (isAdmin) {
                        metaInfo = `
                            <span class="editable" data-field="modelName" title="Double click to edit">${modelName}</span> | 
                            <span class="editable" data-field="theme" title="Double click to edit">${theme}</span> | 
                            <span class="editable" data-field="date" title="Double click to edit date">${dateStr}</span>
                        `;
                    } else {
                        metaInfo = `${modelName} | ${theme} | ${dateStr}`;
                    }

                    if (data.urls && Array.isArray(data.urls)) {
                        let rawUrls = [...data.urls];

                        if (!isAdmin) {
                            rawUrls = rawUrls.filter(u => !archivedUrls.includes(u));
                        } else {
                            archivedUrls.forEach(u => archivedUrlsSet.add(u));
                        }

                        urls = rawUrls.reverse(); // Show newest to oldest
                    }
                } else {
                    loadingState.innerText = "Error: Photoshoot not found.";
                    return;
                }
            }

            if (currentReqId !== loadGalleryReqId) return;

            // Cache Payload
            const freshPayload = {
                categoryName,
                metaInfo,
                description,
                urls,
                archivedUrls: Array.from(archivedUrlsSet)
            };

            setCachedData(cacheKey, freshPayload);

            // --- Custom Modal Confirmation Helper ---
            const showConfirmModal = ({
                title = "Confirm Action",
                message = "Are you sure you want to proceed?",
                confirmText = "Confirm",
                cancelText = "Cancel",
                confirmVariant = "amber" // "amber" | "red" | "blue"
            }) => {
                return new Promise((resolve) => {
                    const existing = document.getElementById('zhukov-confirm-modal-overlay');
                    if (existing) existing.remove();

                    const overlay = document.createElement('div');
                    overlay.id = 'zhukov-confirm-modal-overlay';
                    overlay.className = 'confirm-modal-overlay';

                    const iconHtml = confirmVariant === 'red'
                        ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
                        : (confirmVariant === 'amber'
                            ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>`
                            : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`);

                    const submitStyle = confirmVariant === 'red'
                        ? 'background: #dc2626; color: #fff; border: 1px solid #ef4444;'
                        : (confirmVariant === 'amber'
                            ? 'background: #d97706; color: #fff; border: 1px solid #f59e0b;'
                            : 'background: #2563eb; color: #fff; border: 1px solid #3b82f6;');

                    overlay.innerHTML = `
                        <div class="confirm-modal-card" role="dialog" aria-modal="true">
                            <div class="confirm-modal-header">
                                <div class="confirm-modal-icon confirm-icon-${confirmVariant}">
                                    ${iconHtml}
                                </div>
                                <h3 class="confirm-modal-title">${escapeHtml(title)}</h3>
                            </div>
                            <p class="confirm-modal-message">${message}</p>
                            <div class="confirm-modal-actions">
                                <button type="button" class="confirm-modal-btn confirm-modal-cancel" id="confirm-modal-cancel-btn">${escapeHtml(cancelText)}</button>
                                <button type="button" class="confirm-modal-btn confirm-modal-submit" id="confirm-modal-submit-btn" style="${submitStyle}">${escapeHtml(confirmText)}</button>
                            </div>
                        </div>
                    `;

                    document.body.appendChild(overlay);
                    requestAnimationFrame(() => overlay.classList.add('show'));

                    const cancelBtn = overlay.querySelector('#confirm-modal-cancel-btn');
                    const submitBtn = overlay.querySelector('#confirm-modal-submit-btn');

                    let resolved = false;
                    const close = (result) => {
                        if (resolved) return;
                        resolved = true;
                        overlay.classList.remove('show');
                        setTimeout(() => overlay.remove(), 250);
                        document.removeEventListener('keydown', onKeyDown);
                        resolve(result);
                    };

                    const onKeyDown = (e) => {
                        if (e.key === 'Escape') close(false);
                    };

                    document.addEventListener('keydown', onKeyDown);
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
                    cancelBtn.addEventListener('click', () => close(false));
                    submitBtn.addEventListener('click', () => {
                        submitBtn.disabled = true;
                        submitBtn.innerText = "Processing...";
                        submitBtn.style.opacity = "0.7";
                        close(true);
                    });
                });
            };

            // --- Admin Photo Management & Selection Mode Logic (Delete, Archive, Move) ---
            let isSelectionMode = false;
            const selectedPhotoUrls = new Set();

            const updatePhotoCount = () => {
                const countEl = headerContainer.querySelector('.gallery-photo-count');
                if (countEl) countEl.innerText = `${currentUrls.length} Photographs`;
            };

            const createOrGetBulkActionsBar = () => {
                let bar = document.getElementById('gallery-bulk-actions-bar');
                if (!bar) {
                    bar = document.createElement('div');
                    bar.id = 'gallery-bulk-actions-bar';
                    bar.className = 'gallery-bulk-actions-bar';
                    bar.innerHTML = `
                        <div class="bulk-count-badge" id="bulk-count-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <path d="M9 12l2 2 4-4"/>
                            </svg>
                            <span id="bulk-count-text">0 Selected</span>
                        </div>
                        <button type="button" class="bulk-btn bulk-btn-select-all" id="bulk-select-all-btn">Select All</button>
                        <button type="button" class="bulk-btn bulk-btn-move" id="bulk-move-btn" title="Move selected photos">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 12h14M13 6l6 6-6 6"/>
                            </svg>
                            <span>Move</span>
                        </button>
                        <button type="button" class="bulk-btn bulk-btn-archive" id="bulk-archive-btn" title="Archive or unarchive selected photos">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>
                            </svg>
                            <span>Archive</span>
                        </button>
                        <button type="button" class="bulk-btn bulk-btn-delete" id="bulk-delete-btn" title="Delete selected photos">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            <span>Delete</span>
                        </button>
                        <button type="button" class="bulk-btn bulk-btn-done" id="bulk-done-btn">Done</button>
                    `;
                    document.body.appendChild(bar);

                    // Bulk Action Event Listeners
                    bar.querySelector('#bulk-select-all-btn').addEventListener('click', toggleSelectAll);
                    bar.querySelector('#bulk-move-btn').addEventListener('click', () => {
                        if (selectedPhotoUrls.size > 0) openMoveModal(Array.from(selectedPhotoUrls));
                    });
                    bar.querySelector('#bulk-archive-btn').addEventListener('click', () => {
                        if (selectedPhotoUrls.size > 0) toggleArchivePhotos(Array.from(selectedPhotoUrls));
                    });
                    bar.querySelector('#bulk-delete-btn').addEventListener('click', () => {
                        if (selectedPhotoUrls.size > 0) deletePhotos(Array.from(selectedPhotoUrls));
                    });
                    bar.querySelector('#bulk-done-btn').addEventListener('click', () => {
                        toggleSelectionMode(false);
                    });
                }
                return bar;
            };

            const updateSelectionUI = () => {
                const selectBtn = document.getElementById('gallery-selection-mode-btn');
                if (selectBtn) {
                    selectBtn.classList.toggle('active', isSelectionMode);
                }
                gridContainer.classList.toggle('selection-mode-active', isSelectionMode);

                const bar = createOrGetBulkActionsBar();
                if (isSelectionMode) {
                    bar.classList.add('show');
                    const countText = bar.querySelector('#bulk-count-text');
                    if (countText) countText.innerText = `${selectedPhotoUrls.size} Selected`;

                    const selectAllBtn = bar.querySelector('#bulk-select-all-btn');
                    if (selectAllBtn) {
                        const allSelected = currentUrls.length > 0 && selectedPhotoUrls.size === currentUrls.length;
                        selectAllBtn.innerText = allSelected ? 'Deselect All' : 'Select All';
                    }

                    const moveBtn = bar.querySelector('#bulk-move-btn');
                    const archiveBtn = bar.querySelector('#bulk-archive-btn');
                    const deleteBtn = bar.querySelector('#bulk-delete-btn');
                    const hasSelection = selectedPhotoUrls.size > 0;
                    if (moveBtn) {
                        moveBtn.style.opacity = hasSelection ? '1' : '0.4';
                        moveBtn.style.pointerEvents = hasSelection ? 'auto' : 'none';
                    }
                    if (archiveBtn) {
                        archiveBtn.style.opacity = hasSelection ? '1' : '0.4';
                        archiveBtn.style.pointerEvents = hasSelection ? 'auto' : 'none';
                        const anyUnarchived = Array.from(selectedPhotoUrls).some(u => !archivedUrlsSet.has(u));
                        const span = archiveBtn.querySelector('span');
                        if (span) span.innerText = anyUnarchived ? 'Archive' : 'Unarchive';
                    }
                    if (deleteBtn) {
                        deleteBtn.style.opacity = hasSelection ? '1' : '0.4';
                        deleteBtn.style.pointerEvents = hasSelection ? 'auto' : 'none';
                    }
                } else {
                    bar.classList.remove('show');
                }

                // Update cards
                gridContainer.querySelectorAll('.masonry-item').forEach(item => {
                    const img = item.querySelector('img.masonry-img');
                    const url = img?.dataset.fullUrl;
                    if (url) {
                        item.classList.toggle('is-selected', selectedPhotoUrls.has(url));
                    }
                    item.draggable = isAdmin && !isSelectionMode;
                });
            };

            const toggleSelectionMode = (force) => {
                isSelectionMode = typeof force === 'boolean' ? force : !isSelectionMode;
                if (!isSelectionMode) {
                    selectedPhotoUrls.clear();
                }
                updateSelectionUI();
            };

            const toggleSelectAll = () => {
                if (selectedPhotoUrls.size === currentUrls.length) {
                    selectedPhotoUrls.clear();
                } else {
                    currentUrls.forEach(u => selectedPhotoUrls.add(u));
                }
                updateSelectionUI();
            };

            const togglePhotoSelection = (url) => {
                if (selectedPhotoUrls.has(url)) {
                    selectedPhotoUrls.delete(url);
                } else {
                    selectedPhotoUrls.add(url);
                }
                updateSelectionUI();
            };

            const deletePhotos = async (urls) => {
                if (!isAdmin || !urls || urls.length === 0) return;
                const count = urls.length;
                const title = count === 1 ? "Delete Photo" : `Delete ${count} Photos`;
                const message = count === 1
                    ? "Are you sure you want to delete this photo? This will remove it from the photoshoot."
                    : `Are you sure you want to delete these ${count} photos? This will remove them from the photoshoot.`;
                const confirmText = count === 1 ? "Delete Photo" : `Delete ${count} Photos`;

                const confirmed = await showConfirmModal({
                    title,
                    message,
                    confirmText,
                    confirmVariant: "red"
                });
                if (!confirmed) return;

                try {
                    invalidateCache('photoshoots');
                    invalidateCache('gallery');

                    if (categoryId === 'single-shots') {
                        for (const photoUrl of urls) {
                            const q = query(collection(db, 'single_shots'), where('url', '==', photoUrl));
                            const snap = await getDocs(q);
                            snap.forEach(async (d) => {
                                await deleteDoc(doc(db, 'single_shots', d.id));
                            });
                        }
                        try {
                            const orderRef = doc(db, 'settings', 'single_shots_order');
                            await updateDoc(orderRef, { order: arrayRemove(...urls) });
                        } catch (_) { }
                    } else {
                        await updateDoc(doc(db, 'photo_sets', categoryId), {
                            urls: arrayRemove(...urls),
                            adultUrls: arrayRemove(...urls),
                            archivedUrls: arrayRemove(...urls)
                        });
                    }

                    // Also delete all affected images from Cloudflare R2 bucket
                    await deleteFromCloudflare(urls);

                    // Animate out and remove matching wrappers in-place
                    const wrappersToRemove = [];
                    gridContainer.querySelectorAll('.masonry-item').forEach(item => {
                        const img = item.querySelector('img.masonry-img');
                        if (img && urls.includes(img.dataset.fullUrl)) {
                            wrappersToRemove.push(item);
                        }
                    });

                    wrappersToRemove.forEach(wrapper => {
                        wrapper.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                        wrapper.style.opacity = '0';
                        wrapper.style.transform = 'scale(0.85)';
                        setTimeout(() => wrapper.remove(), 300);
                    });

                    urls.forEach(u => {
                        const idx = currentUrls.indexOf(u);
                        if (idx !== -1) currentUrls.splice(idx, 1);
                        selectedPhotoUrls.delete(u);
                    });

                    setTimeout(() => {
                        updatePhotoCount();
                        if (currentUrls.length === 0) {
                            gridContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; width: 100%;">No photos in this set.</div>`;
                            toggleSelectionMode(false);
                        } else {
                            updateSelectionUI();
                            if (currentRatioMode !== '1:1') layoutMasonry();
                        }
                    }, 310);
                } catch (error) {
                    console.error("Error deleting photos:", error);
                    alert("Error deleting photos: " + (error.message || error));
                }
            };

            const toggleArchivePhotos = async (urls) => {
                if (!isAdmin || !urls || urls.length === 0) return;
                const count = urls.length;
                const allArchived = urls.every(u => archivedUrlsSet.has(u));
                const actionText = allArchived ? "unarchive" : "archive";
                const countText = count === 1 ? "Photo" : `${count} Photos`;

                const confirmed = await showConfirmModal({
                    title: `${allArchived ? "Unarchive" : "Archive"} ${countText}`,
                    message: allArchived
                        ? `Unarchive ${countText.toLowerCase()}? ${count === 1 ? 'It' : 'They'} will become visible to the public gallery.`
                        : `Archive ${countText.toLowerCase()}? ${count === 1 ? 'It' : 'They'} will be hidden from the public gallery.`,
                    confirmText: allArchived ? `Unarchive ${countText}` : `Archive ${countText}`,
                    confirmVariant: allArchived ? "blue" : "amber"
                });
                if (!confirmed) return;

                try {
                    invalidateCache('photoshoots');
                    invalidateCache('gallery');
                    invalidateCache('archived');

                    if (categoryId === 'single-shots') {
                        for (const photoUrl of urls) {
                            const q = query(collection(db, 'single_shots'), where('url', '==', photoUrl));
                            const snap = await getDocs(q);
                            snap.forEach(async (d) => {
                                await updateDoc(doc(db, 'single_shots', d.id), {
                                    archived: !allArchived
                                });
                            });
                        }
                    } else {
                        if (allArchived) {
                            await updateDoc(doc(db, 'photo_sets', categoryId), {
                                archivedUrls: arrayRemove(...urls)
                            });
                        } else {
                            await updateDoc(doc(db, 'photo_sets', categoryId), {
                                archivedUrls: arrayUnion(...urls)
                            });
                        }
                    }

                    // In-place UI update
                    if (allArchived) {
                        urls.forEach(u => archivedUrlsSet.delete(u));
                    } else {
                        urls.forEach(u => archivedUrlsSet.add(u));
                    }

                    gridContainer.querySelectorAll('.masonry-item').forEach(item => {
                        const img = item.querySelector('img.masonry-img');
                        if (img && urls.includes(img.dataset.fullUrl)) {
                            const archiveBtn = item.querySelector('.archive-photo-btn');
                            let badge = item.querySelector('.photo-archived-badge');
                            if (allArchived) {
                                if (badge) badge.remove();
                                if (archiveBtn) {
                                    archiveBtn.classList.remove('is-archived');
                                    archiveBtn.title = 'Archive photo (hide from public)';
                                    archiveBtn.setAttribute('aria-label', archiveBtn.title);
                                    archiveBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>`;
                                }
                            } else {
                                if (!badge) {
                                    badge = document.createElement('div');
                                    badge.className = 'photo-archived-badge';
                                    badge.innerText = 'Archived';
                                    item.appendChild(badge);
                                }
                                if (archiveBtn) {
                                    archiveBtn.classList.add('is-archived');
                                    archiveBtn.title = 'Unarchive photo (make public)';
                                    archiveBtn.setAttribute('aria-label', archiveBtn.title);
                                    archiveBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4M12 16v-4m-3 3 3-3 3 3"/></svg>`;
                                }
                            }
                        }
                    });

                    updateSelectionUI();
                } catch (error) {
                    console.error(`Error ${actionText}ing photos:`, error);
                    alert(`Failed to ${actionText} photos: ` + (error.message || error));
                }
            };

            const openMoveModal = async (urls) => {
                if (!isAdmin || !urls || urls.length === 0) return;
                const count = urls.length;

                // Remove existing modal if any
                const existing = document.getElementById('move-photo-modal-overlay');
                if (existing) existing.remove();

                const overlay = document.createElement('div');
                overlay.id = 'move-photo-modal-overlay';
                overlay.className = 'move-modal-overlay';

                const title = count === 1 ? "Move Photo" : `Move ${count} Photos`;
                const subtitle = count === 1
                    ? "Transfer this photo to another photoshoot set."
                    : `Transfer these ${count} photos to another photoshoot set.`;

                const previewHtml = count === 1
                    ? `<img src="${urls[0]}" alt="Photo preview" class="move-modal-thumb-preview">`
                    : `<div class="move-modal-thumbs-grid">
                        ${urls.slice(0, 4).map(u => `<img src="${u}" alt="Photo preview" class="move-modal-thumb-small">`).join('')}
                        ${count > 4 ? `<div class="move-modal-thumb-more">+${count - 4}</div>` : ''}
                       </div>`;

                overlay.innerHTML = `
                    <div class="move-modal" role="dialog" aria-labelledby="move-modal-title" aria-modal="true">
                        <h3 id="move-modal-title">${title}</h3>
                        <p class="move-modal-subtitle">${subtitle}</p>
                        ${previewHtml}
                        <label for="move-target-select">Select Destination Photoshoot:</label>
                        <select id="move-target-select">
                            <option value="" disabled selected>Loading available sets...</option>
                        </select>
                        <div class="move-modal-actions">
                            <button type="button" class="move-modal-btn move-modal-cancel" id="move-modal-cancel-btn">Cancel</button>
                            <button type="button" class="move-modal-btn move-modal-confirm" id="move-modal-confirm-btn" disabled>${title}</button>
                        </div>
                    </div>
                `;

                document.body.appendChild(overlay);

                const selectEl = overlay.querySelector('#move-target-select');
                const confirmBtn = overlay.querySelector('#move-modal-confirm-btn');
                const cancelBtn = overlay.querySelector('#move-modal-cancel-btn');

                const closeModal = () => {
                    overlay.classList.remove('show');
                    setTimeout(() => overlay.remove(), 250);
                    document.removeEventListener('keydown', handleKey);
                };

                const handleKey = (e) => {
                    if (e.key === 'Escape') closeModal();
                };
                document.addEventListener('keydown', handleKey);

                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) closeModal();
                });
                cancelBtn.addEventListener('click', closeModal);

                try {
                    const snap = await getDocs(collection(db, 'photo_sets'));
                    const options = [];

                    if (categoryId !== 'single-shots') {
                        options.push({ id: 'single-shots', name: '★ Single Shots (Mixed Collection)' });
                    }

                    snap.forEach((docSnap) => {
                        if (docSnap.id === categoryId) return;
                        const d = docSnap.data();
                        const sTitle = d.categoryName || docSnap.id;
                        const meta = [d.theme, d.modelName].filter(Boolean).join(' • ');
                        const label = meta ? `${sTitle} (${meta})` : sTitle;
                        options.push({ id: docSnap.id, name: label });
                    });

                    if (options.length === 0) {
                        selectEl.innerHTML = '<option value="" disabled selected>No other photoshoots found.</option>';
                    } else {
                        selectEl.innerHTML = '<option value="" disabled selected>-- Choose a destination photoshoot --</option>' +
                            options.map(opt => `<option value="${escapeHtml(opt.id)}">${escapeHtml(opt.name)}</option>`).join('');
                        selectEl.addEventListener('change', () => {
                            confirmBtn.disabled = !selectEl.value;
                        });
                    }
                } catch (err) {
                    console.error("Error fetching photo sets:", err);
                    selectEl.innerHTML = '<option value="" disabled selected>Error loading sets.</option>';
                }

                confirmBtn.addEventListener('click', async () => {
                    const targetSetId = selectEl.value;
                    if (!targetSetId) return;

                    confirmBtn.disabled = true;
                    confirmBtn.innerText = 'Moving...';

                    try {
                        // 1. Remove from source
                        if (categoryId === 'single-shots') {
                            for (const photoUrl of urls) {
                                const q = query(collection(db, 'single_shots'), where('url', '==', photoUrl));
                                const qSnap = await getDocs(q);
                                qSnap.forEach(async (d) => {
                                    await deleteDoc(doc(db, 'single_shots', d.id));
                                });
                            }
                        } else {
                            await updateDoc(doc(db, 'photo_sets', categoryId), {
                                urls: arrayRemove(...urls),
                                adultUrls: arrayRemove(...urls),
                                archivedUrls: arrayRemove(...urls)
                            });
                        }

                        // 2. Add to destination
                        if (targetSetId === 'single-shots') {
                            for (const photoUrl of urls) {
                                await addDoc(collection(db, 'single_shots'), {
                                    url: photoUrl,
                                    date: new Date().toISOString(),
                                    isAdult: false
                                });
                            }
                            try {
                                const orderRef = doc(db, 'settings', 'single_shots_order');
                                const orderSnap = await getDoc(orderRef).catch(() => null);
                                if (orderSnap && orderSnap.exists()) {
                                    const currentOrder = Array.isArray(orderSnap.data().order) ? orderSnap.data().order : [];
                                    const newOrder = [...urls, ...currentOrder.filter(u => !urls.includes(u))];
                                    await setDoc(orderRef, { order: newOrder }, { merge: true });
                                }
                            } catch (orderErr) {
                                console.warn("Could not update single_shots_order on move:", orderErr);
                            }
                        } else {
                            await updateDoc(doc(db, 'photo_sets', targetSetId), {
                                urls: arrayUnion(...urls)
                            });
                        }

                        invalidateCache('photoshoots');
                        invalidateCache('gallery');
                        closeModal();

                        // In-place UI removal
                        const wrappersToRemove = [];
                        gridContainer.querySelectorAll('.masonry-item').forEach(item => {
                            const img = item.querySelector('img.masonry-img');
                            if (img && urls.includes(img.dataset.fullUrl)) {
                                wrappersToRemove.push(item);
                            }
                        });

                        wrappersToRemove.forEach(wrapper => {
                            wrapper.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                            wrapper.style.opacity = '0';
                            wrapper.style.transform = 'scale(0.85)';
                            setTimeout(() => wrapper.remove(), 300);
                        });

                        urls.forEach(u => {
                            const idx = currentUrls.indexOf(u);
                            if (idx !== -1) currentUrls.splice(idx, 1);
                            selectedPhotoUrls.delete(u);
                        });

                        setTimeout(() => {
                            updatePhotoCount();
                            if (currentUrls.length === 0) {
                                gridContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; width: 100%;">No photos in this set.</div>`;
                                toggleSelectionMode(false);
                            } else {
                                updateSelectionUI();
                                if (currentRatioMode !== '1:1') layoutMasonry();
                            }
                        }, 310);
                    } catch (err) {
                        console.error("Error moving photos:", err);
                        alert("Failed to move photos: " + (err.message || err));
                        confirmBtn.disabled = false;
                        confirmBtn.innerText = title;
                    }
                });

                requestAnimationFrame(() => overlay.classList.add('show'));
            };

            const deleteCategory = async () => {
                if (!isAdmin) return;
                const confirmed = await showConfirmModal({
                    title: "Delete Entire Photoshoot",
                    message: "Are you sure you want to permanently delete this ENTIRE photoshoot set? All photos in this set will be removed. This cannot be undone.",
                    confirmText: "Delete Set",
                    confirmVariant: "red"
                });
                if (!confirmed) return;

                try {
                    invalidateCache('photoshoots');
                    invalidateCache('gallery');
                    invalidateCache('archived');

                    // Gather all image URLs from the photoshoot set before deleting the document
                    const setRef = doc(db, 'photo_sets', categoryId);
                    const setSnap = await getDoc(setRef);
                    let urlsToDelete = [];
                    if (setSnap.exists()) {
                        const data = setSnap.data();
                        const setUrls = Array.isArray(data.urls) ? data.urls : [];
                        const adultUrls = Array.isArray(data.adultUrls) ? data.adultUrls : [];
                        const archivedUrls = Array.isArray(data.archivedUrls) ? data.archivedUrls : (Array.isArray(data.archived_photos) ? data.archived_photos : []);
                        urlsToDelete = Array.from(new Set([...setUrls, ...adultUrls, ...archivedUrls, ...(currentUrls || [])]));
                    } else if (currentUrls && currentUrls.length > 0) {
                        urlsToDelete = [...currentUrls];
                    }

                    await deleteDoc(setRef);

                    // Delete all photos belonging to this photoshoot set from Cloudflare R2 bucket
                    if (urlsToDelete.length > 0) {
                        await deleteFromCloudflare(urlsToDelete);
                    }

                    window.location.href = '/photoshoots/'; // Redirect back
                } catch (error) {
                    console.error("Error deleting photo set:", error);
                    alert("Error deleting photo set: " + (error.message || error));
                }
            };

            const archiveCategory = async () => {
                if (!isAdmin) return;
                const confirmed = await showConfirmModal({
                    title: "Archive Photoshoot Set",
                    message: "Are you sure you want to archive this photo set? It will be moved to the Archived tab and hidden from public visitors.",
                    confirmText: "Archive Set",
                    confirmVariant: "amber"
                });
                if (!confirmed) return;

                try {
                    invalidateCache('photoshoots');
                    invalidateCache('gallery');
                    invalidateCache('archived');
                    await setDoc(doc(db, 'photo_sets', categoryId), { archived: true }, { merge: true });
                    window.location.href = '/photoshoots/';
                } catch (error) {
                    console.error("Error archiving photo set:", error);
                    alert("Error archiving photo set: " + (error.message || error));
                }
            };

            // --- Render UI ---
            loadingState.style.display = 'none';
            let currentUrls = urls;
            const formattedDesc = formatDescription(description);

            if (isAdmin && categoryId !== 'single-shots') {
                headerContainer.innerHTML = `
                    <h2 class="gallery-title editable" data-field="categoryName" data-raw="${escapeHtml(categoryName)}" title="Double click to edit" style="display:inline-block;">${categoryName}</h2>
                    <div class="gallery-meta">${metaInfo}</div>
                    <div class="gallery-description editable" data-field="description" data-raw="${escapeHtml(description)}" title="Double click to edit description">${description ? formattedDesc : '<span class="desc-placeholder">+ Add description & links...</span>'}</div>
                `;
            } else {
                headerContainer.innerHTML = `
                    <h2 class="gallery-title">${categoryName}</h2>
                    <div class="gallery-meta">${metaInfo}</div>
                    ${description ? `<div class="gallery-description">${formattedDesc}</div>` : ''}
                `;
            }

            // Editable Fields Logic
            if (isAdmin && categoryId !== 'single-shots') {
                const editables = headerContainer.querySelectorAll('.editable');
                editables.forEach(el => {
                    el.style.cursor = 'pointer';
                    el.addEventListener('mouseenter', () => el.style.color = '#60a5fa');
                    el.addEventListener('mouseleave', () => el.style.color = '');

                    el.addEventListener('dblclick', (e) => {
                        // Prevent opening editor if clicking on an active link badge
                        if (e.target.closest('a')) return;
                        if (el.querySelector('input') || el.querySelector('textarea')) return;

                        const fieldName = el.getAttribute('data-field');
                        const isDescription = fieldName === 'description';
                        const currentRaw = el.getAttribute('data-raw') !== null ? el.getAttribute('data-raw') : el.innerText;

                        let input;
                        if (isDescription) {
                            input = document.createElement('textarea');
                            input.value = currentRaw;
                            input.rows = 3;
                            input.placeholder = "Enter description and links (e.g. https://instagram.com/...)";
                            input.style.width = '100%';
                            input.style.maxWidth = '600px';
                            input.style.display = 'block';
                            input.style.margin = '0 auto';
                            input.style.resize = 'vertical';
                        } else {
                            input = document.createElement('input');
                            input.type = fieldName === 'date' ? 'date' : 'text';
                            if (fieldName !== 'date') input.value = currentRaw;
                        }

                        input.style.padding = '6px 10px';
                        input.style.fontSize = 'inherit';
                        input.style.fontFamily = 'inherit';
                        input.style.color = '#fff';
                        input.style.background = '#1e293b';
                        input.style.border = '1px solid #60a5fa';
                        input.style.borderRadius = '6px';
                        input.style.outline = 'none';

                        el.innerHTML = '';
                        el.appendChild(input);
                        input.focus();

                        const saveChange = async () => {
                            if (input.dataset.saving) return;
                            input.dataset.saving = "true";

                            let newVal = input.value.trim();
                            let hasChanged = false;

                            if (fieldName === 'date') {
                                if (newVal) hasChanged = true;
                            } else {
                                if (newVal !== currentRaw) hasChanged = true;
                            }

                            if (!hasChanged) {
                                loadGallery();
                                return;
                            }

                            try {
                                const docRef = doc(db, 'photo_sets', categoryId);
                                const updates = {};
                                if (fieldName === 'date') {
                                    updates[fieldName] = new Date(input.value).toISOString();
                                } else {
                                    updates[fieldName] = newVal;
                                }

                                invalidateCache('photoshoots');
                                invalidateCache('gallery');
                                await updateDoc(docRef, updates);

                                // Update metadata tags document when a set or tag is renamed
                                if (fieldName === 'categoryName' || fieldName === 'modelName' || fieldName === 'theme') {
                                    const oldName = (currentRaw || '').trim();
                                    if (oldName && oldName !== newVal) {
                                        try {
                                            const tagsRef = doc(db, 'metadata', 'tags');
                                            const tagsSnap = await getDoc(tagsRef);
                                            const tagArrayKey = fieldName === 'categoryName' ? 'categories' : (fieldName === 'modelName' ? 'models' : 'themes');
                                            if (tagsSnap.exists()) {
                                                const tagsData = tagsSnap.data();
                                                let tagList = Array.isArray(tagsData[tagArrayKey]) ? [...tagsData[tagArrayKey]] : [];

                                                if (fieldName === 'categoryName') {
                                                    // Categories are {id, name} objects (or legacy strings)
                                                    // Find by stable ID first, then fall back to name match
                                                    const idxById = tagList.findIndex(c => typeof c === 'object' && c !== null && c.id === categoryId);
                                                    if (idxById !== -1) {
                                                        tagList[idxById] = { ...tagList[idxById], name: newVal };
                                                    } else {
                                                        // Legacy string entry — upgrade it to {id, name}
                                                        const idxByName = tagList.findIndex(c =>
                                                            (typeof c === 'string' && c.trim().toLowerCase() === oldName.toLowerCase()) ||
                                                            (typeof c === 'object' && c !== null && (c.name || '').trim().toLowerCase() === oldName.toLowerCase())
                                                        );
                                                        if (idxByName !== -1) {
                                                            const existing = tagList[idxByName];
                                                            tagList[idxByName] = { id: categoryId, name: newVal };
                                                            // Remove any leftover duplicate with old name
                                                            tagList = tagList.filter((c, i) => i === idxByName || (
                                                                typeof c === 'string' ? c !== oldName : (c.name !== oldName || i === idxByName)
                                                            ));
                                                        } else {
                                                            tagList.push({ id: categoryId, name: newVal });
                                                        }
                                                    }
                                                } else {
                                                    // models / themes — plain string arrays
                                                    const exactIdx = tagList.indexOf(oldName);
                                                    if (exactIdx !== -1) {
                                                        tagList[exactIdx] = newVal;
                                                    } else {
                                                        const ciIdx = tagList.findIndex(item => typeof item === 'string' && item.trim().toLowerCase() === oldName.toLowerCase());
                                                        if (ciIdx !== -1) {
                                                            tagList[ciIdx] = newVal;
                                                        } else if (!tagList.includes(newVal)) {
                                                            tagList.push(newVal);
                                                        }
                                                    }
                                                }

                                                tagList = tagList.filter((item, i) => {
                                                    if (typeof item === 'object' && item !== null) {
                                                        return tagList.findIndex(c => typeof c === 'object' && c !== null && c.id === item.id) === i;
                                                    }
                                                    return tagList.indexOf(item) === i;
                                                });
                                                await setDoc(tagsRef, { [tagArrayKey]: tagList }, { merge: true });
                                            } else {
                                                const newEntry = fieldName === 'categoryName'
                                                    ? [{ id: categoryId, name: newVal }]
                                                    : [newVal];
                                                await setDoc(tagsRef, { [tagArrayKey]: newEntry }, { merge: true });
                                            }
                                        } catch (tagErr) {
                                            console.warn(`Could not update metadata tags for ${fieldName}:`, tagErr);
                                        }
                                    }
                                }

                                loadGallery(); // Reload to reflect changes globally
                            } catch (e) {
                                console.error("Error updating field:", e);
                                alert("Failed to update.");
                                loadGallery();
                            }
                        };

                        input.addEventListener('blur', saveChange);
                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' && !isDescription) {
                                input.blur();
                            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && isDescription) {
                                input.blur();
                            } else if (e.key === 'Escape') {
                                input.dataset.saving = "true"; // Prevent blur trigger
                                loadGallery();
                            }
                        });
                    });
                });
            }

            // Admin Action Buttons (Archive + Delete)
            if (isAdmin && categoryId !== 'single-shots') {
                const adminGroup = document.createElement('div');
                adminGroup.className = 'admin-btn-group';
                adminGroup.style.marginTop = '1.25rem';

                const archCatBtn = document.createElement('button');
                archCatBtn.className = 'archive-category-btn';
                archCatBtn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>
                    </svg>
                    <span>Archive Set</span>
                `;
                archCatBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    archiveCategory();
                });

                const delCatBtn = document.createElement('button');
                delCatBtn.className = 'delete-category-btn';
                delCatBtn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>Delete Set</span>
                `;
                delCatBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteCategory();
                });

                adminGroup.appendChild(archCatBtn);
                adminGroup.appendChild(delCatBtn);
                headerContainer.appendChild(adminGroup);
            }

            // Bottom Toolbar: Photo Count + Ratio Switcher (Original vs 1:1 Square) + Admin Selection Mode
            const headerBottom = document.createElement('div');
            headerBottom.className = 'gallery-header-bottom';
            headerBottom.innerHTML = `
                <div class="gallery-photo-count">${currentUrls.length} Photographs</div>
                <div class="gallery-header-controls">
                    <div class="gallery-ratio-switcher" id="gallery-ratio-switcher" role="group" aria-label="Aspect Ratio View">
                        <button type="button" class="ratio-switch-btn ${currentRatioMode === 'original' ? 'active' : ''}" data-ratio="original" title="View in original aspect ratio">
                            <svg class="ratio-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="8" height="11" rx="0.5"/>
                                <rect x="13" y="3" width="8" height="7" rx="0.5"/>
                                <rect x="13" y="12" width="8" height="9" rx="0.5"/>
                                <rect x="3" y="16" width="8" height="5" rx="0.5"/>
                            </svg>
                            <span>Original</span>
                        </button>
                        <button type="button" class="ratio-switch-btn ${currentRatioMode === '1:1' ? 'active' : ''}" data-ratio="1:1" title="View in 1:1 square ratio">
                            <svg class="ratio-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="8" height="8" rx="0.5"/>
                                <rect x="13" y="3" width="8" height="8" rx="0.5"/>
                                <rect x="3" y="13" width="8" height="8" rx="0.5"/>
                                <rect x="13" y="13" width="8" height="8" rx="0.5"/>
                            </svg>
                            <span>1:1</span>
                        </button>
                    </div>
                    ${isAdmin ? `
                    <button type="button" class="gallery-selection-mode-btn ${isSelectionMode ? 'active' : ''}" id="gallery-selection-mode-btn" title="Toggle selection mode for batch actions">
                        <svg class="select-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <path d="M9 12l2 2 4-4"/>
                        </svg>
                        <span>Select</span>
                    </button>
                    ` : ''}
                </div>
            `;
            headerContainer.appendChild(headerBottom);

            if (isAdmin) {
                const selectBtn = headerBottom.querySelector('#gallery-selection-mode-btn');
                if (selectBtn) {
                    selectBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        toggleSelectionMode();
                    });
                }
            }

            const setRatioMode = (mode) => {
                currentRatioMode = mode;
                try {
                    localStorage.setItem('zhukov_gallery_ratio_mode', mode);
                } catch (e) { }

                const switcher = document.getElementById('gallery-ratio-switcher');
                if (switcher) {
                    switcher.querySelectorAll('.ratio-switch-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.getAttribute('data-ratio') === mode);
                    });
                }

                if (mode === '1:1') {
                    gridContainer.classList.add('ratio-1-1');
                    gridContainer.style.position = '';
                    gridContainer.style.height = '';
                    gridContainer.querySelectorAll('.masonry-item').forEach(wrapper => {
                        wrapper.style.position = '';
                        wrapper.style.left = '';
                        wrapper.style.top = '';
                        wrapper.style.width = '';
                        wrapper.style.height = '';
                        wrapper.style.gridColumn = '';
                        wrapper.style.gridRow = '';
                    });
                } else {
                    gridContainer.classList.remove('ratio-1-1');
                    layoutMasonry();
                }
            };

            headerBottom.querySelectorAll('.ratio-switch-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetRatio = btn.getAttribute('data-ratio');
                    if (targetRatio && targetRatio !== currentRatioMode) {
                        setRatioMode(targetRatio);
                    }
                });
            });

            const layoutMasonry = () => {
                if (currentRatioMode === '1:1') return;

                const items = Array.from(gridContainer.querySelectorAll('.masonry-item'));
                if (items.length === 0) return;

                const containerWidth = gridContainer.getBoundingClientRect().width;
                if (!containerWidth) return;

                const isMobile = window.innerWidth <= 500;
                const isTablet = window.innerWidth <= 800;
                const isLaptop = window.innerWidth <= 1200;

                let numCols = 4;
                if (isTablet || isMobile) {
                    numCols = 2;
                } else if (isLaptop) {
                    numCols = 3;
                }

                const gap = isMobile ? 8 : (isTablet ? 12 : 16);
                const colWidth = (containerWidth - (numCols - 1) * gap) / numCols;
                const colHeights = new Array(numCols).fill(0);

                gridContainer.style.position = 'relative';

                items.forEach(wrapper => {
                    const img = wrapper.querySelector('img.masonry-img');
                    // Accurate natural aspect ratio (fallback 0.75 for portrait placeholders)
                    const ratio = (img && img.naturalWidth && img.naturalHeight)
                        ? (img.naturalWidth / img.naturalHeight)
                        : 0.75;

                    // Intelligent 2-column feature span:
                    // Only span 2 columns if adjacent columns are level (<= 20px difference) so NO GAP is ever created!
                    const isWide = ratio > 1.35;
                    let bestCol = 0;
                    let spanCols = 1;

                    if (isWide && numCols >= 2) {
                        let bestPairCol = -1;
                        let bestPairTop = Infinity;

                        for (let c = 0; c < numCols - 1; c++) {
                            const heightDiff = Math.abs(colHeights[c] - colHeights[c + 1]);
                            if (heightDiff <= 20) {
                                const pairTop = Math.max(colHeights[c], colHeights[c + 1]);
                                if (pairTop < bestPairTop) {
                                    bestPairTop = pairTop;
                                    bestPairCol = c;
                                }
                            }
                        }

                        let minSingleCol = 0;
                        let minSingleHeight = colHeights[0];
                        for (let c = 1; c < numCols; c++) {
                            if (colHeights[c] < minSingleHeight) {
                                minSingleHeight = colHeights[c];
                                minSingleCol = c;
                            }
                        }

                        if (bestPairCol !== -1 && bestPairTop <= minSingleHeight + 30) {
                            spanCols = 2;
                            bestCol = bestPairCol;
                        } else {
                            spanCols = 1;
                            bestCol = minSingleCol;
                        }
                    } else {
                        let minCol = 0;
                        let minHeight = colHeights[0];
                        for (let c = 1; c < numCols; c++) {
                            if (colHeights[c] < minHeight) {
                                minHeight = colHeights[c];
                                minCol = c;
                            }
                        }
                        bestCol = minCol;
                        spanCols = 1;
                    }

                    const itemWidth = spanCols === 2 ? Math.round(colWidth * 2 + gap) : Math.round(colWidth);
                    const top = spanCols === 2
                        ? Math.max(colHeights[bestCol], colHeights[bestCol + 1])
                        : colHeights[bestCol];
                    const left = Math.round(bestCol * (colWidth + gap));
                    const itemHeight = Math.round(itemWidth / ratio);

                    wrapper.style.position = 'absolute';
                    wrapper.style.left = `${left}px`;
                    wrapper.style.top = `${top}px`;
                    wrapper.style.width = `${itemWidth}px`;
                    wrapper.style.height = `${itemHeight}px`;
                    wrapper.style.gridColumn = '';
                    wrapper.style.gridRow = '';

                    const newHeight = top + itemHeight + gap;
                    colHeights[bestCol] = newHeight;
                    if (spanCols === 2) {
                        colHeights[bestCol + 1] = newHeight;
                    }
                });

                const maxHeight = Math.max(...colHeights);
                gridContainer.style.height = `${maxHeight}px`;
            };

            let draggedIndex = null;

            let galleryViewportObserver = null;

            const renderGrid = () => {
                gridContainer.innerHTML = ''; // clear

                if (currentUrls.length === 0) {
                    gridContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; width: 100%;">No photos in this set.</div>`;
                    return;
                }

                if (currentRatioMode === '1:1') {
                    gridContainer.classList.add('ratio-1-1');
                } else {
                    gridContainer.classList.remove('ratio-1-1');
                }

                currentUrls.forEach((url, index) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = `masonry-item img-container ${selectedPhotoUrls.has(url) ? 'is-selected' : ''}`;

                    const img = document.createElement('img');
                    img.className = 'masonry-img';
                    img.dataset.fullUrl = url;
                    img.src = url;

                    const handleImageReady = () => {
                        wrapper.classList.add('img-loaded');
                        if (currentRatioMode !== '1:1') {
                            layoutMasonry();
                        }
                    };

                    if (img.complete && img.naturalWidth > 0) {
                        handleImageReady();
                    } else {
                        img.addEventListener('load', handleImageReady);
                    }

                    img.addEventListener('error', () => {
                        wrapper.classList.add('img-loaded');
                    });

                    // Tap & Click handler for Lightbox or Selection
                    let touchMoved = false;
                    let touchStartX = 0;
                    let touchStartY = 0;

                    const triggerLightbox = (e) => {
                        if (e.target.closest('.photo-admin-bar') || e.target.closest('.photo-admin-btn') || e.target.closest('.modal-overlay') || e.target.closest('.photo-select-badge')) return;
                        if (wrapper.classList.contains('dragging')) return;
                        if (touchMoved) {
                            touchMoved = false;
                            return;
                        }
                        if (isSelectionMode) {
                            togglePhotoSelection(url);
                            return;
                        }
                        openLightbox(img, categoryName || 'GALLERY');
                    };

                    wrapper.addEventListener('click', triggerLightbox);

                    wrapper.addEventListener('touchstart', (e) => {
                        touchMoved = false;
                        if (e.touches && e.touches[0]) {
                            touchStartX = e.touches[0].clientX;
                            touchStartY = e.touches[0].clientY;
                        }
                    }, { passive: true });

                    wrapper.addEventListener('touchmove', (e) => {
                        if (e.touches && e.touches[0]) {
                            if (Math.abs(e.touches[0].clientX - touchStartX) > 8 || Math.abs(e.touches[0].clientY - touchStartY) > 8) {
                                touchMoved = true;
                            }
                        }
                    }, { passive: true });

                    // Attach 3D Magnetic Tilt
                    attachTiltEffect(wrapper);

                    wrapper.appendChild(img);

                    // Admin Photo Select Badge
                    if (isAdmin) {
                        const selectBadge = document.createElement('div');
                        selectBadge.className = 'photo-select-badge';
                        selectBadge.setAttribute('aria-label', 'Select photo');
                        selectBadge.innerHTML = `
                            <svg viewBox="0 0 24 24">
                                <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        `;
                        selectBadge.addEventListener('click', (e) => {
                            e.stopPropagation();
                            togglePhotoSelection(url);
                        });
                        wrapper.appendChild(selectBadge);
                    }

                    // Admin Photo Action Buttons (Move, Archive, Delete)
                    if (isAdmin) {
                        const adminBar = document.createElement('div');
                        adminBar.className = 'photo-admin-bar';

                        // Move Button
                        const movePhotoBtn = document.createElement('button');
                        movePhotoBtn.className = 'photo-admin-btn move-photo-btn';
                        movePhotoBtn.title = 'Move photo to another set';
                        movePhotoBtn.setAttribute('aria-label', 'Move photo to another set');
                        movePhotoBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 12h14M13 6l6 6-6 6"/>
                            </svg>
                        `;
                        movePhotoBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (selectedPhotoUrls.size > 1 && selectedPhotoUrls.has(url)) {
                                openMoveModal(Array.from(selectedPhotoUrls));
                            } else {
                                openMoveModal([url]);
                            }
                        });

                        // Archive Button
                        const isPhotoArchived = archivedUrlsSet.has(url);
                        const archivePhotoBtn = document.createElement('button');
                        archivePhotoBtn.className = `photo-admin-btn archive-photo-btn ${isPhotoArchived ? 'is-archived' : ''}`;
                        archivePhotoBtn.title = isPhotoArchived ? 'Unarchive photo (make public)' : 'Archive photo (hide from public)';
                        archivePhotoBtn.setAttribute('aria-label', archivePhotoBtn.title);
                        archivePhotoBtn.innerHTML = isPhotoArchived
                            ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4M12 16v-4m-3 3 3-3 3 3"/></svg>`
                            : `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>`;
                        archivePhotoBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (selectedPhotoUrls.size > 1 && selectedPhotoUrls.has(url)) {
                                toggleArchivePhotos(Array.from(selectedPhotoUrls));
                            } else {
                                toggleArchivePhotos([url]);
                            }
                        });

                        // Delete Photo Button
                        const delPhotoBtn = document.createElement('button');
                        delPhotoBtn.className = 'photo-admin-btn delete-photo-btn';
                        delPhotoBtn.title = 'Delete photo';
                        delPhotoBtn.setAttribute('aria-label', 'Delete photo');
                        delPhotoBtn.innerHTML = '&times;';
                        delPhotoBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (selectedPhotoUrls.size > 1 && selectedPhotoUrls.has(url)) {
                                deletePhotos(Array.from(selectedPhotoUrls));
                            } else {
                                deletePhotos([url]);
                            }
                        });

                        adminBar.appendChild(movePhotoBtn);
                        adminBar.appendChild(archivePhotoBtn);
                        adminBar.appendChild(delPhotoBtn);
                        wrapper.appendChild(adminBar);

                        // Archived indicator badge on photo card for admin
                        if (isPhotoArchived) {
                            const badge = document.createElement('div');
                            badge.className = 'photo-archived-badge';
                            badge.innerText = 'Archived';
                            wrapper.appendChild(badge);
                        }
                    }

                    // Admin Drag and Drop Reordering (Available for all sets including single-shots)
                    if (isAdmin) {
                        wrapper.draggable = !isSelectionMode;

                        wrapper.addEventListener('dragstart', (e) => {
                            if (isSelectionMode) {
                                e.preventDefault();
                                return;
                            }
                            draggedIndex = index;
                            wrapper.classList.add('dragging');
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', index);
                        });

                        wrapper.addEventListener('dragend', () => {
                            wrapper.classList.remove('dragging');
                        });

                        wrapper.addEventListener('dragover', (e) => {
                            if (isSelectionMode) return;
                            e.preventDefault(); // Necessary to allow dropping
                            e.dataTransfer.dropEffect = 'move';
                            wrapper.classList.add('drag-over');
                        });

                        wrapper.addEventListener('dragleave', () => {
                            wrapper.classList.remove('drag-over');
                        });

                        wrapper.addEventListener('drop', async (e) => {
                            if (isSelectionMode) return;
                            e.preventDefault();
                            wrapper.classList.remove('drag-over');

                            const dropIndex = index;
                            if (draggedIndex === null || draggedIndex === dropIndex) return;

                            // Reorder array locally
                            const item = currentUrls.splice(draggedIndex, 1)[0];
                            currentUrls.splice(dropIndex, 0, item);

                            // Save to Firestore immediately
                            try {
                                if (categoryId === 'single-shots') {
                                    await setDoc(doc(db, 'settings', 'single_shots_order'), { order: currentUrls }, { merge: true });
                                } else {
                                    const docRef = doc(db, 'photo_sets', categoryId);
                                    await setDoc(docRef, { urls: [...currentUrls].reverse() }, { merge: true });
                                }
                                invalidateCache(cacheKey);
                                invalidateCache('photoshoots');
                            } catch (err) {
                                console.error("Error saving new order:", err);
                                alert("Failed to save order.");
                            }

                            // Re-render grid to reflect changes
                            renderGrid();
                        });
                    }

                    gridContainer.appendChild(wrapper);
                    if (galleryViewportObserver) {
                        galleryViewportObserver.observe(wrapper);
                    }
                });

                if (currentRatioMode !== '1:1') {
                    layoutMasonry();
                }
            };

            renderGrid();

            // Handle Resize - recalculate masonry layout since column widths change
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (currentRatioMode === '1:1') return;
                    layoutMasonry();
                }, 100);
            });

        } catch (error) {
            console.error("Error loading gallery:", error);
            loadingState.innerText = "An error occurred while loading the gallery.";
        }
    };

    // Initial Load
    if (categoryId) {
        loadGallery();
    } else {
        loadingState.innerText = "Error: No photoshoot selected.";
    }
});

