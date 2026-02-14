/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Adaptive Navigation
 * 역할별/디바이스별 적응형 네비게이션
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoleContext } from '../../contexts/RoleContext';
import { useBreakpoint, useScrollDirection } from '../../hooks/useResponsive';
import { useReducedMotion, useRovingTabIndex } from '../../hooks/useAccessibility';
import { ROLES, RoleId, NavItem } from '../../types/roles';
import { TOUCH_TARGET } from '../../lib/responsive';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AdaptiveNavigationProps {
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function AdaptiveNavigation({ className = '' }: AdaptiveNavigationProps) {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  if (isDesktop) {
    return <DesktopSidebar className={className} />;
  }

  if (isTablet) {
    return <TabletNavigation className={className} />;
  }

  return <MobileBottomNav className={className} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop Sidebar
// ─────────────────────────────────────────────────────────────────────────────

function DesktopSidebar({ className }: { className: string }) {
  const { currentRole, navigation, theme, setRole } = useRoleContext();
  const reducedMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const roleConfig = ROLES[currentRole];

  return (
    <nav
      id="main-navigation"
      className={`
        fixed top-0 left-0 h-full z-40
        ${isExpanded ? 'w-64' : 'w-20'}
        ${theme.mode === 'dark' ? 'bg-slate-900 border-r border-white/10' : 'bg-white border-r border-slate-200 shadow-sm'}
        ${reducedMotion ? '' : 'transition-all duration-300'}
        ${className}
      `}
      aria-label="메인 네비게이션"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <span className="text-2xl">{roleConfig.icon}</span>
        {isExpanded && (
          <div>
            <h1 className="font-bold text-lg">온리쌤</h1>
            <p className="text-xs opacity-60">{roleConfig.nameKo}</p>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            ml-auto p-2 rounded-lg
            ${theme.mode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100'}
            min-w-[44px] min-h-[44px] flex items-center justify-center
          `}
          aria-label={isExpanded ? '사이드바 접기' : '사이드바 펼치기'}
          aria-expanded={isExpanded}
        >
          <span className={`transform ${reducedMotion ? '' : 'transition-transform'} ${isExpanded ? '' : 'rotate-180'}`}>
            ◀
          </span>
        </button>
      </div>

      {/* Navigation Items */}
      <div className="px-3 py-4 space-y-1" role="menubar" aria-label="네비게이션 메뉴">
        {navigation.map((item, index) => (
          <NavItemButton
            key={item.id}
            item={item}
            isActive={activeIndex === index}
            isExpanded={isExpanded}
            onClick={() => setActiveIndex(index)}
            theme={theme}
          />
        ))}
      </div>

      {/* Role Switcher (for demo) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-current/10">
        <RoleSwitcher isExpanded={isExpanded} />
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablet Navigation (Collapsible Top)
// ─────────────────────────────────────────────────────────────────────────────

function TabletNavigation({ className }: { className: string }) {
  const { currentRole, navigation, theme } = useRoleContext();
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const roleConfig = ROLES[currentRole];

  return (
    <nav
      id="main-navigation"
      className={`
        fixed top-0 left-0 right-0 z-40
        ${theme.mode === 'dark' ? 'bg-slate-900/95 backdrop-blur-lg border-b border-white/10' : 'bg-white/95 backdrop-blur-lg border-b border-slate-200'}
        ${className}
      `}
      aria-label="메인 네비게이션"
    >
      <div className="flex items-center px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-6">
          <span className="text-xl">{roleConfig.icon}</span>
          <span className="font-bold">온리쌤</span>
        </div>

        {/* Navigation Items */}
        <div 
          className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide"
          role="menubar"
          aria-label="네비게이션 메뉴"
        >
          {navigation.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(index)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap
                min-h-[44px]
                ${reducedMotion ? '' : 'transition-all duration-200'}
                ${activeIndex === index
                  ? theme.mode === 'dark'
                    ? 'bg-white/15 text-white'
                    : 'bg-slate-100 text-slate-900'
                  : theme.mode === 'dark'
                    ? 'text-white/70 hover:text-white hover:bg-white/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }
              `}
              role="menuitem"
              aria-current={activeIndex === index ? 'page' : undefined}
            >
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Role Indicator */}
        <RoleSwitcher isExpanded={false} />
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Bottom Navigation
// ─────────────────────────────────────────────────────────────────────────────

function MobileBottomNav({ className }: { className: string }) {
  const { currentRole, navigation, theme } = useRoleContext();
  const scrollDirection = useScrollDirection();
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  // Show max 5 items, rest go to "more" menu
  const visibleItems = navigation.slice(0, 5);
  const hiddenItems = navigation.slice(5);
  const [showMore, setShowMore] = useState(false);

  // Hide on scroll down
  const isHidden = scrollDirection === 'down';

  const { getItemProps } = useRovingTabIndex({
    itemCount: visibleItems.length,
    orientation: 'horizontal',
  });

  return (
    <>
      <nav
        id="main-navigation"
        className={`
          fixed bottom-0 left-0 right-0 z-40
          ${theme.mode === 'dark' 
            ? 'bg-slate-900/95 backdrop-blur-lg border-t border-white/10' 
            : 'bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-lg'
          }
          ${reducedMotion ? '' : 'transition-transform duration-300'}
          ${isHidden ? 'translate-y-full' : 'translate-y-0'}
          pb-[env(safe-area-inset-bottom)]
          ${className}
        `}
        aria-label="메인 네비게이션"
      >
        <div 
          className="flex items-stretch justify-around"
          role="menubar"
          aria-label="네비게이션 메뉴"
        >
          {visibleItems.map((item, index) => {
            const itemProps = getItemProps(index);
            return (
              <button
                key={item.id}
                {...itemProps}
                onClick={() => {
                  setActiveIndex(index);
                  itemProps.onFocus();
                }}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-1
                  py-2 px-1
                  min-h-[${TOUCH_TARGET.minSize}px]
                  ${reducedMotion ? '' : 'transition-colors duration-200'}
                  ${activeIndex === index
                    ? theme.mode === 'dark'
                      ? 'text-white'
                      : `text-[${theme.primaryColor}]`
                    : theme.mode === 'dark'
                      ? 'text-white/50'
                      : 'text-slate-400'
                  }
                `}
                role="menuitem"
                aria-current={activeIndex === index ? 'page' : undefined}
                aria-label={item.label}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
                {activeIndex === index && (
                  <span 
                    className={`
                      absolute bottom-0 w-12 h-0.5 rounded-full
                      ${theme.mode === 'dark' ? 'bg-white' : `bg-[${theme.primaryColor}]`}
                    `}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          {/* More button if there are hidden items */}
          {hiddenItems.length > 0 && (
            <button
              onClick={() => setShowMore(true)}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1
                py-2 px-1
                min-h-[${TOUCH_TARGET.minSize}px]
                ${theme.mode === 'dark' ? 'text-white/50' : 'text-slate-400'}
              `}
              aria-label="더보기"
              aria-haspopup="menu"
              aria-expanded={showMore}
            >
              <span className="text-xl">•••</span>
              <span className="text-[10px] font-medium">더보기</span>
            </button>
          )}
        </div>
      </nav>

      {/* More Menu */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className={`
                absolute bottom-0 left-0 right-0
                ${theme.mode === 'dark' ? 'bg-slate-900' : 'bg-white'}
                rounded-t-2xl p-4
                pb-[env(safe-area-inset-bottom)]
              `}
              onClick={(e) => e.stopPropagation()}
              role="menu"
              aria-label="추가 메뉴"
            >
              <div className="w-12 h-1 bg-current/20 rounded-full mx-auto mb-4" />
              <div className="grid grid-cols-4 gap-4">
                {hiddenItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setShowMore(false)}
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-xl
                      ${theme.mode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100'}
                      min-h-[${TOUCH_TARGET.comfortableSize}px]
                    `}
                    role="menuitem"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav Item Button
// ─────────────────────────────────────────────────────────────────────────────

interface NavItemButtonProps {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
  theme: { mode: string; primaryColor: string };
}

function NavItemButton({ item, isActive, isExpanded, onClick, theme }: NavItemButtonProps) {
  const reducedMotion = useReducedMotion();

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
        min-h-[${TOUCH_TARGET.minSize}px]
        ${reducedMotion ? '' : 'transition-all duration-200'}
        ${isActive
          ? theme.mode === 'dark'
            ? 'bg-white/15 text-white'
            : `bg-slate-100 text-slate-900`
          : theme.mode === 'dark'
            ? 'text-white/70 hover:text-white hover:bg-white/5'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }
      `}
      role="menuitem"
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.label}
    >
      <span className="text-xl">{item.icon}</span>
      {isExpanded && (
        <span className="text-sm font-medium">{item.label}</span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Switcher (Demo Only)
// ─────────────────────────────────────────────────────────────────────────────

function RoleSwitcher({ isExpanded }: { isExpanded: boolean }) {
  const { currentRole, setRole, theme } = useRoleContext();
  const [showMenu, setShowMenu] = useState(false);

  const roles: RoleId[] = ['owner', 'manager', 'teacher', 'parent', 'student'];

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg w-full
          min-h-[${TOUCH_TARGET.minSize}px]
          ${theme.mode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100'}
        `}
        aria-label="역할 변경"
        aria-haspopup="listbox"
        aria-expanded={showMenu}
      >
        <span className="text-lg">{ROLES[currentRole].icon}</span>
        {isExpanded && (
          <>
            <span className="text-sm flex-1 text-left">{ROLES[currentRole].nameKo}</span>
            <span className="text-xs opacity-50">▼</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              absolute bottom-full left-0 right-0 mb-2
              ${theme.mode === 'dark' ? 'bg-slate-800' : 'bg-white shadow-lg'}
              rounded-lg border ${theme.mode === 'dark' ? 'border-white/10' : 'border-slate-200'}
              p-2 z-50
            `}
            role="listbox"
            aria-label="역할 선택"
          >
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRole(role);
                  setShowMenu(false);
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                  min-h-[${TOUCH_TARGET.minSize}px]
                  ${currentRole === role
                    ? theme.mode === 'dark' ? 'bg-white/15' : 'bg-slate-100'
                    : theme.mode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                  }
                `}
                role="option"
                aria-selected={currentRole === role}
              >
                <span>{ROLES[role].icon}</span>
                <span className="text-sm">{ROLES[role].nameKo}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdaptiveNavigation;
