// push/nativePush.js
// Native push notifications for Capacitor (Android/iOS)
// Uses Capacitor PushNotifications and LocalNotifications plugins.

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

const ANDROID_CHANNEL_ID = 'ot_arena_default';

async function ensureAndroidChannel() {
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    await LocalNotifications.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: 'OT Arena',
      description: 'General notifications',
      importance: 4,
    });
  } catch (err) {
    console.warn('[Push][Android] Failed to create notification channel:', err);
  }
}

async function ensureLocalNotificationPermission() {
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    const perms = await LocalNotifications.checkPermissions();
    if (perms.display === 'granted') return;

    const request = await LocalNotifications.requestPermissions();
    if (request.display !== 'granted') {
      console.warn('[Push][Android] Local notifications permission not granted');
    }
  } catch (err) {
    console.warn('[Push][Android] Failed to check/request permissions:', err);
  }
}

function extractNotificationData(notification) {
  return notification?.data || {};
}

function buildDeepLink(data) {
  if (!data) return null;
  const type = String(
    data.related_entity_type || data.entity_type || data.type || ''
  ).toLowerCase();
  const id = data.related_entity_id || data.entity_id || data.id;

  if (!type || !id) return null;

  if (type === 'tournament') return `/tournaments/${id}`;
  if (type === 'match') return `/matches/${id}`;
  return null;
}

function getNotificationContent(notification, data) {
  const title =
    notification?.title || data?.title || 'OT Arena Notification';
  const body = notification?.body || data?.body || '';
  return { title, body };
}

async function showForegroundNotification(notification) {
  const data = extractNotificationData(notification);
  const { title, body } = getNotificationContent(notification, data);

  if (!title && !body) return;

  await ensureAndroidChannel();
  await ensureLocalNotificationPermission();

  const parsedId = Number.parseInt(data.notification_id, 10);
  const notificationId = Number.isFinite(parsedId)
    ? parsedId
    : Math.floor(Date.now() % 1000000);

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title,
          body,
          channelId: ANDROID_CHANNEL_ID,
          extra: data,
        },
      ],
    });
  } catch (err) {
    console.error('[Push][Android] Failed to schedule local notification:', err);
  }
}

/**
 * Initialize native push notifications and request permissions.
 * Sets up token registration listeners.
 * @param {Function} onTokenReceived - Callback with push token
 */
export async function initNativePush(onTokenReceived) {
  try {
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== 'granted') {
      console.warn('[Push][Android] Push permission not granted');
      return;
    }

    // Await listener registration to avoid Capacitor warnings
    await PushNotifications.addListener('registration', (token) => {
      console.log('[Push][Android] Registration token:', token.value);
      onTokenReceived(token.value);
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push][Android] Registration error:', err);
    });

    // Register for push after listeners are set up
    await PushNotifications.register();
  } catch (err) {
    console.error('[Push][Android] Init failed:', err);
  }
}

/**
 * Initialize native push notification handlers for foreground notifications
 * and notification tap actions.
 * @param {Object} options - Handler options
 * @param {Function} options.onNotificationAction - Callback for notification tap with deep link
 * @returns {Function} Cleanup function to remove listeners
 */
export async function initNativePushHandlers({ onNotificationAction } = {}) {
  if (Capacitor.getPlatform() !== 'android') return () => {};

  // Ensure channel and permissions are set up
  await ensureAndroidChannel();
  await ensureLocalNotificationPermission();

  // Store listener handles for cleanup
  // Await each addListener to avoid Capacitor warnings
  const receivedListener = await PushNotifications.addListener(
    'pushNotificationReceived',
    async (notification) => {
      console.log('[Push][Android] Received:', notification);
      await showForegroundNotification(notification);
    }
  );

  const actionListener = await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (event) => {
      const data = extractNotificationData(event?.notification);
      const target = buildDeepLink(data);
      console.log('[Push][Android] Action:', { data, target });

      if (target && onNotificationAction) {
        onNotificationAction(target);
      }
    }
  );

  const localActionListener = await LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (event) => {
      const data = event?.notification?.extra || {};
      const target = buildDeepLink(data);
      console.log('[Push][Android] Local action:', { data, target });

      if (target && onNotificationAction) {
        onNotificationAction(target);
      }
    }
  );

  // Return cleanup function
  return () => {
    receivedListener?.remove();
    actionListener?.remove();
    localActionListener?.remove();
  };
}
