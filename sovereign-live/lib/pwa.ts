/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📱 PWA (Progressive Web App)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 오프라인 지원 + 설치 가능
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Service Worker Registration
// ═══════════════════════════════════════════════════════════════════════════════

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[PWA] Service Worker registered:", registration.scope);

    // 업데이트 체크
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // 새 버전 사용 가능
            console.log("[PWA] New version available");
            dispatchEvent(new CustomEvent("pwa-update-available"));
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error("[PWA] Service Worker registration failed:", error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Install Prompt
// ═══════════════════════════════════════════════════════════════════════════════

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function setupInstallPrompt(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    dispatchEvent(new CustomEvent("pwa-install-available"));
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;

  return outcome === "accepted";
}

export function canInstall(): boolean {
  return deferredPrompt !== null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Offline Detection
// ═══════════════════════════════════════════════════════════════════════════════

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Management
// ═══════════════════════════════════════════════════════════════════════════════

export async function clearAppCache(): Promise<void> {
  if (typeof caches === "undefined") return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map((name) => caches.delete(name))
  );

  console.log("[PWA] Cache cleared");
}

export async function getCacheSize(): Promise<number> {
  if (typeof navigator === "undefined" || !("storage" in navigator)) {
    return 0;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return estimate.usage ?? 0;
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Notification
// ═══════════════════════════════════════════════════════════════════════════════

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  return Notification.requestPermission();
}

export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return null;
  }

  return new Notification(title, {
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    ...options,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// App State
// ═══════════════════════════════════════════════════════════════════════════════

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function getDisplayMode(): "browser" | "standalone" | "minimal-ui" | "fullscreen" {
  if (typeof window === "undefined") return "browser";

  const modes = ["fullscreen", "standalone", "minimal-ui"] as const;
  
  for (const mode of modes) {
    if (window.matchMedia(`(display-mode: ${mode})`).matches) {
      return mode;
    }
  }

  return "browser";
}
