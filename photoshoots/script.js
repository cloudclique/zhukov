import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', async () => {
    // Auth UI Elements
    const loginBtn = document.getElementById('login-btn-header');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Gallery & Filter UI
    const categoryFilter = document.getElementById('category-filter');
    const modelFilter = document.getElementById('model-filter');
    const gallery = document.getElementById('gallery');
    const noResults = document.getElementById('no-results');
    
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close');

    // Data store
    let allPhotos = [];

    // --- Firebase Authentication Logic ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
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
    const loadFilters = async () => {
        try {
            const tagsSnap = await getDoc(doc(db, 'metadata', 'tags'));
            if (tagsSnap.exists()) {
                const data = tagsSnap.data();
                
                // Categories
                if (data.categories) {
                    // Start with 'Single Shots'
                    const singleOpt = document.createElement('option');
                    singleOpt.value = 'Single Shots';
                    singleOpt.innerText = 'Single Shots';
                    categoryFilter.appendChild(singleOpt);

                    data.categories.forEach(cat => {
                        if (cat !== 'Single Shots') {
                            const opt = document.createElement('option');
                            opt.value = cat;
                            opt.innerText = cat;
                            categoryFilter.appendChild(opt);
                        }
                    });
                }
                
                // Models
                if (data.models) {
                    data.models.forEach(model => {
                        const opt = document.createElement('option');
                        opt.value = model;
                        opt.innerText = model;
                        modelFilter.appendChild(opt);
                    });
                }
            }
        } catch (error) {
            console.error("Error loading filters:", error);
        }
    };

    const loadPhotos = async () => {
        try {
            allPhotos = [];

            // Fetch Single Shots
            const singleSnap = await getDocs(collection(db, 'single_shots'));
            singleSnap.forEach(doc => {
                const data = doc.data();
                allPhotos.push({
                    url: data.url,
                    category: 'Single Shots',
                    model: data.modelName || 'Unknown',
                    theme: data.theme || ''
                });
            });

            // Fetch Photo Sets
            const setsSnap = await getDocs(collection(db, 'photo_sets'));
            setsSnap.forEach(doc => {
                const data = doc.data();
                if (data.urls && Array.isArray(data.urls)) {
                    data.urls.forEach(url => {
                        allPhotos.push({
                            url: url,
                            category: data.categoryName,
                            model: data.modelName || 'Unknown',
                            theme: data.theme || ''
                        });
                    });
                }
            });

            renderGallery();
        } catch (error) {
            console.error("Error loading photos:", error);
        }
    };

    // --- Render Gallery ---
    const renderGallery = () => {
        const selectedCat = categoryFilter.value;
        const selectedModel = modelFilter.value;

        // Clear existing gallery
        gallery.innerHTML = '';
        noResults.style.display = 'none';

        // Filter photos
        const filteredPhotos = allPhotos.filter(photo => {
            const catMatch = selectedCat === 'all' || photo.category === selectedCat;
            const modelMatch = selectedModel === 'all' || photo.model === selectedModel;
            return catMatch && modelMatch;
        });

        if (filteredPhotos.length === 0) {
            noResults.style.display = 'block';
            return;
        }

        // Render matched photos
        filteredPhotos.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.style.animationDelay = `${index * 0.05}s`;

            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = `${photo.category} - ${photo.model}`;
            img.loading = 'lazy';

            item.appendChild(img);
            gallery.appendChild(item);

            // Click to view
            item.addEventListener('click', () => {
                lightbox.style.display = 'flex';
                setTimeout(() => {
                    lightbox.classList.add('show');
                    lightboxImg.src = img.src;
                }, 10);
            });
        });
    };

    // --- Event Listeners for Filters ---
    categoryFilter.addEventListener('change', renderGallery);
    modelFilter.addEventListener('change', renderGallery);

    // Initial Load
    await loadFilters();
    await loadPhotos();
});
