/**
 * AUTUS Service Worker - PWA 최적화
 * 오프라인 지원 + 스마트 캐싱 + OTA 업데이트
 */

const APP_VERSION = '2.0.0';
const CACHE_NAME = `autus-pwa-v${APP_VERSION}`;
const OFFLINE_URL = '/frontend/offline.html';

// 캐시 전략별 분류
const CACHE_STRATEGIES = {
  // 정적 자산: 캐시 우선
  static: [
    '/frontend/autus-pwa.html',
    '/frontend/autus-bezos.html',
    '/frontend/autus-thiel.html',
    '/frontend/autus-musk.html',
    '/frontend/offline.html',
    '/frontend/manifest.json',
    '/frontend/css/network.css',
    '/frontend/css/ota.css'
  ],
  
  // JS 모듈: 캐시 우선 + 백그라운드 업데이트
  scripts: [
    '/frontend/js/bezos/regret-minimization.js',
    '/frontend/js/bezos/decision-type.js',
    '/frontend/js/bezos/day-one-monitor.js',
    '/frontend/js/bezos/flywheel.js',
    '/frontend/js/bezos/velocity-decision.js',
    '/frontend/js/bezos/working-backwards.js',
    '/frontend/js/bezos/disagree-commit.js',
    '/frontend/js/network/founder-network.js',
    '/frontend/js/network/invite-modal.js',
    '/frontend/js/ota/update-manager.js',
    '/frontend/js/ota/deletion-engine.js',
    '/frontend/js/pwa/pwa-install.js'
  ],
  
  // 폰트 & 외부 리소스: 캐시 우선
  external: [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
  ]
};

// 모든 캐시 대상 URL
const ALL_CACHE_URLS = [
  ...CACHE_STRATEGIES.static,
  ...CACHE_STRATEGIES.scripts,
  OFFLINE_URL
];


// ═══════════════════════════════════════════════════════════════
// INSTALL
// ═══════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
  console.log(`[SW] Installing v${APP_VERSION}...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] Caching core assets');
        
        // 필수 자산 캐싱 (실패 시 설치 중단)
        const essentials = [OFFLINE_URL, '/frontend/autus-pwa.html'];
        await cache.addAll(essentials);
        
        // 나머지는 개별 캐싱 (일부 실패해도 계속)
        for (const url of ALL_CACHE_URLS) {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn(`[SW] Failed to cache: ${url}`);
          }
        }
        
        return true;
      })
      .then(() => {
        console.log('[SW] Installation complete, activating immediately');
        return self.skipWaiting();
      })
  );
});


// ═══════════════════════════════════════════════════════════════
// ACTIVATE
// ═══════════════════════════════════════════════════════════════

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating v${APP_VERSION}...`);
  
  event.waitUntil(
    Promise.all([
      // 이전 버전 캐시 삭제
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('autus-') && name !== CACHE_NAME)
            .map((name) => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      }),
      
      // 모든 클라이언트 즉시 제어
      self.clients.claim()
    ]).then(() => {
      // 클라이언트에 업데이트 알림
      return notifyClients({
        type: 'SW_ACTIVATED',
        version: APP_VERSION
      });
    })
  );
});


// ═══════════════════════════════════════════════════════════════
// FETCH - 스마트 캐싱 전략
// ═══════════════════════════════════════════════════════════════

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 같은 오리진만 처리
  if (url.origin !== location.origin && !url.href.includes('fonts.googleapis')) {
    return;
  }
  
  // POST 요청은 네트워크만
  if (request.method !== 'GET') {
    return;
  }
  
  // API 요청: 네트워크 우선, 실패 시 캐시
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // WebSocket은 무시
  if (url.pathname.includes('/ws')) {
    return;
  }
  
  // HTML 페이지: 네트워크 우선, 오프라인 폴백
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }
  
  // JS/CSS: 캐시 우선, 백그라운드 업데이트
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  
  // 기타: 캐시 우선
  event.respondWith(cacheFirst(request));
});


// ═══════════════════════════════════════════════════════════════
// CACHING STRATEGIES
// ═══════════════════════════════════════════════════════════════

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // 오프라인 페이지 반환
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  // 백그라운드에서 네트워크 요청
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  
  // 캐시된 버전 즉시 반환, 없으면 네트워크 대기
  return cached || fetchPromise;
}


// ═══════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'AUTUS', body: event.data.text() };
  }
  
  const options = {
    body: data.body || data.message || '',
    icon: '/frontend/icons/icon-192.png',
    badge: '/frontend/icons/badge-72.png',
    tag: data.tag || 'autus-notification',
    data: data,
    vibrate: [100, 50, 100],
    actions: data.actions || [
      { action: 'open', title: '열기' },
      { action: 'dismiss', title: '닫기' }
    ],
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'AUTUS', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/frontend/autus-pwa.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url.includes('autus') && 'focus' in client) {
            return client.focus();
          }
        }
        // 없으면 새 창 열기
        return clients.openWindow(urlToOpen);
      })
  );
});


// ═══════════════════════════════════════════════════════════════
// BACKGROUND SYNC
// ═══════════════════════════════════════════════════════════════

self.addEventListener('sync', (event) => {
  console.log(`[SW] Sync event: ${event.tag}`);
  
  if (event.tag === 'autus-sync') {
    event.waitUntil(syncData());
  }
  
  if (event.tag === 'autus-telemetry') {
    event.waitUntil(syncTelemetry());
  }
});

async function syncData() {
  // 오프라인에서 저장된 데이터 동기화
  try {
    const pendingData = await getPendingData();
    if (pendingData.length === 0) return;
    
    for (const item of pendingData) {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    }
    
    await clearPendingData();
    console.log('[SW] Data synced successfully');
  } catch (e) {
    console.error('[SW] Sync failed:', e);
  }
}

async function syncTelemetry() {
  // Telemetry 데이터 전송
  try {
    const telemetry = await getTelemetryData();
    if (!telemetry) return;
    
    await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetry)
    });
    
    console.log('[SW] Telemetry synced');
  } catch (e) {
    console.error('[SW] Telemetry sync failed:', e);
  }
}


// ═══════════════════════════════════════════════════════════════
// PERIODIC BACKGROUND SYNC
// ═══════════════════════════════════════════════════════════════

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'autus-update-check') {
    event.waitUntil(checkForUpdates());
  }
});

async function checkForUpdates() {
  try {
    const response = await fetch(`/api/version?client_version=${APP_VERSION}`);
    const data = await response.json();
    
    if (data.update_available) {
      await notifyClients({
        type: 'UPDATE_AVAILABLE',
        version: data.version,
        changelog: data.changelog_summary
      });
    }
  } catch (e) {
    console.log('[SW] Update check failed (offline?)');
  }
}


// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage(message);
  });
}

async function getPendingData() {
  // IndexedDB에서 대기 중인 데이터 가져오기 (구현 필요)
  return [];
}

async function clearPendingData() {
  // IndexedDB에서 대기 데이터 삭제 (구현 필요)
}

async function getTelemetryData() {
  // IndexedDB에서 텔레메트리 데이터 가져오기 (구현 필요)
  return null;
}


// ═══════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.source.postMessage({ type: 'VERSION', version: APP_VERSION });
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        event.source.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
      
    case 'CACHE_URLS':
      if (payload?.urls) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.addAll(payload.urls);
        });
      }
      break;
  }
});

console.log(`[SW] AUTUS Service Worker v${APP_VERSION} loaded`);
