import { PushNotifications } from '@capacitor/push-notifications';
import { useEffect } from 'react';

export function usePushNotifications() {
  useEffect(() => {
    // 1. Request permission
    PushNotifications.requestPermissions().then((result) => {
      if (result.receive === 'granted') {
        // 2. Register with APNS (iOS) or FCM (Android)
        PushNotifications.register();
      } else {
        console.warn('Push notifications permission denied');
      }
    });

    // 3. Listen for registration success
    const registrationListener = PushNotifications.addListener(
      'registration',
      (token) => {
        console.log('Device push token:', token.value);
        // TODO: send this token to your backend to send notifications
      }
    );

    // 4. Listen for registration errors
    const registrationErrorListener = PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error('Push registration error:', error);
      }
    );

    // 5. Listen for received notifications
    const pushListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('Push received:', notification);
        // You can show a custom in-app alert or update your notification page
      }
    );

    // 6. Listen for notification action (tap)
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification) => {
        console.log('Notification tapped:', notification);
        // Navigate to your notifications page or specific content
      }
    );

    return () => {
      registrationListener.remove();
      registrationErrorListener.remove();
      pushListener.remove();
      actionListener.remove();
    };
  }, []);
}
