/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Role-Based Layout
 * 역할별 반응형 레이아웃 컴포넌트
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { ReactNode, useMemo } from 'react';
import { useRoleContext } from '../../contexts/RoleContext';
import { useBreakpoint, useDeviceType, useSafeAreaInsets } from '../../hooks/useResponsive';
import { useRoleAccessibility, useReducedMotion } from '../../hooks/useAccessibility';
import { ROLES, RoleId } from '../../types/roles';
import { containerClasses } from '../../lib/responsive';
import { AdaptiveNavigation } from './AdaptiveNavigation';
import { SkipLinks } from './SkipLinks';
import { OfflineIndicator } from './OfflineIndicator';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RoleBasedLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
  showHeader?: boolean;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function RoleBasedLayout({
  children,
  showNavigation = true,
  showHeader = true,
  className = '',
  maxWidth = 'xl',
}: RoleBasedLayoutProps) {
  const { currentRole, theme } = useRoleContext();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const deviceType = useDeviceType();
  const safeArea = useSafeAreaInsets();
  const accessibility = useRoleAccessibility(currentRole);
  const reducedMotion = useReducedMotion();

  const roleConfig = ROLES[currentRole];

  // Layout classes based on role and device
  const layoutClasses = useMemo(() => {
    const baseClasses = [
      'min-h-screen',
      'transition-colors',
      reducedMotion ? '' : 'duration-300',
    ];

    // Background based on theme
    if (theme.mode === 'dark') {
      baseClasses.push('bg-slate-900 text-white');
    } else {
      baseClasses.push('text-slate-900');
      // Special backgrounds for certain roles
      if (currentRole === 'parent') {
        baseClasses.push('bg-orange-50');
      } else if (currentRole === 'student') {
        baseClasses.push('bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500');
      } else {
        baseClasses.push('bg-slate-50');
      }
    }

    return baseClasses.filter(Boolean).join(' ');
  }, [theme.mode, currentRole, reducedMotion]);

  // Main content classes
  const mainClasses = useMemo(() => {
    const classes = ['flex-1', 'overflow-auto'];

    // Padding based on device and navigation
    if (showNavigation) {
      if (isDesktop) {
        classes.push('ml-64'); // Sidebar width
      } else if (isMobile) {
        classes.push('pb-16'); // Bottom nav height
      }
    }

    // Max width
    switch (maxWidth) {
      case 'sm':
        classes.push('max-w-2xl');
        break;
      case 'md':
        classes.push('max-w-4xl');
        break;
      case 'lg':
        classes.push('max-w-6xl');
        break;
      case 'xl':
        classes.push('max-w-7xl');
        break;
      case 'full':
        break;
    }

    if (maxWidth !== 'full') {
      classes.push('mx-auto');
    }

    return classes.join(' ');
  }, [showNavigation, isDesktop, isMobile, maxWidth]);

  // Safe area padding styles
  const safeAreaStyle = useMemo(() => ({
    paddingTop: safeArea.top > 0 ? `${safeArea.top}px` : undefined,
    paddingBottom: safeArea.bottom > 0 ? `${safeArea.bottom}px` : undefined,
  }), [safeArea]);

  return (
    <div 
      className={`${layoutClasses} ${className}`}
      style={safeAreaStyle}
      data-role={currentRole}
      data-device={deviceType}
    >
      {/* Skip Links for Accessibility */}
      <SkipLinks />

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Navigation */}
      {showNavigation && <AdaptiveNavigation />}

      {/* Main Content */}
      <main 
        id="main-content"
        className={mainClasses}
        role="main"
        aria-label="메인 콘텐츠"
      >
        {children}
      </main>

      {/* Mobile Bottom Safe Area */}
      {isMobile && safeArea.bottom > 0 && (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-inherit"
          style={{ height: `${safeArea.bottom}px` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Container Component
// ─────────────────────────────────────────────────────────────────────────────

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageContainer({
  children,
  title,
  subtitle,
  actions,
  className = '',
  noPadding = false,
}: PageContainerProps) {
  const { isMobile } = useBreakpoint();

  return (
    <div className={`${noPadding ? '' : containerClasses.page} ${className}`}>
      {/* Page Header */}
      {(title || actions) && (
        <header 
          className={`
            ${containerClasses.section}
            flex flex-col sm:flex-row sm:items-center sm:justify-between
            gap-4
          `}
        >
          <div>
            {title && (
              <h1 className="text-2xl md:text-3xl font-bold">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1 text-sm md:text-base text-current opacity-70">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </header>
      )}

      {/* Page Content */}
      <div className={containerClasses.section}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Grid Component
// ─────────────────────────────────────────────────────────────────────────────

interface CardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 'auto';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CardGrid({
  children,
  columns = 'auto',
  gap = 'md',
  className = '',
}: CardGridProps) {
  const gridClass = containerClasses.grid[columns];
  const gapClass = containerClasses.gap[gap];

  return (
    <div className={`${gridClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Responsive Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button' | 'article';
  padding?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  ariaLabel?: string;
}

export function ResponsiveCard({
  children,
  className = '',
  onClick,
  as: Component = 'div',
  padding = 'md',
  interactive = false,
  ariaLabel,
}: ResponsiveCardProps) {
  const { theme } = useRoleContext();
  const reducedMotion = useReducedMotion();

  const paddingClasses = {
    sm: 'p-3 md:p-4',
    md: 'p-4 md:p-5 lg:p-6',
    lg: 'p-5 md:p-6 lg:p-8',
  };

  const cardClasses = useMemo(() => {
    const classes = [
      'rounded-xl',
      'border',
      paddingClasses[padding],
    ];

    // Theme-based styling
    if (theme.mode === 'dark') {
      classes.push(
        'bg-white/5',
        'border-white/10',
        interactive && 'hover:bg-white/10 hover:border-white/20'
      );
    } else {
      classes.push(
        'bg-white',
        'border-slate-200',
        'shadow-sm',
        interactive && 'hover:shadow-md hover:border-slate-300'
      );
    }

    // Interactive states
    if (interactive || onClick) {
      classes.push(
        'cursor-pointer',
        reducedMotion ? '' : 'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        theme.mode === 'dark' ? 'focus:ring-white/50' : 'focus:ring-slate-400'
      );
    }

    return classes.filter(Boolean).join(' ');
  }, [theme.mode, padding, interactive, onClick, reducedMotion]);

  const props: Record<string, unknown> = {
    className: `${cardClasses} ${className}`,
    ...(ariaLabel && { 'aria-label': ariaLabel }),
  };

  if (Component === 'button' || onClick) {
    props.onClick = onClick;
    props.type = 'button';
  }

  return <Component {...props}>{children}</Component>;
}

export default RoleBasedLayout;
