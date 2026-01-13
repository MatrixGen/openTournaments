// push/index.js
import { Capacitor } from '@capacitor/core';
import { initNativePush, initNativePushHandlers } from './nativePush';
import { initWebPush } from './webPush';

export function initPushNotifications(onTokenReceived) {
  if (Capacitor.getPlatform() === 'android') {
    initNativePush(onTokenReceived);
  } else if (Capacitor.getPlatform() === 'web') {
    initWebPush(onTokenReceived);
  }
}

export function initAndroidPushHandlers(options = {}) {
  if (Capacitor.getPlatform() === 'android') {
    return initNativePushHandlers(options);
  }

  return () => {};
}
