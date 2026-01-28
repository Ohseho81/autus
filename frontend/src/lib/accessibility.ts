/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Accessibility System
 * WCAG 2.1 AA 준수 접근성 유틸리티
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Color Contrast (WCAG AA Compliance)
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRAST_RATIOS = {
  AA_NORMAL_TEXT: 4.5, // Minimum for normal text
  AA_LARGE_TEXT: 3,    // Minimum for large text (18pt+ or 14pt bold)
  AAA_NORMAL_TEXT: 7,  // Enhanced for normal text
  AAA_LARGE_TEXT: 4.5, // Enhanced for large text
} as const;

// Accessible color pairs (background: foreground)
export const ACCESSIBLE_COLORS = {
  // Status Colors with guaranteed contrast
  success: {
    bg: '#059669',
    text: '#ffffff',
    lightBg: '#d1fae5',
    lightText: '#065f46',
  },
  warning: {
    bg: '#d97706',
    text: '#ffffff',
    lightBg: '#fef3c7',
    lightText: '#92400e',
  },
  error: {
    bg: '#dc2626',
    text: '#ffffff',
    lightBg: '#fee2e2',
    lightText: '#991b1b',
  },
  info: {
    bg: '#2563eb',
    text: '#ffffff',
    lightBg: '#dbeafe',
    lightText: '#1e40af',
  },
  // Theme-specific accessible pairs
  dark: {
    bg: '#0f172a',
    text: '#f1f5f9',
    muted: '#94a3b8',
  },
  light: {
    bg: '#ffffff',
    text: '#1e293b',
    muted: '#64748b',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ARIA Attributes Helper
// ─────────────────────────────────────────────────────────────────────────────

export interface AriaProps {
  role?: React.AriaRole;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-hidden'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false';
  'aria-disabled'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-pressed'?: boolean | 'mixed';
  'aria-selected'?: boolean;
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-activedescendant'?: string;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  'aria-modal'?: boolean;
  tabIndex?: number;
}

export function createAriaLabel(text: string, context?: string): string {
  return context ? `${text}, ${context}` : text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard Navigation
// ─────────────────────────────────────────────────────────────────────────────

export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

export type KeyboardKey = typeof KEYBOARD_KEYS[keyof typeof KEYBOARD_KEYS];

export interface KeyboardHandlerOptions {
  onEnter?: () => void;
  onSpace?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export function createKeyboardHandler(options: KeyboardHandlerOptions) {
  return (event: React.KeyboardEvent) => {
    const { preventDefault = true, stopPropagation = false } = options;

    const handlers: Record<string, (() => void) | undefined> = {
      [KEYBOARD_KEYS.ENTER]: options.onEnter,
      [KEYBOARD_KEYS.SPACE]: options.onSpace,
      [KEYBOARD_KEYS.ESCAPE]: options.onEscape,
      [KEYBOARD_KEYS.ARROW_UP]: options.onArrowUp,
      [KEYBOARD_KEYS.ARROW_DOWN]: options.onArrowDown,
      [KEYBOARD_KEYS.ARROW_LEFT]: options.onArrowLeft,
      [KEYBOARD_KEYS.ARROW_RIGHT]: options.onArrowRight,
      [KEYBOARD_KEYS.HOME]: options.onHome,
      [KEYBOARD_KEYS.END]: options.onEnd,
    };

    const handler = handlers[event.key];
    if (handler) {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      handler();
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Focus Management
// ─────────────────────────────────────────────────────────────────────────────

export const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
  'audio[controls]',
  'video[controls]',
  'details > summary',
].join(', ');

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
}

export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => container.removeEventListener('keydown', handleKeyDown);
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen Reader Utilities
// ─────────────────────────────────────────────────────────────────────────────

// Visually hidden but accessible to screen readers
export const srOnlyClass = 'sr-only';
export const srOnlyFocusableClass = 'sr-only focus:not-sr-only';

export const srOnlyStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
};

// Live region announcement
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const id = `aria-live-${priority}`;
  let region = document.getElementById(id);
  
  if (!region) {
    region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    Object.assign(region.style, srOnlyStyles);
    document.body.appendChild(region);
  }

  // Clear and re-announce to trigger screen readers
  region.textContent = '';
  setTimeout(() => {
    region!.textContent = message;
  }, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reduced Motion Support
// ─────────────────────────────────────────────────────────────────────────────

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const reducedMotionClass = 'motion-reduce:transition-none motion-reduce:animate-none';

export interface AnimationConfig {
  duration: number;
  delay?: number;
  easing?: string;
}

export function getAccessibleAnimation(
  config: AnimationConfig,
  reducedMotionOverride?: boolean
): AnimationConfig {
  const shouldReduceMotion = reducedMotionOverride ?? prefersReducedMotion();
  
  if (shouldReduceMotion) {
    return { ...config, duration: 0, delay: 0 };
  }
  return config;
}

// ─────────────────────────────────────────────────────────────────────────────
// Font Size Scaling
// ─────────────────────────────────────────────────────────────────────────────

export const FONT_SCALE = {
  sm: 0.875,   // 14px at base 16
  base: 1,     // 16px
  lg: 1.125,   // 18px
  xl: 1.25,    // 20px
  '2xl': 1.5,  // 24px
} as const;

export type FontScale = keyof typeof FONT_SCALE;

export function scaledFontSize(baseSize: number, scale: FontScale): number {
  return Math.round(baseSize * FONT_SCALE[scale]);
}

// CSS class for respecting user font size preferences
export const respectFontSizeClass = 'text-[1rem]'; // Uses rem for scaling

// ─────────────────────────────────────────────────────────────────────────────
// Form Accessibility
// ─────────────────────────────────────────────────────────────────────────────

export interface FormFieldAccessibility {
  id: string;
  labelId: string;
  descriptionId?: string;
  errorId?: string;
  'aria-labelledby': string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}

export function createFormFieldIds(
  name: string,
  hasDescription: boolean = false,
  hasError: boolean = false,
  required: boolean = false
): FormFieldAccessibility {
  const id = `field-${name}`;
  const labelId = `label-${name}`;
  const descriptionId = hasDescription ? `desc-${name}` : undefined;
  const errorId = hasError ? `error-${name}` : undefined;

  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ');

  return {
    id,
    labelId,
    descriptionId,
    errorId,
    'aria-labelledby': labelId,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': hasError,
    'aria-required': required,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Skip Links
// ─────────────────────────────────────────────────────────────────────────────

export interface SkipLink {
  id: string;
  label: string;
  target: string;
}

export const DEFAULT_SKIP_LINKS: SkipLink[] = [
  { id: 'skip-to-main', label: '메인 콘텐츠로 건너뛰기', target: '#main-content' },
  { id: 'skip-to-nav', label: '네비게이션으로 건너뛰기', target: '#main-navigation' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Role-Specific Accessibility
// ─────────────────────────────────────────────────────────────────────────────

import { RoleId } from '../types/roles';

export interface RoleAccessibilityConfig {
  fontSize: FontScale;
  touchTargetSize: 'min' | 'comfortable' | 'large';
  reduceAnimations: boolean;
  highContrast: boolean;
  simplifiedUI: boolean;
}

export const ROLE_ACCESSIBILITY_DEFAULTS: Record<RoleId, RoleAccessibilityConfig> = {
  owner: {
    fontSize: 'base',
    touchTargetSize: 'min',
    reduceAnimations: false,
    highContrast: false,
    simplifiedUI: false,
  },
  manager: {
    fontSize: 'base',
    touchTargetSize: 'min',
    reduceAnimations: false,
    highContrast: false,
    simplifiedUI: false,
  },
  teacher: {
    fontSize: 'base',
    touchTargetSize: 'comfortable',
    reduceAnimations: false,
    highContrast: false,
    simplifiedUI: false,
  },
  parent: {
    fontSize: 'lg',
    touchTargetSize: 'large',
    reduceAnimations: true,
    highContrast: false,
    simplifiedUI: true,
  },
  student: {
    fontSize: 'lg',
    touchTargetSize: 'large',
    reduceAnimations: false,
    highContrast: false,
    simplifiedUI: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility Testing Helpers (Development Only)
// ─────────────────────────────────────────────────────────────────────────────

export function checkContrastRatio(
  foreground: string,
  background: string
): number {
  // Simplified contrast calculation
  // In production, use a proper color library
  const getLuminance = (color: string): number => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const sRGB = [r, g, b].map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = checkContrastRatio(foreground, background);
  const required = level === 'AAA'
    ? (isLargeText ? CONTRAST_RATIOS.AAA_LARGE_TEXT : CONTRAST_RATIOS.AAA_NORMAL_TEXT)
    : (isLargeText ? CONTRAST_RATIOS.AA_LARGE_TEXT : CONTRAST_RATIOS.AA_NORMAL_TEXT);

  return ratio >= required;
}
