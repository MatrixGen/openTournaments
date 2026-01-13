// push/nativePush.js
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

const ANDROID_CHANNEL_ID = 'ot_arena_default';

async function ensureAndroidChannel() {
  if (Capacitor.getPlatform() !== 'android') return;

  await LocalNotifications.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'OT Arena',
    description: 'General notifications',
    importance: 4,
  });
}

async function ensureLocalNotificationPermission() {
  if (Capacitor.getPlatform() !== 'android') return;

  const perms = await LocalNotifications.checkPermissions();
  if (perms.display === 'granted') return;

  const request = await LocalNotifications.requestPermissions();
  if (request.display !== 'granted') {
    console.warn('[Push][Android] Local notifications permission not granted');
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
}

export function initNativePush(onTokenReceived) {
  PushNotifications.requestPermissions().then((result) => {
    if (result.receive !== 'granted') return;

    PushNotifications.register();
  });

  PushNotifications.addListener('registration', (token) => {
    console.log('[Push][Android] Registration token:', token.value);
    onTokenReceived(token.value);
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[Push][Android] Registration error:', err);
  });
}

export function initNativePushHandlers({ onNotificationAction } = {}) {
  if (Capacitor.getPlatform() !== 'android') return () => {};

  ensureAndroidChannel();
  ensureLocalNotificationPermission();

  const receivedListener = PushNotifications.addListener(
    'pushNotificationReceived',
    async (notification) => {
      console.log('[Push][Android] Received:', notification);
      await showForegroundNotification(notification);
    }
  );

  const actionListener = PushNotifications.addListener(
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

  const localActionListener = LocalNotifications.addListener(
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

  return () => {
    receivedListener.remove();
    actionListener.remove();
    localActionListener.remove();
  };
}
