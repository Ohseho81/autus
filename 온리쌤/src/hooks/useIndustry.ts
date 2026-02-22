/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏭 useIndustry Hook - 조직의 산업 설정 로드
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Supabase에서 현재 조직의 category_code를 가져와
 * 해당 산업의 IndustryConfig를 반환합니다.
 *
 * 폴백 정책:
 * 1. Supabase 조회 실패 → DEFAULT_INDUSTRY_CODE 사용
 * 2. Unknown industry code → DEFAULT_INDUSTRY_CODE 사용
 * 3. 로딩 중 → DEFAULT_INDUSTRY_CODE 사용 (플리커 방지)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  INDUSTRY_CONFIG,
  DEFAULT_INDUSTRY_CODE,
  IndustryConfig,
  getIndustryConfig,
} from '../config/industryConfig';

// ════════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ════════════════════════════════════════════════════════════════════════════════

export interface UseIndustryReturn {
  /** 현재 산업 설정 */
  config: IndustryConfig;
  /** 산업 코드 */
  industryCode: string;
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 (있을 경우) */
  error: Error | null;
  /** 설정 새로고침 */
  refresh: () => Promise<void>;
}

// ════════════════════════════════════════════════════════════════════════════════
// 캐시 (앱 전역에서 중복 요청 방지)
// ════════════════════════════════════════════════════════════════════════════════

let cachedConfig: IndustryConfig | null = null;
let cachedIndustryCode: string | null = null;

// ════════════════════════════════════════════════════════════════════════════════
// Hook 구현
// ════════════════════════════════════════════════════════════════════════════════

export function useIndustry(): UseIndustryReturn {
  const [config, setConfig] = useState<IndustryConfig>(
    cachedConfig ?? INDUSTRY_CONFIG[DEFAULT_INDUSTRY_CODE]
  );
  const [industryCode, setIndustryCode] = useState<string>(
    cachedIndustryCode ?? DEFAULT_INDUSTRY_CODE
  );
  const [loading, setLoading] = useState(!cachedConfig);
  const [error, setError] = useState<Error | null>(null);

  const loadIndustryConfig = useCallback(async () => {
    // 캐시가 있으면 스킵
    if (cachedConfig && cachedIndustryCode) {
      setConfig(cachedConfig);
      setIndustryCode(cachedIndustryCode);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 방법 1: organizations 테이블에 category_code가 직접 있는 경우
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, category_id, category_path')
        .limit(1)
        .single();

      if (orgError) {
        if (__DEV__) console.warn('[useIndustry] organizations 조회 실패, 기본값 사용:', orgError.message);
        applyFallback();
        return;
      }

      // category_path에서 코드 추출 또는 categories 테이블 조인
      let code: string | null = null;

      if (orgData?.category_id) {
        // categories 테이블에서 code 조회
        const { data: catData } = await supabase
          .from('categories')
          .select('code')
          .eq('id', orgData.category_id)
          .single();

        code = catData?.code ?? null;
      }

      // 코드 검증 및 설정
      if (code && INDUSTRY_CONFIG[code]) {
        const resolvedConfig = INDUSTRY_CONFIG[code];
        cachedConfig = resolvedConfig;
        cachedIndustryCode = code;
        setConfig(resolvedConfig);
        setIndustryCode(code);
      } else {
        if (__DEV__) console.warn(`[useIndustry] Unknown industry code: ${code}, 기본값 사용`);
        applyFallback();
      }
    } catch (err: unknown) {
      if (__DEV__) console.error('[useIndustry] 예외 발생:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      applyFallback();
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFallback = () => {
    const fallbackConfig = INDUSTRY_CONFIG[DEFAULT_INDUSTRY_CODE];
    cachedConfig = fallbackConfig;
    cachedIndustryCode = DEFAULT_INDUSTRY_CODE;
    setConfig(fallbackConfig);
    setIndustryCode(DEFAULT_INDUSTRY_CODE);
  };

  const refresh = useCallback(async () => {
    // 캐시 초기화 후 다시 로드
    cachedConfig = null;
    cachedIndustryCode = null;
    await loadIndustryConfig();
  }, [loadIndustryConfig]);

  useEffect(() => {
    loadIndustryConfig();
  }, [loadIndustryConfig]);

  return {
    config,
    industryCode,
    loading,
    error,
    refresh,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// 캐시 유틸리티 (테스트/디버그용)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * 캐시 초기화 (테스트용)
 */
export function clearIndustryCache(): void {
  cachedConfig = null;
  cachedIndustryCode = null;
}

/**
 * 수동으로 캐시 설정 (테스트/개발용)
 */
export function setIndustryCache(code: string): void {
  const config = getIndustryConfig(code);
  cachedConfig = config;
  cachedIndustryCode = code;
}
