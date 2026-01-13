import { getToken } from 'firebase/messaging';
import { messaging } from '../../firebase';

export async function initWebPush(onTokenReceived) {
 

  // Check current permission first
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted'){
        alert('permission is not granted ,returning')
        return;
    };
  }
 
  // Register your existing sw.js file
  const registration = await navigator.serviceWorker.register('/sw.js');

  // Get the token
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration, 
  });

  if (token) {
    onTokenReceived(token);
  }
}
