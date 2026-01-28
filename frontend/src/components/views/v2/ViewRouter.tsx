/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚦 뷰 라우터 (View Router) - AUTUS 2.0
 * 8개 뷰를 역할 기반으로 라우팅
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Views (Legacy)
import { CockpitView } from './CockpitView';
import { PremiumCockpitView } from './PremiumCockpitView';
import { ForecastView } from './ForecastView';
import { PulseView } from './PulseView';
import { MicroscopeView } from './MicroscopeView';
import { TimelineView } from './TimelineView';
import { ActionsView } from './ActionsView';
import { MapView } from './MapView';
import { FunnelView } from './FunnelView';
import { NetworkView } from './NetworkView';
import { CrystalView } from './CrystalView';

// Kraton Views (12 Cycles - New Premium)
import { 
  KratonCockpit, 
  KratonForecast, 
  KratonPulse, 
  KratonMicroscope, 
  KratonTimeline, 
  KratonActions, 
  KratonMap 
} from './kraton';

// Navigation & Modal
import { Navigation, RoleGuard, getRoleDefaultView } from './Navigation';
import { ROLE_VIEW_ACCESS, RoleId } from './index';
import { ModalProvider } from './modals';
import { getRoleConfig, getRoleGreeting } from './config/roles';

// MoltBot AI Assistant
import { MoltBot } from './MoltBot';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface ViewRouterProps {
  role: RoleId;
  initialView?: string;
  onSettingsClick?: () => void;
}

interface ViewParams {
  customerId?: string;
  actionId?: string;
  keyword?: string;
  filter?: string;
  create?: boolean;
  [key: string]: any;
}

// ─────────────────────────────────────────────────────────────────────
// View Component Map
// ─────────────────────────────────────────────────────────────────────

const VIEW_COMPONENTS: Record<string, React.FC<any>> = {
  // Kraton 12 Cycles (New Premium Design)
  cockpit: KratonCockpit,
  forecast: KratonForecast,
  pulse: KratonPulse,
  microscope: KratonMicroscope,
  timeline: KratonTimeline,
  actions: KratonActions,
  map: KratonMap,
  // Legacy Views (keeping for funnel, network, crystal)
  funnel: FunnelView,
  network: NetworkView,
  crystal: CrystalView,
};

// ─────────────────────────────────────────────────────────────────────
// Page Transition Variants
// ─────────────────────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

export function ViewRouter({ role, initialView, onSettingsClick }: ViewRouterProps) {
  const defaultView = initialView || getRoleDefaultView(role);
  const [currentView, setCurrentView] = useState(defaultView);
  const [viewParams, setViewParams] = useState<ViewParams>({});
  const [viewHistory, setViewHistory] = useState<string[]>([defaultView]);
  
  const roleConfig = getRoleConfig(role);
  const greeting = getRoleGreeting(role);

  // Check if role has access to view
  const hasAccess = useCallback((viewId: string) => {
    const roleConfig = ROLE_VIEW_ACCESS[role];
    return roleConfig?.views.includes(viewId) || false;
  }, [role]);

  // Navigate to view
  const navigateToView = useCallback((view: string, params?: ViewParams) => {
    if (!hasAccess(view)) {
      console.warn(`Role ${role} does not have access to view ${view}`);
      return;
    }
    
    setViewHistory(prev => [...prev, currentView]);
    setCurrentView(view);
    setViewParams(params || {});
  }, [currentView, hasAccess, role]);

  // Go back
  const goBack = useCallback(() => {
    if (viewHistory.length > 1) {
      const prevView = viewHistory[viewHistory.length - 1];
      setViewHistory(prev => prev.slice(0, -1));
      setCurrentView(prevView);
      setViewParams({});
    }
  }, [viewHistory]);

  // Handle hash change for URL routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && VIEW_COMPONENTS[hash] && hasAccess(hash)) {
        setCurrentView(hash);
        setViewParams({});
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [hasAccess]);

  // Update URL when view changes
  useEffect(() => {
    if (window.location.hash.slice(1) !== currentView) {
      window.history.pushState(null, '', `#${currentView}`);
    }
  }, [currentView]);

  // Get current view component
  const ViewComponent = VIEW_COMPONENTS[currentView];

  if (!ViewComponent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4">❓</div>
          <div className="text-lg font-bold mb-2">뷰를 찾을 수 없습니다</div>
          <button 
            onClick={() => setCurrentView(defaultView)}
            className="text-blue-400 underline"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <ModalProvider>
      <RoleGuard role={role} requiredViews={[currentView]}>
        <div className="min-h-screen bg-slate-950 pb-20">
          {/* Role-based Greeting Header */}
          <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800/50">
            <div className="text-xs text-slate-400">{greeting}</div>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <ViewComponent 
                {...viewParams}
                role={role}
                roleConfig={roleConfig}
                onNavigate={navigateToView}
                onBack={viewHistory.length > 1 ? goBack : undefined}
              />
            </motion.div>
          </AnimatePresence>
          
          <Navigation
            currentView={currentView}
            onViewChange={navigateToView}
            role={role}
            onSettingsClick={onSettingsClick}
          />
          
          {/* MoltBot AI Assistant */}
          <MoltBot 
            context={{ 
              currentView, 
              role,
            }}
            onNavigate={navigateToView}
          />
        </div>
      </RoleGuard>
    </ModalProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Demo Page Component
// ─────────────────────────────────────────────────────────────────────

export function AUTUSV2Demo() {
  const [role, setRole] = useState<RoleId>('owner');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="relative">
      {/* Role Selector (for demo) */}
      <div className="fixed top-2 right-2 z-50">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleId)}
          className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm border border-slate-700"
        >
          <option value="owner">원장 (Owner)</option>
          <option value="operator">실장 (Operator)</option>
          <option value="executor">강사 (Executor)</option>
          <option value="supporter">상담사 (Supporter)</option>
          <option value="payer">학부모 (Payer)</option>
          <option value="receiver">학생 (Receiver)</option>
        </select>
      </div>

      <ViewRouter 
        role={role} 
        onSettingsClick={() => setShowSettings(true)}
      />

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl p-6 w-80 border border-slate-700"
            >
              <h2 className="text-lg font-bold text-white mb-4">설정</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400">역할</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as RoleId)}
                    className="w-full mt-1 bg-slate-800 text-white px-3 py-2 rounded-lg text-sm border border-slate-700"
                  >
                    <option value="owner">원장</option>
                    <option value="operator">실장</option>
                    <option value="executor">강사</option>
                    <option value="supporter">상담사</option>
                    <option value="payer">학부모</option>
                    <option value="receiver">학생</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm"
              >
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ViewRouter;
