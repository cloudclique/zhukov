import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "./firebase-config.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Static list of images found in the pictures directory.
const images = [
    'PRN00237.jpg',
    '_DSC0006.jpg',
    '_DSC0192.jpg',
    '_DSC0205.jpg',
    '_DSC0245-3.jpg',
    '_DSC0393.jpg'
];
const basePath = '/pictures/';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const loginBtn = document.getElementById('login-btn-header');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Gallery Elements
    const gallery = document.getElementById('gallery');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close');

    // Generate gallery items (only happens once)
    let galleryGenerated = false;
    const generateGallery = async () => {
        if (galleryGenerated || !gallery) return;
        
        let allImages = [];

        // 1. Add static images
        images.forEach(imageName => {
            allImages.push(`${basePath}${imageName}`);
        });

        // 2. Fetch dynamic images from Firestore
        try {
            const photosSnapshot = await getDocs(collection(db, 'photos'));
            photosSnapshot.forEach(doc => {
                const photoData = doc.data();
                if (photoData.url) {
                    allImages.push(photoData.url);
                }
            });
        } catch (error) {
            console.error("Error fetching dynamic photos:", error);
        }

        // 3. Render all images
        allImages.forEach((imgUrl, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.style.animationDelay = `${index * 0.1}s`;

            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = `Portfolio Image ${index + 1}`;
            img.loading = 'lazy';

            item.appendChild(img);
            gallery.appendChild(item);

            // Lightbox logic
            item.addEventListener('click', () => {
                if (!lightbox) return;
                lightbox.style.display = 'flex';
                setTimeout(() => {
                    lightbox.classList.add('show');
                    lightboxImg.src = img.src;
                }, 10);
            });
        });
        galleryGenerated = true;
    };

    // Always generate the gallery so it's visible without login
    generateGallery();

    // Lightbox close logic
    const closeLightbox = () => {
        if (!lightbox) return;
        lightbox.classList.remove('show');
        setTimeout(() => {
            lightbox.style.display = 'none';
            lightboxImg.src = '';
        }, 300);
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', closeLightbox);
    }
    
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (lightbox && e.key === 'Escape' && lightbox.classList.contains('show')) {
            closeLightbox();
        }
    });

    // --- Firebase Authentication Logic ---

    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in.
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
        } else {
            // User is signed out.
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
        }
    });

    // Login button click handler
    loginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider).then(async (result) => {
            const user = result.user;
            
            try {
                // Reference to the user's document
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                
                // If the user document doesn't exist, this is a new signup
                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        role: 'user',
                        email: user.email,
                        createdAt: new Date().toISOString()
                    });
                    console.log("New user registered and assigned 'user' role.");
                } else {
                    console.log("Existing user signed in.");
                }
            } catch (dbError) {
                console.error("Error checking/creating user role in database: ", dbError);
                // Even if db write fails (e.g. permission issues), they are logged in via Auth.
                // The firestore rules will simply block their database access.
            }
        }).catch((error) => {
            console.error("Error signing in: ", error.code, error.message);
            alert("Failed to sign in: " + error.message + "\n\n(Error code: " + error.code + ")");
        });
    });

    // Logout button click handler
    logoutBtn.addEventListener('click', () => {
        signOut(auth).catch((error) => {
            console.error("Error signing out: ", error);
        });
    });
});
