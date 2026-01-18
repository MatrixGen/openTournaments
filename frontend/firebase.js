import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAHAh2MVXKaUdf1MNqU9_rr5WMiA7QGO7k",
  authDomain: "ot-arena.firebaseapp.com",
  projectId: "ot-arena",
  storageBucket: "ot-arena.firebasestorage.app",
  messagingSenderId: "900088485172",
  appId: "1:900088485172:web:74208d00885445d12d4161",
  measurementId: "G-E9MXKQY0ZM"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const messaging = getMessaging(firebaseApp);
export const analytics = getAnalytics(firebaseApp);

// Firebase Auth
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
