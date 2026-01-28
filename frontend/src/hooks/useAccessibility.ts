/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Accessibility Hooks
 * 접근성 기능 React 훅
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  prefersReducedMotion,
  trapFocus,
  announce,
  createKeyboardHandler,
  KeyboardHandlerOptions,
  RoleAccessibilityConfig,
  ROLE_ACCESSIBILITY_DEFAULTS,
  FontScale,
} from '../lib/accessibility';
import { RoleId } from '../types/roles';

// ─────────────────────────────────────────────────────────────────────────────
// useReducedMotion - Detect reduced motion preference
// ─────────────────────────────────────────────────────────────────────────────

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, []);

  return reducedMotion;
}

// ─────────────────────────────────────────────────────────────────────────────
// useFocusTrap - Trap focus within a container
// ─────────────────────────────────────────────────────────────────────────────

export function useFocusTrap<T extends HTMLElement>(
  active: boolean = true
): React.RefObject<T> {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const cleanup = trapFocus(containerRef.current);
    return cleanup;
  }, [active]);

  return containerRef;
}

// ─────────────────────────────────────────────────────────────────────────────
// useFocusReturn - Return focus to trigger element on close
// ─────────────────────────────────────────────────────────────────────────────

export function useFocusReturn(isOpen: boolean): void {
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useAnnounce - Screen reader announcements
// ─────────────────────────────────────────────────────────────────────────────

export function useAnnounce() {
  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announce(message, priority);
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// useKeyboardNavigation - Keyboard event handler
// ─────────────────────────────────────────────────────────────────────────────

export function useKeyboardNavigation(options: KeyboardHandlerOptions) {
  return useMemo(() => createKeyboardHandler(options), [options]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useRovingTabIndex - Roving tabindex for lists/grids
// ─────────────────────────────────────────────────────────────────────────────

export interface RovingTabIndexOptions {
  itemCount: number;
  orientation?: 'horizontal' | 'vertical' | 'grid';
  loop?: boolean;
  columns?: number; // For grid orientation
}

export interface RovingTabIndexReturn {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  getItemProps: (index: number) => {
    tabIndex: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: () => void;
  };
}

export function useRovingTabIndex(options: RovingTabIndexOptions): RovingTabIndexReturn {
  const { 
    itemCount, 
    orientation = 'vertical', 
    loop = true, 
    columns = 1 
  } = options;
  
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let newIndex = currentIndex;
      const isHorizontal = orientation === 'horizontal';
      const isGrid = orientation === 'grid';

      switch (e.key) {
        case 'ArrowUp':
          if (isGrid) {
            newIndex = currentIndex - columns;
          } else if (!isHorizontal) {
            newIndex = currentIndex - 1;
          }
          break;
        case 'ArrowDown':
          if (isGrid) {
            newIndex = currentIndex + columns;
          } else if (!isHorizontal) {
            newIndex = currentIndex + 1;
          }
          break;
        case 'ArrowLeft':
          if (isHorizontal || isGrid) {
            newIndex = currentIndex - 1;
          }
          break;
        case 'ArrowRight':
          if (isHorizontal || isGrid) {
            newIndex = currentIndex + 1;
          }
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = itemCount - 1;
          break;
        default:
          return;
      }

      e.preventDefault();

      if (loop) {
        if (newIndex < 0) newIndex = itemCount - 1;
        if (newIndex >= itemCount) newIndex = 0;
      } else {
        newIndex = Math.max(0, Math.min(newIndex, itemCount - 1));
      }

      setActiveIndex(newIndex);
    },
    [itemCount, orientation, loop, columns]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, index),
      onFocus: () => setActiveIndex(index),
    }),
    [activeIndex, handleKeyDown]
  );

  return { activeIndex, setActiveIndex, getItemProps };
}

// ─────────────────────────────────────────────────────────────────────────────
// useEscapeKey - Handle escape key press
// ─────────────────────────────────────────────────────────────────────────────

export function useEscapeKey(handler: () => void, active: boolean = true): void {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handler, active]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useHighContrast - Detect high contrast mode
// ─────────────────────────────────────────────────────────────────────────────

export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for forced colors (Windows high contrast mode)
    const mediaQuery = window.matchMedia('(forced-colors: active)');
    setHighContrast(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setHighContrast(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, []);

  return highContrast;
}

// ─────────────────────────────────────────────────────────────────────────────
// useFontScale - User font size preferences
// ─────────────────────────────────────────────────────────────────────────────

export function useFontScale(): FontScale {
  const [scale, setScale] = useState<FontScale>('base');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check localStorage for user preference
    const saved = localStorage.getItem('autus-font-scale') as FontScale;
    if (saved && ['sm', 'base', 'lg', 'xl', '2xl'].includes(saved)) {
      setScale(saved);
    }
  }, []);

  return scale;
}

export function useSetFontScale(): (scale: FontScale) => void {
  return useCallback((scale: FontScale) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('autus-font-scale', scale);
    // Trigger re-render in useFontScale
    window.dispatchEvent(new Event('storage'));
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// useRoleAccessibility - Role-specific accessibility settings
// ─────────────────────────────────────────────────────────────────────────────

export function useRoleAccessibility(roleId: RoleId): RoleAccessibilityConfig {
  const reducedMotion = useReducedMotion();
  const highContrast = useHighContrast();
  const defaults = ROLE_ACCESSIBILITY_DEFAULTS[roleId];

  return useMemo(() => ({
    ...defaults,
    reduceAnimations: defaults.reduceAnimations || reducedMotion,
    highContrast: defaults.highContrast || highContrast,
  }), [defaults, reducedMotion, highContrast]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useSkipLink - Skip link functionality
// ─────────────────────────────────────────────────────────────────────────────

export function useSkipLink(targetId: string): () => void {
  return useCallback(() => {
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.removeAttribute('tabindex');
    }
  }, [targetId]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useLiveRegion - Manage aria-live region
// ─────────────────────────────────────────────────────────────────────────────

export interface LiveRegionReturn {
  message: string;
  setMessage: (msg: string) => void;
  clearMessage: () => void;
  props: {
    role: 'status';
    'aria-live': 'polite' | 'assertive';
    'aria-atomic': true;
  };
}

export function useLiveRegion(
  priority: 'polite' | 'assertive' = 'polite'
): LiveRegionReturn {
  const [message, setMessage] = useState('');

  const clearMessage = useCallback(() => setMessage(''), []);

  const props = useMemo(
    () => ({
      role: 'status' as const,
      'aria-live': priority,
      'aria-atomic': true as const,
    }),
    [priority]
  );

  return { message, setMessage, clearMessage, props };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAccessibleDialog - Dialog accessibility
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessibleDialogReturn {
  dialogRef: React.RefObject<HTMLDivElement>;
  titleId: string;
  descriptionId: string;
  dialogProps: {
    role: 'dialog';
    'aria-modal': true;
    'aria-labelledby': string;
    'aria-describedby'?: string;
  };
  close: () => void;
}

export function useAccessibleDialog(
  id: string,
  isOpen: boolean,
  onClose: () => void,
  hasDescription: boolean = false
): AccessibleDialogReturn {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  useFocusReturn(isOpen);
  useEscapeKey(onClose, isOpen);

  const titleId = `${id}-title`;
  const descriptionId = hasDescription ? `${id}-description` : undefined;

  const dialogProps = useMemo(
    () => ({
      role: 'dialog' as const,
      'aria-modal': true as const,
      'aria-labelledby': titleId,
      'aria-describedby': descriptionId,
    }),
    [titleId, descriptionId]
  );

  return {
    dialogRef,
    titleId,
    descriptionId: descriptionId || '',
    dialogProps,
    close: onClose,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAccessibleTabs - Tab panel accessibility
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessibleTabsReturn {
  activeTab: number;
  setActiveTab: (index: number) => void;
  getTabProps: (index: number) => {
    id: string;
    role: 'tab';
    'aria-selected': boolean;
    'aria-controls': string;
    tabIndex: number;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onClick: () => void;
  };
  getPanelProps: (index: number) => {
    id: string;
    role: 'tabpanel';
    'aria-labelledby': string;
    hidden: boolean;
    tabIndex: number;
  };
  tabListProps: {
    role: 'tablist';
    'aria-orientation': 'horizontal' | 'vertical';
  };
}

export function useAccessibleTabs(
  id: string,
  tabCount: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): AccessibleTabsReturn {
  const { activeIndex: activeTab, setActiveIndex: setActiveTab, getItemProps } =
    useRovingTabIndex({
      itemCount: tabCount,
      orientation,
    });

  const getTabProps = useCallback(
    (index: number) => {
      const itemProps = getItemProps(index);
      return {
        id: `${id}-tab-${index}`,
        role: 'tab' as const,
        'aria-selected': activeTab === index,
        'aria-controls': `${id}-panel-${index}`,
        tabIndex: itemProps.tabIndex,
        onKeyDown: itemProps.onKeyDown,
        onClick: () => setActiveTab(index),
      };
    },
    [id, activeTab, getItemProps, setActiveTab]
  );

  const getPanelProps = useCallback(
    (index: number) => ({
      id: `${id}-panel-${index}`,
      role: 'tabpanel' as const,
      'aria-labelledby': `${id}-tab-${index}`,
      hidden: activeTab !== index,
      tabIndex: activeTab === index ? 0 : -1,
    }),
    [id, activeTab]
  );

  const tabListProps = useMemo(
    () => ({
      role: 'tablist' as const,
      'aria-orientation': orientation,
    }),
    [orientation]
  );

  return {
    activeTab,
    setActiveTab,
    getTabProps,
    getPanelProps,
    tabListProps,
  };
}
