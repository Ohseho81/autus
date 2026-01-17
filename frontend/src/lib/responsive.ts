/**
 * AUTUS 반응형 유틸리티
 * - clsx/tailwind-merge 대체
 * - 조건부 클래스
 * - 반응형 값
 */

import { clsx, type ClassValue } from 'clsx';

// 클래스 병합 유틸리티
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// 반응형 값 타입
type ResponsiveValue<T> = T | {
  base?: T;
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
};

// 반응형 프롭 변환
export function getResponsiveValue<T>(
  value: ResponsiveValue<T>,
  breakpoint: string
): T | undefined {
  if (typeof value !== 'object' || value === null) {
    return value as T;
  }

  const obj = value as Record<string, T>;
  
  // 현재 브레이크포인트부터 base까지 탐색
  const order = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs', 'base'];
  const startIndex = order.indexOf(breakpoint);
  
  for (let i = startIndex; i < order.length; i++) {
    const key = order[i];
    if (obj[key] !== undefined) {
      return obj[key];
    }
  }
  
  return undefined;
}

// 반응형 간격 맵
export const spacing = {
  // 패딩
  p: {
    none: 'p-0',
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },
  px: {
    none: 'px-0',
    xs: 'px-1',
    sm: 'px-2',
    md: 'px-4',
    lg: 'px-6',
    xl: 'px-8',
  },
  py: {
    none: 'py-0',
    xs: 'py-1',
    sm: 'py-2',
    md: 'py-4',
    lg: 'py-6',
    xl: 'py-8',
  },
  // 마진
  m: {
    none: 'm-0',
    xs: 'm-1',
    sm: 'm-2',
    md: 'm-4',
    lg: 'm-6',
    xl: 'm-8',
  },
  // 갭
  gap: {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },
} as const;

// 반응형 레이아웃 유틸리티
export const layout = {
  container: cn(
    'w-full mx-auto px-4',
    'sm:px-6',
    'lg:px-8',
    'max-w-7xl'
  ),
  
  containerNarrow: cn(
    'w-full mx-auto px-4',
    'sm:px-6',
    'max-w-3xl'
  ),
  
  containerWide: cn(
    'w-full mx-auto px-4',
    'sm:px-6',
    'lg:px-8',
    'max-w-[1920px]'
  ),
  
  // 반응형 그리드
  grid: {
    cols1: 'grid grid-cols-1',
    cols2: 'grid grid-cols-1 sm:grid-cols-2',
    cols3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    cols4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    auto: 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))]',
  },
  
  // 반응형 플렉스
  flex: {
    row: 'flex flex-col sm:flex-row',
    col: 'flex flex-col',
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    wrap: 'flex flex-wrap',
  },
  
  // 반응형 스택
  stack: {
    sm: 'flex flex-col gap-2 sm:gap-3',
    md: 'flex flex-col gap-3 sm:gap-4',
    lg: 'flex flex-col gap-4 sm:gap-6',
  },
} as const;

// 반응형 텍스트
export const text = {
  // 제목
  h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
  h2: 'text-xl sm:text-2xl lg:text-3xl font-bold',
  h3: 'text-lg sm:text-xl font-semibold',
  h4: 'text-base sm:text-lg font-semibold',
  
  // 본문
  body: 'text-sm sm:text-base',
  bodyLg: 'text-base sm:text-lg',
  bodySm: 'text-xs sm:text-sm',
  
  // 캡션
  caption: 'text-xs text-slate-400',
  
  // 라벨
  label: 'text-sm font-medium text-slate-300',
} as const;

// 반응형 숨김/표시
export const visibility = {
  hiddenMobile: 'hidden sm:block',
  hiddenTablet: 'block sm:hidden lg:block',
  hiddenDesktop: 'block lg:hidden',
  showMobile: 'block sm:hidden',
  showTablet: 'hidden sm:block lg:hidden',
  showDesktop: 'hidden lg:block',
} as const;

// 터치 타겟 유틸리티
export const touchTarget = cn(
  'min-h-[44px] min-w-[44px]',
  'sm:min-h-[36px] sm:min-w-[36px]'
);

// 접근성 유틸리티
export const a11y = {
  srOnly: 'sr-only',
  notSrOnly: 'not-sr-only',
  focusVisible: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2',
  focusWithin: 'focus-within:ring-2 focus-within:ring-cyan-500',
} as const;

export default { cn, spacing, layout, text, visibility, touchTarget, a11y };
