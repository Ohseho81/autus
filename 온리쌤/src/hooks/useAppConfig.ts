/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔧 useAppConfig — 실시간 앱 설정 Hook
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 몰트봇 버튼 → Supabase → 이 Hook → 앱 UI 반영
 * 
 * 사용법:
 *   const { theme, labels, features, greeting } = useAppConfig();
 *   
 *   <Text style={{ color: theme.primary }}>{labels.coach}님</Text>
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface AppTheme {
  primary: string;
  background: string;
  card: string;
}

export interface AppLabels {
  coach: string;
  student: string;
  gratitude: string;
  attendance: string;
}

export interface AppFeatures {
  show_gratitude: boolean;
  show_market: boolean;
  show_compatibility: boolean;
}

export interface AppGreeting {
  text: string;
  emoji: string;
}

export interface AppConfig {
  theme: AppTheme;
  labels: AppLabels;
  features: AppFeatures;
  greeting: AppGreeting;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 기본값
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_THEME: AppTheme = {
  primary: '#FF6B2C',
  background: '#000000',
  card: '#1C1C1E',
};

const DEFAULT_LABELS: AppLabels = {
  coach: '코치님',
  student: '학생',
  gratitude: '감사',
  attendance: '출석',
};

const DEFAULT_FEATURES: AppFeatures = {
  show_gratitude: true,
  show_market: true,
  show_compatibility: true,
};

const DEFAULT_GREETING: AppGreeting = {
  text: '오늘도 감동을 만들어 보세요.',
  emoji: '🏀',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════════

export function useAppConfig(): AppConfig {
  const [theme, setTheme] = useState<AppTheme>(DEFAULT_THEME);
  const [labels, setLabels] = useState<AppLabels>(DEFAULT_LABELS);
  const [features, setFeatures] = useState<AppFeatures>(DEFAULT_FEATURES);
  const [greeting, setGreeting] = useState<AppGreeting>(DEFAULT_GREETING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('app_config')
        .select('key, value');

      if (fetchError) {
        if (__DEV__) console.warn('[AppConfig] Fetch error, using defaults:', fetchError);
        return;
      }

      if (data) {
        data.forEach((row) => {
          try {
            const value = typeof row.value === 'string' 
              ? JSON.parse(row.value) 
              : row.value;

            switch (row.key) {
              case 'theme':
                setTheme({ ...DEFAULT_THEME, ...value });
                break;
              case 'labels':
                setLabels({ ...DEFAULT_LABELS, ...value });
                break;
              case 'features':
                setFeatures({ ...DEFAULT_FEATURES, ...value });
                break;
              case 'home_greeting':
                setGreeting({ ...DEFAULT_GREETING, ...value });
                break;
            }
          } catch (e: unknown) {
            if (__DEV__) console.warn(`[AppConfig] Parse error for ${row.key}:`, e);
          }
        });
      }
    } catch (e: unknown) {
      if (__DEV__) console.error('[AppConfig] Error:', e);
      setError('설정을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    fetchConfig();
  }, []);

  // 실시간 구독 (선택사항)
  useEffect(() => {
    const subscription = supabase
      .channel('app_config_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_config' },
        (payload) => {
          if (__DEV__) console.log('[AppConfig] Realtime update:', payload);
          fetchConfig(); // 변경 시 다시 로드
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    theme,
    labels,
    features,
    greeting,
    loading,
    error,
    refetch: fetchConfig,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 설정값 직접 가져오기 (Hook 외부에서 사용)
 */
export async function getAppConfig(key: string): Promise<unknown> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', key)
      .single();

    if (error || !data) return null;

    return typeof data.value === 'string'
      ? JSON.parse(data.value)
      : data.value;
  } catch {
    return null;
  }
}

/**
 * 설정값 업데이트 (앱 내에서 직접 수정 시)
 */
export async function setAppConfig(key: string, value: unknown): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_config')
      .upsert({
        key,
        value: JSON.stringify(value),
        updated_by: 'app',
      });

    return !error;
  } catch {
    return false;
  }
}
