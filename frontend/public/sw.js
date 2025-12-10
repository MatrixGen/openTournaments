// Advanced service worker for React SPA with client-side routing
const CACHE_NAME = 'tournament-app-v1.0.0';
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
  // Add your app's static assets
];

// Utility function to check if a request is for an API
const isApiRequest = (url) => {
  return url.includes('/api/') || url.includes('/auth/') || url.includes('/socket');
};

// Utility function to check if a request is for a static asset
const isStaticAsset = (url) => {
  return url.includes('/static/') || 
         url.includes('/assets/') || 
         /\.(js|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(url);
};

// Utility function to check if a request is for an image
const isImageRequest = (url) => {
  return /\.(png|jpg|jpeg|gif|svg|ico|webp)$/.test(url);
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle all requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and non-http(s) requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip API requests and WebSocket connections
  if (isApiRequest(url.href)) {
    return;
  }
  
  // Handle navigation requests (HTML pages) for SPA
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html', { cacheName: CACHE_NAMES.static })
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If not in cache, fetch from network
          return fetch(request)
            .then((networkResponse) => {
              // Don't cache HTML pages, always serve fresh
              return networkResponse;
            })
            .catch(() => {
              // If network fails and we don't have index.html cached,
              // return a simple offline page
              return new Response(
                `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8">
                    <title>Offline | Tournament App</title>
                    <style>
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                      }
                      .container {
                        text-align: center;
                        max-width: 600px;
                      }
                      h1 {
                        font-size: 2.5rem;
                        margin-bottom: 1rem;
                      }
                      p {
                        font-size: 1.2rem;
                        margin-bottom: 2rem;
                        opacity: 0.9;
                      }
                      button {
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 12px 32px;
                        font-size: 1rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: transform 0.2s;
                      }
                      button:hover {
                        transform: translateY(-2px);
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h1>You're Offline</h1>
                      <p>Please check your internet connection and try again.</p>
                      <button onclick="window.location.reload()">Try Again</button>
                    </div>
                  </body>
                </html>
                `,
                {
                  headers: { 'Content-Type': 'text/html' },
                  status: 200,
                  statusText: 'OK'
                }
              );
            });
        })
    );
    return;
  }
  
  // Handle static assets (JS, CSS, images)
  if (isStaticAsset(url.href)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response and update cache in background
            fetch(request).then((networkResponse) => {
              caches.open(CACHE_NAMES.static).then((cache) => {
                cache.put(request, networkResponse);
              });
            });
            return cachedResponse;
          }
          
          // If not cached, fetch from network and cache
          return fetch(request)
            .then((networkResponse) => {
              // Check if response is valid
              if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
              }
              
              // Clone the response to store in cache
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAMES.static)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
              
              return networkResponse;
            })
            .catch(() => {
              // If both cache and network fail, return a fallback
              if (isImageRequest(url.href)) {
                return new Response(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#666" font-family="sans-serif" font-size="14">Image</text></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
            });
        })
    );
    return;
  }
  
  // For all other requests, try network first
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for dynamic content
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAMES.dynamic)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If no cache, return offline response for HTML
            if (request.headers.get('Accept')?.includes('text/html')) {
              return caches.match('/index.html', { cacheName: CACHE_NAMES.static });
            }
            
            // For other content types, return null
            return null;
          });
      })
  );
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('[Service Worker] Background sync triggered');
    // Implement background sync logic here
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Tournament App', options)
  );
});

/*/ Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    // Handle explore action
    event.waitUntil(
      clients.openWindow('/notifications')
    );
  } else {
    // Handle main notification click
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});*/