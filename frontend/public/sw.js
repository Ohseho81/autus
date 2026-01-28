/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Service Worker
 * PWA 오프라인 지원
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CACHE_NAME = 'autus-v1';
const OFFLINE_URL = '/offline.html';

// Resources to cache immediately on install
const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first for static assets
  cacheFirst: [
    /\.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico)$/,
    /^\/icons\//,
    /^\/fonts\//,
  ],
  // Network first for API calls
  networkFirst: [
    /^\/api\//,
    /supabase\.co/,
  ],
  // Stale while revalidate for pages
  staleWhileRevalidate: [
    /^\/(?!api).*$/,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Install Event
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // Precache essential resources
      await cache.addAll(PRECACHE_RESOURCES);
      
      // Immediately activate new service worker
      self.skipWaiting();
    })()
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Activate Event
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      
      // Take control of all clients immediately
      self.clients.claim();
    })()
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Event
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for allowed domains)
  if (url.origin !== location.origin && !url.hostname.includes('supabase.co')) {
    return;
  }

  // Determine cache strategy
  const strategy = getCacheStrategy(url);
  
  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case 'cacheFirst':
            return await cacheFirst(request);
          case 'networkFirst':
            return await networkFirst(request);
          case 'staleWhileRevalidate':
          default:
            return await staleWhileRevalidate(request);
        }
      } catch (error) {
        // If all else fails, return offline page for navigation requests
        if (request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return cache.match(OFFLINE_URL);
        }
        throw error;
      }
    })()
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Cache Strategies Implementation
// ─────────────────────────────────────────────────────────────────────────────

function getCacheStrategy(url) {
  const pathname = url.pathname;
  const href = url.href;
  
  for (const pattern of CACHE_STRATEGIES.cacheFirst) {
    if (pattern.test(pathname) || pattern.test(href)) {
      return 'cacheFirst';
    }
  }
  
  for (const pattern of CACHE_STRATEGIES.networkFirst) {
    if (pattern.test(pathname) || pattern.test(href)) {
      return 'networkFirst';
    }
  }
  
  return 'staleWhileRevalidate';
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(request);
  
  if (response.ok) {
    cache.put(request, response.clone());
  }
  
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  return cached || fetchPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Background Sync for Offline Actions
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  // This would sync any queued actions when back online
  // Implementation depends on your backend API
  const db = await openDB();
  const pendingActions = await db.getAll('pendingActions');
  
  for (const action of pendingActions) {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });
      
      await db.delete('pendingActions', action.id);
    } catch (error) {
      console.error('Failed to sync action:', action.id, error);
    }
  }
}

// Simple IndexedDB wrapper (for pending actions)
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('autus-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      resolve({
        getAll: (store) => {
          return new Promise((res, rej) => {
            const tx = db.transaction(store, 'readonly');
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
          });
        },
        delete: (store, id) => {
          return new Promise((res, rej) => {
            const tx = db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).delete(id);
            req.onsuccess = () => res();
            req.onerror = () => rej(req.error);
          });
        },
      });
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id' });
      }
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Push Notifications
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || '새로운 알림이 있습니다.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      ...data,
    },
    actions: data.actions || [],
    tag: data.tag || 'autus-notification',
    renotify: true,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'AUTUS', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window if no existing one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

console.log('[SW] AUTUS Service Worker loaded');
