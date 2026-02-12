// ═══════════════════════════════════════════════════════════════════════════
// AUTUS - 전 지구적 자율 운영체제
// "You do not need to manage the world. You need to align your true 12."
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { DailyNudgeToast } from './components/Quantum/MiracleNudge';
import { OnboardingTutorial, HelpButton } from './components/Onboarding';

// ═══════════════════════════════════════════════════════════════════════════
// Lazy Loading - 초기 번들 크기 최적화
// ═══════════════════════════════════════════════════════════════════════════

// L0: Control Deck (메인 홈)
const TransformDashboard = lazy(() => import('./components/Transform/TransformDashboard').then(m => ({ default: m.default })));

// L1: Core Pages (핵심 페이지)
const LearningPage = lazy(() => import('./pages/LearningPageV2').then(m => ({ default: m.default })));
const WorkPage = lazy(() => import('./pages/WorkPage').then(m => ({ default: m.default })));
const GoalsPage = lazy(() => import('./pages/GoalsPage').then(m => ({ default: m.default })));
const FuturePage = lazy(() => import('./pages/FuturePage').then(m => ({ default: m.default })));
const LogsPage = lazy(() => import('./pages/LogsPage').then(m => ({ default: m.default })));
const MacroPage = lazy(() => import('./pages/MacroPage').then(m => ({ default: m.default })));

// L2: Data Input Modules
const UnifiedDashboard = lazy(() => import('./components/Unified/UnifiedDashboard'));
const PhysicsMap = lazy(() => import('./components/Map/PhysicsMap').then(m => ({ default: m.PhysicsMap })));
// ObservationDashboard - 사용 시 활성화
// const ObservationDashboard = lazy(() => import('./components/Quantum/ObservationDashboard').then(m => ({ default: m.ObservationDashboard })));
const HexagonMap = lazy(() => import('./components/Edge/HexagonMap').then(m => ({ default: m.default })));
const OntologyView = lazy(() => import('./components/Ontology').then(m => ({ default: m.OntologyView })));
const Node144Graph = lazy(() => import('./components/Ontology/Node144Graph').then(m => ({ default: m.Node144Graph })));
const SMBDashboard = lazy(() => import('./components/SMB/IntegratedDashboard').then(m => ({ default: m.default })));
const AUTUSHexagonUI = lazy(() => import('./components/Hexagon/AUTUSHexagonUI').then(m => ({ default: m.default })));
const AUTUSDashboard = lazy(() => import('./components/Dashboard/AUTUSDashboard').then(m => ({ default: m.default })));
const TrinityDashboard = lazy(() => import('./components/Trinity/TrinityDashboard').then(m => ({ default: m.default })));
const Node72Matrix = lazy(() => import('./components/Trinity/Node72Matrix').then(m => ({ default: m.default })));
const TransformationEngine = lazy(() => import('./components/Trinity/TransformationEngine').then(m => ({ default: m.default })));
const MoneyFlowCube = lazy(() => import('./components/Trinity/MoneyFlowCube').then(m => ({ default: m.default })));
const AutusPrediction = lazy(() => import('./components/Prediction/AutusPrediction').then(m => ({ default: m.default })));
const AutusCube72 = lazy(() => import('./components/Cube/AutusCube72').then(m => ({ default: m.default })));
// Matrix72View - 사용 시 활성화
// const Matrix72View = lazy(() => import('./components/Matrix72/Matrix72View').then(m => ({ default: m.default })));
const AUTUSAppV3 = lazy(() => import('./components/AUTUSAppV3').then(m => ({ default: m.default })));
const StressTest = lazy(() => import('./components/AUTUSAppV3/StressTest').then(m => ({ default: m.default })));
const PressureMapView = lazy(() => import('./components/PressureMap/PressureMapView').then(m => ({ default: m.default })));
const LearningLoopDemo = lazy(() => import('./components/LearningLoopDemo').then(m => ({ default: m.default })));
const LaplacianSimulator = lazy(() => import('./components/LaplacianSimulator').then(m => ({ default: m.default })));
const DataInputDashboard = lazy(() => import('./components/DataInputDashboard').then(m => ({ default: m.default })));
const SystemDashboard = lazy(() => import('./pages/SystemDashboard').then(m => ({ default: m.default })));
const ProcessFlowGraph = lazy(() => import('./components/Process/ProcessFlowGraph').then(m => ({ default: m.default })));
const BlackHoleDemo = lazy(() => import('./components/Process/BlackHoleAnimation').then(m => ({ default: m.BlackHoleDemo })));
const ProcessDashboard = lazy(() => import('./pages/ProcessDashboard').then(m => ({ default: m.default })));
const NervousSystemDashboard = lazy(() => import('./pages/NervousSystemDashboard').then(m => ({ default: m.default })));
const WorkflowDashboard = lazy(() => import('./pages/WorkflowDashboard').then(m => ({ default: m.default })));
const SemanticZoomDemo = lazy(() => import('./pages/SemanticZoomDemo').then(m => ({ default: m.default })));
const AutomationPage = lazy(() => import('./pages/AutomationPage').then(m => ({ default: m.default })));
const TasksPage = lazy(() => import('./pages/TasksPage').then(m => ({ default: m.default })));

// L3: Admin & Settings Pages (관리/설정 페이지)
const IntegrationsPage = lazy(() => import('./pages/settings/IntegrationsPage').then(m => ({ default: m.default })));
const UserDashboard = lazy(() => import('./pages/dashboard/UserDashboard').then(m => ({ default: m.default })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.default })));
const MyPage = lazy(() => import('./pages/mypage/MyPage').then(m => ({ default: m.default })));
const OnboardingFlow = lazy(() => import('./pages/onboarding/OnboardingFlow').then(m => ({ default: m.default })));

// L4: Role-based Dashboard (역할 기반 대시보드) ✨ NEW!
const RoleDashboard = lazy(() => import('./pages/RoleDashboard').then(m => ({ default: m.default })));

// L5: Academy Dashboard (학원 관리 대시보드) ✨ NEW!
const AcademyDashboard = lazy(() => import('./pages/AcademyDashboard').then(m => ({ default: m.default })));

// L6: Demo Page (11개 뷰 데모) ✨ NEW!
const DemoPage = lazy(() => import('./pages/DemoPage').then(m => ({ default: m.default })));

// L7: AUTUS V2 (8개 뷰 시스템) ✨ NEW!
const AUTUSV2 = lazy(() => import('./components/views/v2').then(m => ({ default: m.AUTUSV2Demo })));

// L8: 온리쌤 (농구 학원) 🏀 NEW!
const AllThatBasketApp = lazy(() => import('./pages/allthatbasket/AllThatBasketApp').then(m => ({ default: m.default })));

// L9: AUTUS CORE - 1-12-144 파이프라인 🏛️
const AutusCore = lazy(() => import('./pages/AutusCore'));

// L10: 대치동 AI 어시스턴트 💬
const DaechiChatPage = lazy(() => import('./pages/DaechiChatPage'));

// L11: IOO Trace Viewer (감사추적)
const TraceViewerPage = lazy(() => import('./pages/TraceViewerPage').then(m => ({ default: m.default })));

// ═══════════════════════════════════════════════════════════════════════════
// View Types
// ═══════════════════════════════════════════════════════════════════════════
// 
// L0: Control Deck (홈)
// 'transform' = 12인 정렬 Control Deck (메인 홈) ✨
//
// L1: Data Input Modules
// 'map'       = 환경 변수 (144 외부 압력)
// 'work'      = 업무 관리 (12 업무 관계)
// 'money'     = 재무 관리 (투자자/고객 관계)
// 'strategy'  = 전략 시뮬레이션
//
// Legacy Views
// 'trinity'   = Trinity 대시보드
// 'matrix'    = 72타입 상호작용 매트릭스
// 'engine'    = 72×72 변환 엔진
// 'cube'      = Money Flow Cube
// 'unified'   = Kernel + UI + Map 통합
// 'quantum'   = Hexagon Map (Edge Kernel)
// 'smb'       = 소상공인 대시보드
// 'ontology'  = 온톨로지 뷰
// 'graph'     = 144 노드 관계도
// 'hexagon'   = Hexagon Equilibrium UI
// 'dashboard' = AuditBoard 스타일 대시보드
// 'prediction'= 72³ 물리 예측 엔진
// 'cube72'    = 72³ 3D Cube 렌더러
// 'matrix72'  = 72 매트릭스 (6 법칙 × 12 성질)
// 'pressure'  = Pressure Map v2.5 - "미루면 손해 확정 레이더" ✨ NEW!
// 'learning'  = 72×72 학습 루프 ✨ NEW!
// 'simulator' = Laplacian Simulator ✨ NEW!
// 'data'      = 데이터 입력 대시보드 ✨ NEW!
//
// Core Pages (핵심 페이지)
// 'mylearning' = 학습 관리 페이지
// 'work'       = 업무 관리 페이지
// 'goals'      = 목표 설정 페이지
// 'future'     = 미래 예측 페이지
// 'logs'       = 내 로그 페이지
// 'macro'      = 거시 흐름 페이지
//
type View = 'transform' | 'trinity' | 'matrix' | 'engine' | 'cube' | 'unified' | 'map' | 'quantum' | 'smb' | 'ontology' | 'graph' | 'hexagon' | 'dashboard' | 'prediction' | 'cube72' | 'matrix72' | 'stress' | 'pressure' | 'learning' | 'simulator' | 'data' | 'mylearning' | 'work' | 'goals' | 'future' | 'logs' | 'macro' | 'system' | 'process' | 'blackhole' | 'bpmn' | 'nervous' | 'workflow' | 'zoom' | 'automation' | 'tasks' | 'integrations' | 'user' | 'admin' | 'mypage' | 'onboarding' | 'role' | 'academy' | 'demo' | 'v2' | 'allthatbasket' | 'core' | 'daechichat' | 'trace';

// ═══════════════════════════════════════════════════════════════════════════
// Loading Fallback
// ═══════════════════════════════════════════════════════════════════════════

const LoadingFallback = () => (
  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      {/* 로고 애니메이션 */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
        <div className="absolute inset-2 border-4 border-transparent border-b-cyan-400/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">⚡</span>
        </div>
      </div>
      {/* 텍스트 */}
      <div className="text-cyan-400 font-semibold text-lg mb-2">온리쌤</div>
      <div className="text-slate-500 text-sm">시스템을 준비하고 있습니다...</div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Page Wrapper - 모든 페이지 통일된 레이아웃
// ═══════════════════════════════════════════════════════════════════════════

const PageWrapper = ({ children, fullHeight = true }: { children: React.ReactNode; fullHeight?: boolean }) => (
  <div className={`w-full ${fullHeight ? 'h-full' : 'min-h-full'} bg-slate-900 text-white overflow-auto`}>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Deep Link 유틸리티
// ═══════════════════════════════════════════════════════════════════════════

interface DeepLinkState {
  view: View;
  nodeId?: string;
  params?: Record<string, string>;
}

function parseDeepLink(hash: string): DeepLinkState {
  // 홈(/) = #transform (Control Deck)
  if (!hash || hash === '#' || hash === '#/') {
    return { view: 'transform' };
  }
  
  const cleanHash = hash.replace('#', '');
  const [pathPart, queryPart] = cleanHash.split('?');
  const [view, nodeId] = pathPart.split('/');
  
  const params: Record<string, string> = {};
  if (queryPart) {
    queryPart.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) params[key] = value;
    });
  }
  
  const validViews: View[] = ['transform', 'trinity', 'matrix', 'engine', 'cube', 'unified', 'map', 'quantum', 'ontology', 'graph', 'smb', 'hexagon', 'dashboard', 'prediction', 'cube72', 'matrix72', 'pressure', 'learning', 'simulator', 'data', 'mylearning', 'work', 'goals', 'future', 'logs', 'macro', 'system', 'process', 'blackhole', 'bpmn', 'nervous', 'workflow', 'zoom', 'automation', 'tasks', 'integrations', 'user', 'admin', 'mypage', 'onboarding', 'role', 'academy', 'demo', 'v2', 'allthatbasket', 'core', 'daechichat', 'trace'];
  const validView = validViews.includes(view as View) ? (view as View) : 'transform';
  
  return { view: validView, nodeId, params };
}

function buildDeepLink(state: DeepLinkState): string {
  let hash = `#${state.view}`;
  if (state.nodeId) hash += `/${state.nodeId}`;
  if (state.params && Object.keys(state.params).length > 0) {
    const queryString = Object.entries(state.params)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    hash += `?${queryString}`;
  }
  return hash;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════════════════════════════

function App() {
  // 기본 뷰를 'transform' (Control Deck)으로 설정
  const [currentView, setCurrentView] = useState<View>('transform');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [showDailyNudge, setShowDailyNudge] = useState(false);
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);

  // 초기 명상 알림 (60초 후)
  useEffect(() => {
    const nudgeTimer = setTimeout(() => {
      setShowDailyNudge(true);
    }, 60000);
    return () => clearTimeout(nudgeTimer);
  }, []);

  // URL 해시 확인 및 딥링크 파싱
  useEffect(() => {
    const handleHashChange = () => {
      const state = parseDeepLink(window.location.hash);
      setCurrentView(state.view);
      setSelectedNodeId(state.nodeId);
    };
    
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // 뷰 변경 시 URL 업데이트 (향후 사용 예정)
  const _navigateTo = (view: View, nodeId?: string) => {
    const newHash = buildDeepLink({ view, nodeId });
    window.location.hash = newHash;
    setCurrentView(view);
    setSelectedNodeId(nodeId);
  };
  void _navigateTo; // ESLint: 의도적으로 보관

  // 뷰 렌더링 - 모든 페이지 동일한 폭 적용
  const renderView = () => {
    switch (currentView) {
      // L0: Control Deck (홈)
      case 'transform':
        return <PageWrapper><TransformDashboard /></PageWrapper>;
      
      // L1: Data Input Modules
      case 'map':
        return <PageWrapper><PhysicsMap /></PageWrapper>;
      
      // Legacy Views
      case 'trinity':
        return <PageWrapper><TrinityDashboard /></PageWrapper>;
      case 'matrix':
        return <PageWrapper><Node72Matrix /></PageWrapper>;
      case 'engine':
        return <PageWrapper><TransformationEngine /></PageWrapper>;
      case 'cube':
        return <PageWrapper><MoneyFlowCube /></PageWrapper>;
      case 'unified':
        return <PageWrapper><UnifiedDashboard /></PageWrapper>;
      case 'quantum':
        return <PageWrapper><HexagonMap /></PageWrapper>;
      case 'smb':
        return <PageWrapper><SMBDashboard /></PageWrapper>;
      case 'ontology':
        return <PageWrapper><OntologyView /></PageWrapper>;
      case 'graph':
        return <PageWrapper><Node144Graph /></PageWrapper>;
      case 'hexagon':
        return <PageWrapper><AUTUSHexagonUI /></PageWrapper>;
      case 'dashboard':
        return <PageWrapper><AUTUSDashboard /></PageWrapper>;
      case 'prediction':
        return <PageWrapper><AutusPrediction /></PageWrapper>;
      case 'cube72':
        return <PageWrapper><AutusCube72 /></PageWrapper>;
      case 'matrix72':
        return <PageWrapper><AUTUSAppV3 /></PageWrapper>;
      case 'stress':
        return <PageWrapper><StressTest /></PageWrapper>;
      case 'pressure':
        return <PageWrapper><PressureMapView /></PageWrapper>;
      case 'learning':
        return <PageWrapper><LearningLoopDemo /></PageWrapper>;
      case 'simulator':
        return <PageWrapper><LaplacianSimulator /></PageWrapper>;
      case 'data':
        return <PageWrapper><DataInputDashboard /></PageWrapper>;
      
      // Core Pages (핵심 페이지)
      case 'mylearning':
        return <PageWrapper><LearningPage /></PageWrapper>;
      case 'work':
        return <PageWrapper><WorkPage /></PageWrapper>;
      case 'goals':
        return <PageWrapper><GoalsPage /></PageWrapper>;
      case 'future':
        return <PageWrapper><FuturePage /></PageWrapper>;
      case 'logs':
        return <PageWrapper><LogsPage /></PageWrapper>;
      case 'macro':
        return <PageWrapper><MacroPage /></PageWrapper>;
      case 'system':
        return <PageWrapper><SystemDashboard /></PageWrapper>;
      case 'process':
        return <PageWrapper><ProcessFlowGraph /></PageWrapper>;
      case 'blackhole':
        return <PageWrapper><BlackHoleDemo /></PageWrapper>;
      case 'bpmn':
        return <ProcessDashboard />;
      case 'nervous':
        return <NervousSystemDashboard />;
      case 'workflow':
        return <PageWrapper fullHeight={true}><WorkflowDashboard /></PageWrapper>;
      case 'zoom':
        return <SemanticZoomDemo />;
      case 'automation':
        return <PageWrapper><AutomationPage /></PageWrapper>;
      case 'tasks':
        return <PageWrapper><TasksPage /></PageWrapper>;
      
      // L3: Admin & Settings
      case 'integrations':
        return <PageWrapper><IntegrationsPage /></PageWrapper>;
      case 'user':
        return <PageWrapper><UserDashboard /></PageWrapper>;
      case 'admin':
        return <PageWrapper><AdminDashboard /></PageWrapper>;
      case 'mypage':
        return <PageWrapper><MyPage /></PageWrapper>;
      case 'onboarding':
        return <PageWrapper><OnboardingFlow /></PageWrapper>;
      
      // L4: Role-based Dashboard (역할 기반 대시보드) ✨ NEW!
      case 'role':
        return <RoleDashboard />;
      
      // L5: Academy Dashboard (학원 관리 대시보드) ✨ NEW!
      case 'academy':
        return <AcademyDashboard />;
      
      // L6: Demo Page (11개 뷰 데모) ✨ NEW!
      case 'demo':
        return <DemoPage />;
      
      // L7: AUTUS V2 (8개 뷰 시스템) ✨ NEW!
      case 'v2':
        return <AUTUSV2 />;
      
      // L8: 온리쌤 (농구 학원) 🏀 NEW!
      case 'allthatbasket':
        return <AllThatBasketApp />;
      
      // L9: AUTUS CORE - 1-12-144 파이프라인 🏛️
      case 'core':
        return <AutusCore />;
      
      // L10: 대치동 AI 어시스턴트 💬
      case 'daechichat':
        return <DaechiChatPage />;

      // L11: IOO Trace Viewer
      case 'trace':
        return <PageWrapper><TraceViewerPage /></PageWrapper>;

      default:
        return <PageWrapper><TransformDashboard /></PageWrapper>;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900">
      {/* 왼쪽 네비게이션 - 확장시 메인 화면 폭 조정 */}
      <NavigationSidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        isExpanded={navExpanded}
        setIsExpanded={setNavExpanded}
      />
      
      {/* 메인 콘텐츠 - 네비게이션 폭에 따라 자동 조정 */}
      <main className="flex-1 h-full overflow-auto transition-all duration-300">
        <Suspense fallback={<LoadingFallback />}>
          {renderView()}
        </Suspense>
      </main>
      
      {/* 오버레이 요소들 */}
      <HelpButton onClick={() => setForceShowOnboarding(true)} />
      <OnboardingTutorial 
        forceShow={forceShowOnboarding} 
        onComplete={() => setForceShowOnboarding(false)} 
      />
      {showDailyNudge && <DailyNudgeToast onDismiss={() => setShowDailyNudge(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 좌측 세로 네비게이션 바 (Flex 레이아웃 - 메인 화면 폭 자동 조정)
// ═══════════════════════════════════════════════════════════════════════════

function NavigationSidebar({ 
  currentView, 
  setCurrentView,
  isExpanded,
  setIsExpanded
}: { 
  currentView: View; 
  setCurrentView: (v: View) => void;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
}) {
  // MVP 네비게이션 - 핵심 기능만 표시 (시제품용 간소화)
  const navItems = [
    // 🏠 홈
    { id: 'transform', icon: '🎯', label: 'Control', color: '#06b6d4', isHome: true },

    // 📊 핵심 대시보드
    { id: 'divider1', icon: '', label: '', color: '' },
    { id: 'daechichat', icon: '💬', label: '대치동 AI', color: '#06b6d4' },
    { id: 'core', icon: '🏛️', label: 'CORE 1-12-144', color: '#00f5ff' },
    { id: 'allthatbasket', icon: '🏀', label: '온리쌤', color: '#FF6B35' },
    { id: 'academy', icon: '🏫', label: '학원관리', color: '#8b5cf6' },
    { id: 'role', icon: '🎭', label: '역할별', color: '#f59e0b' },

    // 📈 주요 기능
    { id: 'divider2', icon: '', label: '', color: '' },
    { id: 'work', icon: '📋', label: '업무', color: '#3b82f6' },
    { id: 'future', icon: '🔮', label: '예측', color: '#a855f7' },
    { id: 'pressure', icon: '⚡', label: '긴급', color: '#ef4444' },
    { id: 'map', icon: '🗺️', label: '지도', color: '#10b981' },

    // ⚙️ 설정
    { id: 'divider3', icon: '', label: '', color: '' },
    { id: 'mypage', icon: '👤', label: '마이', color: '#06b6d4' },
    { id: 'integrations', icon: '🔗', label: '연동', color: '#22c55e' },

    // 🔧 개발자 도구 (접힌 상태로 표시)
    { id: 'divider4', icon: '', label: '', color: '' },
    { id: 'demo', icon: '🎪', label: 'Demo', color: '#ec4899' },
    { id: 'admin', icon: '⚙️', label: '관리자', color: '#f59e0b' },
    { id: 'trace', icon: '🔍', label: 'IOO추적', color: '#06b6d4' },
  ] as const;

  return (
    <nav 
      className={`h-full flex-shrink-0 bg-black/90 backdrop-blur-xl border-r border-white/10 
                  flex flex-col py-4 transition-all duration-300 ease-in-out overflow-y-auto
                  ${isExpanded ? 'w-44' : 'w-16'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* 로고/타이틀 영역 */}
      <div className={`px-3 mb-4 flex items-center gap-2 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
        <span className="text-2xl">⚡</span>
        <span className={`text-cyan-400 font-bold text-sm whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
          온리쌤
        </span>
      </div>
      
      {/* 네비게이션 아이템 */}
      <div className="flex flex-col gap-1 px-2 flex-1">
        {navItems.map((item, index) => {
          // Divider 처리
          if (item.id.startsWith('divider')) {
            return <div key={index} className="h-px bg-white/10 my-3" />;
          }
          
          const isActive = currentView === item.id;
          const isHomeItem = 'isHome' in item && item.isHome;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as View);
                window.location.hash = item.id === 'transform' ? '' : item.id;
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                ${isActive ? 'bg-white/15 shadow-lg' : 'hover:bg-white/5'}
                ${isHomeItem ? 'ring-1 ring-cyan-500/30' : ''}
                ${isExpanded ? 'justify-start' : 'justify-center'}`}
              style={{ 
                color: isActive ? item.color : 'rgba(255,255,255,0.6)',
                borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent'
              }}
              title={item.label}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <span className={`text-xs font-medium whitespace-nowrap transition-all duration-300 
                ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                {item.label}
                {isHomeItem && <span className="ml-1 text-cyan-400">⌂</span>}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* 하단 정보 */}
      <div className={`px-3 pt-4 border-t border-white/10 mt-auto ${isExpanded ? 'text-left' : 'text-center'}`}>
        <span className={`text-xs text-slate-500 transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
          v2.2 MVP
        </span>
      </div>
    </nav>
  );
}

export default App;
