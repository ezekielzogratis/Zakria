// Service Worker for R-Service Tracker PWA v1.0.0
const CACHE_NAME = 'r-service-tracker-v1.0.0';
const DYNAMIC_CACHE = 'r-service-dynamic-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/database.js',
  '/js/notifications.js',
  '/js/calendar.js',
  '/js/charts.js',
  '/js/utils.js',
  '/js/constants.js',
  '/assets/favicon.ico',
  '/assets/favicon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/manifest.json'
  // Note: External resources are loaded dynamically for better performance
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker v1.0.0...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[SW] Failed to cache resources:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker v1.0.0...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  const url = new URL(event.request.url);
  
  // For same-origin requests, use cache-first strategy
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            console.log('[SW] Serving from cache:', url.pathname);
            return response;
          }

          return fetch(event.request)
            .then(response => {
              // Don't cache if not a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              // Add to cache for future use
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            })
            .catch(err => {
              console.log('[SW] Network request failed for:', url.pathname);
              // For HTML requests, serve the main page from cache
              if (event.request.headers.get('accept').includes('text/html')) {
                return caches.match('/index.html');
              }
              throw err;
            });
        })
    );
  } else {
    // For external resources, use network-first with fallback
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache external resources if successful
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for external resources
          return caches.match(event.request);
        })
    );
  }
});

// ===== BASIC PWA FUNCTIONALITY =====

// IndexedDB helper functions
function getFromIndexedDB(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RServiceTracker', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getRequest = store.get(key);
      
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result);
    };
  });
}

function saveToIndexedDB(storeName, key, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RServiceTracker', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      
      // Create store if it doesn't exist
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        const upgradeRequest = indexedDB.open('RServiceTracker', db.version + 1);
        upgradeRequest.onupgradeneeded = () => {
          const upgradeDb = upgradeRequest.result;
          upgradeDb.createObjectStore(storeName);
        };
        upgradeRequest.onsuccess = () => {
          const newDb = upgradeRequest.result;
          const transaction = newDb.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const putRequest = store.put(value, key);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };
        return;
      }
      
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const putRequest = store.put(value, key);
      
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    };
  });
}

// ===== ENHANCED MESSAGING SYSTEM =====

// Handle messages from the main app
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'UPDATE_CONFIG':
      console.log('[SW] Configuration updated');
      break;
      
    case 'CACHE_DATA':
      // Cache important data for offline access
      if (payload) {
        saveToIndexedDB('cache', 'appData', payload)
          .then(() => console.log('[SW] Data cached successfully'))
          .catch(err => console.error('[SW] Failed to cache data:', err));
      }
      break;
      
    case 'GET_CACHED_DATA':
      // Retrieve cached data
      getFromIndexedDB('cache', 'appData')
        .then(data => {
          event.ports[0].postMessage({
            type: 'CACHED_DATA_RESPONSE',
            data: data
          });
        })
        .catch(err => {
          console.error('[SW] Failed to retrieve cached data:', err);
          event.ports[0].postMessage({
            type: 'CACHED_DATA_ERROR',
            error: err.message
          });
        });
      break;
      
    case 'OFFLINE_ACTION':
      // Handle offline actions like mark as done/paid
      handleOfflineAction(payload);
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Handle offline actions
function handleOfflineAction(action) {
  console.log('[SW] Processing offline action:', action);
  
  // Store the action for when we come back online
  getFromIndexedDB('offlineActions', 'queue')
    .then(queue => {
      const actions = queue || [];
      actions.push({
        ...action,
        timestamp: Date.now(),
        id: generateActionId()
      });
      return saveToIndexedDB('offlineActions', 'queue', actions);
    })
    .then(() => {
      console.log('[SW] Offline action queued successfully');
      // Try to sync if online
      if (navigator.onLine) {
        syncOfflineActions();
      }
    })
    .catch(err => {
      console.error('[SW] Failed to queue offline action:', err);
    });
}

// Sync offline actions when online
function syncOfflineActions() {
  console.log('[SW] Syncing offline actions...');
  
  getFromIndexedDB('offlineActions', 'queue')
    .then(actions => {
      if (!actions || actions.length === 0) {
        console.log('[SW] No offline actions to sync');
        return;
      }
      
      // Clear the queue after successful sync
      return saveToIndexedDB('offlineActions', 'queue', [])
        .then(() => {
          console.log('[SW] Offline actions synced and queue cleared');
          // Notify main app about successful sync
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'OFFLINE_SYNC_COMPLETE',
                actions: actions
              });
            });
          });
        });
    })
    .catch(err => {
      console.error('[SW] Failed to sync offline actions:', err);
    });
}

// Generate unique action ID
function generateActionId() {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Listen for online/offline events
self.addEventListener('online', () => {
  console.log('[SW] App is online, syncing offline actions...');
  syncOfflineActions();
});

console.log('[SW] R-Service Tracker Service Worker v1.0.0 loaded');