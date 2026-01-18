// push/index.js
// Platform-aware push notification initialization
// Ensures native and web paths are strictly separated to prevent crashes.

import { Capacitor } from '@capacitor/core';
import { initNativePush, initNativePushHandlers } from './nativePush';
// NOTE: webPush is dynamically imported below to avoid loading Firebase on native

/**
 * Initialize push notifications based on platform.
 * Native: Uses Capacitor PushNotifications plugin
 * Web: Uses Firebase Cloud Messaging (loaded dynamically)
 * @param {Function} onTokenReceived - Callback with push token
 */
export function initPushNotifications(onTokenReceived) {
  const platform = Capacitor.getPlatform();

  if (platform === 'android' || platform === 'ios') {
    // Native: Use Capacitor push notifications
    initNativePush(onTokenReceived);
  } else if (platform === 'web') {
    // Web: Dynamically import to avoid loading Firebase messaging on native
    import('./webPush')
      .then(({ initWebPush }) => {
        initWebPush(onTokenReceived);
      })
      .catch((err) => {
        console.error('[Push] Failed to load web push module:', err);
      });
  }
}

/**
 * Initialize Android push notification handlers (foreground notifications, tap actions).
 * Only runs on Android - returns no-op cleanup function on other platforms.
 * @param {Object} options - Handler options
 * @param {Function} options.onNotificationAction - Callback for notification tap with deep link
 * @returns {Function} Cleanup function to remove listeners
 */
export function initAndroidPushHandlers(options = {}) {
  const platform = Capacitor.getPlatform();

  if (platform === 'android') {
    return initNativePushHandlers(options);
  }

  // Return no-op cleanup for non-Android platforms
  return () => {};
}
