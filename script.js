import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "./firebase-config.js";
import { getCachedData, setCachedData, isDataEqual, registerSiteServiceWorker } from "./site-cache.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Static fallback images (curated photography for recent work gallery)
const fallbackImages = [
    'https://i.ibb.co/d4Vrdj32/image-2.webp',
    'https://i.ibb.co/PsZXrKDf/image-0.webp',
    'https://i.ibb.co/yByqsxc7/image-5.webp',
    'https://i.ibb.co/TxT3LCYZ/image-1.webp',
    'https://i.ibb.co/hx18J6x6/image-8.webp',
    'https://i.ibb.co/CKCTtpm0/image-2.webp',
    'https://i.ibb.co/2YvP0Ggx/image-4.webp',
    'https://i.ibb.co/gZgCv2SK/image-10.webp',
    'https://i.ibb.co/WvgGq1vd/image-1.webp',
    'https://i.ibb.co/tPhkGyZ4/image-3.webp',
    'https://i.ibb.co/0VJ3gLfV/image-3.webp',
    'https://i.ibb.co/rqgS1mb/image-4.webp'
];

const fallbackSetNames = [
    'VOGUE PARIS EDITORIAL',
    'HAUTE COUTURE FW24',
    'MONOCHROME NOIR',
    'AVANT-GARDE ATELIER',
    'MINIMALIST PORTRAITURE',
    'MILAN RUNWAY STUDY',
    'EDITORIAL CAPSULE',
    'STUDIO SELECTION'
];

const defaultSlotAspects = [
    'landscape', // Slot 1: wide
    'portrait',  // Slot 2: narrow
    'landscape', // Slot 3: wide
    'portrait',  // Slot 4: narrow
    'portrait',  // Slot 5: narrow
    'landscape', // Slot 6: wide
    'portrait',  // Slot 7: narrow
    'landscape'  // Slot 8: wide (last image)
];

document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker for offline asset & image caching
    registerSiteServiceWorker();

    // UI Elements
    const loginBtn = document.getElementById('login-btn-header');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Gallery Elements
    const gallery = document.getElementById('gallery');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxSetName = document.getElementById('lightbox-set-name');
    const closeBtn = document.querySelector('#lightbox-close, .lightbox .close, .close');

    // Hero Image Elements
    const heroImg = document.getElementById('hero-img') || document.querySelector('.hero-diagonal-cut-wrapper img');
    const heroEditBtn = document.getElementById('hero-edit-btn');

    // Profile Image Elements
    const profileImg = document.getElementById('profile-img') || document.querySelector('.profile-image-frame img');
    const profileEditBtn = document.getElementById('profile-edit-btn');

    // Instant Cache Render for Hero Image (0ms delay)
    const cachedHero = getCachedData('home_hero_image');
    if (cachedHero && heroImg && heroImg.src !== cachedHero) {
        heroImg.src = cachedHero;
    } else if (!cachedHero && heroImg && heroImg.src) {
        setCachedData('home_hero_image', heroImg.src);
    }

    // Instant Cache Render for Profile Image (0ms delay)
    const cachedProfile = getCachedData('home_profile_image');
    if (cachedProfile && profileImg) {
        profileImg.src = cachedProfile;
    }

    if (localStorage.getItem('zhukov_is_admin') === 'true') {
        if (heroEditBtn) heroEditBtn.style.display = 'flex';
        if (profileEditBtn) profileEditBtn.style.display = 'flex';
    } else {
        if (heroEditBtn) heroEditBtn.style.display = 'none';
        if (profileEditBtn) profileEditBtn.style.display = 'none';
    }

    if (heroEditBtn) {
        heroEditBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openPicker('hero');
        });
    }

    if (profileEditBtn) {
        profileEditBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openPicker('profile');
        });
    }

    // --- Admin state ---
    let currentIsAdmin = false;

    // Map URL to origin photoshoot set name for automatic lookup
    const urlToSetNameMap = new Map();

    // --- Gallery Slots ---
    // Horizontal alternating pattern: 8 featured image slots
    const SLOT_COUNT = 8;
    let gallerySlots = []; // Array of { url, aspectRatio, setName }

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

    const openLightbox = (imgElement, setName = 'EDITORIAL ARCHIVE') => {
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
        
        lightboxImg.src = imgElement.src;
        if (lightboxSetName) {
            lightboxSetName.textContent = (setName || 'EDITORIAL ARCHIVE').toUpperCase();
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

    const resolveOriginSetNames = async () => {
        try {
            const [setsSnap, singleSnap] = await Promise.all([
                getDocs(collection(db, 'photo_sets')),
                getDocs(collection(db, 'single_shots'))
            ]);

            setsSnap.forEach(docSnap => {
                const data = docSnap.data();
                const categoryName = data.categoryName || 'PHOTOSHOOT';
                if (data.urls && Array.isArray(data.urls)) {
                    data.urls.forEach(url => urlToSetNameMap.set(url, categoryName));
                }
                if (data.adultUrls && Array.isArray(data.adultUrls)) {
                    data.adultUrls.forEach(url => urlToSetNameMap.set(url, categoryName));
                }
                if (data.archivedUrls && Array.isArray(data.archivedUrls)) {
                    data.archivedUrls.forEach(url => urlToSetNameMap.set(url, categoryName));
                }
            });

            singleSnap.forEach(docSnap => {
                const data = docSnap.data();
                if (data.url) urlToSetNameMap.set(data.url, 'SINGLE SHOTS');
            });

            // Update any slots that didn't have their origin set name stored yet
            let updated = false;
            gallerySlots.forEach((slot, i) => {
                if (slot.url && urlToSetNameMap.has(slot.url)) {
                    const foundName = urlToSetNameMap.get(slot.url);
                    if (slot.setName !== foundName) {
                        slot.setName = foundName;
                        updated = true;
                    }
                } else if (!slot.setName) {
                    slot.setName = fallbackSetNames[i % fallbackSetNames.length];
                }
            });

            if (updated) {
                setCachedData('home_gallery_slots', gallerySlots);
            }
        } catch (e) {
            console.warn('Could not resolve origin set names:', e);
        }
    };

    const loadGallerySlots = async () => {
        if (!gallery) return;

        // Background resolve origin set names from Firestore sets
        resolveOriginSetNames();

        // 1. Instant Cache Render (0ms delay)
        const cachedSlots = getCachedData('home_gallery_slots');
        if (cachedSlots && Array.isArray(cachedSlots) && cachedSlots.length > 0) {
            if (cachedSlots[0]) cachedSlots[0].aspectRatio = 'landscape';
            if (cachedSlots[1]) cachedSlots[1].aspectRatio = 'portrait';
            if (cachedSlots[2]) cachedSlots[2].aspectRatio = 'landscape';
            if (cachedSlots[3]) cachedSlots[3].aspectRatio = 'portrait';
            if (cachedSlots[4]) cachedSlots[4].aspectRatio = 'portrait';
            if (cachedSlots[5]) cachedSlots[5].aspectRatio = 'landscape';
            if (cachedSlots[6]) cachedSlots[6].aspectRatio = 'portrait';
            if (cachedSlots[7]) cachedSlots[7].aspectRatio = 'landscape';
            gallerySlots = cachedSlots;
            renderGallerySlots();
        } else {
            gallery.innerHTML = '';
            gallerySlots = [];
        }

        // 2. Background Revalidation from Firestore
        try {
            const settingsDoc = await getDoc(doc(db, 'settings', 'home_gallery'));
            let freshSlots = [];
            if (settingsDoc.exists() && settingsDoc.data().slots) {
                freshSlots = settingsDoc.data().slots;
            }

            // Sync Hero Image from Firestore settings
            if (settingsDoc.exists() && settingsDoc.data().heroImage) {
                const freshHero = settingsDoc.data().heroImage;
                setCachedData('home_hero_image', freshHero);
                if (heroImg && heroImg.src !== freshHero) {
                    heroImg.src = freshHero;
                }
            }

            // Sync Profile Image from Firestore settings
            if (settingsDoc.exists() && settingsDoc.data().profileImage) {
                const freshProfile = settingsDoc.data().profileImage;
                setCachedData('home_profile_image', freshProfile);
                if (profileImg && profileImg.src !== freshProfile) {
                    profileImg.src = freshProfile;
                }
            }

            // Fill any missing slots with fallbacks and set names
            for (let i = 0; i < SLOT_COUNT; i++) {
                if (!freshSlots[i] || !freshSlots[i].url) {
                    freshSlots[i] = { 
                        url: fallbackImages[i % fallbackImages.length] || '', 
                        aspectRatio: defaultSlotAspects[i] || 'landscape',
                        setName: fallbackSetNames[i % fallbackSetNames.length] || 'EDITORIAL ARCHIVE'
                    };
                } else if (!freshSlots[i].setName) {
                    freshSlots[i].setName = urlToSetNameMap.get(freshSlots[i].url) || fallbackSetNames[i % fallbackSetNames.length] || 'EDITORIAL ARCHIVE';
                }
            }

            // Normalize slot orientations: 1, 3, 6, 8 landscape; 2, 4, 5, 7 portrait
            if (freshSlots[0]) freshSlots[0].aspectRatio = 'landscape';
            if (freshSlots[1]) freshSlots[1].aspectRatio = 'portrait';
            if (freshSlots[2]) freshSlots[2].aspectRatio = 'landscape';
            if (freshSlots[3]) freshSlots[3].aspectRatio = 'portrait';
            if (freshSlots[4]) freshSlots[4].aspectRatio = 'portrait';
            if (freshSlots[5]) freshSlots[5].aspectRatio = 'landscape';
            if (freshSlots[6]) freshSlots[6].aspectRatio = 'portrait';
            if (freshSlots[7]) freshSlots[7].aspectRatio = 'landscape';

            if (!isDataEqual(gallerySlots, freshSlots)) {
                gallerySlots = freshSlots;
                setCachedData('home_gallery_slots', freshSlots);
                renderGallerySlots();
            } else if (!cachedSlots) {
                setCachedData('home_gallery_slots', freshSlots);
            }
        } catch (e) {
            console.warn('Could not load home_gallery settings:', e);
            if (gallerySlots.length === 0) {
                for (let i = 0; i < SLOT_COUNT; i++) {
                    gallerySlots[i] = { 
                        url: fallbackImages[i % fallbackImages.length] || '', 
                        aspectRatio: defaultSlotAspects[i] || 'landscape',
                        setName: fallbackSetNames[i % fallbackSetNames.length] || 'EDITORIAL ARCHIVE'
                    };
                }
                renderGallerySlots();
            }
        }
    };

    const renderGallerySlots = () => {
        if (!gallery) return;
        gallery.innerHTML = '';

        gallerySlots.forEach((slot, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.style.animationDelay = `${index * 0.12}s`;
            if (!slot.url) item.classList.add('empty-slot');

            const isLastSlot = (index === gallerySlots.length - 1);
            if (isLastSlot) {
                item.classList.add('is-last-slot');
            }

            // Determine orientation: 1, 3, 6, 8 horizontal; 2, 4, 5, 7 vertical
            const isVerticalSlot = (index === 1 || index === 3 || index === 4 || index === 6);
            item.classList.add(isVerticalSlot ? 'is-vertical' : 'is-horizontal');
            item.classList.add(isVerticalSlot ? 'is-portrait' : 'is-landscape');

            if (slot.url) {
                const img = document.createElement('img');
                img.src = slot.url;
                img.alt = `Featured Image ${index + 1}`;
                img.loading = 'lazy';

                // Real dimension check to dynamically assign vertical vs horizontal orientation
                const updateOrientation = () => {
                    // Slots 1, 3, 6, 8 are strictly horizontal in the editorial composition
                    if (index === 0 || index === 2 || index === 5 || index === 7 || isLastSlot) {
                        item.classList.remove('is-vertical', 'is-portrait');
                        item.classList.add('is-horizontal', 'is-landscape');
                        return;
                    }
                    // Slots 2, 4, 5, 7 are strictly vertical in the editorial composition
                    if (index === 1 || index === 3 || index === 4 || index === 6) {
                        item.classList.add('is-vertical', 'is-portrait');
                        item.classList.remove('is-horizontal', 'is-landscape');
                        return;
                    }
                    if (img.naturalWidth && img.naturalHeight) {
                        const isVertical = img.naturalHeight > img.naturalWidth;
                        item.classList.toggle('is-vertical', isVertical);
                        item.classList.toggle('is-portrait', isVertical);
                        item.classList.toggle('is-horizontal', !isVertical);
                        item.classList.toggle('is-landscape', !isVertical);
                    }
                };

                if (img.complete && img.naturalWidth) {
                    updateOrientation();
                } else {
                    img.addEventListener('load', updateOrientation, { once: true });
                }

                item.appendChild(img);

                // Lightbox on click (only if not admin — admin gets edit button)
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.slot-edit-btn')) return;
                    const originSetName = slot.setName || urlToSetNameMap.get(slot.url) || fallbackSetNames[index % fallbackSetNames.length] || 'EDITORIAL ARCHIVE';
                    openLightbox(img, originSetName);
                });

                attachTiltEffect(item);
            } else {
                // Empty slot icon
                const icon = document.createElement('span');
                icon.style.cssText = 'font-size:2rem;color:rgba(148,163,184,0.3);';
                icon.textContent = '+';
                item.appendChild(icon);
            }

            // Admin edit button
            if (currentIsAdmin) {
                const editBtn = document.createElement('button');
                editBtn.className = 'slot-edit-btn';
                editBtn.title = 'Change image';
                editBtn.innerHTML = '✏️';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openPicker(index);
                });
                item.appendChild(editBtn);
            }

            gallery.appendChild(item);
        });
    };

    // ==========================================================================
    // STUDIO PHOTO ARCHIVE — MASTER-DETAIL ALBUM & IMAGE PICKER ENGINE
    // ==========================================================================
    let cachedStudioPhotoSets = null;
    let activeStudioSetId = 'all'; // 'all', 'all_archived', 'single_shots', or set id
    let activeStudioArchiveFilter = 'all'; // 'all', 'active', 'archived'
    let activeStudioSelectedUrl = null;
    let activeStudioSelectedSetName = '';
    let activeStudioGridDensity = 'normal'; // 'compact', 'normal', 'large'
    let activeStudioSearchQuery = '';
    let activeSlotIndex = -1; // 'hero', 'profile', or number 0..7

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(message) {
        let toast = document.querySelector('.cookie-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'cookie-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
    }

    const openPicker = async (slotIndex) => {
        const modal = document.getElementById('studio-gallery-modal');
        if (!modal) return;

        activeSlotIndex = slotIndex;
        modal.classList.add('is-open');
        document.body.classList.add('picker-open');
        document.body.style.overflow = 'hidden';

        // Reset search
        activeStudioSearchQuery = '';
        const searchInput = document.getElementById('studio-library-search');
        const clearBtn = document.getElementById('studio-search-clear-btn');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';

        // Reset selection state
        activeStudioSelectedUrl = null;
        activeStudioSelectedSetName = '';
        updateStudioFooterSelection();

        // Context-aware title or prompt
        const statsText = document.getElementById('studio-stats-text');
        let targetLabel = 'Curated Gallery Slot';
        if (slotIndex === 'hero') targetLabel = 'Hero Cover Image';
        else if (slotIndex === 'profile') targetLabel = 'About Profile Image';
        else if (typeof slotIndex === 'number') targetLabel = `Recent Work Slot #${slotIndex + 1}`;

        if (statsText) {
            statsText.textContent = `Selecting ${targetLabel} • Connecting to studio archive…`;
        }

        // Check if we already have complete cached data
        if (cachedStudioPhotoSets && cachedStudioPhotoSets.length > 0) {
            renderStudioLibraryUI(targetLabel);
            return;
        }

        // Show loading state in both panels
        const sidebarList = document.getElementById('studio-sets-list');
        const photosGrid = document.getElementById('studio-photos-grid');
        const currentMeta = document.getElementById('studio-current-set-meta');

        if (sidebarList) {
            sidebarList.innerHTML = `
                <div style="padding: 2.5rem 1rem; text-align: center; color: #7e8ba3; font-family: 'Inter', sans-serif;">
                    <div style="font-size: 1.4rem; margin-bottom: 0.6rem; animation: spin 1s linear infinite; display: inline-block; color: #c5a059;">✦</div>
                    <p style="font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase;">Loading sets & archives…</p>
                </div>
            `;
        }
        if (photosGrid) {
            photosGrid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; color: #7e8ba3; font-family: 'Inter', sans-serif;">
                    <div style="font-size: 1.8rem; margin-bottom: 0.8rem; animation: spin 1s linear infinite; display: inline-block; color: #c5a059;">✦</div>
                    <p style="font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase;">Loading studio photoshoot archive…</p>
                </div>
            `;
        }
        if (currentMeta) currentMeta.textContent = 'Loading imagery…';

        try {
            const [setsSnap, singleSnap, orderDoc] = await Promise.all([
                getDocs(collection(db, 'photo_sets')).catch(err => {
                    console.warn('Could not fetch photo_sets for studio picker:', err);
                    return { empty: true, forEach: () => {} };
                }),
                getDocs(collection(db, 'single_shots')).catch(err => {
                    console.warn('Could not fetch single_shots for studio picker:', err);
                    return { empty: true, forEach: () => {} };
                }),
                getDoc(doc(db, 'settings', 'single_shots_order')).catch(() => null)
            ]);

            const sets = [];

            // 1. Process Photoshoot Sets (including archived sets & photos)
            if (setsSnap && !setsSnap.empty) {
                setsSnap.forEach(docSnap => {
                    const data = docSnap.data();
                    const rawUrls = Array.isArray(data.urls) ? data.urls.filter(Boolean) : [];
                    if (rawUrls.length === 0) return;

                    const archivedUrlsList = Array.isArray(data.archivedUrls) ? data.archivedUrls : (Array.isArray(data.archived_photos) ? data.archived_photos : []);
                    const archivedUrlsSet = new Set(archivedUrlsList);
                    const allPhotosArchived = rawUrls.length > 0 && rawUrls.every(u => archivedUrlsSet.has(u));
                    const isSetArchived = Boolean(data.archived === true || allPhotosArchived);

                    // Show newest to oldest
                    const orderedUrls = [...rawUrls].reverse();
                    const name = data.categoryName || data.title || docSnap.id || 'Photoshoot Set';
                    const model = data.modelName && data.modelName !== 'Unknown' && data.modelName !== 'Mixed' && data.modelName !== '/' ? data.modelName.trim() : '';
                    const theme = data.theme || '';
                    const date = data.date || '';

                    const archivedCount = isSetArchived ? orderedUrls.length : orderedUrls.filter(u => archivedUrlsSet.has(u)).length;

                    sets.push({
                        id: docSnap.id,
                        name: name,
                        model: model,
                        theme: theme,
                        date: date,
                        urls: orderedUrls,
                        archivedUrls: archivedUrlsSet,
                        isArchived: isSetArchived,
                        archivedCount: archivedCount,
                        coverUrl: data.coverUrl || orderedUrls[0] || ''
                    });
                });
            }

            // 2. Process Single Shots (including archived single shots)
            if (singleSnap && !singleSnap.empty) {
                const singleItems = [];
                const singleArchivedUrls = new Set();

                singleSnap.forEach(docSnap => {
                    const d = docSnap.data();
                    if (d.url) {
                        singleItems.push(d);
                        if (d.archived === true) {
                            singleArchivedUrls.add(d.url);
                        }
                    }
                });

                const customOrder = (orderDoc && orderDoc.exists() && Array.isArray(orderDoc.data().order)) ? orderDoc.data().order : [];
                const orderMap = new Map();
                customOrder.forEach((url, idx) => orderMap.set(url, idx));

                singleItems.sort((a, b) => {
                    const idxA = orderMap.has(a.url) ? orderMap.get(a.url) : -1;
                    const idxB = orderMap.has(b.url) ? orderMap.get(b.url) : -1;
                    if (idxA !== idxB) {
                        if (idxA === -1) return -1;
                        if (idxB === -1) return 1;
                        return idxA - idxB;
                    }
                    return new Date(b.date || 0) - new Date(a.date || 0);
                });

                const singleUrls = singleItems.map(item => item.url).filter(Boolean);
                if (singleUrls.length > 0) {
                    sets.unshift({
                        id: 'single_shots',
                        name: 'Single Shots',
                        model: 'Editorial Portraits',
                        theme: 'Mixed',
                        date: '',
                        urls: singleUrls,
                        archivedUrls: singleArchivedUrls,
                        isArchived: false,
                        archivedCount: singleArchivedUrls.size,
                        coverUrl: singleUrls[0] || ''
                    });
                }
            }

            // Fallbacks if no database items
            if (sets.length === 0) {
                sets.push(
                    {
                        id: 'fallback_editorial',
                        name: 'Vogue Paris Editorial',
                        model: 'Elena V.',
                        theme: 'Haute Couture',
                        date: '2026-08-14',
                        urls: fallbackImages.slice(0, 4),
                        archivedUrls: new Set(),
                        isArchived: false,
                        archivedCount: 0,
                        coverUrl: fallbackImages[0] || ''
                    },
                    {
                        id: 'fallback_archived_noir',
                        name: 'Haute Couture Monochrome Noir (Archived)',
                        model: 'Anastasia S.',
                        theme: 'Monochrome Film',
                        date: '2026-07-22',
                        urls: fallbackImages.slice(4, 8),
                        archivedUrls: new Set([fallbackImages[4], fallbackImages[5]]),
                        isArchived: true,
                        archivedCount: 4,
                        coverUrl: fallbackImages[4] || ''
                    }
                );
            }

            cachedStudioPhotoSets = sets;
            if (!activeStudioSetId) {
                activeStudioSetId = 'all';
            }
            renderStudioLibraryUI(targetLabel);
        } catch (err) {
            console.error('Failed to load studio photo sets:', err);
            if (photosGrid) {
                photosGrid.innerHTML = `<div style="grid-column:1 / -1; padding:3rem; text-align:center; color:#f87171; font-family:'Inter',sans-serif;">Error connecting to photo library.</div>`;
            }
        }
    };

    function getAllArchivedPhotos() {
        if (!cachedStudioPhotoSets) return [];
        const archivedPhotos = [];
        const seen = new Set();
        cachedStudioPhotoSets.forEach(set => {
            set.urls.forEach(url => {
                if (!url || seen.has(url)) return;
                const isArchived = set.isArchived || (set.archivedUrls && set.archivedUrls.has(url));
                if (isArchived) {
                    seen.add(url);
                    archivedPhotos.push({
                        url: url,
                        setName: set.name,
                        isArchived: true
                    });
                }
            });
        });
        return archivedPhotos;
    }

    function renderStudioLibraryUI(targetLabel) {
        if (!cachedStudioPhotoSets) return;

        const realSets = cachedStudioPhotoSets.filter(s => s.id !== 'single_shots');
        const totalActiveSets = realSets.filter(s => !s.isArchived).length;
        const totalArchivedSets = realSets.filter(s => s.isArchived).length;
        const allArchivedPhotos = getAllArchivedPhotos();
        const totalPhotos = cachedStudioPhotoSets.reduce((sum, s) => sum + (s.urls ? s.urls.length : 0), 0);

        const statsText = document.getElementById('studio-stats-text');
        if (statsText) {
            const prefix = targetLabel ? `Selecting: ${targetLabel} • ` : '';
            statsText.textContent = `${prefix}${totalActiveSets} Active Sets • ${totalArchivedSets} Archived Sets • ${allArchivedPhotos.length} Archived Photos (${totalPhotos} Total)`;
        }

        renderStudioSidebar();
        renderStudioPhotosCanvas();
    }

    window.setStudioArchiveFilter = function (filter) {
        activeStudioArchiveFilter = filter || 'all';

        // Update active tab buttons
        document.querySelectorAll('.studio-filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-filter') === activeStudioArchiveFilter);
        });

        // Smart set switching when filter changes
        if (activeStudioArchiveFilter === 'archived') {
            const currentSet = cachedStudioPhotoSets?.find(s => s.id === activeStudioSetId);
            const hasArchivedInCurrentSet = currentSet && (currentSet.isArchived || currentSet.archivedCount > 0);
            if (!currentSet || !hasArchivedInCurrentSet) {
                activeStudioSetId = 'all_archived';
            }
        } else if (activeStudioArchiveFilter === 'active') {
            const currentSet = cachedStudioPhotoSets?.find(s => s.id === activeStudioSetId);
            if ((currentSet && currentSet.isArchived) || activeStudioSetId === 'all_archived') {
                activeStudioSetId = 'all';
            }
        }

        renderStudioSidebar();
        renderStudioPhotosCanvas();
    };

    function renderStudioSidebar() {
        const list = document.getElementById('studio-sets-list');
        const countBadge = document.getElementById('studio-sidebar-set-count');
        if (!list || !cachedStudioPhotoSets) return;

        const query = activeStudioSearchQuery.toLowerCase();

        // Filter sets by search and archive tab
        const filteredSets = cachedStudioPhotoSets.filter(set => {
            // Tab filter
            if (activeStudioArchiveFilter === 'active' && set.isArchived) return false;
            if (activeStudioArchiveFilter === 'archived' && !set.isArchived && set.archivedCount === 0) return false;

            // Search query
            if (!query) return true;
            const matchesName = (set.name || '').toLowerCase().includes(query);
            const matchesModel = (set.model || '').toLowerCase().includes(query);
            const matchesTheme = (set.theme || '').toLowerCase().includes(query);
            return matchesName || matchesModel || matchesTheme;
        });

        const allArchivedPhotos = getAllArchivedPhotos();

        if (countBadge) {
            if (activeStudioArchiveFilter === 'archived') {
                countBadge.textContent = `${filteredSets.length} archived set${filteredSets.length === 1 ? '' : 's'}`;
            } else if (activeStudioArchiveFilter === 'active') {
                countBadge.textContent = `${filteredSets.length} active set${filteredSets.length === 1 ? '' : 's'}`;
            } else {
                countBadge.textContent = `${filteredSets.length} set${filteredSets.length === 1 ? '' : 's'}`;
            }
        }

        const totalPhotos = cachedStudioPhotoSets.reduce((acc, s) => acc + s.urls.length, 0);

        let html = '';

        // Quick entry items (shown if no restrictive search query)
        if (!query) {
            if (activeStudioArchiveFilter === 'all' || activeStudioArchiveFilter === 'active') {
                const isAllActive = activeStudioSetId === 'all';
                html += `
                    <div class="studio-set-item ${isAllActive ? 'is-active' : ''}" onclick="window.selectStudioSet('all')">
                        <div class="studio-set-item-thumb icon-thumb">✦</div>
                        <div class="studio-set-item-info">
                            <div class="studio-set-item-title">All Studio Photos</div>
                            <div class="studio-set-item-sub">Continuous Portfolio Stream</div>
                        </div>
                        <span class="studio-set-item-badge">${totalPhotos}</span>
                    </div>
                `;
            }

            // Show "All Archived Photos" vault item if archived photos exist
            if (allArchivedPhotos.length > 0 && (activeStudioArchiveFilter === 'all' || activeStudioArchiveFilter === 'archived')) {
                const isArchivedVaultActive = activeStudioSetId === 'all_archived';
                html += `
                    <div class="studio-set-item ${isArchivedVaultActive ? 'is-active' : ''}" onclick="window.selectStudioSet('all_archived')">
                        <div class="studio-set-item-thumb icon-thumb" style="color:#fbbf24; background:rgba(217,119,6,0.12); border-color:rgba(245,158,11,0.35);">📦</div>
                        <div class="studio-set-item-info">
                            <div class="studio-set-item-title" style="${isArchivedVaultActive ? 'color:#fbbf24;' : ''}">All Archived Photos</div>
                            <div class="studio-set-item-sub">Vault Collection (${allArchivedPhotos.length} photos)</div>
                        </div>
                        <span class="studio-set-item-badge badge-archived">${allArchivedPhotos.length}</span>
                    </div>
                `;
            }
        }

        if (filteredSets.length === 0) {
            html += `
                <div style="padding: 2.5rem 1rem; text-align: center; color: #7e8ba3; font-family: 'Inter', sans-serif; font-size: 0.72rem;">
                    ${activeStudioArchiveFilter === 'archived' ? 'No archived photoshoot sets match this criteria.' : `No photoshoot sets match "${escapeHtml(activeStudioSearchQuery)}".`}
                </div>
            `;
        } else {
            filteredSets.forEach(set => {
                const isActive = activeStudioSetId === set.id;
                const displayName = (set.name && set.name.trim() !== '-' && set.name.trim() !== '') ? set.name : (set.model ? `Photoshoot • ${set.model}` : 'Editorial Set');
                const modelPart = set.model ? `Model: ${escapeHtml(set.model)}` : (set.theme ? escapeHtml(set.theme) : `${set.urls.length} photos`);
                const subtitle = set.isArchived ? `📦 Archived Set • ${modelPart}` : modelPart;

                const badgeHtml = set.isArchived
                    ? `<span class="studio-set-item-badge badge-archived">ARCHIVED (${set.urls.length})</span>`
                    : (set.archivedCount > 0
                        ? `<span class="studio-set-item-badge">${set.urls.length} (${set.archivedCount} 📦)</span>`
                        : `<span class="studio-set-item-badge">${set.urls.length}</span>`);

                html += `
                    <div class="studio-set-item ${isActive ? 'is-active' : ''} ${set.isArchived ? 'is-archived-item' : ''}" onclick="window.selectStudioSet('${escapeHtml(set.id)}')">
                        <img src="${escapeHtml(set.coverUrl || '/_images/theme_main.jpg')}" alt="${escapeHtml(displayName)}" class="studio-set-item-thumb" loading="lazy">
                        <div class="studio-set-item-info">
                            <div class="studio-set-item-title">${escapeHtml(displayName)}</div>
                            <div class="studio-set-item-sub">${subtitle}</div>
                        </div>
                        ${badgeHtml}
                    </div>
                `;
            });
        }

        list.innerHTML = html;
    }

    function renderStudioPhotosCanvas() {
        const grid = document.getElementById('studio-photos-grid');
        const titleEl = document.getElementById('studio-current-set-title');
        const metaEl = document.getElementById('studio-current-set-meta');
        if (!grid || !cachedStudioPhotoSets) return;

        // Apply grid density class
        grid.className = `studio-photos-grid ${activeStudioGridDensity === 'compact' ? 'density-compact' : (activeStudioGridDensity === 'large' ? 'density-large' : '')}`;

        let photosToDisplay = [];
        let currentSetName = 'All Studio Photos';
        let currentSetMeta = '';

        const query = activeStudioSearchQuery.toLowerCase();

        if (query) {
            // When searching, find matching photos across all sets (respecting archive filter)
            currentSetName = `Search: "${escapeHtml(activeStudioSearchQuery)}"`;
            cachedStudioPhotoSets.forEach(set => {
                if (activeStudioArchiveFilter === 'active' && set.isArchived) return;
                if (activeStudioArchiveFilter === 'archived' && !set.isArchived && set.archivedCount === 0) return;
                const matchesSet = (set.name || '').toLowerCase().includes(query) || (set.model || '').toLowerCase().includes(query) || (set.theme || '').toLowerCase().includes(query);
                set.urls.forEach(u => {
                    const isPhotoArchived = set.isArchived || (set.archivedUrls && set.archivedUrls.has(u));
                    if (activeStudioArchiveFilter === 'active' && isPhotoArchived) return;
                    if (activeStudioArchiveFilter === 'archived' && !isPhotoArchived) return;
                    if (matchesSet || u.toLowerCase().includes(query)) {
                        photosToDisplay.push({
                            url: u,
                            setName: set.name,
                            isArchived: isPhotoArchived
                        });
                    }
                });
            });
            currentSetMeta = `${photosToDisplay.length} matching photos found across sets`;
        } else if (activeStudioSetId === 'all_archived') {
            currentSetName = 'All Archived Imagery';
            photosToDisplay = getAllArchivedPhotos();
            currentSetMeta = `Archived Vault • ${photosToDisplay.length} Total Hidden & Archived Photographs`;
        } else if (activeStudioSetId === 'all') {
            currentSetName = 'All Studio Photos';
            cachedStudioPhotoSets.forEach(set => {
                if (activeStudioArchiveFilter === 'active' && set.isArchived) return;
                if (activeStudioArchiveFilter === 'archived' && !set.isArchived && set.archivedCount === 0) return;
                set.urls.forEach(u => {
                    const isPhotoArchived = set.isArchived || (set.archivedUrls && set.archivedUrls.has(u));
                    if (activeStudioArchiveFilter === 'active' && isPhotoArchived) return;
                    if (activeStudioArchiveFilter === 'archived' && !isPhotoArchived) return;
                    photosToDisplay.push({
                        url: u,
                        setName: set.name,
                        isArchived: isPhotoArchived
                    });
                });
            });
            currentSetMeta = `Studio Archive • ${photosToDisplay.length} High-Resolution Photographs`;
        } else {
            const found = cachedStudioPhotoSets.find(s => s.id === activeStudioSetId);
            if (found) {
                currentSetName = (found.name && found.name.trim() !== '-' && found.name.trim() !== '') ? found.name : (found.model ? `Photoshoot • ${found.model}` : 'Editorial Set');
                const modelPart = found.model ? `Model: ${found.model} • ` : '';
                const themePart = found.theme ? `Theme: ${found.theme} • ` : '';
                const archivePart = found.isArchived ? '📦 ARCHIVED SET • ' : '';

                found.urls.forEach(u => {
                    const isPhotoArchived = found.isArchived || (found.archivedUrls && found.archivedUrls.has(u));
                    if (activeStudioArchiveFilter === 'active' && isPhotoArchived) return;
                    if (activeStudioArchiveFilter === 'archived' && !isPhotoArchived) return;
                    photosToDisplay.push({
                        url: u,
                        setName: found.name,
                        isArchived: isPhotoArchived
                    });
                });

                currentSetMeta = `${archivePart}${modelPart}${themePart}${photosToDisplay.length} Photographs`;
            } else {
                currentSetName = 'Photoshoot Set';
                currentSetMeta = 'No photos available';
            }
        }

        if (titleEl) titleEl.textContent = currentSetName;
        if (metaEl) metaEl.textContent = currentSetMeta;

        if (photosToDisplay.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; color: #7e8ba3; font-family: 'Inter', sans-serif;">
                    <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">No photographs found in this collection.</p>
                    <p style="font-size: 0.72rem; color: #64748b;">Try clearing your search query or selecting another set from the sidebar.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = photosToDisplay.map(({ url, setName, isArchived }) => {
            const isSelected = activeStudioSelectedUrl === url;
            return `
                <div class="studio-photo-card ${isSelected ? 'is-selected' : ''} ${isArchived ? 'is-archived' : ''}"
                     data-photo-url="${escapeHtml(url)}"
                     data-photo-set="${escapeHtml(setName)}"
                     data-photo-archived="${isArchived ? 'true' : 'false'}"
                     onclick="window.chooseStudioPhoto('${escapeHtml(url)}', '${escapeHtml(setName)}', false)"
                     ondblclick="window.chooseStudioPhoto('${escapeHtml(url)}', '${escapeHtml(setName)}', true)">
                    <img src="${escapeHtml(url)}" alt="${escapeHtml(setName)}" loading="lazy">
                    ${isArchived ? '<div class="studio-photo-card-archived-tag">📦 ARCHIVED</div>' : ''}
                    <div class="studio-photo-card-check">✓</div>
                    <div class="studio-photo-hover-tag">${isArchived ? '📦 Archived • Double-click to apply' : 'Double-click to apply'}</div>
                </div>
            `;
        }).join('');
    }

    window.selectStudioSet = function (setId) {
        activeStudioSetId = setId;
        renderStudioSidebar();
        renderStudioPhotosCanvas();

        // On mobile, switch view to canvas
        const body = document.querySelector('.studio-picker-body');
        if (body) body.classList.add('view-canvas');
    };

    window.switchStudioMobileView = function (view) {
        const body = document.querySelector('.studio-picker-body');
        if (body) {
            if (view === 'sidebar') {
                body.classList.remove('view-canvas');
            } else {
                body.classList.add('view-canvas');
            }
        }
    };

    window.filterStudioLibrarySets = function (query) {
        activeStudioSearchQuery = query || '';
        const clearBtn = document.getElementById('studio-search-clear-btn');
        if (clearBtn) {
            clearBtn.style.display = activeStudioSearchQuery ? 'block' : 'none';
        }
        renderStudioSidebar();
        renderStudioPhotosCanvas();
    };

    window.clearStudioSearch = function () {
        const searchInput = document.getElementById('studio-library-search');
        if (searchInput) searchInput.value = '';
        window.filterStudioLibrarySets('');
    };

    window.setStudioGridDensity = function (density) {
        activeStudioGridDensity = density || 'normal';
        document.querySelectorAll('.studio-density-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-density') === activeStudioGridDensity);
        });
        const grid = document.getElementById('studio-photos-grid');
        if (grid) {
            grid.className = `studio-photos-grid ${activeStudioGridDensity === 'compact' ? 'density-compact' : (activeStudioGridDensity === 'large' ? 'density-large' : '')}`;
        }
    };

    window.chooseStudioPhoto = function (url, setName, isDoubleClick = false) {
        activeStudioSelectedUrl = url;
        activeStudioSelectedSetName = setName || '';

        // Update active highlight on cards
        document.querySelectorAll('.studio-photo-card').forEach(card => {
            const cardUrl = card.getAttribute('data-photo-url');
            card.classList.toggle('is-selected', cardUrl === url);
        });

        updateStudioFooterSelection();

        if (isDoubleClick) {
            window.confirmStudioSelection();
        }
    };

    function updateStudioFooterSelection() {
        const previewContainer = document.getElementById('studio-selected-preview');
        const applyBtn = document.getElementById('studio-apply-selection-btn');
        if (!previewContainer) return;

        if (!activeStudioSelectedUrl) {
            previewContainer.innerHTML = `<span class="studio-no-selection-hint">Click a photo to select • Double-click to apply immediately</span>`;
            if (applyBtn) {
                applyBtn.disabled = true;
                applyBtn.style.opacity = '0.4';
                applyBtn.style.cursor = 'not-allowed';
            }
            return;
        }

        const card = document.querySelector(`.studio-photo-card[data-photo-url="${activeStudioSelectedUrl}"]`);
        const setName = activeStudioSelectedSetName || (card ? card.getAttribute('data-photo-set') : 'Studio Photo');
        const isArchived = card ? card.getAttribute('data-photo-archived') === 'true' : false;

        previewContainer.innerHTML = `
            <img src="${escapeHtml(activeStudioSelectedUrl)}" alt="Selected preview" class="studio-selected-preview-img">
            <div class="studio-selected-preview-info">
                <div class="studio-selected-preview-title">
                    Selected Photo from "${escapeHtml(setName)}"
                    ${isArchived ? '<span style="color:#fbbf24; font-size:0.65rem; margin-left:0.35rem;">[📦 ARCHIVED]</span>' : ''}
                </div>
                <div class="studio-selected-preview-desc">Ready to apply to active element</div>
            </div>
        `;

        if (applyBtn) {
            applyBtn.disabled = false;
            applyBtn.style.opacity = '1';
            applyBtn.style.cursor = 'pointer';
        }
    }

    window.confirmStudioSelection = function () {
        if (!activeStudioSelectedUrl) return;
        const url = activeStudioSelectedUrl;
        const setName = activeStudioSelectedSetName;
        selectImage(url, setName);
    };

    window.closeStudioGalleryModal = function () {
        const modal = document.getElementById('studio-gallery-modal');
        if (modal) modal.classList.remove('is-open');
        document.body.classList.remove('picker-open');
        document.body.style.overflow = '';
        activeSlotIndex = -1;
    };

    window.handleModalImageUpload = function (event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const status = document.getElementById('upload-status-indicator');
        if (status) status.textContent = 'Processing local image...';

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            activeStudioSelectedUrl = dataUrl;
            activeStudioSelectedSetName = file.name || 'Local Upload';
            if (status) status.textContent = '';
            window.confirmStudioSelection();
            showToast('Local image uploaded and applied ✓');
        };
        reader.onerror = () => {
            if (status) status.textContent = 'Failed to load file';
            showToast('Failed to read image file');
        };
        reader.readAsDataURL(file);
    };

    // Close on Escape or Backdrop Click
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('studio-gallery-modal');
            if (modal && modal.classList.contains('is-open')) {
                window.closeStudioGalleryModal();
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('studio-picker-backdrop')) {
            window.closeStudioGalleryModal();
        }
    });

    window.openPicker = openPicker;
    window.openStudioGalleryModal = openPicker;

    const selectImage = async (url, setName = '') => {
        if (activeSlotIndex === 'hero') {
            try {
                if (heroImg) {
                    heroImg.src = url;
                }
                setCachedData('home_hero_image', url);
                window.closeStudioGalleryModal();

                // Save to Firestore in settings/home_gallery
                const settingsRef = doc(db, 'settings', 'home_gallery');
                await setDoc(settingsRef, { heroImage: url }, { merge: true });
                showToast('Hero cover image updated ✓');
            } catch (err) {
                console.error('Failed to save hero image:', err);
                showToast('Error saving hero image.');
            }
            return;
        }

        if (activeSlotIndex === 'profile') {
            try {
                if (profileImg) {
                    profileImg.src = url;
                }
                setCachedData('home_profile_image', url);
                window.closeStudioGalleryModal();

                // Save to Firestore in settings/home_gallery
                const settingsRef = doc(db, 'settings', 'home_gallery');
                await setDoc(settingsRef, { profileImage: url }, { merge: true });
                showToast('Profile photo updated ✓');
            } catch (err) {
                console.error('Failed to save profile image:', err);
                showToast('Error saving profile image.');
            }
            return;
        }

        if (typeof activeSlotIndex !== 'number' || activeSlotIndex < 0) return;
        try {
            gallerySlots[activeSlotIndex].url = url;
            gallerySlots[activeSlotIndex].setName = setName || urlToSetNameMap.get(url) || 'CURATED SELECTION';
            setCachedData('home_gallery_slots', gallerySlots);
            renderGallerySlots();
            window.closeStudioGalleryModal();

            // Save to Firestore
            const settingsRef = doc(db, 'settings', 'home_gallery');
            const snap = await getDoc(settingsRef);
            if (snap.exists()) {
                await updateDoc(settingsRef, { slots: gallerySlots });
            } else {
                await setDoc(settingsRef, { slots: gallerySlots });
            }
            showToast(`Gallery slot #${activeSlotIndex + 1} updated ✓`);
        } catch (err) {
            console.error('Failed to save gallery slot:', err);
            showToast('Error saving image.');
        }
    };

    // Always load the gallery (reads from Firestore or uses fallback)
    loadGallerySlots();

    // --- Firebase Authentication Logic ---

    // Combined auth state: update UI buttons + admin status + gallery
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            localStorage.setItem('zhukov_logged_in', 'true');
            try {
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                currentIsAdmin = userSnap.exists() && userSnap.data().role === 'admin';
                if (currentIsAdmin) {
                    localStorage.setItem('zhukov_is_admin', 'true');
                } else {
                    localStorage.removeItem('zhukov_is_admin');
                }
            } catch {
                currentIsAdmin = false;
                localStorage.removeItem('zhukov_is_admin');
            }
        } else {
            localStorage.removeItem('zhukov_logged_in');
            localStorage.removeItem('zhukov_is_admin');
            currentIsAdmin = false;
        }
        if (window.updateHeaderAuthState) {
            window.updateHeaderAuthState(user, currentIsAdmin);
        }
        renderGallerySlots();
        if (heroEditBtn) {
            heroEditBtn.style.display = currentIsAdmin ? 'flex' : 'none';
        }
        if (profileEditBtn) {
            profileEditBtn.style.display = currentIsAdmin ? 'flex' : 'none';
        }
    });

    // Delegated Login / Logout button click handlers
    document.addEventListener('click', (e) => {
        if (e.target.closest('#login-btn-header')) {
            localStorage.setItem('zhukov_logged_in', 'true');
            signInWithPopup(auth, provider).then(async (result) => {
                const user = result.user;
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    if (!userSnap.exists()) {
                        await setDoc(userRef, {
                            role: 'user',
                            email: user.email,
                            createdAt: new Date().toISOString()
                        });
                    }
                } catch (dbError) {
                    console.error("Error checking/creating user role in database: ", dbError);
                }
            }).catch((error) => {
                console.error("Error signing in: ", error.code, error.message);
                alert("Failed to sign in: " + error.message + "\n\n(Error code: " + error.code + ")");
            });
        }

        if (e.target.closest('#logout-btn')) {
            localStorage.removeItem('zhukov_logged_in');
            localStorage.removeItem('zhukov_is_admin');
            currentIsAdmin = false;
            if (heroEditBtn) heroEditBtn.style.display = 'none';
            if (profileEditBtn) profileEditBtn.style.display = 'none';
            renderGallerySlots();
            signOut(auth).catch((error) => {
                console.error("Error signing out: ", error);
            });
        }
    });

    // =========================================================================
    // Directions / Disciplines Image Preview Slider (Question mark -> Close X)
    // =========================================================================
    const disciplineCards = document.querySelectorAll('.discipline-card');
    disciplineCards.forEach((card) => {
        const toggleBtn = card.querySelector('.discipline-toggle-btn');
        const overlay = card.querySelector('.discipline-image-overlay');

        if (!toggleBtn) return;

        const togglePreview = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            const isActive = card.classList.contains('preview-active');
            if (isActive) {
                card.classList.remove('preview-active');
                toggleBtn.setAttribute('aria-expanded', 'false');
                toggleBtn.setAttribute('title', 'Preview image');
                if (overlay) overlay.setAttribute('aria-hidden', 'true');
            } else {
                card.classList.add('preview-active');
                toggleBtn.setAttribute('aria-expanded', 'true');
                toggleBtn.setAttribute('title', 'Close preview');
                if (overlay) overlay.setAttribute('aria-hidden', 'false');
            }
        };

        toggleBtn.addEventListener('click', togglePreview);

        // Clicking on the overlay image also slides it closed
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (card.classList.contains('preview-active')) {
                    card.classList.remove('preview-active');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                    toggleBtn.setAttribute('title', 'Preview image');
                    overlay.setAttribute('aria-hidden', 'true');
                }
            });
        }
    });

    // Close preview on Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.discipline-card.preview-active').forEach((card) => {
                card.classList.remove('preview-active');
                const btn = card.querySelector('.discipline-toggle-btn');
                const overlay = card.querySelector('.discipline-image-overlay');
                if (btn) {
                    btn.setAttribute('aria-expanded', 'false');
                    btn.setAttribute('title', 'Preview image');
                }
                if (overlay) overlay.setAttribute('aria-hidden', 'true');
            });
        }
    });
});



// ============================================
// Cloth Overscroll Portal → Navigate to Photoshoots
// ============================================
(function initClothPortal() {
    const portal   = document.getElementById('overscroll-portal');
    const canvas   = document.getElementById('overscroll-canvas');
    const label    = document.getElementById('overscroll-label');
    const appContent = document.getElementById('app-content');
    if (!portal || !canvas || !appContent) return;

    const ctx = canvas.getContext('2d');

    // ── Tuning ────────────────────────────────────────────────────────────
    const CANVAS_H        = 280;   // px headroom (matches CSS height)
    const TRIGGER_THRESHOLD = 200; // accumulated overscroll to trigger nav
    const MAX_PULL        = 240;   // max canvas peak height in px
    const RESISTANCE      = 0.36;  // scrolling spring factor (lower = more pull needed)

    let overscrollAmount = 0;
    let navigating = false;

    // ── Hi-DPI canvas setup ───────────────────────────────────────────────
    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = window.innerWidth * dpr;
        canvas.height = CANVAS_H * dpr;
        ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener('resize', () => { resizeCanvas(); drawCloth(overscrollAmount); });

    // ── Draw cloth shape ──────────────────────────────────────────────────
    const drawCloth = (peakPx) => {
        const W = window.innerWidth;
        const H = CANVAS_H;
        ctx.clearRect(0, 0, W, H);
        if (peakPx <= 1) return;

        // Tip of the mountain (from top of canvas)
        const tipY = H - peakPx;

        // ── Mountain path ─────────────────────────────────────────────────
        // Wide base: anchors at screen left & right edges
        // Sharp central peak, gentle curved sides (like the sketch)
        const path = new Path2D();
        path.moveTo(-20, H + 10);
        path.bezierCurveTo(
            W * 0.18, H + 5,       // far left: stays low
            W * 0.43, tipY + 12,   // sweeps up steeply near center
            W * 0.5,  tipY         // sharp peak tip
        );
        path.bezierCurveTo(
            W * 0.57, tipY + 12,   // mirror
            W * 0.82, H + 5,       // far right: stays low
            W + 20,   H + 10
        );
        path.lineTo(W + 20, H + 40);
        path.lineTo(-20, H + 40);
        path.closePath();

        // ── Drop shadow above the mountain edge ───────────────────────────
        ctx.save();
        ctx.shadowColor   = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur    = 28;
        ctx.shadowOffsetY = -12;

        // Solid dark fill — matching site bg but slightly lighter for the mountain body
        const grad = ctx.createLinearGradient(W / 2, tipY, W / 2, H);
        grad.addColorStop(0,   'rgba(22, 32, 52, 0.97)');   // slightly lighter than bg at peak
        grad.addColorStop(0.35,'rgba(17, 25, 42, 0.97)');
        grad.addColorStop(1,   'rgba(15, 23, 42, 0.97)');   // exact site bg at base
        ctx.fillStyle = grad;
        ctx.fill(path);
        ctx.restore();

        // ── Thin crease line along the mountain silhouette ────────────────
        ctx.beginPath();
        ctx.moveTo(-20, H + 10);
        ctx.bezierCurveTo(W * 0.18, H + 5, W * 0.43, tipY + 12, W * 0.5, tipY);
        ctx.bezierCurveTo(W * 0.57, tipY + 12, W * 0.82, H + 5, W + 20, H + 10);
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
        ctx.lineWidth   = 1;
        ctx.stroke();

        // ── Inner depth crease (second cloth fold from sketch) ────────────
        const tipY2 = H - peakPx * 0.82;
        ctx.beginPath();
        ctx.moveTo(W * 0.04, H + 8);
        ctx.bezierCurveTo(W * 0.22, H + 3, W * 0.44, tipY2 + 10, W * 0.5, tipY2);
        ctx.bezierCurveTo(W * 0.56, tipY2 + 10, W * 0.78, H + 3, W * 0.96, H + 8);
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
        ctx.lineWidth   = 0.8;
        ctx.stroke();

        // ── Label: arrow + text BELOW the peak tip (inside mountain) ─────
        const progress = Math.min(1, peakPx / TRIGGER_THRESHOLD);
        // Place label 30px below the tip (inside the mountain body)
        const labelBottom = peakPx - 34;
        if (label) {
            label.style.bottom  = Math.max(2, labelBottom) + 'px';
            label.style.opacity = Math.max(0, (progress - 0.2) / 0.8).toFixed(3);
        }
    };


    // ── Page warp (content slides up slightly as cloth pulls) ────────────
    const applyWarp = (peakPx) => {
        const warp = peakPx * 0.18;
        appContent.style.transition = 'none';
        appContent.style.transform  = `translateY(${-warp.toFixed(1)}px)`;
    };

    const releasePull = () => {
        // Animate overscrollAmount back to 0 smoothly
        if (overscrollAmount <= 0) return;
        const startVal = overscrollAmount;
        const startTime = performance.now();
        const SPRING_DUR = 550; // ms

        const spring = (now) => {
            const t = Math.min(1, (now - startTime) / SPRING_DUR);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - t, 3);
            overscrollAmount = startVal * (1 - ease);
            drawCloth(overscrollAmount);
            label.style.opacity = '0';
            appContent.style.transition = 'none';
            appContent.style.transform  = `translateY(${-(overscrollAmount * 0.18).toFixed(1)}px)`;
            if (t < 1 && !navigating) requestAnimationFrame(spring);
            else if (t >= 1) {
                overscrollAmount = 0;
                appContent.style.transform = 'translateY(0)';
            }
        };
        requestAnimationFrame(spring);
    };

    const triggerNavigation = () => {
        navigating = true;
        // Stretch peak to max quickly, then fade out and navigate
        const startVal = overscrollAmount;
        const startTime = performance.now();
        const SNAP_DUR  = 220;
        const snap = (now) => {
            const t = Math.min(1, (now - startTime) / SNAP_DUR);
            const ease = 1 - Math.pow(1 - t, 2);
            const cur = startVal + (MAX_PULL - startVal) * ease;
            drawCloth(cur);
            appContent.style.transform = `translateY(${-(cur * 0.18).toFixed(1)}px)`;
            if (t < 1) { requestAnimationFrame(snap); return; }
            // Then slide current page up & navigate (photoshoots will slide in from below)
            setTimeout(() => {
                sessionStorage.setItem('zhukov_overscroll_nav', '1');
                document.documentElement.style.transition = 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease';
                document.documentElement.style.transform = 'translateY(-40px)';
                document.documentElement.style.opacity = '0';
                setTimeout(() => { window.location.href = '/photoshoots/'; }, 360);
            }, 80);
        };
        requestAnimationFrame(snap);
    };

    // ── Core pull accumulator ─────────────────────────────────────────────
    const isAtBottom = () =>
        (window.innerHeight + window.scrollY) >= document.body.scrollHeight - 2;

    const pull = (rawDelta) => {
        if (navigating) return;
        if (!isAtBottom()) { if (overscrollAmount > 0) releasePull(); return; }

        overscrollAmount = Math.min(MAX_PULL, overscrollAmount + rawDelta * RESISTANCE);
        if (overscrollAmount < 0) overscrollAmount = 0;

        drawCloth(overscrollAmount);
        applyWarp(overscrollAmount);

        if (overscrollAmount >= TRIGGER_THRESHOLD) triggerNavigation();
    };

    // ── Wheel / trackpad ──────────────────────────────────────────────────
    let wheelTimer = null;
    window.addEventListener('wheel', (e) => {
        if (navigating) return;
        clearTimeout(wheelTimer);
        if (isAtBottom() && e.deltaY > 0) {
            pull(e.deltaY);
        } else if (overscrollAmount > 0) {
            releasePull();
        }
        wheelTimer = setTimeout(() => { if (!navigating) releasePull(); }, 160);
    }, { passive: true });

    // ── Touch ─────────────────────────────────────────────────────────────
    let touchLastY = 0;
    window.addEventListener('touchstart', (e) => {
        touchLastY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (navigating) return;
        const y = e.touches[0].clientY;
        const delta = touchLastY - y; // positive = scrolling down
        touchLastY = y;
        if (isAtBottom() && delta > 0) pull(delta * 2.5);
        else if (overscrollAmount > 0 && delta < 0) pull(-delta * 0.5);
    }, { passive: true });

    window.addEventListener('touchend', () => {
        if (!navigating) releasePull();
    }, { passive: true });
})();

// ==========================================================================
// Global Image Protection (Disable right click & dragging on images)
// ==========================================================================
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG' || e.target.closest('img') || e.target.closest('.gallery-item') || e.target.closest('.fan-card') || e.target.closest('.process-image-container')) {
        e.preventDefault();
        return false;
    }
}, { capture: true });

document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG' || e.target.closest('img')) {
        e.preventDefault();
        return false;
    }
}, { capture: true });

