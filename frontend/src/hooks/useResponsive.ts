/**
 * AUTUS 반응형 Hook
 * - 현재 브레이크포인트 감지
 * - 미디어 쿼리 매칭
 * - SSR 안전
 */

import { useState, useEffect, useCallback } from 'react';

// Tailwind 브레이크포인트 (pixels)
const BREAKPOINTS = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

interface UseResponsiveReturn {
  // 현재 브레이크포인트
  breakpoint: Breakpoint;
  
  // 브레이크포인트 체크
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2xl: boolean;
  is3xl: boolean;
  
  // 최소 브레이크포인트 체크
  isSmUp: boolean;
  isMdUp: boolean;
  isLgUp: boolean;
  isXlUp: boolean;
  is2xlUp: boolean;
  
  // 최대 브레이크포인트 체크
  isSmDown: boolean;
  isMdDown: boolean;
  isLgDown: boolean;
  isXlDown: boolean;
  
  // 화면 크기
  width: number;
  height: number;
  
  // 디바이스 타입
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // 유틸리티
  matches: (query: string) => boolean;
}

export function useResponsive(): UseResponsiveReturn {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  // 리사이즈 핸들러 (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 현재 브레이크포인트 계산
  const getBreakpoint = useCallback((width: number): Breakpoint => {
    if (width >= BREAKPOINTS['3xl']) return '3xl';
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    if (width >= BREAKPOINTS.xs) return 'xs';
    return 'xs';
  }, []);

  // 미디어 쿼리 매칭
  const matches = useCallback((query: string): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  }, []);

  const { width, height } = dimensions;
  const breakpoint = getBreakpoint(width);

  return {
    breakpoint,
    
    // 정확한 브레이크포인트
    isXs: breakpoint === 'xs',
    isSm: breakpoint === 'sm',
    isMd: breakpoint === 'md',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl',
    is2xl: breakpoint === '2xl',
    is3xl: breakpoint === '3xl',
    
    // 최소 브레이크포인트 (>= breakpoint)
    isSmUp: width >= BREAKPOINTS.sm,
    isMdUp: width >= BREAKPOINTS.md,
    isLgUp: width >= BREAKPOINTS.lg,
    isXlUp: width >= BREAKPOINTS.xl,
    is2xlUp: width >= BREAKPOINTS['2xl'],
    
    // 최대 브레이크포인트 (< breakpoint)
    isSmDown: width < BREAKPOINTS.sm,
    isMdDown: width < BREAKPOINTS.md,
    isLgDown: width < BREAKPOINTS.lg,
    isXlDown: width < BREAKPOINTS.xl,
    
    // 화면 크기
    width,
    height,
    
    // 디바이스 타입
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    
    // 유틸리티
    matches,
  };
}

// 특정 브레이크포인트 체크 Hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// 모바일 여부 체크 Hook
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

// 터치 디바이스 여부 체크 Hook
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }, []);

  return isTouch;
}

// 가로/세로 모드 체크 Hook
export function useOrientation(): 'portrait' | 'landscape' {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  return isPortrait ? 'portrait' : 'landscape';
}

// 선호 컬러 스킴 체크 Hook
export function usePrefersColorScheme(): 'light' | 'dark' {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  return prefersDark ? 'dark' : 'light';
}

// 선호 애니메이션 감소 체크 Hook
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export default useResponsive;
