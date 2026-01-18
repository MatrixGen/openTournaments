// push/webPush.js
// Web-only push notifications via Firebase Cloud Messaging
// This module should ONLY be imported/called on web platforms.

import { Capacitor } from '@capacitor/core';

/**
 * Initialize web push notifications using Firebase Cloud Messaging.
 * MUST only be called on web platform - will safely exit on native.
 * @param {Function} onTokenReceived - Callback with FCM token
 */
export async function initWebPush(onTokenReceived) {
  // Guard: Never run on native platforms
  if (Capacitor.isNativePlatform()) {
    console.warn('[WebPush] Attempted to init on native platform - skipping');
    return;
  }

  // Guard: Service workers required
  if (!('serviceWorker' in navigator)) {
    console.warn('[WebPush] Service workers not supported');
    return;
  }

  // Guard: Notification API required
  if (!('Notification' in window)) {
    console.warn('[WebPush] Notification API not supported');
    return;
  }

  try {
    // Check current permission first
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[WebPush] Notification permission not granted');
        return;
      }
    }

    // Dynamically import Firebase messaging to avoid loading on native
    const { getMessagingInstance } = await import('../../firebase');
    const messaging = await getMessagingInstance();
    
    if (!messaging) {
      console.warn('[WebPush] Firebase Messaging not available');
      return;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');

    // Get the FCM token
    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      onTokenReceived(token);
    } else {
      console.warn('[WebPush] Failed to get FCM token');
    }
  } catch (err) {
    console.error('[WebPush] Initialization failed:', err);
  }
}
