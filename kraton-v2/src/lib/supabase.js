/**
 * Supabase Client for AUTUS/KRATON
 *
 * 환경변수가 설정되지 않으면 Mock 모드로 동작
 */

import { createClient } from '@supabase/supabase-js';

// 환경변수에서 Supabase 설정 읽기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase 클라이언트 생성 (설정이 있을 때만)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Supabase가 설정되었는지 확인
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey && supabase);
}

/**
 * Supabase 연결 테스트
 */
export async function testConnection() {
  if (!isSupabaseConfigured()) {
    console.log('[Supabase] Not configured - using mock mode');
    return { success: false, error: 'Not configured' };
  }

  try {
    const { data, error } = await supabase.from('health_check').select('*').limit(1);
    if (error) throw error;
    console.log('[Supabase] Connection successful');
    return { success: true, data };
  } catch (error) {
    console.error('[Supabase] Connection failed:', error);
    return { success: false, error: error.message };
  }
}

export default supabase;
