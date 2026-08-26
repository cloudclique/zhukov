import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, deleteDoc, updateDoc, arrayRemove, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', async () => {
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
                    if (categoryId) loadGallery();
                }
            } catch (error) {
                console.error("Auth check error:", error);
            }
        } else {
            if (loginBtn.classList.contains('hidden')) loginBtn.classList.remove('hidden');
            if (!logoutBtn.classList.contains('hidden')) logoutBtn.classList.add('hidden');
            localStorage.removeItem('zhukov_logged_in');
            if (uploadLink) uploadLink.classList.add('hidden');
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
            
            // Scale tilt inversely with element size — big images tilt less
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
    const loadGallery = async () => {
        if (!categoryId) {
            loadingState.innerText = "Error: No photoshoot selected.";
            return;
        }

        // --- Skeleton Loading State ---
        loadingState.style.display = 'none';
        headerContainer.innerHTML = `
            <div class="skeleton skeleton-title" style="margin-bottom: 0.5rem; width: 300px;"></div>
            <div class="skeleton skeleton-meta" style="width: 200px;"></div>
        `;
        
        gridContainer.innerHTML = '';
        // Create 12 skeleton items with varying heights to simulate masonry
        const spans = [20, 25, 18, 30, 22, 28, 19, 24, 27, 21, 26, 23];
        spans.forEach(span => {
            gridContainer.innerHTML += `<div class="masonry-item skeleton" style="grid-row: span ${span}; min-height: ${span * 10}px; border-radius: 12px;"></div>`;
        });

        try {
            let categoryName = "Photoshoot";
            let metaInfo = "";
            let description = "";
            let urls = [];

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

            if (categoryId === 'single-shots') {
                categoryName = "Single Shots";
                metaInfo = "Mixed Models | Mixed Themes";
                
                const singleSnap = await getDocs(collection(db, 'single_shots'));
                const singleItems = [];
                singleSnap.forEach(doc => {
                    singleItems.push(doc.data());
                });
                // Sort newest to oldest
                singleItems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                urls = singleItems.map(item => item.url);
            } else {
                const setRef = doc(db, 'photo_sets', categoryId);
                const setSnap = await getDoc(setRef);
                
                if (setSnap.exists()) {
                    const data = setSnap.data();
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
                        urls = [...data.urls].reverse(); // Show newest to oldest
                    }
                } else {
                    loadingState.innerText = "Error: Photoshoot not found.";
                    return;
                }
            }

            // --- Admin Deletion Logic ---
            const deletePhoto = async (photoUrl) => {
                if (!confirm("Are you sure you want to delete this photo?")) return;
                try {
                    if (categoryId === 'single-shots') {
                        const q = query(collection(db, 'single_shots'), where('url', '==', photoUrl));
                        const snap = await getDocs(q);
                        snap.forEach(async (d) => {
                            await deleteDoc(doc(db, 'single_shots', d.id));
                        });
                    } else {
                        await updateDoc(doc(db, 'photo_sets', categoryId), {
                            urls: arrayRemove(photoUrl)
                        });
                    }
                    loadGallery(); // Reload
                } catch (error) {
                    console.error("Error deleting photo:", error);
                    alert("Error deleting photo.");
                }
            };

            const deleteCategory = async () => {
                if (!confirm("Are you sure you want to delete this ENTIRE set?")) return;
                try {
                    await deleteDoc(doc(db, 'photo_sets', categoryId));
                    window.location.href = '/photoshoots/'; // Redirect back
                } catch (error) {
                    console.error("Error deleting photo set:", error);
                    alert("Error deleting photo set.");
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
                    <div style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">${currentUrls.length} Photos</div>
                `;
            } else {
                headerContainer.innerHTML = `
                    <h2 class="gallery-title">${categoryName}</h2>
                    <div class="gallery-meta">${metaInfo}</div>
                    ${description ? `<div class="gallery-description">${formattedDesc}</div>` : ''}
                    <div style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">${currentUrls.length} Photos</div>
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
            
            // Delete Category Button
            if (isAdmin && categoryId !== 'single-shots') {
                const delCatBtn = document.createElement('button');
                delCatBtn.className = 'delete-category-btn';
                delCatBtn.innerText = 'Delete Set';
                delCatBtn.addEventListener('click', deleteCategory);
                headerContainer.appendChild(delCatBtn);
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
                    
                    // Delete Photo Button
                    if (isAdmin) {
                        const delPhotoBtn = document.createElement('button');
                        delPhotoBtn.className = 'delete-photo-btn';
                        delPhotoBtn.innerHTML = '&times;';
                        delPhotoBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            deletePhoto(url);
                        });
                        wrapper.appendChild(delPhotoBtn);
                    }
                    
                    // Admin Drag and Drop Reordering
                    if (isAdmin && categoryId !== 'single-shots') {
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
                                const docRef = doc(db, 'photo_sets', categoryId);
                                await updateDoc(docRef, { urls: [...currentUrls].reverse() });
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
    
    // Initial Load
    if (categoryId) {
        loadGallery();
    } else {
        loadingState.innerText = "Error: No photoshoot selected.";
    }
});
