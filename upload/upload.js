import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";
import { invalidateCache } from "../site-cache.js";
import { CLOUDFLARE_WORKER_URL } from "../cloudflare-storage.js";

// Initialize Firebase Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const loginBtn = document.getElementById('login-btn-header');
    const logoutBtn = document.getElementById('logout-btn');
    const authWarning = document.getElementById('auth-warning');
    const uploadSection = document.getElementById('upload-section');

    const dropZone = document.getElementById('drop-zone');
    const imageInput = document.getElementById('image-input');
    const previewContainer = document.getElementById('preview-container');
    const uploadBtn = document.getElementById('upload-btn');
    const statusMsg = document.getElementById('status-msg');

    const categoryInput = document.getElementById('category-input');
    const modelInput = document.getElementById('model-input');
    const themeInput = document.getElementById('theme-input');
    const descInput = document.getElementById('desc-input');
    const adultInput = document.getElementById('adult-input');

    const categoryList = document.getElementById('category-list');
    const modelList = document.getElementById('model-list');
    const themeList = document.getElementById('theme-list');

    let selectedFiles = [];

    // --- Fetch Metadata (Tags) ---
    const loadMetadata = async () => {
        try {
            const tagsRef = doc(db, 'metadata', 'tags');
            const tagsSnap = await getDoc(tagsRef);

            if (tagsSnap.exists()) {
                const data = tagsSnap.data();

                if (data.categories) {
                    data.categories.forEach(cat => {
                        if (cat !== 'Single Shots') {
                            const opt = document.createElement('option');
                            opt.value = cat;
                            categoryList.appendChild(opt);
                        }
                    });
                }

                if (data.models) {
                    data.models.forEach(model => {
                        const opt = document.createElement('option');
                        opt.value = model;
                        modelList.appendChild(opt);
                    });
                }

                if (data.themes) {
                    data.themes.forEach(theme => {
                        const opt = document.createElement('option');
                        opt.value = theme;
                        themeList.appendChild(opt);
                    });
                }
            }
        } catch (error) {
            console.error("Error loading metadata:", error);
        }
    };

    const updateMetadata = async (category, model, theme) => {
        try {
            const tagsRef = doc(db, 'metadata', 'tags');
            const updates = {};

            if (category && category !== 'Single Shots') {
                updates.categories = arrayUnion(category);
            }
            if (model) {
                updates.models = arrayUnion(model);
            }
            if (theme) {
                updates.themes = arrayUnion(theme);
            }

            if (Object.keys(updates).length > 0) {
                await setDoc(tagsRef, updates, { merge: true });
            }
        } catch (error) {
            console.error("Error updating metadata:", error);
        }
    };

    // --- Firebase Authentication & Role Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            localStorage.setItem('zhukov_logged_in', 'true');
            let isAdmin = false;
            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists() && userSnap.data().role === 'admin') {
                    isAdmin = true;
                    if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, true);
                    authWarning.classList.add('hidden');
                    uploadSection.classList.remove('hidden');
                    loadMetadata();
                } else {
                    if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, false);
                    authWarning.classList.remove('hidden');
                    authWarning.innerHTML = `
                        <h2>Access Denied</h2>
                        <p style="color: #ff6b6b; margin-top: 1rem;">You do not have administrator privileges to access this page.</p>
                    `;
                    uploadSection.classList.add('hidden');
                }
            } catch (error) {
                console.error("Error checking role:", error);
                if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, false);
                authWarning.innerHTML = `<p style="color: #ff6b6b;">Error checking permissions.</p>`;
            }
        } else {
            localStorage.removeItem('zhukov_logged_in');
            if (window.updateHeaderAuthState) window.updateHeaderAuthState(null, false);
            authWarning.classList.remove('hidden');
            uploadSection.classList.add('hidden');
        }
    });

    // Delegated click listeners for header auth buttons
    document.addEventListener('click', (e) => {
        const loginTarget = e.target.closest('#login-btn-header');
        if (loginTarget) {
            localStorage.setItem('zhukov_logged_in', 'true');
            signInWithPopup(auth, provider).catch(console.error);
        }

        const logoutTarget = e.target.closest('#logout-btn');
        if (logoutTarget) {
            localStorage.removeItem('zhukov_logged_in');
            signOut(auth).catch(console.error);
        }
    });

    // --- Image Processing (Resize & WebP) ---
    const processImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Max dimension 1920 (1080p equivalent)
                    const MAX_DIMENSION = 1920;

                    if (width > height) {
                        if (width > MAX_DIMENSION) {
                            height = Math.round(height *= MAX_DIMENSION / width);
                            width = MAX_DIMENSION;
                        }
                    } else {
                        if (height > MAX_DIMENSION) {
                            width = Math.round(width *= MAX_DIMENSION / height);
                            height = MAX_DIMENSION;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to WebP Blob at 85% quality
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/webp', 0.85);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // --- Upload UI Interactions ---

    const handleFiles = (files) => {
        const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (validFiles.length === 0) {
            statusMsg.innerHTML = '<span class="error">Please select valid image files.</span>';
            return;
        }

        selectedFiles = [...selectedFiles, ...validFiles];

        // Render thumbnails
        previewContainer.innerHTML = '';
        dropZone.querySelector('p').style.display = 'none';

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });

        uploadBtn.disabled = false;
        statusMsg.innerHTML = '';
    };

    dropZone.addEventListener('click', (e) => {
        // Prevent click if clicking on thumbnails
        if (e.target.tagName !== 'IMG') imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFiles(e.target.files);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });

    // --- Upload Logic ---
    uploadBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        const category = categoryInput.value.trim() || 'Single Shots';
        const modelName = modelInput.value.trim();
        const theme = themeInput.value.trim();
        const description = descInput ? descInput.value.trim() : '';
        const isAdult = adultInput ? Boolean(adultInput.checked) : false;
        const date = new Date().toISOString();

        uploadBtn.disabled = true;

        try {
            const uploadedUrls = [];
            const workerUrl = CLOUDFLARE_WORKER_URL;

            // Process and Upload Sequentially
            for (let i = 0; i < selectedFiles.length; i++) {
                statusMsg.innerHTML = `<span style="color: #60a5fa;">Processing & Uploading ${i + 1} of ${selectedFiles.length}...</span>`;

                // 1. Process Image to WebP
                const webpBlob = await processImage(selectedFiles[i]);

                // 2. Upload to Cloudflare R2 via Worker
                const safePrefix = category.replace(/[^a-zA-Z0-9_-]/g, '_');
                const uniqueFileName = `${safePrefix}_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}.webp`;
                const formData = new FormData();
                formData.append('image', webpBlob, uniqueFileName);

                const uploadRes = await fetch(workerUrl, {
                    method: 'POST',
                    body: formData
                });

                const uploadResult = await uploadRes.json();

                if (!uploadRes.ok || !uploadResult.success) {
                    throw new Error(uploadResult.error || `Failed to upload image ${i + 1}`);
                }

                uploadedUrls.push(uploadResult.data.url);
            }

            statusMsg.innerHTML = `<span style="color: #60a5fa;">Saving references to Firebase...</span>`;

            // 3. Save to Firestore
            if (category === 'Single Shots') {
                const singleShotsRef = collection(db, 'single_shots');
                for (let j = 0; j < uploadedUrls.length; j++) {
                    statusMsg.innerHTML = `<span style="color: #60a5fa;">Saving reference ${j + 1} of ${uploadedUrls.length} to database...</span>`;
                    await addDoc(singleShotsRef, {
                        url: uploadedUrls[j], modelName, theme, description, date,
                        isAdult: isAdult,
                        uploadedAt: date,
                        uploadedBy: auth.currentUser.uid
                    });
                }

                // Prepend newly uploaded URLs to single_shots_order setting so they are placed at the top of the gallery
                try {
                    const orderRef = doc(db, 'settings', 'single_shots_order');
                    const orderSnap = await getDoc(orderRef).catch(() => null);
                    if (orderSnap && orderSnap.exists()) {
                        const currentOrder = Array.isArray(orderSnap.data().order) ? orderSnap.data().order : [];
                        const newOrder = [...uploadedUrls, ...currentOrder.filter(u => !uploadedUrls.includes(u))];
                        await setDoc(orderRef, { order: newOrder }, { merge: true });
                    } else {
                        await setDoc(orderRef, { order: uploadedUrls }, { merge: true });
                    }
                } catch (orderErr) {
                    console.warn("Could not update single_shots_order on upload:", orderErr);
                }
            } else {
                // Sanitize category to create a valid Firestore document ID (no slashes allowed)
                const docId = category.replace(/[\/\\]/g, '-');
                const photoSetRef = doc(db, 'photo_sets', docId);

                // In photo sets, galleries display images using rawUrls.reverse() (newest to oldest).
                // Reversing the uploaded batch before arrayUnion ensures that the first uploaded
                // image is placed at index 0 (the top of the gallery), followed by subsequent images.
                const reversedBatch = [...uploadedUrls].reverse();

                // 1. Save base photoshoot metadata
                const baseData = {
                    categoryName: category,
                    modelName,
                    theme,
                    date,
                    uploadedAt: date,
                    uploadedBy: auth.currentUser.uid
                };
                if (isAdult) {
                    baseData.isAdult = true;
                }
                if (description) {
                    baseData.description = description;
                }
                await setDoc(photoSetRef, baseData, { merge: true });

                // 2. Append URLs in safe chunks of 20 to prevent Firestore batch or field transform limits
                const CHUNK_SIZE = 20;
                const totalChunks = Math.ceil(reversedBatch.length / CHUNK_SIZE);
                for (let c = 0; c < totalChunks; c++) {
                    const chunk = reversedBatch.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
                    statusMsg.innerHTML = `<span style="color: #60a5fa;">Saving batch ${c + 1} of ${totalChunks} to database...</span>`;
                    const chunkUpdate = {
                        urls: arrayUnion(...chunk)
                    };
                    if (isAdult) {
                        chunkUpdate.adultUrls = arrayUnion(...chunk);
                    }
                    await setDoc(photoSetRef, chunkUpdate, { merge: true });
                }
            }

            // 4. Update metadata tags
            await updateMetadata(category, modelName, theme);

            // Invalidate cached photoshoots so fresh uploads appear immediately
            invalidateCache('photoshoots');
            invalidateCache('gallery');
            invalidateCache('archived');

            // Success!
            statusMsg.innerHTML = '<span class="success">All photos successfully uploaded and saved!</span>';

            // Reset form
            setTimeout(() => {
                selectedFiles = [];
                previewContainer.innerHTML = '';
                dropZone.querySelector('p').style.display = 'block';
                uploadBtn.disabled = true;
                uploadBtn.innerText = 'Upload Photo';
                statusMsg.innerHTML = '';
                categoryInput.value = '';
                modelInput.value = '';
                themeInput.value = '';
                if (descInput) descInput.value = '';
                if (adultInput) adultInput.checked = false;
            }, 3000);

        } catch (error) {
            console.error("Upload error:", error);
            statusMsg.innerHTML = `<span class="error">Error: ${error.message}</span>`;
            uploadBtn.disabled = false;
            uploadBtn.innerText = 'Retry Upload';
        }
    });
});

