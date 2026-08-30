import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, deleteDoc, updateDoc, arrayRemove, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";
import { ensureAgeVerification, getAgeVerificationStatus } from "./age-gate.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', async () => {
    // Auth UI Elements
    const loginBtn = document.getElementById('login-btn-header');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Gallery & Sort UI
    const sortSelect = document.getElementById('sort-select');
    const sortOrderBtn = document.getElementById('sort-order-btn');
    const categoriesContainer = document.getElementById('categories-container');
    const noResults = document.getElementById('no-results');
    
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close');

    // Data store
    let categoriesData = [];
    let isAdmin = false;

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
                    renderGallery();
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
            renderGallery();
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

    // --- Fetch Data ---
    const loadPhotos = async () => {
        // Show skeleton loading state
        categoriesContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
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
                            <div class="skeleton skeleton-img row-img" style="width: 200px;"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        noResults.style.display = 'none';

        try {
            categoriesData = [];
            const isAdult = getAgeVerificationStatus() === true;
            
            // 1. Fetch Single Shots (filtered if not 18+)
            const singleSnap = await getDocs(collection(db, 'single_shots'));
            const singleUrls = [];
            const singleItems = [];
            let latestSingleDate = '1970-01-01T00:00:00.000Z';
            
            singleSnap.forEach(doc => {
                const data = doc.data();
                if (!isAdult && data.isAdult === true) return; // Hide 18+ single shots for non-adults
                singleItems.push(data);
                if (data.date && data.date > latestSingleDate) {
                    latestSingleDate = data.date;
                }
            });
            
            // Sort newest to oldest
            singleItems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            singleItems.forEach(item => singleUrls.push(item.url));

            if (singleUrls.length > 0) {
                categoriesData.push({
                    categoryId: 'single-shots',
                    categoryName: 'Single Shots',
                    modelName: 'Mixed',
                    theme: 'Mixed',
                    date: latestSingleDate,
                    urls: singleUrls
                });
            }

            // 2. Fetch Photo Sets (exclude archived and filter 18+)
            const setsSnap = await getDocs(collection(db, 'photo_sets'));
            setsSnap.forEach(doc => {
                const data = doc.data();
                if (data.archived === true) return; // Hide archived sets from public
                if (data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
                    let visibleUrls = [...data.urls];
                    
                    if (!isAdult) {
                        const adultUrls = data.adultUrls || [];
                        if (data.isAdult === true && adultUrls.length === 0) {
                            // Entire set was marked 18+ on upload
                            return; // Do not show set if it completely consists of 18+ images
                        }
                        visibleUrls = visibleUrls.filter(url => !adultUrls.includes(url));
                        if (visibleUrls.length === 0) {
                            return; // All images in this set are 18+, hide set completely
                        }
                    }

                    categoriesData.push({
                        categoryId: doc.id,
                        categoryName: data.categoryName || 'Unknown Photo set',
                        modelName: data.modelName || 'Unknown',
                        theme: data.theme || 'None',
                        date: data.date || '1970-01-01T00:00:00.000Z',
                        urls: visibleUrls.reverse() // Show newest to oldest
                    });
                }
            });

            renderGallery();
        } catch (error) {
            console.error("Error loading photos:", error);
        }
    };

    // --- Admin Deletion Logic ---
    const deletePhoto = async (categoryId, photoUrl) => {
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
            // Reload data
            await loadPhotos();
        } catch (error) {
            console.error("Error deleting photo:", error);
            alert("Error deleting photo.");
        }
    };

    const deleteCategory = async (categoryId) => {
        if (!confirm("Are you sure you want to delete this ENTIRE set?")) return;
        try {
            await deleteDoc(doc(db, 'photo_sets', categoryId));
            await loadPhotos();
        } catch (error) {
            console.error("Error deleting photo set:", error);
            alert("Error deleting photo set.");
        }
    };

    const archiveCategory = async (categoryId) => {
        if (!confirm("Archive this photo set? It will be hidden from the public gallery.")) return;
        try {
            await updateDoc(doc(db, 'photo_sets', categoryId), { archived: true });
            await loadPhotos();
        } catch (error) {
            console.error("Error archiving photo set:", error);
            alert("Error archiving photo set.");
        }
    };

    // --- Render Gallery ---
    const renderGallery = () => {
        const sortBy = sortSelect.value;
        const sortOrder = sortOrderBtn.getAttribute('data-order'); // 'asc' or 'desc'

        categoriesContainer.innerHTML = '';
        noResults.style.display = 'none';

        if (categoriesData.length === 0) {
            noResults.style.display = 'block';
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

        // Render each category
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

            headerDiv.appendChild(title);
            headerDiv.appendChild(meta);
            
            // Admin Action Buttons (Archive + Delete)
            if (isAdmin && cat.categoryId !== 'single-shots') {
                const adminGroup = document.createElement('div');
                adminGroup.className = 'admin-btn-group';

                const archCatBtn = document.createElement('button');
                archCatBtn.className = 'archive-category-btn';
                archCatBtn.innerText = 'â¬› Archive';
                archCatBtn.addEventListener('click', () => archiveCategory(cat.categoryId));

                const delCatBtn = document.createElement('button');
                delCatBtn.className = 'delete-category-btn';
                delCatBtn.innerText = 'Delete Set';
                delCatBtn.addEventListener('click', () => deleteCategory(cat.categoryId));

                adminGroup.appendChild(archCatBtn);
                adminGroup.appendChild(delCatBtn);
                headerDiv.appendChild(adminGroup);
            }
            
            rowDiv.appendChild(headerDiv);

            // Images Container
            const scrollRow = document.createElement('div');
            scrollRow.className = 'scrollable-row';

            const limit = 15; // Load enough to fill wide screens
            const imagesToShow = cat.urls.slice(0, limit);
            const hasMore = cat.urls.length > 5; // Show fade if there are many images

            const createImgElem = (url, waveIndex) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'img-container';
                
                const img = document.createElement('img');
                img.className = 'row-img';
                img.src = url;

                const reveal = () => {
                    wrapper.classList.add('is-sized');
                    const delay = waveIndex * 0.08;
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
                        deletePhoto(cat.categoryId, url);
                    });
                    wrapper.appendChild(delPhotoBtn);
                }
                
                return wrapper;
            };

            imagesToShow.forEach((url, i) => {
                scrollRow.appendChild(createImgElem(url, i));
            });

            const scrollWrapper = document.createElement('div');
            scrollWrapper.className = 'scrollable-row-wrapper';
            scrollWrapper.appendChild(scrollRow);

            if (hasMore) {
                const fadeBtn = document.createElement('div');
                fadeBtn.className = 'fade-overlay';
                fadeBtn.innerHTML = `<span class="fade-btn-text">See All &rarr;</span>`;
                
                fadeBtn.addEventListener('click', () => {
                    window.location.href = `/photoshoots/gallery.html?id=${encodeURIComponent(cat.categoryId)}`;
                });
                
                scrollWrapper.appendChild(fadeBtn);
            }

            rowDiv.appendChild(scrollWrapper);
            categoriesContainer.appendChild(rowDiv);
        });
    };

    // --- Event Listeners for Sort ---
    const updateSortButtonText = () => {
        const sortBy = sortSelect.value;
        const currentOrder = sortOrderBtn.getAttribute('data-order');
        if (sortBy === 'date') {
            sortOrderBtn.innerText = currentOrder === 'asc' ? 'Old-New â†“' : 'New-Old â†‘';
        } else {
            sortOrderBtn.innerText = currentOrder === 'asc' ? 'A-Z â†“' : 'Z-A â†‘';
        }
    };

    sortSelect.addEventListener('change', () => {
        updateSortButtonText();
        renderGallery();
    });
    
    sortOrderBtn.addEventListener('click', () => {
        const currentOrder = sortOrderBtn.getAttribute('data-order');
        if (currentOrder === 'asc') {
            sortOrderBtn.setAttribute('data-order', 'desc');
        } else {
            sortOrderBtn.setAttribute('data-order', 'asc');
        }
        updateSortButtonText();
        renderGallery();
    });

    // Initial Load - Age gate check first
    await ensureAgeVerification();
    await loadPhotos();
});

