import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, collection, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { app, db } from "../firebase-config.js";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- DOM Refs ---
const loginBtn      = document.getElementById('login-btn-header');
const logoutBtn     = document.getElementById('logout-btn');
const uploadLink    = document.getElementById('upload-nav-link');
const archivedLink  = document.getElementById('archived-nav-link');
const accessDenied  = document.getElementById('access-denied');
const loadingMsg    = document.getElementById('loading-msg');
const archivedGrid  = document.getElementById('archived-grid');
const archivedEmpty = document.getElementById('archived-empty');

// --- Helpers ---
function showState(state) {
    // state: 'loading' | 'denied' | 'empty' | 'grid' | 'error'
    accessDenied.style.display  = 'none';
    loadingMsg.style.display    = 'none';
    archivedGrid.style.display  = 'none';
    archivedEmpty.style.display = 'none';

    if (state === 'loading') {
        loadingMsg.style.color   = '#94a3b8';
        loadingMsg.textContent   = 'Loading archived sets...';
        loadingMsg.style.display = 'block';
    } else if (state === 'denied') {
        accessDenied.style.display = 'block';
    } else if (state === 'empty') {
        archivedEmpty.style.display = 'block';
    } else if (state === 'grid') {
        archivedGrid.style.display = 'grid';
    } else if (state === 'error') {
        loadingMsg.style.color   = '#ff4d4d';
        loadingMsg.style.display = 'block';
    }
}

// Start in loading state until auth resolves
showState('loading');
loadingMsg.textContent = 'Checking access...';

// --- Load Archived Sets ---
async function loadArchivedSets() {
    showState('loading');

    try {
        const snap = await getDocs(collection(db, 'photo_sets'));
        const archivedDocs = [];

        snap.forEach(docSnap => {
            if (docSnap.data().archived === true) {
                archivedDocs.push(docSnap);
            }
        });

        if (archivedDocs.length === 0) {
            showState('empty');
            return;
        }

        showState('grid');
        archivedGrid.innerHTML = '';
        archivedDocs.forEach(docSnap => {
            archivedGrid.appendChild(buildCard(docSnap.id, docSnap.data()));
        });

    } catch (err) {
        console.error('Error loading archived sets:', err);
        showState('error');
        loadingMsg.textContent = 'Error: ' + (err.message || err);
    }
}

// --- Build card element ---
function buildCard(setId, data) {
    const categoryName = data.categoryName || setId;
    const modelName    = data.modelName    || 'Unknown';
    const theme        = data.theme        || 'None';
    const photoCount   = Array.isArray(data.urls) ? data.urls.length : 0;
    const displayDate  = data.date ? new Date(data.date).toLocaleDateString() : 'No date';
    const thumbUrl     = Array.isArray(data.urls) && data.urls.length > 0
        ? data.urls[data.urls.length - 1]
        : null;

    const card = document.createElement('div');
    card.className = 'archived-card';

    const thumbHTML = thumbUrl
        ? `<img class="archived-card-thumb" src="${thumbUrl}" alt="${categoryName}" loading="lazy">`
        : `<div class="archived-card-thumb" style="background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;color:#475569;font-size:2.5rem;">&#x1F4F7;</div>`;

    card.innerHTML = `
        ${thumbHTML}
        <div class="archived-card-body">
            <div class="archived-card-title">${categoryName}</div>
            <div class="archived-card-meta">${modelName} &bull; ${theme} &bull; ${displayDate} &bull; ${photoCount} photo${photoCount !== 1 ? 's' : ''}</div>
            <div class="archived-card-actions">
                <button class="unarchive-category-btn" data-action="unarchive">&#x2705; Unarchive</button>
                <a href="/photoshoots/gallery.html?id=${encodeURIComponent(setId)}" class="archive-category-btn" style="text-decoration:none;display:inline-flex;align-items:center;padding:0.3rem 0.8rem;">&#x1F441; View</a>
                <button class="delete-category-btn" data-action="delete">Delete</button>
            </div>
        </div>
    `;

    card.querySelector('[data-action="unarchive"]').addEventListener('click', async () => {
        if (!confirm(`Restore "${categoryName}" to the public gallery?`)) return;
        try {
            await updateDoc(doc(db, 'photo_sets', setId), { archived: false });
            card.remove();
            if (archivedGrid.children.length === 0) showState('empty');
        } catch (err) {
            console.error('Unarchive error:', err);
            alert('Error unarchiving set: ' + err.message);
        }
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`Permanently delete "${categoryName}"? This cannot be undone.`)) return;
        try {
            await deleteDoc(doc(db, 'photo_sets', setId));
            card.remove();
            if (archivedGrid.children.length === 0) showState('empty');
        } catch (err) {
            console.error('Delete error:', err);
            alert('Error deleting set: ' + err.message);
        }
    });

    return card;
}

// --- Auth ---
loginBtn.addEventListener('click', () => {
    localStorage.setItem('zhukov_logged_in', 'true');
    signInWithPopup(auth, provider).catch(err => console.error(err));
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('zhukov_logged_in');
    signOut(auth).catch(err => console.error(err));
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        localStorage.setItem('zhukov_logged_in', 'true');

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                if (uploadLink)   uploadLink.classList.remove('hidden');
                if (archivedLink) archivedLink.classList.remove('hidden');
                loadArchivedSets();
            } else {
                showState('denied');
            }
        } catch (err) {
            console.error('Auth check error:', err);
            showState('error');
            loadingMsg.textContent = 'Auth error: ' + (err.message || err);
        }
    } else {
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        localStorage.removeItem('zhukov_logged_in');
        showState('denied');
    }
});
