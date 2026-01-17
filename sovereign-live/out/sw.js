/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📱 Service Worker - AUTUS Sovereign Live
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const CACHE_NAME = "autus-sovereign-v1";
const STATIC_ASSETS = [
  "/",
  "/status",
  "/console",
  "/path",
  "/action-log",
  "/setup",
  "/map",
  "/proof",
  "/logic",
];

// 설치
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 활성화
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// 요청 처리 (네트워크 우선, 오프라인 시 캐시)
self.addEventListener("fetch", (event) => {
  // API 요청은 캐시하지 않음
  if (event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공적인 응답은 캐시에 저장
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 응답
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 캐시에도 없으면 오프라인 페이지 (옵션)
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});

// 백그라운드 동기화
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-decisions") {
    console.log("[SW] Background sync: decisions");
    // P2P 동기화 로직 (향후 구현)
  }
});

// 푸시 알림
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  
  event.waitUntil(
    self.registration.showNotification(data.title ?? "AUTUS", {
      body: data.body ?? "새로운 알림",
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      data: data.url,
    })
  );
});

// 알림 클릭
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});
