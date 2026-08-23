// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
export const db = getFirestore(app);