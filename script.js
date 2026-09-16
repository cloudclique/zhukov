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
    if (cachedHero && heroImg) {
        heroImg.src = cachedHero;
    }

    // Instant Cache Render for Profile Image (0ms delay)
    const cachedProfile = getCachedData('home_profile_image');
    if (cachedProfile && profileImg) {
        profileImg.src = cachedProfile;
    }

    if (localStorage.getItem('zhukov_logged_in') === 'true') {
        if (heroEditBtn) heroEditBtn.style.display = 'flex';
        if (profileEditBtn) profileEditBtn.style.display = 'flex';
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

    // --- Editorial Fine-Art Lightbox Logic ---
    let activeOriginImg = null;

    let lastLightboxOpenTime = 0;

    const openLightbox = (imgElement, setName = 'EDITORIAL ARCHIVE') => {
        if (!lightbox || !lightboxImg) return;
        lastLightboxOpenTime = Date.now();
        activeOriginImg = imgElement;
        document.body.classList.add('lightbox-open');
        
        lightboxImg.src = imgElement.src;
        if (lightboxSetName) {
            lightboxSetName.textContent = (setName || 'EDITORIAL ARCHIVE').toUpperCase();
        }
        
        lightbox.style.display = 'flex';
        requestAnimationFrame(() => {
            lightbox.classList.add('show');
        });
    };

    const closeLightbox = (force = false) => {
        if (!lightbox) return;
        if (!force && Date.now() - lastLightboxOpenTime < 350) return;
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

    // --- Image Picker Popup ---
    const pickerOverlay = document.getElementById('picker-overlay');
    const pickerBody = document.getElementById('picker-body');
    const pickerCloseBtn = document.getElementById('picker-close-btn');
    let activeSlotIndex = -1;
    let pickerLoaded = false;

    const openPicker = async (slotIndex) => {
        if (!pickerOverlay) return;
        activeSlotIndex = slotIndex;
        const pickerTitle = pickerOverlay.querySelector('.picker-title');
        if (pickerTitle) {
            if (slotIndex === 'hero') {
                pickerTitle.textContent = 'Choose hero cover image — hold for 2 seconds to select';
            } else if (slotIndex === 'profile') {
                pickerTitle.textContent = 'Choose profile photo — hold for 2 seconds to select';
            } else {
                pickerTitle.textContent = 'Choose an image — hold for 2 seconds to select';
            }
        }
        document.body.classList.add('picker-open');
        pickerOverlay.style.display = 'flex';
        requestAnimationFrame(() => pickerOverlay.classList.add('show'));
        document.body.style.overflow = 'hidden';

        if (!pickerLoaded) {
            await loadPickerContent();
            pickerLoaded = true;
        }
    };

    const closePicker = () => {
        if (!pickerOverlay) return;
        pickerOverlay.classList.remove('show');
        document.body.classList.remove('picker-open');
        setTimeout(() => {
            pickerOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }, 350);
        activeSlotIndex = -1;
    };

    if (pickerCloseBtn) pickerCloseBtn.addEventListener('click', closePicker);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pickerOverlay && pickerOverlay.classList.contains('show')) closePicker();
    });

    const loadPickerContent = async () => {
        if (!pickerBody) return;
        pickerBody.innerHTML = '<div style="color:#64748b;font-family:Inter,sans-serif;padding:2rem;">Loading sets…</div>';

        try {
            const setsSnap = await getDocs(collection(db, 'photo_sets'));
            pickerBody.innerHTML = '';

            if (setsSnap.empty) {
                pickerBody.innerHTML = '<div style="color:#64748b;font-family:Inter,sans-serif;">No photoshoots found.</div>';
                return;
            }

            setsSnap.forEach(setDoc => {
                const data = setDoc.data();
                const urls = data.urls || [];
                if (!urls.length) return;
                const setName = data.categoryName || 'Untitled Set';

                const setDiv = document.createElement('div');
                setDiv.className = 'picker-set';

                const titleEl = document.createElement('div');
                titleEl.className = 'picker-set-title';
                titleEl.innerHTML = `<span class="toggle-icon">▶</span>${setName} <span style="color:#475569;font-weight:400;font-size:0.8rem;">${urls.length} photos</span>`;

                const imagesDiv = document.createElement('div');
                imagesDiv.className = 'picker-set-images';

                // Toggle expand/collapse
                titleEl.addEventListener('click', () => {
                    titleEl.classList.toggle('expanded');
                    imagesDiv.classList.toggle('show');
                });

                // Build thumbnails with origin set name (newest to oldest to match gallery display)
                [...urls].reverse().forEach(url => {
                    const wrap = createPickerThumb(url, setName);
                    imagesDiv.appendChild(wrap);
                });

                setDiv.appendChild(titleEl);
                setDiv.appendChild(imagesDiv);
                pickerBody.appendChild(setDiv);
            });

            // Also add single shots section
            const [singleSnap, orderDoc] = await Promise.all([
                getDocs(collection(db, 'single_shots')),
                getDoc(doc(db, 'settings', 'single_shots_order')).catch(() => null)
            ]);
            if (!singleSnap.empty) {
                const setDiv = document.createElement('div');
                setDiv.className = 'picker-set';
                const titleEl = document.createElement('div');
                titleEl.className = 'picker-set-title';
                titleEl.innerHTML = `<span class="toggle-icon">▶</span>Single Shots`;
                const imagesDiv = document.createElement('div');
                imagesDiv.className = 'picker-set-images';
                titleEl.addEventListener('click', () => {
                    titleEl.classList.toggle('expanded');
                    imagesDiv.classList.toggle('show');
                });

                const customOrder = (orderDoc && orderDoc.exists() && Array.isArray(orderDoc.data().order)) ? orderDoc.data().order : [];
                const orderMap = new Map();
                customOrder.forEach((url, idx) => orderMap.set(url, idx));

                const singleDocs = [];
                singleSnap.forEach(d => {
                    if (d.data().url) singleDocs.push(d.data());
                });

                singleDocs.sort((a, b) => {
                    const idxA = orderMap.has(a.url) ? orderMap.get(a.url) : -1;
                    const idxB = orderMap.has(b.url) ? orderMap.get(b.url) : -1;
                    if (idxA !== idxB) {
                        if (idxA === -1) return -1;
                        if (idxB === -1) return 1;
                        return idxA - idxB;
                    }
                    return new Date(b.date || 0) - new Date(a.date || 0);
                });

                singleDocs.forEach(d => {
                    imagesDiv.appendChild(createPickerThumb(d.url, 'SINGLE SHOTS'));
                });
                setDiv.appendChild(titleEl);
                setDiv.appendChild(imagesDiv);
                pickerBody.appendChild(setDiv);
            }

        } catch (err) {
            console.error('Failed to load picker content:', err);
            pickerBody.innerHTML = '<div style="color:#f87171;font-family:Inter,sans-serif;">Error loading images.</div>';
        }
    };

    const createPickerThumb = (url, setName = '') => {
        const wrap = document.createElement('div');
        wrap.className = 'picker-img-wrap';

        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.loading = 'lazy';

        // Hold ring overlay
        const ring = document.createElement('div');
        ring.className = 'hold-ring';
        ring.innerHTML = `
            <div class="hold-overlay"></div>
            <svg viewBox="0 0 48 48">
                <circle class="ring-bg" cx="24" cy="24" r="22"/>
                <circle class="ring-fill" cx="24" cy="24" r="22"/>
            </svg>`;

        wrap.appendChild(img);
        wrap.appendChild(ring);

        // Long-press logic (mouse + touch)
        let holdTimer = null;
        let holdStarted = false;

        const startHold = (e) => {
            if (e.type === 'mousedown' && e.button !== 0) return;
            e.preventDefault();
            holdStarted = true;

            // Reset and re-trigger animation cleanly without breaking DOM references
            ring.classList.remove('active');
            void ring.offsetWidth;
            ring.classList.add('active');

            clearTimeout(holdTimer);
            holdTimer = setTimeout(async () => {
                if (!holdStarted) return;
                ring.classList.remove('active');
                await selectImage(url, setName);
            }, 2000);
        };

        const cancelHold = () => {
            if (!holdStarted) return;
            holdStarted = false;
            clearTimeout(holdTimer);
            ring.classList.remove('active');
        };

        wrap.addEventListener('mousedown', startHold);
        wrap.addEventListener('mouseup', cancelHold);
        wrap.addEventListener('mouseleave', cancelHold);
        wrap.addEventListener('touchstart', startHold, { passive: false });
        wrap.addEventListener('touchend', cancelHold);
        wrap.addEventListener('touchcancel', cancelHold);
        // Prevent context menu on long-press mobile
        wrap.addEventListener('contextmenu', e => e.preventDefault());

        return wrap;
    };

    const selectImage = async (url, setName = '') => {
        if (activeSlotIndex === 'hero') {
            try {
                if (heroImg) {
                    heroImg.src = url;
                }
                setCachedData('home_hero_image', url);
                closePicker();

                // Save to Firestore in settings/home_gallery
                const settingsRef = doc(db, 'settings', 'home_gallery');
                await setDoc(settingsRef, { heroImage: url }, { merge: true });
            } catch (err) {
                console.error('Failed to save hero image:', err);
                alert('Error saving hero image. Please try again.');
            }
            return;
        }

        if (activeSlotIndex === 'profile') {
            try {
                if (profileImg) {
                    profileImg.src = url;
                }
                setCachedData('home_profile_image', url);
                closePicker();

                // Save to Firestore in settings/home_gallery
                const settingsRef = doc(db, 'settings', 'home_gallery');
                await setDoc(settingsRef, { profileImage: url }, { merge: true });
            } catch (err) {
                console.error('Failed to save profile image:', err);
                alert('Error saving profile image. Please try again.');
            }
            return;
        }

        if (typeof activeSlotIndex !== 'number' || activeSlotIndex < 0) return;
        try {
            gallerySlots[activeSlotIndex].url = url;
            gallerySlots[activeSlotIndex].setName = setName || urlToSetNameMap.get(url) || 'CURATED SELECTION';
            setCachedData('home_gallery_slots', gallerySlots);
            renderGallerySlots();
            closePicker();

            // Save to Firestore
            const settingsRef = doc(db, 'settings', 'home_gallery');
            const snap = await getDoc(settingsRef);
            if (snap.exists()) {
                await updateDoc(settingsRef, { slots: gallerySlots });
            } else {
                await setDoc(settingsRef, { slots: gallerySlots });
            }
        } catch (err) {
            console.error('Failed to save gallery slot:', err);
            alert('Error saving image. Please try again.');
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
            } catch { currentIsAdmin = false; }
        } else {
            localStorage.removeItem('zhukov_logged_in');
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

