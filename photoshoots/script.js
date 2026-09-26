import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, arrayRemove, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";
import { getCachedData, setCachedData, invalidateCache, isDataEqual, registerSiteServiceWorker } from "../site-cache.js";
import { deleteFromCloudflare } from "../cloudflare-storage.js";

// --- CONFIGURATION ---
// Change this number to control how many images per photoshoot set are shown in Flow Mode:
const FLOW_VIEW_IMAGES_PER_SET = 9;

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', async () => {
    registerSiteServiceWorker();

    // Auth UI Elements
    const loginBtn = document.getElementById('login-btn-header');
    const logoutBtn = document.getElementById('logout-btn');

    // Gallery, View Switcher & Sort UI
    const sortSelect = document.getElementById('sort-select');
    const sortOrderBtn = document.getElementById('sort-order-btn');
    const categoriesContainer = document.getElementById('categories-container');
    const flowContainer = document.getElementById('flow-container');
    const viewFlowBtn = document.getElementById('view-flow-btn');
    const viewSetsBtn = document.getElementById('view-sets-btn');
    const noResults = document.getElementById('no-results');

    // View state: 'flow' is default
    let currentView = localStorage.getItem('zhukov_photoshoots_view') || 'flow';

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxSetName = document.getElementById('lightbox-set-name');
    const lightboxActions = document.getElementById('lightbox-actions');
    const lightboxViewSetBtn = document.getElementById('lightbox-view-set-btn');
    const closeBtn = document.querySelector('#lightbox-close, .lightbox .close, .close');

    // Data store
    let categoriesData = [];
    let isAdmin = false;

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
            await loadPhotos();
        } else {
            localStorage.removeItem('zhukov_logged_in');
            isAdmin = false;
            if (window.updateHeaderAuthState) {
                window.updateHeaderAuthState(null, false);
            }
            await loadPhotos();
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

    const openLightbox = (imgElement, setName = 'PHOTOSHOOT', categoryId = null) => {
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
            lightboxSetName.innerHTML = '';
            if (categoryId) {
                const link = document.createElement('a');
                link.className = 'lightbox-set-name-link';
                link.href = `/photoshoots/gallery.html?id=${encodeURIComponent(categoryId)}`;
                link.textContent = (setName || (categoryId === 'single-shots' ? 'SINGLE SHOTS' : 'PHOTOSHOOT')).toUpperCase() + ' \u2192';
                link.title = `View full ${setName || 'photoshoot'} editorial`;
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (isLightboxHistoryActive) {
                        try {
                            history.replaceState(null, '', window.location.href);
                            isLightboxHistoryActive = false;
                        } catch (err) {}
                    }
                });
                lightboxSetName.appendChild(link);
            } else {
                lightboxSetName.textContent = (setName || 'PHOTOSHOOT').toUpperCase();
            }
        }

        // View Set Button under the image
        if (lightboxActions && lightboxViewSetBtn) {
            if (categoryId) {
                const targetCat = categoriesData.find(c => c.categoryId === categoryId);
                const count = (targetCat && Array.isArray(targetCat.urls)) ? targetCat.urls.length : 0;
                const setDisplayName = targetCat ? (targetCat.categoryName || setName) : setName;

                const btnText = lightboxViewSetBtn.querySelector('.btn-text');
                const label = count > 1 ? `VIEW SET (${count} PHOTOS)` : 'VIEW FULL SET';
                if (btnText) {
                    btnText.textContent = label;
                } else {
                    lightboxViewSetBtn.textContent = `${label} \u2192`;
                }

                lightboxViewSetBtn.href = `/photoshoots/gallery.html?id=${encodeURIComponent(categoryId)}`;
                lightboxViewSetBtn.title = `View full ${setDisplayName} editorial`;
                lightboxActions.style.display = 'flex';
            } else {
                lightboxActions.style.display = 'none';
            }
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
            if (lightboxSetName) lightboxSetName.textContent = 'PHOTOSHOOT';
            if (lightboxActions) lightboxActions.style.display = 'none';
            activeOriginImg = null;
        }, 300);
    };

    if (lightboxActions) {
        lightboxActions.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    if (lightboxViewSetBtn) {
        lightboxViewSetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isLightboxHistoryActive) {
                try {
                    history.replaceState(null, '', window.location.href);
                    isLightboxHistoryActive = false;
                } catch (err) {}
            }
        });
    }

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

    // --- Fetch Data ---
    let loadPhotosReqId = 0;

    const loadPhotos = async () => {
        const currentReqId = ++loadPhotosReqId;
        const cacheKey = `photoshoots_list_admin_${isAdmin}`;

        // 1. Instant SWR Render from Local Memory / Storage
        const cached = getCachedData(cacheKey);
        if (cached && Array.isArray(cached) && cached.length > 0) {
            categoriesData = cached;
            renderCurrentView();
        } else {
            // Show skeleton loading state only on cold / un-cached load
            showSkeletonLoading();
        }

        try {
            const loadedCategories = [];

            // 1. Fetch Single Shots (filtered if not 18+ and not archived for public)
            const [singleSnap, orderDoc] = await Promise.all([
                getDocs(collection(db, 'single_shots')),
                getDoc(doc(db, 'settings', 'single_shots_order')).catch(() => null)
            ]);
            const singleUrls = [];
            const singleItems = [];
            let latestSingleDate = '1970-01-01T00:00:00.000Z';

            singleSnap.forEach(doc => {
                const data = doc.data();
                if (!isAdmin && data.archived === true) return; // Hide archived single shots for non-admins
                singleItems.push(data);
                if (data.date && data.date > latestSingleDate) {
                    latestSingleDate = data.date;
                }
            });

            // Sort by custom order or newest to oldest
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
            singleItems.forEach(item => singleUrls.push(item.url));

            if (singleUrls.length > 0) {
                loadedCategories.push({
                    categoryId: 'single-shots',
                    categoryName: 'Single Shots',
                    modelName: 'Mixed',
                    theme: 'Mixed',
                    date: latestSingleDate,
                    urls: singleUrls
                });
            }

            // 2. Fetch Photo Sets (exclude fully archived sets & sets with all photos archived)
            const setsSnap = await getDocs(collection(db, 'photo_sets'));
            setsSnap.forEach(doc => {
                const data = doc.data();
                if (data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
                    const archivedUrls = Array.isArray(data.archivedUrls) ? data.archivedUrls : (Array.isArray(data.archived_photos) ? data.archived_photos : []);
                    const allImagesArchived = data.urls.every(url => archivedUrls.includes(url));

                    // Sets that are fully archived or have every single image archived should ONLY be visible in the archived tab
                    if (data.archived === true || allImagesArchived) return;

                    let visibleUrls = [...data.urls];

                    // Filter out individually archived photos for non-admins
                    if (!isAdmin) {
                        visibleUrls = visibleUrls.filter(url => !archivedUrls.includes(url));
                        if (visibleUrls.length === 0) {
                            return; // All images in this set are archived, hide set
                        }
                    }

                    loadedCategories.push({
                        categoryId: doc.id,
                        categoryName: data.categoryName || 'Unknown Photo set',
                        modelName: data.modelName || 'Unknown',
                        theme: data.theme || 'None',
                        date: data.date || '1970-01-01T00:00:00.000Z',
                        urls: visibleUrls.reverse() // Show newest to oldest
                    });
                }
            });

            // Prevent race condition overwrite
            if (currentReqId !== loadPhotosReqId) return;

            // Only re-render if data has changed or if first load was un-cached
            if (!isDataEqual(categoriesData, loadedCategories) || !cached) {
                categoriesData = loadedCategories;
                setCachedData(cacheKey, loadedCategories);
                renderCurrentView();
            } else {
                // Refresh cache TTL
                setCachedData(cacheKey, loadedCategories);
            }
        } catch (error) {
            console.error("Error loading photos:", error);
        }
    };

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

            const escapeHtml = (str) => String(str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

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

    // --- Admin Deletion Logic ---
    const deletePhoto = async (categoryId, photoUrl) => {
        const confirmed = await showConfirmModal({
            title: "Delete Photo",
            message: "Are you sure you want to delete this photo?",
            confirmText: "Delete Photo",
            confirmVariant: "red"
        });
        if (!confirmed) return;

        try {
            invalidateCache('photoshoots');
            invalidateCache('gallery');
            if (categoryId === 'single-shots') {
                const q = query(collection(db, 'single_shots'), where('url', '==', photoUrl));
                const snap = await getDocs(q);
                snap.forEach(async (d) => {
                    await deleteDoc(doc(db, 'single_shots', d.id));
                });
                try {
                    const orderRef = doc(db, 'settings', 'single_shots_order');
                    await updateDoc(orderRef, { order: arrayRemove(photoUrl) });
                } catch (_) { }
            } else {
                await updateDoc(doc(db, 'photo_sets', categoryId), {
                    urls: arrayRemove(photoUrl),
                    adultUrls: arrayRemove(photoUrl),
                    archivedUrls: arrayRemove(photoUrl)
                });
            }

            // Also delete from Cloudflare R2 bucket
            await deleteFromCloudflare(photoUrl);

            // Reload data
            await loadPhotos();
        } catch (error) {
            console.error("Error deleting photo:", error);
            alert("Error deleting photo: " + (error.message || error));
        }
    };

    const deleteCategory = async (categoryId) => {
        const confirmed = await showConfirmModal({
            title: "Delete Entire Photoshoot",
            message: "Are you sure you want to permanently delete this ENTIRE set? This cannot be undone.",
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
                urlsToDelete = Array.from(new Set([...setUrls, ...adultUrls, ...archivedUrls]));
            }

            await deleteDoc(setRef);

            // Delete all photos belonging to this photoshoot set from Cloudflare R2 bucket
            if (urlsToDelete.length > 0) {
                await deleteFromCloudflare(urlsToDelete);
            }

            await loadPhotos();
        } catch (error) {
            console.error("Error deleting photo set:", error);
            alert("Error deleting photo set: " + (error.message || error));
        }
    };

    const archiveCategory = async (categoryId) => {
        const confirmed = await showConfirmModal({
            title: "Archive Photoshoot Set",
            message: "Archive this photo set? It will be moved to the Archived tab and hidden from public visitors.",
            confirmText: "Archive Set",
            confirmVariant: "amber"
        });
        if (!confirmed) return;

        try {
            invalidateCache('photoshoots');
            invalidateCache('gallery');
            invalidateCache('archived');
            await setDoc(doc(db, 'photo_sets', categoryId), { archived: true }, { merge: true });
            await loadPhotos();
        } catch (error) {
            console.error("Error archiving photo set:", error);
            alert("Error archiving photo set: " + (error.message || error));
        }
    };

    // --- Cold Load Skeleton Helper ---
    const showSkeletonLoading = () => {
        noResults.style.display = 'none';
        if (currentView === 'flow') {
            if (flowContainer) {
                flowContainer.style.display = 'block';
                categoriesContainer.style.display = 'none';
                flowContainer.innerHTML = '';
                const skeletonHeights = [320, 260, 380, 300, 240, 350, 280, 400];
                for (let i = 0; i < 8; i++) {
                    const skel = document.createElement('div');
                    skel.className = 'masonry-item skeleton';
                    skel.style.position = 'relative';
                    skel.style.height = `${skeletonHeights[i]}px`;
                    skel.style.marginBottom = '16px';
                    flowContainer.appendChild(skel);
                }
            }
        } else {
            if (flowContainer) flowContainer.style.display = 'none';
            categoriesContainer.style.display = 'block';
            categoriesContainer.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                categoriesContainer.innerHTML += `
                    <div class="category-row">
                        <div class="category-header">
                            <div class="category-info" style="width: 100%;">
                                <div class="skeleton skeleton-text skeleton-title" style="max-width: 260px;"></div>
                                <div class="skeleton skeleton-text skeleton-meta" style="max-width: 160px;"></div>
                            </div>
                        </div>
                        <div class="scrollable-row-wrapper">
                            <div class="scrollable-row">
                                <div class="skeleton skeleton-img img-container" style="width: 180px; flex-shrink: 0;"></div>
                                <div class="skeleton skeleton-img img-container" style="width: 180px; flex-shrink: 0;"></div>
                                <div class="skeleton skeleton-img img-container" style="width: 180px; flex-shrink: 0;"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    };

    // --- Sort Categories Data Helper ---
    const sortCategories = () => {
        const sortBy = sortSelect ? sortSelect.value : 'date';
        const sortOrder = sortOrderBtn ? sortOrderBtn.getAttribute('data-order') : 'desc';

        categoriesData.sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = new Date(a.date || 0).getTime();
                const dateB = new Date(b.date || 0).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                let valA = (a[sortBy === 'category' ? 'categoryName' : (sortBy === 'model' ? 'modelName' : sortBy)] || '').toLowerCase();
                let valB = (b[sortBy === 'category' ? 'categoryName' : (sortBy === 'model' ? 'modelName' : sortBy)] || '').toLowerCase();

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            }
        });
    };

    // ==========================================================================
    // FLOW VIEW — SMART SEAMLESS MASONRY ENGINE (Exact Same As Galleries)
    // ==========================================================================
    let masonryRaf = null;
    const scheduleMasonryLayout = () => {
        if (masonryRaf) cancelAnimationFrame(masonryRaf);
        masonryRaf = requestAnimationFrame(() => {
            if (currentView === 'flow' && flowContainer) {
                layoutMasonry();
            }
        });
    };

    const layoutMasonry = () => {
        if (!flowContainer) return;
        const items = Array.from(flowContainer.querySelectorAll('.masonry-item'));
        if (items.length === 0) return;

        const containerWidth = flowContainer.getBoundingClientRect().width;
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

        flowContainer.style.position = 'relative';

        items.forEach(wrapper => {
            const img = wrapper.querySelector('img.masonry-img');
            // Accurate natural aspect ratio (fallback 0.75 for portrait placeholders)
            const ratio = (img && img.naturalWidth && img.naturalHeight && img.src && !img.src.startsWith('data:image/svg+xml'))
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

            const newHeight = top + itemHeight + gap;
            colHeights[bestCol] = newHeight;
            if (spanCols === 2) {
                colHeights[bestCol + 1] = newHeight;
            }
        });

        const maxHeight = Math.max(...colHeights);
        flowContainer.style.height = `${maxHeight}px`;
    };

    // Resize recalculates masonry layout
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (currentView === 'flow') {
                layoutMasonry();
            }
        }, 80);
    });

    let flowViewportObserver = null;

    const renderFlowView = () => {
        if (photoshootsViewportObserver) {
            photoshootsViewportObserver.disconnect();
        }
        if (flowViewportObserver) {
            flowViewportObserver.disconnect();
        }
        categoriesContainer.style.display = 'none';
        if (flowContainer) {
            flowContainer.style.display = 'block';
            flowContainer.innerHTML = '';
        }
        noResults.style.display = 'none';

        if (categoriesData.length === 0) {
            noResults.style.display = 'block';
            return;
        }

        sortCategories();

        flowViewportObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const wrapper = entry.target;
                    const img = wrapper.querySelector('img.masonry-img');
                    if (img && img.dataset.src) {
                        const targetSrc = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.src = targetSrc;
                        if (img.complete && img.naturalWidth > 0) {
                            wrapper.classList.add('img-loaded');
                            scheduleMasonryLayout();
                        }
                    }
                    observer.unobserve(wrapper);
                }
            });
        }, {
            root: null,
            rootMargin: '600px 200px',
            threshold: 0
        });

        // Collect up to FLOW_VIEW_IMAGES_PER_SET images per photoshoot set
        const flowItems = [];
        categoriesData.forEach(cat => {
            const limit = typeof FLOW_VIEW_IMAGES_PER_SET === 'number' && FLOW_VIEW_IMAGES_PER_SET > 0 ? FLOW_VIEW_IMAGES_PER_SET : 5;
            const urls = (cat.urls || []).slice(0, limit);
            urls.forEach(url => {
                flowItems.push({ url, cat });
            });
        });

        if (flowItems.length === 0) {
            noResults.style.display = 'block';
            return;
        }

        const escapeHtml = (str) => String(str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

        flowItems.forEach(({ url, cat }) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'masonry-item img-container';

            const img = document.createElement('img');
            img.className = 'masonry-img';
            img.dataset.fullUrl = url;
            img.dataset.src = url;
            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 4'%3E%3C/svg%3E";
            img.loading = 'lazy';
            img.decoding = 'async';
            img.alt = cat.categoryName || 'Editorial Photo';

            const handleImageReady = () => {
                wrapper.classList.add('img-loaded');
                scheduleMasonryLayout();
            };

            if (img.complete && img.naturalWidth > 0 && img.src && !img.src.startsWith('data:image/svg+xml')) {
                handleImageReady();
            } else {
                img.addEventListener('load', () => {
                    if (img.src && !img.src.startsWith('data:image/svg+xml')) {
                        handleImageReady();
                    }
                });
            }

            img.addEventListener('error', () => {
                if (img.src && !img.src.startsWith('data:image/svg+xml')) {
                    wrapper.classList.add('img-loaded');
                }
            });

            // Tap & Click handler for Lightbox
            let touchMoved = false;
            let touchStartX = 0;
            let touchStartY = 0;

            const triggerLightbox = (e) => {
                if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && e.target.closest('.flow-set-link')) return;
                if (e.target.closest('.delete-photo-btn')) return;
                if (touchMoved) {
                    touchMoved = false;
                    return;
                }
                openLightbox(img, cat.categoryName || 'PHOTOSHOOT', cat.categoryId);
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

            // Append image first as card base
            wrapper.appendChild(img);

            // Subtle editorial hover overlay (appended ON TOP of image)
            if (cat.categoryId) {
                const overlay = document.createElement('div');
                overlay.className = 'flow-item-overlay';

                const info = document.createElement('div');
                info.className = 'flow-item-info';

                const title = document.createElement('span');
                title.className = 'flow-item-title';
                title.textContent = cat.categoryName || (cat.categoryId === 'single-shots' ? 'Single Shots' : 'Photoshoot');

                const link = document.createElement('a');
                link.className = 'flow-set-link';
                link.href = `/photoshoots/gallery.html?id=${encodeURIComponent(cat.categoryId)}`;
                link.innerHTML = `View Set &rarr;`;
                link.title = `View full ${escapeHtml(cat.categoryName || 'Single Shots')} editorial`;
                link.addEventListener('click', (e) => {
                    e.stopPropagation();
                });

                info.appendChild(title);
                info.appendChild(link);
                overlay.appendChild(info);
                wrapper.appendChild(overlay);
            }

            // Attach 3D Magnetic Tilt
            attachTiltEffect(wrapper);

            // Delete Photo Button (Admin Only)
            if (isAdmin) {
                const delPhotoBtn = document.createElement('button');
                delPhotoBtn.className = 'delete-photo-btn';
                delPhotoBtn.innerHTML = '&times;';
                delPhotoBtn.setAttribute('title', 'Delete Photo');
                delPhotoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deletePhoto(cat.categoryId, url);
                });
                wrapper.appendChild(delPhotoBtn);
            }

            flowContainer.appendChild(wrapper);
            if (flowViewportObserver) {
                flowViewportObserver.observe(wrapper);
            }
        });

        scheduleMasonryLayout();
    };

    // ==========================================================================
    // SETS VIEW — ORIGINAL HORIZONTAL SERIES (Kept 100% Intact & Untouched)
    // ==========================================================================
    let photoshootsViewportObserver = null;

    const renderSetsView = () => {
        if (flowViewportObserver) {
            flowViewportObserver.disconnect();
        }
        if (flowContainer) flowContainer.style.display = 'none';
        categoriesContainer.style.display = 'block';

        categoriesContainer.innerHTML = '';
        noResults.style.display = 'none';

        if (photoshootsViewportObserver) {
            photoshootsViewportObserver.disconnect();
        }

        photoshootsViewportObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const wrapper = entry.target;
                    const img = wrapper.querySelector('img.row-img');
                    if (img && img.dataset.src) {
                        const targetSrc = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.src = targetSrc;
                        if (img.complete && img.naturalWidth > 0) {
                            img.classList.add('is-loaded');
                            wrapper.classList.add('img-loaded');
                        }
                    }
                    observer.unobserve(wrapper);
                }
            });
        }, {
            root: null,
            rootMargin: '600px 300px',
            threshold: 0
        });

        if (categoriesData.length === 0) {
            noResults.style.display = 'block';
            return;
        }

        sortCategories();

        // Render each category row exactly as originally written
        categoriesData.forEach(cat => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'category-row';

            // Header
            const headerDiv = document.createElement('div');
            headerDiv.className = 'category-header';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'category-info';

            const title = document.createElement('h2');
            title.className = 'category-title';
            const titleLink = document.createElement('a');
            titleLink.href = `/photoshoots/gallery.html?id=${encodeURIComponent(cat.categoryId)}`;
            titleLink.innerText = cat.categoryName;
            title.appendChild(titleLink);

            const meta = document.createElement('div');
            meta.className = 'category-meta';
            const displayDate = cat.date !== '1970-01-01T00:00:00.000Z' ? new Date(cat.date).toLocaleDateString() : '';
            meta.innerText = `${cat.modelName} | ${cat.theme} ${displayDate ? '| ' + displayDate : ''}`;

            infoDiv.appendChild(title);
            infoDiv.appendChild(meta);
            headerDiv.appendChild(infoDiv);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'category-actions';

            const viewSetBtn = document.createElement('a');
            viewSetBtn.className = 'view-set-header-btn';
            viewSetBtn.href = `/photoshoots/gallery.html?id=${encodeURIComponent(cat.categoryId)}`;
            viewSetBtn.innerHTML = `View Set <span style="opacity: 0.65;">(${cat.urls.length})</span> <span class="arrow">&rarr;</span>`;
            actionsDiv.appendChild(viewSetBtn);

            // Admin Action Buttons (Archive + Delete)
            if (isAdmin && cat.categoryId !== 'single-shots') {
                const archCatBtn = document.createElement('button');
                archCatBtn.className = 'archive-category-btn';
                archCatBtn.innerText = 'Archive Set';
                archCatBtn.addEventListener('click', () => archiveCategory(cat.categoryId));

                const delCatBtn = document.createElement('button');
                delCatBtn.className = 'delete-category-btn';
                delCatBtn.innerText = 'Delete Set';
                delCatBtn.addEventListener('click', () => deleteCategory(cat.categoryId));

                actionsDiv.appendChild(archCatBtn);
                actionsDiv.appendChild(delCatBtn);
            }

            headerDiv.appendChild(actionsDiv);
            rowDiv.appendChild(headerDiv);

            // Images Container
            const scrollRow = document.createElement('div');
            scrollRow.className = 'scrollable-row';

            // --- PC Drag-to-Scroll & Smooth Wheel ---
            let isMouseDown = false;
            let startX = 0;
            let scrollLeftStart = 0;
            let hasDragged = false;

            scrollRow.setAttribute('draggable', 'false');
            scrollRow.addEventListener('dragstart', (e) => {
                e.preventDefault();
                return false;
            });

            scrollRow.addEventListener('mousedown', (e) => {
                if (e.target.closest('.delete-photo-btn') || e.target.closest('.row-nav-arrow')) return;
                isMouseDown = true;
                hasDragged = false;
                startX = e.pageX - scrollRow.offsetLeft;
                scrollLeftStart = scrollRow.scrollLeft;
                pauseAutoScroll();
            });

            const onRowMouseMove = (e) => {
                if (!isMouseDown) return;
                const x = e.pageX - scrollRow.offsetLeft;
                const walk = (x - startX) * 1.5;
                if (Math.abs(walk) > 6) {
                    hasDragged = true;
                    scrollRow.classList.add('is-dragging');
                    e.preventDefault();
                }
                if (hasDragged) {
                    scrollRow.scrollLeft = scrollLeftStart - walk;
                    pauseAutoScroll();
                }
            };

            const onRowMouseUp = () => {
                if (isMouseDown) {
                    isMouseDown = false;
                    scrollRow.classList.remove('is-dragging');
                    if (hasDragged) {
                        setTimeout(() => {
                            hasDragged = false;
                        }, 80);
                    }
                    scheduleAutoScroll();
                }
            };

            window.addEventListener('mousemove', onRowMouseMove);
            window.addEventListener('mouseup', onRowMouseUp);

            // Allow vertical wheel to scroll the page naturally without scrolling the row.
            scrollRow.addEventListener('wheel', (e) => {
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                    pauseAutoScroll();
                    scheduleAutoScroll();
                }
            }, { passive: true });

            // --- Auto-Move / Silky Continuous Drift after 1.3s of Inactivity ---
            let autoScrollRaf = null;
            let idleTimer = null;
            let turnaroundTimer = null;
            let lastTimestamp = null;
            const scrollSpeedPxPerSec = 50; // 50px/second smooth continuous drift
            let autoDir = 1; // 1 = right, -1 = left
            let isVisible = false;
            let isInteracting = false;
            let isProgrammaticScroll = false;
            let currentScrollLeft = scrollRow.scrollLeft;

            const startAutoScroll = () => {
                if (autoScrollRaf || !isVisible || isInteracting || isMouseDown) return;
                if (turnaroundTimer) {
                    clearTimeout(turnaroundTimer);
                    turnaroundTimer = null;
                }
                lastTimestamp = null;
                currentScrollLeft = scrollRow.scrollLeft;

                const step = (timestamp) => {
                    if (!isVisible || isInteracting || isMouseDown) {
                        autoScrollRaf = null;
                        lastTimestamp = null;
                        return;
                    }

                    if (!lastTimestamp) lastTimestamp = timestamp;
                    const deltaSec = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
                    lastTimestamp = timestamp;

                    const maxScroll = scrollRow.scrollWidth - scrollRow.clientWidth;
                    if (maxScroll > 15) {
                        currentScrollLeft += scrollSpeedPxPerSec * deltaSec * autoDir;

                        // Reached right edge: clamp, pause for 2s, then scroll back
                        if (currentScrollLeft >= maxScroll - 2 && autoDir === 1) {
                            currentScrollLeft = maxScroll;
                            isProgrammaticScroll = true;
                            scrollRow.scrollLeft = currentScrollLeft;
                            autoDir = -1;
                            autoScrollRaf = null;
                            lastTimestamp = null;
                            turnaroundTimer = setTimeout(() => {
                                turnaroundTimer = null;
                                startAutoScroll();
                            }, 2000);
                            return;
                        }

                        // Reached left edge: clamp, pause for 2s, then scroll forward
                        if (currentScrollLeft <= 2 && autoDir === -1) {
                            currentScrollLeft = 0;
                            isProgrammaticScroll = true;
                            scrollRow.scrollLeft = currentScrollLeft;
                            autoDir = 1;
                            autoScrollRaf = null;
                            lastTimestamp = null;
                            turnaroundTimer = setTimeout(() => {
                                turnaroundTimer = null;
                                startAutoScroll();
                            }, 2000);
                            return;
                        }

                        isProgrammaticScroll = true;
                        scrollRow.scrollLeft = currentScrollLeft;
                    }

                    autoScrollRaf = requestAnimationFrame(step);
                };

                autoScrollRaf = requestAnimationFrame(step);
            };

            const pauseAutoScroll = () => {
                isInteracting = true;
                if (idleTimer) clearTimeout(idleTimer);
                if (turnaroundTimer) {
                    clearTimeout(turnaroundTimer);
                    turnaroundTimer = null;
                }
                if (autoScrollRaf) {
                    cancelAnimationFrame(autoScrollRaf);
                    autoScrollRaf = null;
                    lastTimestamp = null;
                }
                currentScrollLeft = scrollRow.scrollLeft;
            };

            const scheduleAutoScroll = () => {
                if (idleTimer) clearTimeout(idleTimer);
                if (turnaroundTimer) {
                    clearTimeout(turnaroundTimer);
                    turnaroundTimer = null;
                }
                idleTimer = setTimeout(() => {
                    isInteracting = false;
                    startAutoScroll();
                }, 1300); // 1.3 seconds idle
            };

            scrollRow.addEventListener('mouseenter', pauseAutoScroll);
            scrollRow.addEventListener('mouseleave', () => {
                if (!isMouseDown) scheduleAutoScroll();
            });
            scrollRow.addEventListener('touchstart', pauseAutoScroll, { passive: true });
            scrollRow.addEventListener('touchmove', pauseAutoScroll, { passive: true });
            scrollRow.addEventListener('touchend', scheduleAutoScroll, { passive: true });
            scrollRow.addEventListener('touchcancel', scheduleAutoScroll, { passive: true });
            scrollRow.addEventListener('scroll', () => {
                if (isProgrammaticScroll) {
                    isProgrammaticScroll = false;
                    return;
                }
                currentScrollLeft = scrollRow.scrollLeft;
                pauseAutoScroll();
                scheduleAutoScroll();
            }, { passive: true });

            const rowObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    isVisible = entry.isIntersecting;
                    if (isVisible) {
                        scheduleAutoScroll();
                    } else {
                        pauseAutoScroll();
                    }
                });
            }, { threshold: 0.15 });

            rowObserver.observe(scrollRow);

            const limit = 15; // Load enough to fill wide screens
            const imagesToShow = cat.urls.slice(0, limit);
            const hasMore = cat.urls.length > 5;

            const createImgElem = (url) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'img-container';
                wrapper.setAttribute('draggable', 'false');
                wrapper.addEventListener('dragstart', (e) => {
                    e.preventDefault();
                    return false;
                });

                const img = document.createElement('img');
                img.className = 'row-img';
                img.dataset.src = url;
                img.dataset.fullUrl = url;
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
                img.draggable = false;
                img.setAttribute('draggable', 'false');
                img.addEventListener('dragstart', (e) => {
                    e.preventDefault();
                    return false;
                });

                const markLoaded = () => {
                    img.classList.add('is-loaded');
                    wrapper.classList.add('img-loaded');
                };

                img.addEventListener('load', () => {
                    if (img.src && !img.src.startsWith('data:')) {
                        markLoaded();
                    }
                });

                img.addEventListener('error', markLoaded);

                // Tap & Click handler for lightbox
                let touchMoved = false;
                let touchStartX = 0;
                let touchStartY = 0;

                const triggerLightbox = (e) => {
                    if (e.target.closest('.delete-photo-btn') || e.target.closest('.row-nav-arrow')) return;
                    if (hasDragged) return;
                    if (touchMoved) {
                        touchMoved = false;
                        return;
                    }
                    openLightbox(img, cat.categoryName || 'PHOTOSHOOT', cat.categoryId);
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

                // Delete Photo Button
                if (isAdmin) {
                    const delPhotoBtn = document.createElement('button');
                    delPhotoBtn.className = 'delete-photo-btn';
                    delPhotoBtn.innerHTML = '&times;';
                    delPhotoBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deletePhoto(cat.categoryId, url);
                    });
                    wrapper.appendChild(delPhotoBtn);
                }

                if (photoshootsViewportObserver) {
                    photoshootsViewportObserver.observe(wrapper);
                }

                return wrapper;
            };

            imagesToShow.forEach((url) => {
                scrollRow.appendChild(createImgElem(url));
            });

            // Luxury End-Card Tile (Never blocks images, fluidly accessible via scroll/swipe)
            if (hasMore) {
                const seeAllCard = document.createElement('a');
                seeAllCard.className = 'see-all-card';
                seeAllCard.href = `/photoshoots/gallery.html?id=${encodeURIComponent(cat.categoryId)}`;
                const remaining = cat.urls.length - imagesToShow.length;
                seeAllCard.innerHTML = `
                    <div class="see-all-card-inner">
                        <span class="see-all-plus">${remaining > 0 ? '+' + remaining : '&rarr;'}</span>
                        <span class="see-all-label">Full Editorial</span>
                        <span class="see-all-count">${cat.urls.length} Photos</span>
                        <span class="see-all-arrow">&rarr;</span>
                    </div>
                `;
                scrollRow.appendChild(seeAllCard);
            }

            const scrollWrapper = document.createElement('div');
            scrollWrapper.className = 'scrollable-row-wrapper';
            scrollWrapper.appendChild(scrollRow);

            // Floating Desktop Chevron Arrows
            const prevArrow = document.createElement('button');
            prevArrow.className = 'row-nav-arrow nav-prev';
            prevArrow.setAttribute('aria-label', 'Previous photos');
            prevArrow.innerHTML = '&lsaquo;';
            prevArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                scrollRow.scrollBy({ left: -450, behavior: 'smooth' });
                pauseAutoScroll();
                scheduleAutoScroll();
            });

            const nextArrow = document.createElement('button');
            nextArrow.className = 'row-nav-arrow nav-next';
            nextArrow.setAttribute('aria-label', 'Next photos');
            nextArrow.innerHTML = '&rsaquo;';
            nextArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                scrollRow.scrollBy({ left: 450, behavior: 'smooth' });
                pauseAutoScroll();
                scheduleAutoScroll();
            });

            scrollWrapper.appendChild(prevArrow);
            scrollWrapper.appendChild(nextArrow);

            rowDiv.appendChild(scrollWrapper);
            categoriesContainer.appendChild(rowDiv);
        });
    };

    // --- Master Render Function ---
    const renderCurrentView = () => {
        if (currentView === 'flow') {
            renderFlowView();
        } else {
            renderSetsView();
        }
    };

    // --- View Mode Switcher ---
    const setViewMode = (mode) => {
        currentView = mode;
        localStorage.setItem('zhukov_photoshoots_view', mode);

        if (viewFlowBtn && viewSetsBtn) {
            if (mode === 'flow') {
                viewFlowBtn.classList.add('active');
                viewSetsBtn.classList.remove('active');
            } else {
                viewSetsBtn.classList.add('active');
                viewFlowBtn.classList.remove('active');
            }
        }

        renderCurrentView();
        requestSwitcherUpdate();
    };

    if (viewFlowBtn) {
        viewFlowBtn.addEventListener('click', () => {
            if (currentView !== 'flow') setViewMode('flow');
        });
    }

    if (viewSetsBtn) {
        viewSetsBtn.addEventListener('click', () => {
            if (currentView !== 'sets') setViewMode('sets');
        });
    }

    // Initialize switcher buttons state
    if (viewFlowBtn && viewSetsBtn) {
        if (currentView === 'flow') {
            viewFlowBtn.classList.add('active');
            viewSetsBtn.classList.remove('active');
        } else {
            viewSetsBtn.classList.add('active');
            viewFlowBtn.classList.remove('active');
        }
    }

    // --- Floating View Switcher on Desktop/Mid when Hidden Behind Header ---
    const viewSwitcher = document.getElementById('photoshoots-view-switcher');
    let viewSwitcherSlot = document.getElementById('photoshoots-view-switcher-slot');
    const headerSlot = document.getElementById('site-header-slot');

    // Fallback: auto-create slot wrapper if missing in DOM
    if (!viewSwitcherSlot && viewSwitcher && viewSwitcher.parentNode) {
        viewSwitcherSlot = document.createElement('div');
        viewSwitcherSlot.className = 'photoshoots-view-switcher-slot';
        viewSwitcherSlot.id = 'photoshoots-view-switcher-slot';
        viewSwitcher.parentNode.insertBefore(viewSwitcherSlot, viewSwitcher);
        viewSwitcherSlot.appendChild(viewSwitcher);
    }

    let naturalSwitcherWidth = 0;
    let naturalSwitcherHeight = 0;
    let isFloating = false;
    let switcherRaf = null;

    const measureSwitcherDimensions = () => {
        if (!viewSwitcher) return;
        if (!viewSwitcher.classList.contains('is-floating')) {
            const rect = viewSwitcher.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                naturalSwitcherWidth = Math.round(rect.width);
                naturalSwitcherHeight = Math.round(rect.height);
            }
        }
    };

    const updateFloatingSwitcherState = () => {
        if (!viewSwitcher || !viewSwitcherSlot) return;

        // On mobile (<= 768px), CSS handles the fixed bottom switcher automatically
        if (window.innerWidth <= 768) {
            if (isFloating) {
                isFloating = false;
                viewSwitcher.classList.remove('is-floating');
                viewSwitcherSlot.style.width = '';
                viewSwitcherSlot.style.height = '';
            }
            return;
        }

        measureSwitcherDimensions();

        // Calculate header bottom edge in viewport
        const headerRect = headerSlot ? headerSlot.getBoundingClientRect() : null;
        const headerBottom = headerRect ? headerRect.bottom : (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-scrolled-height')) || 70);

        // Slot rect in viewport (slot stays in normal flow in sort bar)
        const slotRect = viewSwitcherSlot.getBoundingClientRect();

        // Hysteresis: enter floating when slotRect.bottom <= headerBottom,
        // exit floating when slotRect.bottom > headerBottom + 4
        if (!isFloating && slotRect.bottom <= headerBottom) {
            isFloating = true;
            if (naturalSwitcherWidth && naturalSwitcherHeight) {
                viewSwitcherSlot.style.width = `${naturalSwitcherWidth}px`;
                viewSwitcherSlot.style.height = `${naturalSwitcherHeight}px`;
            }
            viewSwitcher.classList.add('is-floating');
        } else if (isFloating && slotRect.bottom > headerBottom + 4) {
            isFloating = false;
            viewSwitcher.classList.remove('is-floating');
            viewSwitcherSlot.style.width = '';
            viewSwitcherSlot.style.height = '';
            measureSwitcherDimensions();
        }
    };

    const requestSwitcherUpdate = () => {
        if (switcherRaf) cancelAnimationFrame(switcherRaf);
        switcherRaf = requestAnimationFrame(updateFloatingSwitcherState);
    };

    window.addEventListener('scroll', requestSwitcherUpdate, { passive: true });
    window.addEventListener('resize', () => {
        if (!isFloating) measureSwitcherDimensions();
        requestSwitcherUpdate();
    }, { passive: true });
    document.addEventListener('scroll', requestSwitcherUpdate, { passive: true, capture: true });

    // Initial check
    measureSwitcherDimensions();
    requestSwitcherUpdate();

    // --- Event Listeners for Sort ---
    const updateSortButtonText = () => {
        if (!sortSelect || !sortOrderBtn) return;
        const sortBy = sortSelect.value;
        const currentOrder = sortOrderBtn.getAttribute('data-order');
        if (sortBy === 'date') {
            sortOrderBtn.innerText = currentOrder === 'asc' ? 'Old-New ↓' : 'New-Old ↑';
        } else {
            sortOrderBtn.innerText = currentOrder === 'asc' ? 'A-Z ↓' : 'Z-A ↑';
        }
    };

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            updateSortButtonText();
            renderCurrentView();
        });
    }

    if (sortOrderBtn) {
        sortOrderBtn.addEventListener('click', () => {
            const currentOrder = sortOrderBtn.getAttribute('data-order');
            if (currentOrder === 'asc') {
                sortOrderBtn.setAttribute('data-order', 'desc');
            } else {
                sortOrderBtn.setAttribute('data-order', 'asc');
            }
            updateSortButtonText();
            renderCurrentView();
        });
    }

    // Ensure sort button displays correct initial state
    updateSortButtonText();

    // Initial Load
    await loadPhotos();
    requestSwitcherUpdate();
});

