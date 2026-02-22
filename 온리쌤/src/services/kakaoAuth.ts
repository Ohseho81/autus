/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 Kakao Auth Service
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface KakaoProfile {
  id: string;
  nickname: string;
  email?: string;
  profileImageUrl?: string;
  phoneNumber?: string;
}

export interface KakaoAuthResult {
  success: boolean;
  profile?: KakaoProfile;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Kakao Login
// ═══════════════════════════════════════════════════════════════════════════════

let KakaoLogin: { login: () => Promise<Record<string, unknown>>; getProfile: () => Promise<Record<string, unknown>>; logout: () => Promise<void> } | null = null;

function getKakaoModule() {
  if (!KakaoLogin) {
    try {
      KakaoLogin = require('@react-native-seoul/kakao-login');
    } catch {
      return null;
    }
  }
  return KakaoLogin;
}

/**
 * 카카오 로그인 실행
 */
export async function loginWithKakao(): Promise<KakaoAuthResult> {
  try {
    const kakao = getKakaoModule();
    if (!kakao) {
      return { success: false, error: '카카오 로그인 모듈을 불러올 수 없습니다.' };
    }

    // 카카오 로그인
    const tokenResult = await kakao.login();
    if (!tokenResult.accessToken) {
      return { success: false, error: '카카오 토큰을 받지 못했습니다.' };
    }

    // 프로필 가져오기
    const profileResult = await kakao.getProfile();
    const profile: KakaoProfile = {
      id: String(profileResult.id),
      nickname: profileResult.nickname ?? '',
      email: profileResult.email ?? undefined,
      profileImageUrl: profileResult.profileImageUrl ?? undefined,
      phoneNumber: profileResult.phoneNumber ?? undefined,
    };

    // Supabase에 사용자 upsert
    await upsertKakaoUser(profile);

    return { success: true, profile };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '카카오 로그인에 실패했습니다.';
    if (__DEV__) console.error('Kakao login error:', err);
    return { success: false, error: message };
  }
}

/**
 * 카카오 로그아웃
 */
export async function logoutKakao(): Promise<void> {
  try {
    const kakao = getKakaoModule();
    if (kakao) await kakao.logout();
  } catch {
    // 무시
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Supabase 연동
// ═══════════════════════════════════════════════════════════════════════════════

async function upsertKakaoUser(profile: KakaoProfile) {
  try {
    const { error } = await supabase.from('entities').upsert(
      {
        external_id: `kakao_${profile.id}`,
        name: profile.nickname,
        email: profile.email,
        phone: profile.phoneNumber,
        profile_image: profile.profileImageUrl,
        auth_provider: 'kakao',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'external_id' }
    );
    if (error && __DEV__) console.error('Upsert error:', error);
  } catch (e: unknown) {
    if (__DEV__) console.error('Upsert failed:', e);
  }
}
