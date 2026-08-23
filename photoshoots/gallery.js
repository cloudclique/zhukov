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
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
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
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            if (uploadLink) uploadLink.classList.add('hidden');
            isAdmin = false;
            if (categoryId) loadGallery();
        }
    });

    loginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch(error => console.error(error));
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth).catch(error => console.error(error));
    });

    // --- Lightbox Logic ---
    const closeLightbox = () => {
        if (!lightbox) return;
        lightbox.classList.remove('show');
        setTimeout(() => {
            lightbox.style.display = 'none';
            lightboxImg.src = '';
        }, 300);
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

        try {
            let categoryName = "Photoshoot";
            let metaInfo = "";
            let urls = [];

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
                    console.error("Error deleting category:", error);
                    alert("Error deleting category.");
                }
            };

            // --- Render UI ---
            loadingState.style.display = 'none';
            let currentUrls = urls;

            if (isAdmin && categoryId !== 'single-shots') {
                headerContainer.innerHTML = `
                    <h2 class="gallery-title editable" data-field="categoryName" title="Double click to edit" style="display:inline-block;">${categoryName}</h2>
                    <div class="gallery-meta">${metaInfo}</div>
                    <div style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">${currentUrls.length} Photos</div>
                `;
            } else {
                headerContainer.innerHTML = `
                    <h2 class="gallery-title">${categoryName}</h2>
                    <div class="gallery-meta">${metaInfo}</div>
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
                    
                    el.addEventListener('dblclick', () => {
                        if (el.querySelector('input')) return;
                        
                        const currentText = el.innerText;
                        const fieldName = el.getAttribute('data-field');
                        
                        const input = document.createElement('input');
                        input.type = fieldName === 'date' ? 'date' : 'text';
                        if (fieldName !== 'date') input.value = currentText;
                        
                        input.style.padding = '4px 8px';
                        input.style.fontSize = 'inherit';
                        input.style.fontFamily = 'inherit';
                        input.style.color = '#fff';
                        input.style.background = '#1e293b';
                        input.style.border = '1px solid #60a5fa';
                        input.style.borderRadius = '4px';
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
                                if (newVal && newVal !== currentText) hasChanged = true;
                            }
                            
                            if (!hasChanged) {
                                el.innerHTML = currentText;
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
                                el.innerHTML = currentText;
                                alert("Failed to update.");
                            }
                        };
                        
                        input.addEventListener('blur', saveChange);
                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') input.blur();
                            if (e.key === 'Escape') {
                                input.dataset.saving = "true"; // Prevent blur trigger
                                el.innerHTML = currentText;
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
                    // Initially hide it or set a default span so it doesn't break layout while loading
                    wrapper.style.gridRow = `span 20`; // default fallback
                    
                    const img = document.createElement('img');
                    img.className = 'masonry-img';
                    img.src = url;
                    // Don't lazy load, we want to calculate sizes ASAP for the dense grid
                    
                    img.onload = () => {
                        calculateSpans(wrapper, img);
                    };
                    
                    img.addEventListener('click', () => {
                        lightbox.style.display = 'flex';
                        setTimeout(() => {
                            lightbox.classList.add('show');
                            lightboxImg.src = img.src;
                        }, 10);
                    });

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
