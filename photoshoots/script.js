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
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    isAdmin = true;
                    if (uploadLink) uploadLink.classList.remove('hidden');
                    renderGallery();
                }
            } catch (error) {
                console.error("Auth check error:", error);
            }
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            if (uploadLink) uploadLink.classList.add('hidden');
            isAdmin = false;
            renderGallery();
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

    // --- Fetch Data ---
    const loadPhotos = async () => {
        try {
            categoriesData = [];
            
            // 1. Fetch Single Shots
            const singleSnap = await getDocs(collection(db, 'single_shots'));
            const singleUrls = [];
            const singleItems = [];
            let latestSingleDate = '1970-01-01T00:00:00.000Z';
            
            singleSnap.forEach(doc => {
                const data = doc.data();
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

            // 2. Fetch Photo Sets
            const setsSnap = await getDocs(collection(db, 'photo_sets'));
            setsSnap.forEach(doc => {
                const data = doc.data();
                if (data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
                    categoriesData.push({
                        categoryId: doc.id,
                        categoryName: data.categoryName || 'Unknown Category',
                        modelName: data.modelName || 'Unknown',
                        theme: data.theme || 'None',
                        date: data.date || '1970-01-01T00:00:00.000Z',
                        urls: [...data.urls].reverse() // Show newest to oldest
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
            console.error("Error deleting category:", error);
            alert("Error deleting category.");
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
            let valA = (a[sortBy === 'category' ? 'categoryName' : (sortBy === 'model' ? 'modelName' : sortBy)] || '').toLowerCase();
            let valB = (b[sortBy === 'category' ? 'categoryName' : (sortBy === 'model' ? 'modelName' : sortBy)] || '').toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
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
            title.innerText = cat.categoryName;

            const meta = document.createElement('div');
            meta.className = 'category-meta';
            const displayDate = cat.date !== '1970-01-01T00:00:00.000Z' ? new Date(cat.date).toLocaleDateString() : '';
            meta.innerText = `${cat.modelName} | ${cat.theme} ${displayDate ? '| ' + displayDate : ''}`;

            headerDiv.appendChild(title);
            headerDiv.appendChild(meta);
            
            // Delete Category Button
            if (isAdmin && cat.categoryId !== 'single-shots') {
                const delCatBtn = document.createElement('button');
                delCatBtn.className = 'delete-category-btn';
                delCatBtn.innerText = 'Delete Set';
                delCatBtn.addEventListener('click', () => deleteCategory(cat.categoryId));
                headerDiv.appendChild(delCatBtn);
            }
            
            rowDiv.appendChild(headerDiv);

            // Images Container
            const scrollRow = document.createElement('div');
            scrollRow.className = 'scrollable-row';

            const limit = 15; // Load enough to fill wide screens
            const imagesToShow = cat.urls.slice(0, limit);
            const hasMore = cat.urls.length > 5; // Show fade if there are many images

            const createImgElem = (url) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'img-container';
                
                const img = document.createElement('img');
                img.className = 'row-img';
                img.src = url;
                img.loading = 'lazy';
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
                        deletePhoto(cat.categoryId, url);
                    });
                    wrapper.appendChild(delPhotoBtn);
                }
                
                return wrapper;
            };

            imagesToShow.forEach(url => {
                scrollRow.appendChild(createImgElem(url));
            });

            if (hasMore) {
                const fadeBtn = document.createElement('div');
                fadeBtn.className = 'fade-overlay';
                fadeBtn.innerHTML = `<span class="fade-btn-text">See All &rarr;</span>`;
                
                fadeBtn.addEventListener('click', () => {
                    window.location.href = `/photoshoots/gallery.html?id=${encodeURIComponent(cat.categoryId)}`;
                });
                
                scrollRow.appendChild(fadeBtn);
            }

            rowDiv.appendChild(scrollRow);
            categoriesContainer.appendChild(rowDiv);
        });
    };

    // --- Event Listeners for Sort ---
    sortSelect.addEventListener('change', renderGallery);
    
    sortOrderBtn.addEventListener('click', () => {
        const currentOrder = sortOrderBtn.getAttribute('data-order');
        if (currentOrder === 'asc') {
            sortOrderBtn.setAttribute('data-order', 'desc');
            sortOrderBtn.innerText = 'Z-A ↑';
        } else {
            sortOrderBtn.setAttribute('data-order', 'asc');
            sortOrderBtn.innerText = 'A-Z ↓';
        }
        renderGallery();
    });

    // Initial Load
    await loadPhotos();
});
