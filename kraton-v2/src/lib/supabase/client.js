/**
 * Supabase Client (싱글톤)
 * 
 * 전역에서 사용하는 Supabase 클라이언트
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 싱글톤 클라이언트
let supabaseInstance = null;

export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] 환경변수 미설정 - Mock 모드로 동작');
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return supabaseInstance;
}

// 편의를 위한 기본 export
export const supabase = getSupabase();

// Supabase 사용 가능 여부
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export default supabase;
