/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Responsive Design System
 * 반응형 브레이크포인트 및 유틸리티
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// Breakpoint Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  xs: 320,   // Small mobile
  sm: 480,   // Mobile
  md: 768,   // Tablet
  lg: 1024,  // Desktop
  xl: 1280,  // Large desktop
  '2xl': 1536, // Extra large
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ─────────────────────────────────────────────────────────────────────────────
// Device Types
// ─────────────────────────────────────────────────────────────────────────────

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.md) return 'mobile';
  if (width < BREAKPOINTS.lg) return 'tablet';
  return 'desktop';
}

// ─────────────────────────────────────────────────────────────────────────────
// Orientation
// ─────────────────────────────────────────────────────────────────────────────

export type Orientation = 'portrait' | 'landscape';

export function getOrientation(width: number, height: number): Orientation {
  return height > width ? 'portrait' : 'landscape';
}

// ─────────────────────────────────────────────────────────────────────────────
// Role-specific Device Priorities
// ─────────────────────────────────────────────────────────────────────────────

import { RoleId } from '../types/roles';

export const ROLE_DEVICE_PRIORITY: Record<RoleId, DeviceType> = {
  owner: 'desktop',
  manager: 'desktop',
  teacher: 'tablet',
  parent: 'mobile',
  student: 'mobile',
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS Media Query Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const mediaQueries = {
  mobile: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
  
  // Min-width queries
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  '2xl': `(min-width: ${BREAKPOINTS['2xl']}px)`,
  
  // Touch/pointer queries
  touch: '(hover: none) and (pointer: coarse)',
  fine: '(hover: hover) and (pointer: fine)',
  
  // Reduced motion
  reducedMotion: '(prefers-reduced-motion: reduce)',
  
  // Color scheme
  darkMode: '(prefers-color-scheme: dark)',
  lightMode: '(prefers-color-scheme: light)',
  
  // Orientation
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tailwind Responsive Classes Generator
// ─────────────────────────────────────────────────────────────────────────────

export interface ResponsiveValue<T> {
  base?: T;
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}

export function responsiveClass<T extends string>(
  values: ResponsiveValue<T>,
  prefix: string = ''
): string {
  const classes: string[] = [];
  
  if (values.base) classes.push(`${prefix}${values.base}`);
  if (values.xs) classes.push(`xs:${prefix}${values.xs}`);
  if (values.sm) classes.push(`sm:${prefix}${values.sm}`);
  if (values.md) classes.push(`md:${prefix}${values.md}`);
  if (values.lg) classes.push(`lg:${prefix}${values.lg}`);
  if (values.xl) classes.push(`xl:${prefix}${values.xl}`);
  if (values['2xl']) classes.push(`2xl:${prefix}${values['2xl']}`);
  
  return classes.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Touch Target Utilities
// ─────────────────────────────────────────────────────────────────────────────

export const TOUCH_TARGET = {
  minSize: 44, // Minimum 44x44px for accessibility
  minSpacing: 8, // Minimum spacing between targets
  comfortableSize: 48,
  largeSize: 56,
} as const;

export function getTouchTargetClass(size: 'min' | 'comfortable' | 'large' = 'comfortable'): string {
  switch (size) {
    case 'min':
      return 'min-w-[44px] min-h-[44px]';
    case 'comfortable':
      return 'min-w-[48px] min-h-[48px]';
    case 'large':
      return 'min-w-[56px] min-h-[56px]';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Spacing Scale
// ─────────────────────────────────────────────────────────────────────────────

export const SPACING = {
  // Mobile-first spacing
  mobile: {
    page: 16, // px padding
    card: 12,
    section: 24,
    element: 8,
  },
  // Tablet spacing
  tablet: {
    page: 24,
    card: 16,
    section: 32,
    element: 12,
  },
  // Desktop spacing
  desktop: {
    page: 32,
    card: 20,
    section: 48,
    element: 16,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Typography Scale
// ─────────────────────────────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  mobile: {
    h1: { size: 24, lineHeight: 1.2, weight: 700 },
    h2: { size: 20, lineHeight: 1.3, weight: 600 },
    h3: { size: 18, lineHeight: 1.4, weight: 600 },
    body: { size: 16, lineHeight: 1.5, weight: 400 },
    small: { size: 14, lineHeight: 1.5, weight: 400 },
    caption: { size: 12, lineHeight: 1.4, weight: 400 },
  },
  tablet: {
    h1: { size: 28, lineHeight: 1.2, weight: 700 },
    h2: { size: 24, lineHeight: 1.3, weight: 600 },
    h3: { size: 20, lineHeight: 1.4, weight: 600 },
    body: { size: 16, lineHeight: 1.5, weight: 400 },
    small: { size: 14, lineHeight: 1.5, weight: 400 },
    caption: { size: 12, lineHeight: 1.4, weight: 400 },
  },
  desktop: {
    h1: { size: 32, lineHeight: 1.2, weight: 700 },
    h2: { size: 28, lineHeight: 1.3, weight: 600 },
    h3: { size: 24, lineHeight: 1.4, weight: 600 },
    body: { size: 16, lineHeight: 1.6, weight: 400 },
    small: { size: 14, lineHeight: 1.5, weight: 400 },
    caption: { size: 12, lineHeight: 1.4, weight: 400 },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Layout Helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface LayoutConfig {
  columns: number;
  gap: number;
  padding: number;
  maxWidth?: number;
}

export const LAYOUT: Record<DeviceType, LayoutConfig> = {
  mobile: {
    columns: 1,
    gap: 12,
    padding: 16,
    maxWidth: 480,
  },
  tablet: {
    columns: 2,
    gap: 16,
    padding: 24,
    maxWidth: 768,
  },
  desktop: {
    columns: 3,
    gap: 24,
    padding: 32,
    maxWidth: 1280,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Container Classes
// ─────────────────────────────────────────────────────────────────────────────

export const containerClasses = {
  page: 'px-4 md:px-6 lg:px-8 mx-auto max-w-7xl',
  section: 'py-6 md:py-8 lg:py-12',
  card: 'p-3 md:p-4 lg:p-5',
  grid: {
    1: 'grid grid-cols-1',
    2: 'grid grid-cols-1 md:grid-cols-2',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    auto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  },
  gap: {
    sm: 'gap-2 md:gap-3 lg:gap-4',
    md: 'gap-3 md:gap-4 lg:gap-6',
    lg: 'gap-4 md:gap-6 lg:gap-8',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Safe Area Insets (for mobile notches/home indicators)
// ─────────────────────────────────────────────────────────────────────────────

export const safeAreaClasses = {
  top: 'pt-[env(safe-area-inset-top)]',
  bottom: 'pb-[env(safe-area-inset-bottom)]',
  left: 'pl-[env(safe-area-inset-left)]',
  right: 'pr-[env(safe-area-inset-right)]',
  all: 'p-[env(safe-area-inset-top)] p-[env(safe-area-inset-right)] p-[env(safe-area-inset-bottom)] p-[env(safe-area-inset-left)]',
} as const;
