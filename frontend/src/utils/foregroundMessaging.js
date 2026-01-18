// foregroundMessaging.js
// Web-only foreground message handler for Firebase Cloud Messaging.
// This module should ONLY be called on web platforms.

import { Capacitor } from '@capacitor/core';

/**
 * Initialize foreground message handling for web push notifications.
 * MUST only be called on web platform - will safely exit on native.
 */
export async function initForegroundMessaging() {
  // Guard: Never run on native platforms
  if (Capacitor.isNativePlatform()) {
    console.warn('[FCM] Foreground messaging not supported on native - skipping');
    return;
  }

  // Guard: Notification API required
  if (!('Notification' in window)) {
    console.warn('[FCM] Notification API not supported');
    return;
  }

  try {
    // Dynamically import Firebase messaging
    const { getMessagingInstance } = await import('../../firebase');
    const messaging = await getMessagingInstance();

    if (!messaging) {
      console.warn('[FCM] Firebase Messaging not available');
      return;
    }

    const { onMessage } = await import('firebase/messaging');

    onMessage(messaging, (payload) => {
      console.log("[FCM][FOREGROUND] Message received:", payload);

      const title = payload.notification?.title || payload.data?.title || "Update";
      const body = payload.notification?.body || payload.data?.body || "";

      console.log("[FCM] permission:", Notification.permission);
      console.log("[FCM] about to show:", { title, body });

      if (Notification.permission !== "granted") {
        console.warn("[FCM] Notifications not granted");
        return;
      }

      if (!body && !title) {
        console.warn("[FCM] Empty notification content");
        return;
      }

      try {
        const n = new Notification(title, { body });
        n.onshow = () => console.log("[FCM] notification shown");
        n.onerror = (e) => console.error("[FCM] notification error", e);
      } catch (e) {
        console.error("[FCM] new Notification threw:", e);
      }
    });
  } catch (err) {
    console.error('[FCM] Failed to initialize foreground messaging:', err);
  }
}
