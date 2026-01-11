/**
 * AUTUS Service Worker
 * PWA 오프라인 지원 및 캐싱
 */

const CACHE_NAME = 'autus-v2.0.0';
const STATIC_CACHE = 'autus-static-v2.0.0';
const DYNAMIC_CACHE = 'autus-dynamic-v2.0.0';

// 정적 리소스 (빌드 시 캐시)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
];

// 캐시 전략
const CACHE_STRATEGIES = {
  // 네트워크 우선 (API)
  networkFirst: ['/api/', '/health', '/state'],
  // 캐시 우선 (정적 리소스)
  cacheFirst: ['/assets/', '/icons/', '.js', '.css', '.png', '.svg'],
  // 네트워크만 (실시간 데이터)
  networkOnly: ['/ws/', '/webhook'],
};

// 설치
self.addEventListener('install', (event) => {
  console.log('[SW] Installing AUTUS Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // 즉시 활성화
  self.skipWaiting();
});

// 활성화
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating AUTUS Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // 모든 클라이언트 제어
  self.clients.claim();
});

// Fetch 이벤트
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 같은 origin만 처리
  if (url.origin !== location.origin) {
    return;
  }
  
  // WebSocket은 무시
  if (request.url.includes('/ws/')) {
    return;
  }
  
  // 캐시 전략 결정
  const strategy = getStrategy(url.pathname);
  
  switch (strategy) {
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    case 'networkOnly':
      event.respondWith(fetch(request));
      break;
    default:
      event.respondWith(networkFirst(request));
  }
});

// 전략 결정
function getStrategy(pathname) {
  for (const [strategy, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some((pattern) => pathname.includes(pattern))) {
      return strategy;
    }
  }
  return 'networkFirst';
}

// 네트워크 우선 전략
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // 성공하면 캐시에 저장
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // 네트워크 실패 시 캐시에서 반환
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // 오프라인 페이지 반환
    if (request.destination === 'document') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// 캐시 우선 전략
async function cacheFirst(request) {
  const cached = await caches.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// 푸시 알림
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'AUTUS 알림',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: '열기' },
      { action: 'close', title: '닫기' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'AUTUS', options)
  );
});

// 알림 클릭
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') return;
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // 이미 열린 창이 있으면 포커스
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // 없으면 새 창 열기
      return clients.openWindow(url);
    })
  );
});

// 백그라운드 동기화
self.addEventListener('sync', (event) => {
  if (event.tag === 'autus-sync') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('[SW] Background sync triggered');
  // 오프라인 동안 쌓인 데이터 동기화
  // TODO: IndexedDB에서 pending 데이터 가져와서 서버로 전송
}

console.log('[SW] AUTUS Service Worker loaded');
