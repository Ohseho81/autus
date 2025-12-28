/**
 * AUTUS Service Worker
 * ====================
 * 
 * 오프라인 지원 + 캐싱 전략
 * 
 * Version: 1.0.0
 * Status: PRODUCTION
 */

const CACHE_NAME = 'autus-v1';
const STATIC_CACHE = 'autus-static-v1';
const DYNAMIC_CACHE = 'autus-dynamic-v1';

// 정적 자산 (앱 쉘)
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/autus-live.html',
    '/autus-page1.html',
    '/autus-page2.html',
    '/autus-page3.html',
    '/css/autus-main.css',
    '/js/api/AutusEngine.js',
    '/js/core/CoreLayer.js',
    '/js/core/GraphLayer.js',
    '/js/core/FlowLayer.js',
    '/js/core/StateUniform.js',
    '/js/core/DeterminismSampler.js',
    '/js/core/AutusRenderer.js',
    '/js/core/VisualFeedback.js',
    '/manifest.json'
];

// 외부 CDN
const CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

// ================================================================
// INSTALL
// ================================================================

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        Promise.all([
            // 정적 자산 캐싱
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS).catch((err) => {
                    console.warn('[SW] Some static assets failed to cache:', err);
                });
            }),
            // CDN 자산 캐싱
            caches.open(STATIC_CACHE).then((cache) => {
                return Promise.all(
                    CDN_ASSETS.map((url) => 
                        cache.add(url).catch(() => console.warn(`[SW] Failed to cache: ${url}`))
                    )
                );
            })
        ]).then(() => {
            console.log('[SW] Install complete');
            return self.skipWaiting();
        })
    );
});

// ================================================================
// ACTIVATE
// ================================================================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map((key) => {
                        console.log(`[SW] Deleting old cache: ${key}`);
                        return caches.delete(key);
                    })
            );
        }).then(() => {
            console.log('[SW] Activate complete');
            return self.clients.claim();
        })
    );
});

// ================================================================
// FETCH
// ================================================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // API 요청: Network First
    if (url.pathname.startsWith('/api/') || url.origin.includes('localhost:8001')) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // 정적 자산: Cache First
    if (isStaticAsset(request)) {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // 기타: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// ================================================================
// CACHING STRATEGIES
// ================================================================

/**
 * Cache First: 캐시 우선, 없으면 네트워크
 */
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
        console.warn('[SW] Cache first failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network First: 네트워크 우선, 실패 시 캐시
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        
        // 성공 응답 캐싱
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.log('[SW] Network failed, trying cache');
        
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        
        // 오프라인 폴백
        return new Response(
            JSON.stringify({
                error: true,
                code: 'OFFLINE',
                message: '오프라인 상태입니다. 네트워크 연결을 확인하세요.'
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

/**
 * Stale While Revalidate: 캐시 반환 후 백그라운드 업데이트
 */
async function staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    
    const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
            const cache = caches.open(DYNAMIC_CACHE);
            cache.then((c) => c.put(request, response.clone()));
        }
        return response;
    }).catch(() => null);
    
    return cached || fetchPromise || new Response('Offline', { status: 503 });
}

// ================================================================
// UTILITIES
// ================================================================

function isStaticAsset(request) {
    const url = new URL(request.url);
    const staticExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.svg', '.woff', '.woff2'];
    return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

// ================================================================
// BACKGROUND SYNC (Draft 저장)
// ================================================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-draft') {
        console.log('[SW] Syncing draft...');
        event.waitUntil(syncDraft());
    }
});

async function syncDraft() {
    try {
        // IndexedDB에서 저장된 Draft 가져오기
        const drafts = await getDraftsFromIndexedDB();
        
        for (const draft of drafts) {
            await fetch('/api/draft/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draft)
            });
        }
        
        // 성공 시 삭제
        await clearDraftsFromIndexedDB();
        console.log('[SW] Draft sync complete');
    } catch (error) {
        console.error('[SW] Draft sync failed:', error);
    }
}

// IndexedDB 헬퍼 (실제 구현 필요)
async function getDraftsFromIndexedDB() {
    // TODO: IndexedDB 구현
    return [];
}

async function clearDraftsFromIndexedDB() {
    // TODO: IndexedDB 구현
}

// ================================================================
// PUSH NOTIFICATIONS (선택적)
// ================================================================

self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    
    const options = {
        body: data.body || '새로운 알림이 있습니다.',
        icon: '/assets/autus-6layers-reference.png',
        badge: '/assets/autus-6layers-reference.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: data.actions || []
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'AUTUS', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/')
    );
});

console.log('[SW] Service Worker loaded');
