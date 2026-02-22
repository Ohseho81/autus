/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏭 IndustryContext - 앱 전역 산업 설정 Provider
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 앱 전체에서 산업 설정에 접근할 수 있는 Context입니다.
 *
 * 사용법:
 * 1. App.tsx에서 <IndustryProvider>로 감싸기
 * 2. 컴포넌트에서 useIndustryConfig() 사용
 *
 * 예시:
 * const { config, loading } = useIndustryConfig();
 * <Text>{config.labels.entity} 목록</Text>  // "학생 목록" | "건축주 목록"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useIndustry, UseIndustryReturn } from '../hooks/useIndustry';
import { INDUSTRY_CONFIG, DEFAULT_INDUSTRY_CODE, IndustryConfig } from '../config/industryConfig';

// ════════════════════════════════════════════════════════════════════════════════
// Context 생성
// ════════════════════════════════════════════════════════════════════════════════

const IndustryContext = createContext<UseIndustryReturn | null>(null);

// ════════════════════════════════════════════════════════════════════════════════
// Provider 컴포넌트
// ════════════════════════════════════════════════════════════════════════════════

interface IndustryProviderProps {
  children: ReactNode;
  /** 테스트/개발용: 특정 산업 코드 강제 지정 */
  forceIndustryCode?: string;
}

export function IndustryProvider({ 
  children, 
  forceIndustryCode 
}: IndustryProviderProps): JSX.Element {
  const industry = useIndustry();

  // 강제 지정된 코드가 있으면 해당 설정 사용 (개발/테스트용)
  const value: UseIndustryReturn = forceIndustryCode
    ? {
        config: INDUSTRY_CONFIG[forceIndustryCode] ?? INDUSTRY_CONFIG[DEFAULT_INDUSTRY_CODE],
        industryCode: forceIndustryCode,
        loading: false,
        error: null,
        refresh: industry.refresh,
      }
    : industry;

  return (
    <IndustryContext.Provider value={value}>
      {children}
    </IndustryContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Consumer Hook
// ════════════════════════════════════════════════════════════════════════════════

/**
 * 산업 설정에 접근하는 Hook
 * 
 * @throws IndustryProvider 없이 사용 시 에러
 * 
 * @example
 * const { config } = useIndustryConfig();
 * return <Text>{config.labels.entity} 관리</Text>;
 */
export function useIndustryConfig(): UseIndustryReturn {
  const context = useContext(IndustryContext);
  
  if (!context) {
    throw new Error(
      '[useIndustryConfig] IndustryProvider가 상위에 없습니다. ' +
      'App.tsx에서 <IndustryProvider>로 감싸주세요.'
    );
  }
  
  return context;
}

// ════════════════════════════════════════════════════════════════════════════════
// 편의 Hook들
// ════════════════════════════════════════════════════════════════════════════════

/**
 * 라벨만 가져오는 편의 Hook
 */
export function useLabels() {
  const { config } = useIndustryConfig();
  return config.labels;
}

/**
 * 상태 설정만 가져오는 편의 Hook
 */
export function useStates() {
  const { config } = useIndustryConfig();
  return config.states;
}

/**
 * 색상만 가져오는 편의 Hook
 */
export function useColors() {
  const { config } = useIndustryConfig();
  return config.color;
}

/**
 * 기능 활성화 여부 확인 Hook
 */
export function useFeature(featureName: string): boolean {
  const { config } = useIndustryConfig();
  return config.features.includes(featureName);
}

// ════════════════════════════════════════════════════════════════════════════════
// HOC (Higher Order Component)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * 산업 설정을 props로 주입하는 HOC
 */
export function withIndustry<P extends object>(
  WrappedComponent: React.ComponentType<P & { industry: UseIndustryReturn }>
) {
  return function WithIndustryComponent(props: P) {
    const industry = useIndustryConfig();
    return <WrappedComponent {...props} industry={industry} />;
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// 타입 재익스포트 (편의상)
// ════════════════════════════════════════════════════════════════════════════════

export type { IndustryConfig, UseIndustryReturn };
