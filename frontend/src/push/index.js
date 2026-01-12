// push/index.js
import { Capacitor } from '@capacitor/core';
import { initNativePush } from './nativePush';
import { initWebPush } from './webPush';

export function initPushNotifications(onTokenReceived) {
  if (Capacitor.isNativePlatform()) {
    initNativePush(onTokenReceived);
  } else {
    initWebPush(onTokenReceived);
  }
}
