/* global importScripts, firebase, clients */
/// <reference lib="webworker" />

// Firebase compat SDKs
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAHAh2MVXKaUdf1MNqU9_rr5WMiA7QGO7k",
  authDomain: "ot-arena.firebaseapp.com",
  projectId: "ot-arena",
  storageBucket: "ot-arena.firebasestorage.app",
  messagingSenderId: "900088485172",
  appId: "1:900088485172:web:74208d00885445d12d4161"
});

const messaging = firebase.messaging();

// Background push
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Tournament Update';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    data: payload.data || {},
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
  };
  self.registration.showNotification(title, options);
});

/* ===== Caching (safe SPA) ===== */

// Bump this on deploy to avoid stale shells (or inject build hash)
const CACHE_NAME = 'ot-arena-shell-v2';
const SHELL_ASSETS = ['/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  // SPA navigation: network-first, fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }
});

/* ===== Notification click ===== */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  if (data.related_entity_type === 'tournament') {
    targetUrl = `/tournaments/${data.related_entity_id}`;
  } else if (data.type === 'match') {
    targetUrl = `/matches/${data.related_entity_id}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
