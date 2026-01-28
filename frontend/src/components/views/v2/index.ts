/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 2.0 - 8개 뷰 시스템
 * 
 * 기본 뷰 (8개):
 * 1. Cockpit (조종석) - 메인 대시보드, 스코어 통합
 * 2. Forecast (예보) - 날씨+레이더 통합
 * 3. Pulse (맥박) - 조류+심전도 통합
 * 4. Microscope (현미경) - 고객 상세
 * 5. Timeline (타임라인) - 신규
 * 6. Actions (액션) - 신규
 * 7. Map (지도) - 유지
 * 8. Funnel (퍼널) - 유지
 * 
 * 고급 뷰 (2개):
 * A. Network (네트워크) - Owner만
 * B. Crystal (수정구) - Owner만
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Core Views (8)
export { CockpitView, default as Cockpit } from './CockpitView';
export { PremiumCockpitView } from './PremiumCockpitView';
export { ForecastView, default as Forecast } from './ForecastView';
export { PulseView, default as Pulse } from './PulseView';
export { MicroscopeView, default as Microscope } from './MicroscopeView';
export { TimelineView, default as Timeline } from './TimelineView';
export { ActionsView, default as Actions } from './ActionsView';
export { MapView, default as MapV2 } from './MapView';
export { FunnelView, default as Funnel } from './FunnelView';

// Advanced Views (2)
export { NetworkView, default as Network } from './NetworkView';
export { CrystalView, default as Crystal } from './CrystalView';

// Navigation & Router
export { Navigation, RoleGuard, getRoleNavigationLabel, getRoleDefaultView } from './Navigation';
export { ViewRouter, AUTUSV2Demo } from './ViewRouter';

// Modal System
export { ModalProvider, useModal } from './modals';
export type { ModalType, ModalPayload } from './modals';

// Role Configuration
export { 
  ROLE_CONFIGS, 
  getRoleConfig, 
  canAccessView, 
  hasPermission, 
  getDataFilter,
  getRoleGreeting,
  getRoleDisplayName,
  getViewLabel,
  VIEW_LABELS_BY_ROLE,
} from './config/roles';
export type { RoleConfig } from './config/roles';

// Action Hooks
export { useActions } from './hooks/useActions';
export type { ActionHandlers } from './hooks/useActions';

// MoltBot AI Assistant
export { MoltBot } from './MoltBot';

// Kraton App (12 Cycles Integrated)
export { KratonApp } from './kraton';
export * from './kraton';

// View Configuration
export const VIEW_CONFIG = {
  cockpit: { id: 'cockpit', name: '조종석', icon: '🎛️', question: '지금 전체 상태는?' },
  forecast: { id: 'forecast', name: '예보', icon: '🌤️', question: '앞으로 뭐가 올까?' },
  pulse: { id: 'pulse', name: '맥박', icon: '💓', question: '외부/내부 신호는?' },
  microscope: { id: 'microscope', name: '현미경', icon: '🔬', question: '이 고객 상세는?' },
  timeline: { id: 'timeline', name: '타임라인', icon: '📅', question: '어떻게 변해왔나?' },
  actions: { id: 'actions', name: '액션', icon: '✅', question: '오늘 뭘 해야 하나?' },
  map: { id: 'map', name: '지도', icon: '🗺️', question: '어디에 분포했나?' },
  funnel: { id: 'funnel', name: '퍼널', icon: '📊', question: '전환율 병목은?' },
  network: { id: 'network', name: '네트워크', icon: '🌐', question: '누가 누구와?', advanced: true },
  crystal: { id: 'crystal', name: '수정구', icon: '🔮', question: '미래는 어떻게?', advanced: true },
} as const;

// Role-based View Access
export type RoleId = 'owner' | 'operator' | 'executor' | 'supporter' | 'payer' | 'receiver';

export const ROLE_VIEW_ACCESS: Record<RoleId, {
  views: string[];
  defaultView: string;
  scope: 'full' | 'assigned' | 'leads' | 'children' | 'self';
}> = {
  owner: {
    views: ['cockpit', 'forecast', 'pulse', 'microscope', 'timeline', 'actions', 'map', 'funnel', 'network', 'crystal'],
    defaultView: 'cockpit',
    scope: 'full',
  },
  operator: {
    views: ['cockpit', 'forecast', 'pulse', 'microscope', 'timeline', 'actions', 'map', 'funnel'],
    defaultView: 'cockpit',
    scope: 'full',
  },
  executor: {
    views: ['cockpit', 'forecast', 'pulse', 'microscope', 'actions'],
    defaultView: 'actions',
    scope: 'assigned',
  },
  supporter: {
    views: ['funnel', 'microscope', 'actions'],
    defaultView: 'funnel',
    scope: 'leads',
  },
  payer: {
    views: ['microscope', 'timeline'],
    defaultView: 'microscope',
    scope: 'children',
  },
  receiver: {
    views: ['microscope', 'timeline'],
    defaultView: 'microscope',
    scope: 'self',
  },
};
