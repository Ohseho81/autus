// AUTUS Push Notifications Utility

/**
 * Request notification permission
 * @returns {Promise<boolean>} Whether permission was granted
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Send a local notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} options - Additional options
 */
export function sendLocalNotification(title, body, options = {}) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options
    });
  }
}

/**
 * Register service worker
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('AUTUS: Service Worker registered');
      return registration;
    } catch (error) {
      console.error('AUTUS: Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
}

/**
 * Send notification for AUTUS events
 * @param {string} type - Event type
 * @param {object} data - Event data
 */
export function notifyEvent(type, data = {}) {
  const notifications = {
    evolution: {
      title: '🧬 Evolution Complete',
      body: `${data.name || 'Module'} has been evolved`
    },
    error: {
      title: '⚠️ AUTUS Alert',
      body: data.message || 'An error occurred'
    },
    task: {
      title: '📋 Task Update',
      body: data.message || 'Task status changed'
    },
    system: {
      title: '🔧 System Update',
      body: data.message || 'System status changed'
    }
  };

  const notification = notifications[type] || {
    title: 'AUTUS',
    body: 'New notification'
  };

  sendLocalNotification(notification.title, notification.body);
}

