import { onMessage } from "firebase/messaging";
import { messaging } from "../../firebase";

export function initForegroundMessaging() {
  onMessage(messaging, (payload) => {
    console.log("[FCM][FOREGROUND] Message received:", payload);

    const title = payload.notification?.title || payload.data?.title || "Update";
    const body = payload.notification?.body || payload.data?.body || "";

    console.log("[FCM] permission:", Notification.permission);
    console.log("[FCM] about to show:", { title, body });

    if (Notification.permission !== "granted") {
      console.warn("[FCM] Notifications not granted");
      return;
    }

    if (!body && !title) {
      console.warn("[FCM] Empty notification content");
      return;
    }

    try {
      const n = new Notification(title, { body });
      n.onshow = () => console.log("[FCM] notification shown");
      n.onerror = (e) => console.error("[FCM] notification error", e);
    } catch (e) {
      console.error("[FCM] new Notification threw:", e);
    }
  });
}
