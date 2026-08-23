import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";

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
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');

            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists() && userSnap.data().role === 'admin') {
                    authWarning.classList.add('hidden');
                    uploadSection.classList.remove('hidden');
                    loadMetadata();
                } else {
                    authWarning.classList.remove('hidden');
                    authWarning.innerHTML = `
                        <h2>Access Denied</h2>
                        <p style="color: #ff6b6b; margin-top: 1rem;">You do not have administrator privileges to access this page.</p>
                    `;
                    uploadSection.classList.add('hidden');
                }
            } catch (error) {
                console.error("Error checking role:", error);
                authWarning.innerHTML = `<p style="color: #ff6b6b;">Error checking permissions.</p>`;
            }
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            authWarning.classList.remove('hidden');
            uploadSection.classList.add('hidden');
        }
    });

    loginBtn.addEventListener('click', () => signInWithPopup(auth, provider).catch(console.error));
    logoutBtn.addEventListener('click', () => signOut(auth).catch(console.error));

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
        const date = new Date().toISOString();

        uploadBtn.disabled = true;

        try {
            const uploadedUrls = [];
            const workerUrl = 'https://long-sky-4aa4.dener4826.workers.dev';

            // Process and Upload Sequentially
            for (let i = 0; i < selectedFiles.length; i++) {
                statusMsg.innerHTML = `<span style="color: #60a5fa;">Processing & Uploading ${i + 1} of ${selectedFiles.length}...</span>`;

                // 1. Process Image to WebP
                const webpBlob = await processImage(selectedFiles[i]);

                // 2. Upload to ImgBB via Worker
                const formData = new FormData();
                formData.append('image', webpBlob, `image_${i}.webp`);

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
                for (const url of uploadedUrls) {
                    await addDoc(singleShotsRef, {
                        url, modelName, theme, date,
                        uploadedAt: date,
                        uploadedBy: auth.currentUser.uid
                    });
                }
            } else {
                const photoSetRef = doc(db, 'photo_sets', category);
                await setDoc(photoSetRef, {
                    categoryName: category,
                    modelName,
                    theme,
                    date,
                    urls: arrayUnion(...uploadedUrls),
                    uploadedAt: date,
                    uploadedBy: auth.currentUser.uid
                }, { merge: true });
            }

            // 4. Update metadata tags
            await updateMetadata(category, modelName, theme);

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
            }, 3000);

        } catch (error) {
            console.error("Upload error:", error);
            statusMsg.innerHTML = `<span class="error">Error: ${error.message}</span>`;
            uploadBtn.disabled = false;
            uploadBtn.innerText = 'Retry Upload';
        }
    });
});
