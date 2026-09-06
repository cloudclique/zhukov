import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc, arrayRemove, arrayUnion, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";
import { ensureAgeVerification, getAgeVerificationStatus, showAgeGateModal } from "./age-gate.js";
import { getCachedData, setCachedData, invalidateCache, isDataEqual, registerSiteServiceWorker } from "../site-cache.js";

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
    const closeBtn = document.querySelector('.close');

    // Data & Auth State
    let isAdmin = false;
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('id');

    // --- Firebase Authentication Logic ---
    onAuthStateChanged(auth, async (user) => {
        const uploadLink = document.getElementById('upload-nav-link');
        if (user) {
            if (!loginBtn.classList.contains('hidden')) loginBtn.classList.add('hidden');
            if (logoutBtn.classList.contains('hidden')) logoutBtn.classList.remove('hidden');
            localStorage.setItem('zhukov_logged_in', 'true');
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    isAdmin = true;
                    if (uploadLink) uploadLink.classList.remove('hidden');
                    const archivedLink = document.getElementById('archived-nav-link');
                    if (archivedLink) archivedLink.classList.remove('hidden');
                } else {
                    isAdmin = false;
                    if (uploadLink) uploadLink.classList.add('hidden');
                    const archivedLink = document.getElementById('archived-nav-link');
                    if (archivedLink) archivedLink.classList.add('hidden');
                }
                if (categoryId) loadGallery();
            } catch (error) {
                console.error("Auth check error:", error);
                isAdmin = false;
                if (categoryId) loadGallery();
            }
        } else {
            if (loginBtn.classList.contains('hidden')) loginBtn.classList.remove('hidden');
            if (!logoutBtn.classList.contains('hidden')) logoutBtn.classList.add('hidden');
            localStorage.removeItem('zhukov_logged_in');
            if (uploadLink) uploadLink.classList.add('hidden');
            const archivedLink = document.getElementById('archived-nav-link');
            if (archivedLink) archivedLink.classList.add('hidden');
            isAdmin = false;
            if (categoryId) loadGallery();
        }
    });

    loginBtn.addEventListener('click', () => {
        localStorage.setItem('zhukov_logged_in', 'true');
        signInWithPopup(auth, provider).catch(error => console.error(error));
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('zhukov_logged_in');
        signOut(auth).catch(error => console.error(error));
    });

    // --- 3D Tilt Effect Helper ---
    const attachTiltEffect = (element) => {
        element.classList.add('tilt-card');
        
        const onMouseMove = (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const deltaX = (x - centerX) / centerX;
            const deltaY = (y - centerY) / centerY;
            
            // Scale tilt inversely with element size â€” big images tilt less
            const maxTilt = Math.max(1.5, Math.min(10, 1800 / (rect.width + rect.height)));
            const rotateX = (-deltaY * maxTilt).toFixed(2);
            const rotateY = (deltaX * maxTilt).toFixed(2);
            
            element.classList.add('is-tilting');
            element.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
        };
        
        const onMouseLeave = () => {
            element.classList.remove('is-tilting');
            element.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        };
        
        element.addEventListener('mousemove', onMouseMove);
        element.addEventListener('mouseleave', onMouseLeave);
    };

    // --- Shared Element FLIP Lightbox Logic ---
    let activeOriginImg = null;

    const openLightbox = (imgElement) => {
        if (!lightbox || !lightboxImg) return;
        activeOriginImg = imgElement;
        
        // Temporarily reset styles to measure target layout
        lightboxImg.style.transition = 'none';
        lightboxImg.style.transform = 'none';
        lightboxImg.style.borderRadius = '';
        lightboxImg.src = imgElement.src;
        
        lightbox.style.display = 'flex';
        lightbox.classList.remove('show');
        
        const sourceRect = imgElement.getBoundingClientRect();
        
        requestAnimationFrame(() => {
            const targetRect = lightboxImg.getBoundingClientRect();
            
            const targetCenterX = targetRect.left + targetRect.width / 2;
            const targetCenterY = targetRect.top + targetRect.height / 2;
            
            const sourceCenterX = sourceRect.left + sourceRect.width / 2;
            const sourceCenterY = sourceRect.top + sourceRect.height / 2;
            
            const deltaX = sourceCenterX - targetCenterX;
            const deltaY = sourceCenterY - targetCenterY;
            const scaleX = sourceRect.width / targetRect.width;
            const scaleY = sourceRect.height / targetRect.height;
            
            // Invert: Position exactly over the clicked image
            lightboxImg.style.transformOrigin = 'center center';
            lightboxImg.style.transform = `translate(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
            lightboxImg.style.borderRadius = window.getComputedStyle(imgElement).borderRadius || '8px';
            
            // Play: Grow and zoom out to the viewer in center
            requestAnimationFrame(() => {
                lightbox.classList.add('show');
                lightboxImg.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.5s ease';
                lightboxImg.style.transform = 'translate(0px, 0px) scale(1, 1)';
                lightboxImg.style.borderRadius = '12px';
            });
        });
    };

    const closeLightbox = () => {
        if (!lightbox) return;
        
        if (activeOriginImg && activeOriginImg.isConnected) {
            const sourceRect = activeOriginImg.getBoundingClientRect();
            const targetRect = lightboxImg.getBoundingClientRect();
            
            const targetCenterX = targetRect.left + targetRect.width / 2;
            const targetCenterY = targetRect.top + targetRect.height / 2;
            
            const sourceCenterX = sourceRect.left + sourceRect.width / 2;
            const sourceCenterY = sourceRect.top + sourceRect.height / 2;
            
            const deltaX = sourceCenterX - targetCenterX;
            const deltaY = sourceCenterY - targetCenterY;
            const scaleX = sourceRect.width / targetRect.width;
            const scaleY = sourceRect.height / targetRect.height;
            
            // Animate back to original thumbnail location
            lightboxImg.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.4s ease';
            lightboxImg.style.transform = `translate(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
            lightboxImg.style.borderRadius = window.getComputedStyle(activeOriginImg).borderRadius || '8px';
            
            lightbox.classList.remove('show');
            
            setTimeout(() => {
                lightbox.style.display = 'none';
                lightboxImg.src = '';
                lightboxImg.style.transform = '';
                lightboxImg.style.transition = '';
                activeOriginImg = null;
            }, 400);
        } else {
            lightbox.classList.remove('show');
            setTimeout(() => {
                lightbox.style.display = 'none';
                lightboxImg.src = '';
                activeOriginImg = null;
            }, 300);
        }
    };

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (lightbox) lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
        if (lightbox && e.key === 'Escape' && lightbox.classList.contains('show')) closeLightbox();
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
        const isAdult = getAgeVerificationStatus() === true;
        const cacheKey = `gallery_${categoryId}_adult_${isAdult}_admin_${isAdmin}`;

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
                    if (!isAdult && d.isAdult === true) return; // Hide 18+ items if not adult
                    if (!isAdmin && d.archived === true) return; // Hide archived items from public
                    if (d.archived === true) archivedUrlsSet.add(d.url);
                    singleItems.push(d);
                });

                // Apply custom order if saved, falling back to newest to oldest
                const customOrder = (orderDoc && orderDoc.exists() && Array.isArray(orderDoc.data().order)) ? orderDoc.data().order : [];
                const orderMap = new Map();
                customOrder.forEach((url, idx) => orderMap.set(url, idx));

                singleItems.sort((a, b) => {
                    const idxA = orderMap.has(a.url) ? orderMap.get(a.url) : 999999;
                    const idxB = orderMap.has(b.url) ? orderMap.get(b.url) : 999999;
                    if (idxA !== idxB) return idxA - idxB;
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

                        if (!isAdult) {
                            const adultUrls = data.adultUrls || [];
                            if (data.isAdult === true && adultUrls.length === 0) {
                                rawUrls = []; // Entire set is 18+
                            } else {
                                rawUrls = rawUrls.filter(u => !adultUrls.includes(u));
                            }
                        }

                        // If user is under 18 and set has only adult content
                        if (!isAdult && rawUrls.length === 0 && (data.isAdult === true || (data.adultUrls && data.adultUrls.length > 0))) {
                            loadingState.style.display = 'block';
                            loadingState.innerHTML = `
                                <div style="text-align:center; padding: 3.5rem 1.5rem; max-width: 480px; margin: 0 auto;">
                                    <div class="age-gate-badge" style="margin: 0 auto 1.5rem auto;">18+</div>
                                    <h3 style="font-size: 1.6rem; font-weight: 600; color: #fff; margin-bottom: 0.75rem;">Age-Restricted Content</h3>
                                    <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin-bottom: 2rem;">This photoshoot contains adult / 18+ content and is hidden for visitors under 18.</p>
                                    <button id="reverify-age-btn" class="age-btn age-btn-yes" style="max-width: 220px; margin: 0 auto; display: inline-block;">Verify Age (18+)</button>
                                </div>
                            `;
                            headerContainer.innerHTML = '';
                            gridContainer.innerHTML = '';
                            setTimeout(() => {
                                const btn = document.getElementById('reverify-age-btn');
                                if (btn) {
                                    btn.addEventListener('click', async () => {
                                        await showAgeGateModal();
                                        loadGallery();
                                    });
                                }
                            }, 50);
                            return;
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

            // --- Admin Photo Management Logic (Delete, Archive, Move) ---
            const updatePhotoCount = () => {
                const countEl = headerContainer.querySelector('.gallery-photo-count');
                if (countEl) countEl.innerText = `${currentUrls.length} Photos`;
            };

            const deletePhoto = async (photoUrl, wrapper) => {
                if (!isAdmin) return;
                const confirmed = await showConfirmModal({
                    title: "Delete Photo",
                    message: "Are you sure you want to delete this photo? This will remove it from the photoshoot.",
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
                    } else {
                        await updateDoc(doc(db, 'photo_sets', categoryId), {
                            urls: arrayRemove(photoUrl),
                            adultUrls: arrayRemove(photoUrl),
                            archivedUrls: arrayRemove(photoUrl)
                        });
                    }

                    // Seamless in-place UI removal (no visual reload)
                    if (wrapper) {
                        wrapper.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                        wrapper.style.opacity = '0';
                        wrapper.style.transform = 'scale(0.85)';
                        setTimeout(() => {
                            wrapper.remove();
                            const idx = currentUrls.indexOf(photoUrl);
                            if (idx !== -1) currentUrls.splice(idx, 1);
                            updatePhotoCount();
                            if (currentUrls.length === 0) {
                                gridContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; width: 100%;">No photos in this set.</div>`;
                            }
                        }, 300);
                    }
                } catch (error) {
                    console.error("Error deleting photo:", error);
                    alert("Error deleting photo: " + (error.message || error));
                }
            };

            const toggleArchivePhoto = async (photoUrl, wrapper, archiveBtn) => {
                if (!isAdmin) return;
                const isCurrentlyArchived = archivedUrlsSet.has(photoUrl);
                const actionText = isCurrentlyArchived ? "unarchive" : "archive";
                const confirmed = await showConfirmModal({
                    title: isCurrentlyArchived ? "Unarchive Photo" : "Archive Photo",
                    message: isCurrentlyArchived
                        ? "Unarchive this photo? It will become visible to the public gallery."
                        : "Archive this photo? It will be hidden from the public gallery.",
                    confirmText: isCurrentlyArchived ? "Unarchive" : "Archive",
                    confirmVariant: isCurrentlyArchived ? "blue" : "amber"
                });
                if (!confirmed) return;

                try {
                    invalidateCache('photoshoots');
                    invalidateCache('gallery');
                    invalidateCache('archived');
                    if (categoryId === 'single-shots') {
                        const q = query(collection(db, 'single_shots'), where('url', '==', photoUrl));
                        const snap = await getDocs(q);
                        snap.forEach(async (d) => {
                            await updateDoc(doc(db, 'single_shots', d.id), {
                                archived: !isCurrentlyArchived
                            });
                        });
                    } else {
                        if (isCurrentlyArchived) {
                            await updateDoc(doc(db, 'photo_sets', categoryId), {
                                archivedUrls: arrayRemove(photoUrl)
                            });
                        } else {
                            await updateDoc(doc(db, 'photo_sets', categoryId), {
                                archivedUrls: arrayUnion(photoUrl)
                            });
                        }
                    }

                    // Seamless in-place UI update (no visual reload)
                    if (isCurrentlyArchived) {
                        archivedUrlsSet.delete(photoUrl);
                        if (archiveBtn) {
                            archiveBtn.classList.remove('is-archived');
                            archiveBtn.title = 'Archive photo (hide from public)';
                            archiveBtn.setAttribute('aria-label', archiveBtn.title);
                            archiveBtn.innerHTML = `
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>
                                </svg>
                            `;
                        }
                        if (wrapper) {
                            const badge = wrapper.querySelector('.photo-archived-badge');
                            if (badge) badge.remove();
                        }
                    } else {
                        archivedUrlsSet.add(photoUrl);
                        if (archiveBtn) {
                            archiveBtn.classList.add('is-archived');
                            archiveBtn.title = 'Unarchive photo (make public)';
                            archiveBtn.setAttribute('aria-label', archiveBtn.title);
                            archiveBtn.innerHTML = `
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4M12 16v-4m-3 3 3-3 3 3"/>
                                </svg>
                            `;
                        }
                        if (wrapper && !wrapper.querySelector('.photo-archived-badge')) {
                            const badge = document.createElement('div');
                            badge.className = 'photo-archived-badge';
                            badge.innerText = 'Archived';
                            wrapper.appendChild(badge);
                        }
                    }
                } catch (error) {
                    console.error(`Error ${actionText}ing photo:`, error);
                    alert(`Failed to ${actionText} photo.`);
                }
            };

            const openMoveModal = async (photoUrl, wrapper) => {
                if (!isAdmin) return;

                // Remove existing modal if any
                const existing = document.getElementById('move-photo-modal-overlay');
                if (existing) existing.remove();

                const overlay = document.createElement('div');
                overlay.id = 'move-photo-modal-overlay';
                overlay.className = 'move-modal-overlay';

                overlay.innerHTML = `
                    <div class="move-modal" role="dialog" aria-labelledby="move-modal-title" aria-modal="true">
                        <h3 id="move-modal-title">Move Photo</h3>
                        <p class="move-modal-subtitle">Transfer this photo to another photoshoot set.</p>
                        <img src="${photoUrl}" alt="Photo preview" class="move-modal-thumb-preview">
                        <label for="move-target-select">Select Destination Photoshoot:</label>
                        <select id="move-target-select">
                            <option value="" disabled selected>Loading available sets...</option>
                        </select>
                        <div class="move-modal-actions">
                            <button type="button" class="move-modal-btn move-modal-cancel" id="move-modal-cancel-btn">Cancel</button>
                            <button type="button" class="move-modal-btn move-modal-confirm" id="move-modal-confirm-btn" disabled>Move Photo</button>
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
                        if (docSnap.id === categoryId) return; // Skip source set
                        const d = docSnap.data();
                        const title = d.categoryName || docSnap.id;
                        const meta = [d.theme, d.modelName].filter(Boolean).join(' • ');
                        const label = meta ? `${title} (${meta})` : title;
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
                            const q = query(collection(db, 'single_shots'), where('url', '==', photoUrl));
                            const qSnap = await getDocs(q);
                            qSnap.forEach(async (d) => {
                                await deleteDoc(doc(db, 'single_shots', d.id));
                            });
                        } else {
                            await updateDoc(doc(db, 'photo_sets', categoryId), {
                                urls: arrayRemove(photoUrl),
                                adultUrls: arrayRemove(photoUrl),
                                archivedUrls: arrayRemove(photoUrl)
                            });
                        }

                        // 2. Add to destination
                        if (targetSetId === 'single-shots') {
                            await addDoc(collection(db, 'single_shots'), {
                                url: photoUrl,
                                date: new Date().toISOString(),
                                isAdult: false
                            });
                        } else {
                            await updateDoc(doc(db, 'photo_sets', targetSetId), {
                                urls: arrayUnion(photoUrl)
                            });
                        }

                        invalidateCache('photoshoots');
                        invalidateCache('gallery');
                        closeModal();

                        // Seamless in-place UI removal (no visual reload)
                        if (wrapper) {
                            wrapper.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                            wrapper.style.opacity = '0';
                            wrapper.style.transform = 'scale(0.85)';
                            setTimeout(() => {
                                wrapper.remove();
                                const idx = currentUrls.indexOf(photoUrl);
                                if (idx !== -1) currentUrls.splice(idx, 1);
                                updatePhotoCount();
                                if (currentUrls.length === 0) {
                                    gridContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; width: 100%;">No photos in this set.</div>`;
                                }
                            }, 300);
                        }
                    } catch (err) {
                        console.error("Error moving photo:", err);
                        alert("Failed to move photo: " + (err.message || err));
                        confirmBtn.disabled = false;
                        confirmBtn.innerText = 'Move Photo';
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
                    await deleteDoc(doc(db, 'photo_sets', categoryId));
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
                    <h2 class="gallery-title editable" data-field="categoryName" title="Double click to edit" style="display:inline-block;">${categoryName}</h2>
                    <div class="gallery-meta">${metaInfo}</div>
                    <div class="gallery-description editable" data-field="description" data-raw="${escapeHtml(description)}" title="Double click to edit description">${description ? formattedDesc : '<span class="desc-placeholder">+ Add description & links...</span>'}</div>
                    <div class="gallery-photo-count" style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">${currentUrls.length} Photos</div>
                `;
            } else {
                headerContainer.innerHTML = `
                    <h2 class="gallery-title">${categoryName}</h2>
                    <div class="gallery-meta">${metaInfo}</div>
                    ${description ? `<div class="gallery-description">${formattedDesc}</div>` : ''}
                    <div class="gallery-photo-count" style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">${currentUrls.length} Photos</div>
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

            const calculateSpans = (wrapper, img) => {
                if (!img.naturalWidth) return;
                
                const ratio = img.naturalWidth / img.naturalHeight;
                let colSpan = 1;
                
                // Stretch horizontal/wide images across 2 columns if viewport is wide enough
                if (ratio > 1.2 && window.innerWidth > 800) {
                    colSpan = 2;
                }
                
                wrapper.style.gridColumn = `span ${colSpan}`;
                
                // We use standardized target ratios so that all portraits have the EXACT same row span,
                // and all landscapes have the EXACT same row span. This prevents micro-gaps and allows
                // the dense CSS Grid to pack them together flawlessly like a bento box.
                requestAnimationFrame(() => {
                    const renderedWidth = wrapper.getBoundingClientRect().width;
                    
                    let targetRatio;
                    if (colSpan === 2) {
                        targetRatio = 3 / 2; // Standard Landscape
                    } else if (ratio < 0.85) {
                        targetRatio = 4 / 5; // Standard Portrait
                    } else {
                        targetRatio = 1 / 1; // Standard Square
                    }
                    
                    const targetHeight = renderedWidth / targetRatio;
                    
                    const rowHeight = 10;
                    const gap = 16;
                    const rowSpan = Math.ceil((targetHeight + gap) / (rowHeight + gap));
                    
                    wrapper.style.gridRow = `span ${rowSpan}`;
                });
            };

            let draggedIndex = null;

            const renderGrid = () => {
                gridContainer.innerHTML = ''; // clear

                if (currentUrls.length === 0) {
                    gridContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; width: 100%;">No photos in this set.</div>`;
                    return;
                }

                currentUrls.forEach((url, index) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'masonry-item img-container';
                    // Initially set a default span so it doesn't break layout while loading
                    wrapper.style.gridRow = `span 20`; // default fallback
                    
                    const img = document.createElement('img');
                    img.className = 'masonry-img';
                    img.src = url;

                    const reveal = () => {
                        calculateSpans(wrapper, img);
                        const delay = (index * 0.05); // 50ms wave interval
                        img.style.transitionDelay = `${delay}s`;
                        requestAnimationFrame(() => {
                            img.classList.add('is-revealed');
                        });
                        setTimeout(() => {
                            wrapper.classList.add('img-loaded');
                            img.style.transitionDelay = '';
                        }, (delay + 0.65) * 1000);
                    };

                    if (img.complete && img.naturalWidth) {
                        reveal();
                    } else {
                        img.addEventListener('load', reveal, { once: true });
                    }
                    
                    img.addEventListener('click', () => {
                        openLightbox(img);
                    });

                    // Attach 3D Magnetic Tilt
                    attachTiltEffect(wrapper);

                    wrapper.appendChild(img);
                    
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
                            openMoveModal(url, wrapper);
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
                            toggleArchivePhoto(url, wrapper, archivePhotoBtn);
                        });

                        // Delete Photo Button
                        const delPhotoBtn = document.createElement('button');
                        delPhotoBtn.className = 'photo-admin-btn delete-photo-btn';
                        delPhotoBtn.title = 'Delete photo';
                        delPhotoBtn.setAttribute('aria-label', 'Delete photo');
                        delPhotoBtn.innerHTML = '&times;';
                        delPhotoBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            deletePhoto(url, wrapper);
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
                        wrapper.draggable = true;
                        
                        wrapper.addEventListener('dragstart', (e) => {
                            draggedIndex = index;
                            wrapper.classList.add('dragging');
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', index);
                        });
                        
                        wrapper.addEventListener('dragend', () => {
                            wrapper.classList.remove('dragging');
                        });
                        
                        wrapper.addEventListener('dragover', (e) => {
                            e.preventDefault(); // Necessary to allow dropping
                            e.dataTransfer.dropEffect = 'move';
                            wrapper.classList.add('drag-over');
                        });
                        
                        wrapper.addEventListener('dragleave', () => {
                            wrapper.classList.remove('drag-over');
                        });
                        
                        wrapper.addEventListener('drop', async (e) => {
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
                });
            };

            renderGrid();

            // Handle Resize - recalculate all spans since column widths change
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    const items = gridContainer.querySelectorAll('.masonry-item');
                    items.forEach(wrapper => {
                        const img = wrapper.querySelector('img');
                        calculateSpans(wrapper, img);
                    });
                }, 200);
            });

        } catch (error) {
            console.error("Error loading gallery:", error);
            loadingState.innerText = "An error occurred while loading the gallery.";
        }
    };
    
    // Initial Load - Age gate check first
    if (categoryId) {
        await ensureAgeVerification();
        loadGallery();
    } else {
        loadingState.innerText = "Error: No photoshoot selected.";
    }
});

