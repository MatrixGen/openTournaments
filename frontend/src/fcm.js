import { getToken } from "firebase/messaging";
import { messaging } from "./firebase";

export async function requestFcmToken() {
  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }

  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
  });

  if (!token) {
    throw new Error("Failed to generate FCM token");
  }

  return token;
}
