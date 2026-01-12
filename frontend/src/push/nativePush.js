// push/nativePush.js
import { PushNotifications } from '@capacitor/push-notifications';

export function initNativePush(onTokenReceived) {
  PushNotifications.requestPermissions().then(result => {
    if (result.receive !== 'granted') return;

    PushNotifications.register();
  });

  PushNotifications.addListener('registration', token => {
    onTokenReceived(token.value);
  });

  PushNotifications.addListener('registrationError', err => {
    console.error('Native push registration error:', err);
  });
}
