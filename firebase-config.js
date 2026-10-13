import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Your web app's Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyDSPuTqwyQp3-0nMe5raYhRmJTWAQb65N0",
    authDomain: "zhukovphotograpy.firebaseapp.com",
    projectId: "zhukovphotograpy",
    storageBucket: "zhukovphotograpy.firebasestorage.app",
    messagingSenderId: "119677592324",
    appId: "1:119677592324:web:97f8b86a123d07a11ba651",
    measurementId: "G-NZFRW735QB"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Initialize Firestore with robust local persistent cache (IndexedDB across tabs)
let firestoreInstance;
try {
    firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
} catch (e) {
    console.warn("Firestore persistent local cache fallback:", e);
    firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

// Check whether a user has access to any moodboards (admin or shared collaborator)
export async function checkUserHasMoodboards(user, currentIsAdmin) {
    if (!user) {
        localStorage.removeItem('zhukov_has_moodboards');
        if (window.updateHeaderAuthState) window.updateHeaderAuthState(null, false, false);
        return false;
    }
    if (currentIsAdmin) {
        localStorage.setItem('zhukov_has_moodboards', 'true');
        if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, true, true);
        return true;
    }
    try {
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        const snap = await getDocs(collection(db, 'moodboards'));
        const userEmail = (user.email || '').toLowerCase();
        let has = false;
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const trusted = data.trustedUsers || [];
            const emails = (data.trustedEmails || []).map(e => (e || '').toLowerCase());
            if (trusted.includes(user.uid) || emails.includes(userEmail) || data.creatorUid === user.uid || (data.creatorEmail && data.creatorEmail.toLowerCase() === userEmail)) {
                has = true;
            }
        });
        if (has) {
            localStorage.setItem('zhukov_has_moodboards', 'true');
        } else {
            localStorage.removeItem('zhukov_has_moodboards');
        }
        if (window.updateHeaderAuthState) {
            window.updateHeaderAuthState(user, false, has);
        }
        return has;
    } catch (e) {
        console.warn("Could not check moodboard permissions:", e);
        const cached = localStorage.getItem('zhukov_has_moodboards') === 'true';
        if (window.updateHeaderAuthState) window.updateHeaderAuthState(user, false, cached);
        return cached;
    }
}

if (typeof window !== 'undefined') {
    window.checkUserHasMoodboards = checkUserHasMoodboards;
}