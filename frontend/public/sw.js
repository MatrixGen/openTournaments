/* =========================================
  1. FIREBASE MESSAGING CONFIGURATION
  =========================================
  /* eslint-disable no-undef */
/* global importScripts,firebase, clients */

// This line helps your IDE recognize that 'self' is a Service Worker
/// <reference lib="webworker" />

// Now start your code...

// Import Firebase scripts (Compat version is safest for SW environment)
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Replace these values with your actual Firebase Project Config
firebase.initializeApp({
  apiKey: "AIzaSyAHAh2MVXKaUdf1MNqU9_rr5WMiA7QGO7k",
  authDomain: "ot-arena.firebaseapp.com",
  projectId: "ot-arena",
  storageBucket: "ot-arena.firebasestorage.app",
  messagingSenderId: "900088485172",
  appId: "1:900088485172:web:74208d00885445d12d4161",
  measurementId: "G-E9MXKQY0ZM"
});


const messaging = firebase.messaging();

/**
 * Handle background messages. 
 * This is triggered when the app is in the background or closed.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received:', payload);

  const notificationTitle = payload.notification.title || 'Tournament Update';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png', // Ensure this exists in your public folder
    badge: '/badge-72x72.png',
    data: payload.data, // This contains relatedEntityId, type, etc.
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

/* =========================================
  2. CACHING & PWA LOGIC
  =========================================
*/
const CACHE_NAMES = {
  static: 'static-v1',
  dynamic: 'dynamic-v1',
  images: 'images-v1',
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Utility: Identify API/Auth/Socket requests to avoid caching them
const isApiRequest = (url) => url.includes('/api/') || url.includes('/auth/') || url.includes('/socket');

// Utility: Identify Static assets
const isStaticAsset = (url) => {
  return url.includes('/static/') || 
         url.includes('/assets/') || 
         /\.(js|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(url);
};

// --- Install Event ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// --- Activate Event ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!Object.values(CACHE_NAMES).includes(key)) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// --- Fetch Event ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !url.protocol.startsWith('http') || isApiRequest(url.href)) {
    return;
  }

  // Handle SPA Navigation (Redirect to index.html)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => cached || fetch(request))
    );
    return;
  }

  // Cache-First strategy for static assets
  if (isStaticAsset(url.href)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAMES.static).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
    return;
  }
});

/* =========================================
  3. NOTIFICATION INTERACTION LOGIC
  =========================================
*/
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  let targetUrl = '/';

  // Build deep-link URL based on notification data
  if (data?.related_entity_type === 'tournament') {
    targetUrl = `/tournaments/${data.related_entity_id}`;
  } else if (data?.type === 'match') {
    targetUrl = `/matches/${data.related_entity_id}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});