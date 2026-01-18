import { initializeApp } from "firebase/app";
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

// Firebase Auth (safe on all platforms)
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// ============================================================================
// LAZY-LOADED WEB-ONLY EXPORTS
// Firebase Messaging and Analytics are NOT supported on native Capacitor.
// They require service workers which don't exist in native WebViews.
// These are initialized lazily only when explicitly requested on web.
// ============================================================================

let _messaging = null;
let _analytics = null;

/**
 * Get Firebase Messaging instance (web only).
 * Returns null on native platforms.
 * Must be called lazily, NOT at module import time.
 */
export async function getMessagingInstance() {
  // Guard: only initialize on web
  if (typeof window === 'undefined') return null;
  
  // Check if we're in a native Capacitor environment
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      return null;
    }
  } catch {
    // If Capacitor isn't available, we're likely on web
  }

  // Guard: service workers required for messaging
  if (!('serviceWorker' in navigator)) return null;

  if (!_messaging) {
    try {
      const { getMessaging, isSupported } = await import('firebase/messaging');
      const supported = await isSupported();
      if (supported) {
        _messaging = getMessaging(firebaseApp);
      }
    } catch (err) {
      console.warn('[Firebase] Messaging initialization failed:', err.message);
      return null;
    }
  }
  return _messaging;
}

/**
 * Get Firebase Analytics instance (web only).
 * Returns null on native platforms or if unsupported.
 */
export async function getAnalyticsInstance() {
  // Guard: only initialize on web
  if (typeof window === 'undefined') return null;

  // Check if we're in a native Capacitor environment
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      return null;
    }
  } catch {
    // If Capacitor isn't available, we're likely on web
  }

  if (!_analytics) {
    try {
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      const supported = await isSupported();
      if (supported) {
        _analytics = getAnalytics(firebaseApp);
      }
    } catch (err) {
      console.warn('[Firebase] Analytics initialization failed:', err.message);
      return null;
    }
  }
  return _analytics;
}

// DEPRECATED: These synchronous exports are kept for backward compatibility
// but will return null. Use getMessagingInstance() and getAnalyticsInstance() instead.
export const messaging = null;
export const analytics = null;
