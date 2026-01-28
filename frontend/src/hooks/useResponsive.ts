/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Responsive Hooks
 * 반응형 디자인 React 훅
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BREAKPOINTS,
  Breakpoint,
  DeviceType,
  Orientation,
  getDeviceType,
  getOrientation,
  LAYOUT,
  SPACING,
  TYPOGRAPHY,
  mediaQueries,
} from '../lib/responsive';

// ─────────────────────────────────────────────────────────────────────────────
// useMediaQuery - Match CSS media queries
// ─────────────────────────────────────────────────────────────────────────────

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Modern browsers
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', listener);
      return () => mediaQueryList.removeEventListener('change', listener);
    }
    // Legacy browsers
    mediaQueryList.addListener(listener);
    return () => mediaQueryList.removeListener(listener);
  }, [query]);

  return matches;
}

// ─────────────────────────────────────────────────────────────────────────────
// useBreakpoint - Current breakpoint detection
// ─────────────────────────────────────────────────────────────────────────────

export interface BreakpointState {
  breakpoint: Breakpoint;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2xl: boolean;
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() => {
    if (typeof window === 'undefined') {
      return {
        breakpoint: 'lg',
        width: 1024,
        height: 768,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isXs: false,
        isSm: false,
        isMd: false,
        isLg: true,
        isXl: false,
        is2xl: false,
      };
    }
    return calculateBreakpointState(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setState(calculateBreakpointState(window.innerWidth, window.innerHeight));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}

function calculateBreakpointState(width: number, height: number): BreakpointState {
  let breakpoint: Breakpoint = 'xs';
  
  if (width >= BREAKPOINTS['2xl']) breakpoint = '2xl';
  else if (width >= BREAKPOINTS.xl) breakpoint = 'xl';
  else if (width >= BREAKPOINTS.lg) breakpoint = 'lg';
  else if (width >= BREAKPOINTS.md) breakpoint = 'md';
  else if (width >= BREAKPOINTS.sm) breakpoint = 'sm';

  return {
    breakpoint,
    width,
    height,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isXs: width < BREAKPOINTS.sm,
    isSm: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isMd: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isLg: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isXl: width >= BREAKPOINTS.xl && width < BREAKPOINTS['2xl'],
    is2xl: width >= BREAKPOINTS['2xl'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useDeviceType - Current device type
// ─────────────────────────────────────────────────────────────────────────────

export function useDeviceType(): DeviceType {
  const { width } = useBreakpoint();
  return useMemo(() => getDeviceType(width), [width]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useOrientation - Device orientation
// ─────────────────────────────────────────────────────────────────────────────

export function useOrientation(): Orientation {
  const { width, height } = useBreakpoint();
  return useMemo(() => getOrientation(width, height), [width, height]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useResponsiveValue - Get value based on current breakpoint
// ─────────────────────────────────────────────────────────────────────────────

export interface ResponsiveValues<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}

export function useResponsiveValue<T>(values: ResponsiveValues<T>, defaultValue: T): T {
  const { breakpoint } = useBreakpoint();
  
  return useMemo(() => {
    const breakpoints: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpoints.indexOf(breakpoint);
    
    for (let i = currentIndex; i < breakpoints.length; i++) {
      const bp = breakpoints[i];
      if (values[bp] !== undefined) {
        return values[bp]!;
      }
    }
    return defaultValue;
  }, [values, breakpoint, defaultValue]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useLayout - Device-specific layout config
// ─────────────────────────────────────────────────────────────────────────────

export function useLayout() {
  const deviceType = useDeviceType();
  
  return useMemo(() => ({
    ...LAYOUT[deviceType],
    spacing: SPACING[deviceType],
    typography: TYPOGRAPHY[deviceType],
  }), [deviceType]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useTouchDevice - Detect touch capability
// ─────────────────────────────────────────────────────────────────────────────

export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - Legacy check
      navigator.msMaxTouchPoints > 0;

    setIsTouch(isTouchDevice);
  }, []);

  return isTouch;
}

// ─────────────────────────────────────────────────────────────────────────────
// useScrollDirection - Detect scroll direction for hiding/showing elements
// ─────────────────────────────────────────────────────────────────────────────

export type ScrollDirection = 'up' | 'down' | null;

export function useScrollDirection(threshold: number = 10): ScrollDirection {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const diff = scrollY - lastScrollY;

      if (Math.abs(diff) > threshold) {
        setScrollDirection(diff > 0 ? 'down' : 'up');
        lastScrollY = scrollY;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrollDirection;
}

// ─────────────────────────────────────────────────────────────────────────────
// useViewportSize - Get viewport dimensions
// ─────────────────────────────────────────────────────────────────────────────

export interface ViewportSize {
  width: number;
  height: number;
  vw: number; // 1vw in pixels
  vh: number; // 1vh in pixels
}

export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(() => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768, vw: 10.24, vh: 7.68 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      vw: window.innerWidth / 100,
      vh: window.innerHeight / 100,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
        vw: window.innerWidth / 100,
        vh: window.innerHeight / 100,
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// ─────────────────────────────────────────────────────────────────────────────
// useSafeAreaInsets - Get safe area insets (for mobile notches)
// ─────────────────────────────────────────────────────────────────────────────

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0, right: 0, bottom: 0, left: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') return;

    const updateInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
      });
    };

    // Set CSS variables for safe area
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');

    updateInsets();
    window.addEventListener('resize', updateInsets, { passive: true });
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  return insets;
}

// ─────────────────────────────────────────────────────────────────────────────
// Responsive Container Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface ResponsiveContainerConfig {
  padding: string;
  maxWidth: string;
  gridCols: number;
  gap: string;
}

export function useResponsiveContainer(): ResponsiveContainerConfig {
  const deviceType = useDeviceType();
  
  return useMemo(() => {
    switch (deviceType) {
      case 'mobile':
        return {
          padding: 'px-4',
          maxWidth: 'max-w-md',
          gridCols: 1,
          gap: 'gap-3',
        };
      case 'tablet':
        return {
          padding: 'px-6',
          maxWidth: 'max-w-3xl',
          gridCols: 2,
          gap: 'gap-4',
        };
      case 'desktop':
      default:
        return {
          padding: 'px-8',
          maxWidth: 'max-w-7xl',
          gridCols: 3,
          gap: 'gap-6',
        };
    }
  }, [deviceType]);
}
