import { getToken } from 'firebase/messaging';
import { messaging } from '../../firebase';

export async function initWebPush(onTokenReceived) {
  alert('init web push called ');

  // Check current permission first
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted'){
        alert('permission is not granted ,returning')
        return;
    };
  }
  alert('permission was there , continue ...')
  // Register your existing sw.js file
  const registration = await navigator.serviceWorker.register('/sw.js');

  // Get the token
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration, 
  });

  alert('here is a token',token);

  if (token) {
    onTokenReceived(token);
  }
}
