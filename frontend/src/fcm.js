// fcm.js
// Firebase Cloud Messaging token request utility - WEB ONLY
// This module should only be used on web platforms.

import { Capacitor } from '@capacitor/core';

/**
 * Request an FCM token for web push notifications.
 * MUST only be called on web platform.
 * @returns {Promise<string>} FCM token
 * @throws {Error} If called on native platform or permission denied
 */
export async function requestFcmToken() {
  // Guard: Never run on native platforms
  if (Capacitor.isNativePlatform()) {
    throw new Error('FCM web tokens are not supported on native platforms');
  }

  // Guard: Notification API required
  if (!('Notification' in window)) {
    throw new Error('Notification API not supported');
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }

  // Dynamically import Firebase messaging
  const { getMessagingInstance } = await import('./firebase');
  const messaging = await getMessagingInstance();

  if (!messaging) {
    throw new Error('Firebase Messaging not available on this platform');
  }

  const { getToken } = await import('firebase/messaging');
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
  });

  if (!token) {
    throw new Error("Failed to generate FCM token");
  }

  return token;
}
