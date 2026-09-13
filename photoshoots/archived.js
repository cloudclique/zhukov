import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";
import { getCachedData, setCachedData, invalidateCache, isDataEqual, registerSiteServiceWorker } from "../site-cache.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
    registerSiteServiceWorker();

    // DOM Elements
    const loginBtn            = document.getElementById('login-btn-header');
    const logoutBtn           = document.getElementById('logout-btn');
    const uploadLink          = document.getElementById('upload-nav-link');
    const archivedLink        = document.getElementById('archived-nav-link');
    const archivedBanner      = document.getElementById('archived-banner');
    const sortBar             = document.getElementById('sort-bar');
    const sortSelect          = document.getElementById('sort-select');
    const sortOrderBtn        = document.getElementById('sort-order-btn');
    const categoriesContainer = document.getElementById('categories-container');
    const archivedEmpty       = document.getElementById('archived-empty');
    const accessDenied        = document.getElementById('access-denied');
    const loadingMsg          = document.getElementById('loading-msg');

    // Lightbox UI
    const lightbox        = document.getElementById('lightbox');
    const lightboxImg     = document.getElementById('lightbox-img');
    const lightboxSetName = document.getElementById('lightbox-set-name');
    const closeBtn        = document.querySelector('#lightbox-close, .lightbox .close, .close');

    // Data State
    let categoriesData = [];
    let loadReqId = 0;

    // --- State Handler ---
    const showViewState = (state) => {
        // state: 'loading' | 'denied' | 'empty' | 'content' | 'error'
        if (loadingMsg) loadingMsg.style.display = 'none';
        if (accessDenied) accessDenied.style.display = 'none';
        if (archivedBanner) archivedBanner.style.display = 'none';
        if (sortBar) sortBar.style.display = 'none';
        if (categoriesContainer) categoriesContainer.style.display = 'none';
        if (archivedEmpty) archivedEmpty.style.display = 'none';

        if (state === 'loading') {
            if (loadingMsg) {
                loadingMsg.style.color = '#94a3b8';
                loadingMsg.textContent = 'Checking access...';
                loadingMsg.style.display = 'block';
            }
        } else if (state === 'denied') {
            if (accessDenied) accessDenied.style.display = 'block';
        } else if (state === 'empty') {
            if (archivedBanner) archivedBanner.style.display = 'flex';
            if (archivedEmpty) archivedEmpty.style.display = 'block';
        } else if (state === 'content') {
            if (archivedBanner) archivedBanner.style.display = 'flex';
            if (sortBar) sortBar.style.display = 'flex';
            if (categoriesContainer) categoriesContainer.style.display = 'block';
        } else if (state === 'error') {
            if (loadingMsg) {
                loadingMsg.style.color = '#ef4444';
                loadingMsg.style.display = 'block';
            }
        }
    };

    // --- 3D Magnetic Tilt Effect ---
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

    // --- Editorial Fine-Art Lightbox Logic ---
    let activeOriginImg = null;

    const openLightbox = (imgElement, setName = 'ARCHIVE') => {
        if (!lightbox || !lightboxImg) return;
        activeOriginImg = imgElement;
        document.body.classList.add('lightbox-open');
        
        lightboxImg.src = imgElement.dataset.src || imgElement.src;
        if (lightboxSetName) {
            lightboxSetName.textContent = (setName || 'ARCHIVE').toUpperCase();
        }
        
        lightbox.style.display = 'flex';
        requestAnimationFrame(() => {
            lightbox.classList.add('show');
        });
    };

    const closeLightbox = () => {
        if (!lightbox) return;
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
            closeLightbox();
        });
    }
    
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            closeLightbox();
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (lightbox && e.key === 'Escape' && lightbox.classList.contains('show')) {
            closeLightbox();
        }
    });

    // --- Fetch Archived Photo Sets ---
    const loadArchivedPhotos = async () => {
        const currentReqId = ++loadReqId;
        const cacheKey = 'archived_photo_sets';

        // 1. Instant Cache Render
        const cached = getCachedData(cacheKey);
        if (cached && Array.isArray(cached)) {
            categoriesData = cached;
            if (categoriesData.length === 0) {
                showViewState('empty');
            } else {
                showViewState('content');
                renderArchivedGallery();
            }
        } else {
            // Show skeleton loading state on cold load
            showViewState('content');
            categoriesContainer.innerHTML = '';
            for (let i = 0; i < 2; i++) {
                categoriesContainer.innerHTML += `
                    <div class="category-row">
                        <div class="category-header">
                            <div style="width: 100%;">
                                <div class="skeleton skeleton-text skeleton-title"></div>
                                <div class="skeleton skeleton-text skeleton-meta"></div>
                            </div>
                        </div>
                        <div class="scrollable-row-wrapper">
                            <div class="scrollable-row" style="mask-image: none; -webkit-mask-image: none;">
                                <div class="skeleton skeleton-img row-img" style="width: 350px;"></div>
                                <div class="skeleton skeleton-img row-img" style="width: 250px;"></div>
                                <div class="skeleton skeleton-img row-img" style="width: 300px;"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        try {
            const loaded = [];
            const setsSnap = await getDocs(collection(db, 'photo_sets'));

            setsSnap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
                    const archivedUrls = Array.isArray(data.archivedUrls) ? data.archivedUrls : (Array.isArray(data.archived_photos) ? data.archived_photos : []);
                    const allImagesArchived = data.urls.every(url => archivedUrls.includes(url));

                    // Include if explicitly marked archived OR if every single image is archived
                    if (data.archived === true || allImagesArchived) {
                        loaded.push({
                            categoryId: docSnap.id,
                            categoryName: data.categoryName || 'Untitled Set',
                            modelName: data.modelName || 'Unknown',
                            theme: data.theme || 'None',
                            date: data.date || '1970-01-01T00:00:00.000Z',
                            urls: [...data.urls].reverse()
                        });
                    }
                }
            });

            if (currentReqId !== loadReqId) return;

            if (!isDataEqual(categoriesData, loaded) || !cached) {
                categoriesData = loaded;
                setCachedData(cacheKey, loaded);
                if (categoriesData.length === 0) {
                    showViewState('empty');
                } else {
                    showViewState('content');
                    renderArchivedGallery();
                }
            } else {
                setCachedData(cacheKey, loaded);
            }
        } catch (error) {
            console.error("Error loading archived photos:", error);
            showViewState('error');
            if (loadingMsg) loadingMsg.textContent = "Error loading archived sets: " + (error.message || error);
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

    // --- Admin Category Actions ---
    const unarchiveCategory = async (categoryId, rowElement) => {
        const confirmed = await showConfirmModal({
            title: "Restore Photoshoot Set",
            message: "Restore this photoshoot set to the public gallery?",
            confirmText: "Restore Set",
            confirmVariant: "blue"
        });
        if (!confirmed) return;

        try {
            invalidateCache('photoshoots');
            invalidateCache('gallery');
            invalidateCache('archived');
            await setDoc(doc(db, 'photo_sets', categoryId), {
                archived: false,
                archivedUrls: []
            }, { merge: true });

            if (rowElement) {
                rowElement.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
                rowElement.style.opacity = '0';
                rowElement.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    rowElement.remove();
                    categoriesData = categoriesData.filter(c => c.categoryId !== categoryId);
                    setCachedData('archived_photo_sets', categoriesData);
                    if (categoriesData.length === 0) showViewState('empty');
                }, 350);
            }
        } catch (error) {
            console.error("Error unarchiving set:", error);
            alert("Error unarchiving set: " + (error.message || error));
        }
    };

    const deleteCategory = async (categoryId, rowElement) => {
        const confirmed = await showConfirmModal({
            title: "Delete Archived Set",
            message: "Permanently delete this ENTIRE photoshoot set? This cannot be undone.",
            confirmText: "Delete Set",
            confirmVariant: "red"
        });
        if (!confirmed) return;

        try {
            invalidateCache('photoshoots');
            invalidateCache('gallery');
            invalidateCache('archived');
            await deleteDoc(doc(db, 'photo_sets', categoryId));
            if (rowElement) {
                rowElement.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
                rowElement.style.opacity = '0';
                rowElement.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    rowElement.remove();
                    categoriesData = categoriesData.filter(c => c.categoryId !== categoryId);
                    setCachedData('archived_photo_sets', categoriesData);
                    if (categoriesData.length === 0) showViewState('empty');
                }, 350);
            }
        } catch (error) {
            console.error("Error deleting set:", error);
            alert("Error deleting set: " + (error.message || error));
        }
    };

    // --- Render Gallery Rows ---
    let archivedViewportObserver = null;

    const renderArchivedGallery = () => {
        if (!categoriesContainer) return;
        const sortBy = sortSelect ? sortSelect.value : 'date';
        const sortOrder = sortOrderBtn ? sortOrderBtn.getAttribute('data-order') : 'desc';

        categoriesContainer.innerHTML = '';

        if (archivedViewportObserver) {
            archivedViewportObserver.disconnect();
        }

        archivedViewportObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const wrapper = entry.target;
                    const img = wrapper.querySelector('img.row-img');
                    if (img && img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        if (img.complete && img.naturalWidth && typeof img._reveal === 'function') {
                            img._reveal();
                        }
                    }
                    observer.unobserve(wrapper);
                }
            });
        }, {
            root: null,
            rootMargin: '150px 200px', // 150px vertical buffer, 200px horizontal buffer
            threshold: 0
        });

        if (categoriesData.length === 0) {
            showViewState('empty');
            return;
        }

        // Sort categories
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

        categoriesData.forEach(cat => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'category-row';

            // Header
            const headerDiv = document.createElement('div');
            headerDiv.className = 'category-header';
            
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
            const infoDiv = document.createElement('div');
            infoDiv.className = 'category-info';
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

            // Admin Action Buttons (Unarchive + Delete)
            const unarchBtn = document.createElement('button');
            unarchBtn.className = 'unarchive-category-btn';
            unarchBtn.title = 'Restore set to public gallery';
            unarchBtn.innerHTML = '&#x21A9; Unarchive Set';
            unarchBtn.addEventListener('click', () => unarchiveCategory(cat.categoryId, rowDiv));

            const delCatBtn = document.createElement('button');
            delCatBtn.className = 'delete-category-btn';
            delCatBtn.innerText = 'Delete Set';
            delCatBtn.addEventListener('click', () => deleteCategory(cat.categoryId, rowDiv));

            actionsDiv.appendChild(unarchBtn);
            actionsDiv.appendChild(delCatBtn);
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
                if (e.target.closest('.row-nav-arrow')) return;
                e.preventDefault();
                isMouseDown = true;
                hasDragged = false;
                startX = e.pageX - scrollRow.offsetLeft;
                scrollLeftStart = scrollRow.scrollLeft;
                scrollRow.classList.add('is-dragging');
                pauseAutoScroll();
            });

            const onRowMouseMove = (e) => {
                if (!isMouseDown) return;
                e.preventDefault();
                const x = e.pageX - scrollRow.offsetLeft;
                const walk = (x - startX) * 1.5;
                if (Math.abs(walk) > 5) {
                    hasDragged = true;
                }
                scrollRow.scrollLeft = scrollLeftStart - walk;
                pauseAutoScroll();
            };

            const onRowMouseUp = () => {
                if (isMouseDown) {
                    isMouseDown = false;
                    scrollRow.classList.remove('is-dragging');
                    setTimeout(() => {
                        hasDragged = false;
                    }, 60);
                    scheduleAutoScroll();
                }
            };

            window.addEventListener('mousemove', onRowMouseMove);
            window.addEventListener('mouseup', onRowMouseUp);

            // Allow vertical wheel to scroll the page naturally without scrolling the row.
            // Only pause auto-scroll if user is explicitly scrolling horizontally (e.g. trackpad swipe).
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
                }, 1300);
            };

            scrollRow.addEventListener('mouseenter', pauseAutoScroll);
            scrollRow.addEventListener('mouseleave', () => {
                if (!isMouseDown) scheduleAutoScroll();
            });
            scrollRow.addEventListener('touchstart', pauseAutoScroll, { passive: true });
            scrollRow.addEventListener('touchend', scheduleAutoScroll, { passive: true });
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

            const limit = 15;
            const imagesToShow = cat.urls.slice(0, limit);
            const hasMore = cat.urls.length > 5;

            const createImgElem = (url, waveIndex) => {
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
                // Transparent placeholder
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
                img.draggable = false;
                img.setAttribute('draggable', 'false');
                img.addEventListener('dragstart', (e) => {
                    e.preventDefault();
                    return false;
                });

                const reveal = () => {
                    wrapper.classList.add('is-sized');
                    const delay = (waveIndex % 6) * 0.08;
                    img.style.transitionDelay = `${delay}s`;
                    requestAnimationFrame(() => {
                        img.classList.add('is-revealed');
                    });
                    setTimeout(() => {
                        wrapper.classList.add('img-loaded');
                        img.style.transitionDelay = '';
                    }, (delay + 0.65) * 1000);
                };

                img._reveal = reveal;

                img.addEventListener('load', () => {
                    if (img.src && !img.src.startsWith('data:')) {
                        reveal();
                    }
                });

                img.addEventListener('click', () => {
                    if (hasDragged) return;
                    openLightbox(img, cat.categoryName || 'ARCHIVE');
                });
                
                attachTiltEffect(wrapper);
                wrapper.appendChild(img);

                if (archivedViewportObserver) {
                    archivedViewportObserver.observe(wrapper);
                }

                return wrapper;
            };

            imagesToShow.forEach((url, i) => {
                scrollRow.appendChild(createImgElem(url, i));
            });

            // Luxury End-Card Tile
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

    // --- Sort Listeners ---
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            renderArchivedGallery();
        });
    }
    
    if (sortOrderBtn) {
        sortOrderBtn.addEventListener('click', () => {
            const current = sortOrderBtn.getAttribute('data-order');
            const next = current === 'asc' ? 'desc' : 'asc';
            sortOrderBtn.setAttribute('data-order', next);
            sortOrderBtn.innerText = sortSelect.value === 'date'
                ? (next === 'asc' ? 'Old-New ↓' : 'New-Old ↑')
                : (next === 'asc' ? 'A-Z ↓' : 'Z-A ↑');
            renderArchivedGallery();
        });
    }

    // --- Authentication Logic ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            localStorage.setItem('zhukov_logged_in', 'true');
            let isAdmin = false;
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    isAdmin = true;
                    if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, true);
                    loadArchivedPhotos();
                } else {
                    if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, false);
                    showViewState('denied');
                }
            } catch (err) {
                console.error("Auth check error:", err);
                if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, false);
                showViewState('error');
            }
        } else {
            localStorage.removeItem('zhukov_logged_in');
            if (window.updateHeaderAuthState) window.updateHeaderAuthState(null, false);
            showViewState('denied');
        }
    });

    // Delegated click listeners for header auth buttons
    document.addEventListener('click', (e) => {
        const loginTarget = e.target.closest('#login-btn-header');
        if (loginTarget) {
            localStorage.setItem('zhukov_logged_in', 'true');
            signInWithPopup(auth, provider).catch(err => console.error(err));
        }

        const logoutTarget = e.target.closest('#logout-btn');
        if (logoutTarget) {
            localStorage.removeItem('zhukov_logged_in');
            signOut(auth).catch(err => console.error(err));
        }
    });
});
