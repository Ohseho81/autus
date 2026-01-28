/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧭 역할별 네비게이션 (Role-based Navigation) - AUTUS 2.0
 * 역할에 따라 다른 뷰 메뉴를 표시
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Gauge, Cloud, Heart, Search, Calendar, CheckSquare, 
  Map, Target, Globe, Sparkles, Settings
} from 'lucide-react';
import { VIEW_CONFIG, ROLE_VIEW_ACCESS, RoleId } from './index';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  role: RoleId;
  onSettingsClick?: () => void;
}

// ─────────────────────────────────────────────────────────────────────
// Icon Mapping
// ─────────────────────────────────────────────────────────────────────

const VIEW_ICONS: Record<string, React.ElementType> = {
  cockpit: Gauge,
  forecast: Cloud,
  pulse: Heart,
  microscope: Search,
  timeline: Calendar,
  actions: CheckSquare,
  map: Map,
  funnel: Target,
  network: Globe,
  crystal: Sparkles,
};

// ─────────────────────────────────────────────────────────────────────
// Navigation Item
// ─────────────────────────────────────────────────────────────────────

const NavItem: React.FC<{
  viewId: string;
  active: boolean;
  onClick: () => void;
}> = ({ viewId, active, onClick }) => {
  const config = VIEW_CONFIG[viewId as keyof typeof VIEW_CONFIG];
  const Icon = VIEW_ICONS[viewId] || Gauge;
  
  if (!config) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center p-2 rounded-xl transition-all ${
        active 
          ? 'bg-blue-500/20 text-blue-400' 
          : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
      }`}
    >
      <Icon size={18} />
      <span className="text-[9px] mt-1">{config.name}</span>
      {active && (
        <motion.div
          layoutId="activeIndicator"
          className="w-1 h-1 rounded-full bg-blue-400 mt-1"
        />
      )}
    </motion.button>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Main Navigation Component
// ─────────────────────────────────────────────────────────────────────

export function Navigation({ currentView, onViewChange, role, onSettingsClick }: NavigationProps) {
  const roleConfig = ROLE_VIEW_ACCESS[role];
  const availableViews = roleConfig?.views || [];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/50 px-4 py-2 z-50">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-1">
        {availableViews.map((viewId) => (
          <NavItem
            key={viewId}
            viewId={viewId}
            active={currentView === viewId}
            onClick={() => onViewChange(viewId)}
          />
        ))}
        
        {/* Settings */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSettingsClick}
          className="flex flex-col items-center p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all"
        >
          <Settings size={18} />
          <span className="text-[9px] mt-1">설정</span>
        </motion.button>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Role Guard Component
// ─────────────────────────────────────────────────────────────────────

interface RoleGuardProps {
  role: RoleId;
  requiredViews: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ role, requiredViews, children, fallback }: RoleGuardProps) {
  const roleConfig = ROLE_VIEW_ACCESS[role];
  const hasAccess = requiredViews.every(view => roleConfig?.views.includes(view));
  
  if (!hasAccess) {
    return fallback ? <>{fallback}</> : (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <div className="text-lg font-bold mb-2">접근 권한이 없습니다</div>
          <div className="text-sm text-slate-400">
            이 화면은 {role === 'owner' ? '오너' : role} 권한이 필요합니다.
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────
// Role-specific Navigation Configs
// ─────────────────────────────────────────────────────────────────────

export const getRoleNavigationLabel = (role: RoleId): string => {
  const labels: Record<RoleId, string> = {
    owner: '원장님',
    operator: '실장님',
    executor: '강사님',
    supporter: '상담사님',
    payer: '학부모님',
    receiver: '학생',
  };
  return labels[role] || role;
};

export const getRoleDefaultView = (role: RoleId): string => {
  return ROLE_VIEW_ACCESS[role]?.defaultView || 'cockpit';
};

export default Navigation;
