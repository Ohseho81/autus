/**
 * AUTUS API Configuration
 * =======================
 * 
 * 모든 API 호출에서 이 설정을 사용하세요.
 * 
 * 사용법:
 *   import { API_BASE, WS_BASE } from '@/config/api';
 *   fetch(`${API_BASE}/api/ki/state/${entityId}`)
 *   new WebSocket(`${WS_BASE}/ws/ki`)
 */

/**
 * API 베이스 URL
 * 
 * - 개발 환경: http://localhost:8000
 * - 프로덕션 환경: 환경변수 또는 상대 경로 (같은 도메인)
 */
export const API_BASE: string = (() => {
  // 환경변수가 설정되어 있으면 사용
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // 프로덕션이면 상대 경로 (같은 도메인 API)
  if (import.meta.env.PROD) {
    return '';
  }
  
  // 개발 환경 기본값
  return 'http://localhost:8000';
})();

/**
 * WebSocket 베이스 URL
 */
export const WS_BASE: string = (() => {
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // 프로덕션이면 같은 도메인 (wss:// 또는 ws://)
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  
  return 'ws://localhost:8000';
})();

/**
 * Supabase 설정
 */
export const SUPABASE = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  isConfigured: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
} as const;

/**
 * 디버그 모드
 */
export const DEBUG = import.meta.env.VITE_DEBUG === 'true';

/**
 * 환경 정보
 */
export const ENV = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const;

/**
 * 버전 정보
 */
export const VERSION = '15.0.0';
