/**
 * ═══════════════════════════════════════════════════════════════
 * Sentry 에러 모니터링
 * ═══════════════════════════════════════════════════════════════
 *
 * .env에 추가:
 *   EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
 *
 * app.json plugins에 추가:
 *   ["@sentry/react-native/expo", {
 *     "organization": "autus",
 *     "project": "onlysam"
 *   }]
 * ═══════════════════════════════════════════════════════════════
 */

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry() {
  if (__DEV__) return;

  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN이 설정되지 않았습니다. EXPO_PUBLIC_SENTRY_DSN을 .env에 추가하세요.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,

    beforeSend(event) {
      // PII 필터링
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (__DEV__) {
    console.error('[Error]', error.message, context);
    return;
  }

  if (!SENTRY_DSN) return;
  Sentry.captureException(error, { extra: context });
}

export function setUserContext(userId: string, role?: string) {
  if (!SENTRY_DSN || __DEV__) return;
  Sentry.setUser({ id: userId, role });
}

export function clearUserContext() {
  if (!SENTRY_DSN || __DEV__) return;
  Sentry.setUser(null);
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  if (!SENTRY_DSN || __DEV__) return;
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });
}
