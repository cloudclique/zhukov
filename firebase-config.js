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