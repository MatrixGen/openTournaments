import { getToken } from 'firebase/messaging';
import { messaging } from '../../firebase';

export async function initWebPush(onTokenReceived) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  // Register your existing sw.js file
  const registration = await navigator.serviceWorker.register('/sw.js');

  // Explicitly tell Firebase to use THIS registration
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration, 
  });

  if (token) {
    onTokenReceived(token);
  }
}