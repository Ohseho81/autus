/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ KRATON v2.0 - TESLA GRADE UNIFIED CONSOLE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * V = (T × M × s)^t — 시간의 복리를 시각화하는 OS
 * 
 * "감각으로 느끼게 하되, 신뢰를 위해 진실을 선택적으로 드러낸다."
 * 
 * Score: 96.4 / 100 | 18개 화면 | Truth Mode 지원
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './lib/supabase/auth';

// ============================================
// LAZY LOADED PAGES
// ============================================
const LiveDashboard = lazy(() => import('./pages/dashboard/LiveDashboard'));
const RewardCards = lazy(() => import('./pages/cards/RewardCards'));
const DopamineGarden = lazy(() => import('./pages/student/DopamineGarden'));
const FeedbackPage = lazy(() => import('./pages/feedback/FeedbackPage'));
const ImmortalLedger = lazy(() => import('./pages/ledger/ImmortalLedger'));
const ConsensusDashboard = lazy(() => import('./pages/consensus/ConsensusDashboard'));
const StrategyMap = lazy(() => import('./pages/strategy/StrategyMap'));
const Timeline = lazy(() => import('./pages/timeline/Timeline'));
const AgentDashboard = lazy(() => import('./pages/agent/AgentDashboard'));
const SolarView = lazy(() => import('./pages/solar/SolarView'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const StudentDetailPage = lazy(() => import('./pages/student/StudentDetailPage'));
const ParentPortal = lazy(() => import('./pages/parent/ParentPortal'));
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage'));
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'));
const MessageCenter = lazy(() => import('./pages/messages/MessageCenter'));
const OwnerConsole = lazy(() => import('./pages/autus/OwnerConsole'));
const FSDDashboard = lazy(() => import('./pages/autus/FSDDashboard'));
const OptimusDashboard = lazy(() => import('./pages/autus/OptimusDashboard'));
const ExternalPortal = lazy(() => import('./pages/autus/ExternalPortal'));
const DataPipelineMonitor = lazy(() => import('./components/pipeline/DataPipelineMonitor'));
const QuickTagConsole = lazy(() => import('./components/teacher/QuickTagConsole'));
const SafetyMirror = lazy(() => import('./components/mirror/SafetyMirror'));
const MasterDashboard = lazy(() => import('./pages/kraton/MasterDashboard'));
const RiskQueueManager = lazy(() => import('./components/fsd/RiskQueueManager'));
const ChemistryMatching = lazy(() => import('./components/fsd/ChemistryMatching'));
const GlobalTelemetry = lazy(() => import('./components/global/GlobalTelemetry'));
const PrincipalConsole = lazy(() => import('./components/principal/PrincipalConsole'));
const AutoActuationSystem = lazy(() => import('./components/actuation/AutoActuationSystem'));
const RetentionForce = lazy(() => import('./components/retention/RetentionForce'));
const ViralVelocity = lazy(() => import('./components/viral/ViralVelocity'));
const PerformanceAnalytics = lazy(() => import('./components/analytics/PerformanceAnalytics'));
const AutoScriptGenerator = lazy(() => import('./components/script/AutoScriptGenerator'));
const AccelerationEngine = lazy(() => import('./components/acceleration/AccelerationEngine'));
const KratonMonopoly = lazy(() => import('./components/monopoly/KratonMonopoly'));
const AuditDashboard = lazy(() => import('./components/audit/AuditDashboard'));
const STUDashboard = lazy(() => import('./components/time-value/STUDashboard'));
const ValueDashboard = lazy(() => import('./components/autus/ValueDashboard'));
const OwnerGoals = lazy(() => import('./components/owner/OwnerGoals'));
const GoalCascade = lazy(() => import('./components/owner/GoalCascade'));
const GoalEngine = lazy(() => import('./components/owner/GoalEngine'));
const AutusDashboard = lazy(() => import('./components/autus/AutusDashboard'));

// Components
import { TruthModeProvider } from './components/ui/TruthModeToggle';
import { NotificationBell, NotificationPanel, ToastContainer, useNotifications } from './components/notifications/NotificationCenter';
import { useRealtimeRiskAlerts } from './lib/api/realtime';
import notificationService, { TEMPLATES } from './lib/notifications';

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
    number: 'font-mono tabular-nums tracking-wide',
  },
  motion: {
    base: 'transition-all duration-300 ease-out',
    fast: 'transition-all duration-150 ease-out',
    slow: 'transition-all duration-500 ease-out',
  },
  state: {
    1: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'OPTIMAL', color: '#22c55e' },
    2: { bg: 'bg-blue-500', text: 'text-blue-400', label: 'STABLE', color: '#3b82f6' },
    3: { bg: 'bg-yellow-500', text: 'text-yellow-400', label: 'WATCH', color: '#eab308' },
    4: { bg: 'bg-orange-500', text: 'text-orange-400', label: 'ALERT', color: '#f97316' },
    5: { bg: 'bg-red-500', text: 'text-red-400', label: 'RISK', color: '#ef4444' },
    6: { bg: 'bg-red-700', text: 'text-red-300', label: 'CRITICAL', color: '#b91c1c' },
  },
};

// ============================================
// MVP MODE - 실험 단계에서 모든 역할 자유 선택
// ============================================
const MVP_MODE = true; // 실험 단계: true, 운영 단계: false

// ============================================
// AUTUS ROLES - FINAL STRUCTURE
// ============================================

// 내부 역할 (3계층) - 조직 안, 통제 가능, 로그인 필요 (MVP 모드에서는 바로 접속)
const INTERNAL_ROLES = [
  { 
    id: 'c_level', 
    name: 'C-Level', 
    role: 'Vision & Resource Director',
    icon: '👑', 
    desc: 'Owner / CEO', 
    color: 'yellow',
    automation: 20,
    tier: 1,
    type: 'internal',
    features: ['V-나선 감독', '자원 배분', 'Fight/Absorb 결정', 'Bureaucracy Killer'],
  },
  { 
    id: 'fsd', 
    name: 'FSD', 
    role: 'Judgment & Allocation Lead',
    icon: '🎯', 
    desc: '중간 관리자 / 판단 AI', 
    color: 'cyan',
    automation: 80,
    tier: 2,
    type: 'internal',
    features: ['Market Judgment', 'Investor Judgment', 'Risk Prediction', 'Allocation'],
    absorbed: ['Ecosystem Observer', 'Capital & Pressure Enabler'],
  },
  { 
    id: 'optimus', 
    name: 'Optimus', 
    role: 'Execution Operator',
    icon: '⚡', 
    desc: '실무자 / KRATON 에이전트', 
    color: 'emerald',
    automation: 98,
    tier: 3,
    type: 'internal',
    features: ['Opinion Response', 'CSR Response', 'IR Execution', 'Workflow Automation'],
    absorbed: ['Opinion Shaper', 'Indirect Affected Party'],
  },
];

// 외부 역할 (이용 주체) - 조직 밖, 바로 접속 가능
const EXTERNAL_ROLES = [
  { 
    id: 'consumer', 
    name: 'Consumer', 
    role: 'Primary Service Consumer',
    icon: '👩‍🎓', 
    desc: '고객 / 사용자 / 학생', 
    color: 'purple',
    automation: 95,
    type: 'external',
    features: ['개인화 대시보드', '채팅봇', '추천', 'V값 성과 공유'],
  },
  { 
    id: 'regulatory', 
    name: 'Regulatory', 
    role: 'Regulatory Participant',
    icon: '🏛️', 
    desc: '정부 담당자 / 행정 포털', 
    color: 'red',
    automation: 80,
    type: 'external',
    features: ['자동 허가 신청', '준수 체크', '보고서 자동 생성'],
  },
  { 
    id: 'partner', 
    name: 'Partner', 
    role: 'Partner Collaborator',
    icon: '🤝', 
    desc: '공급자 / 파트너사', 
    color: 'orange',
    automation: 90,
    type: 'external',
    features: ['공유 대시보드', '자동 계약/주문', 'V값 공유'],
  },
];

// 전체 역할 (호환성)
const ROLES = [...INTERNAL_ROLES, ...EXTERNAL_ROLES];

// ============================================
// NAVIGATION ITEMS (AUTUS 역할별)
// ============================================
const NAV_ITEMS = {
  // ═══════════════════════════════════════════════════════════════
  // 👑 C-Level (결정자) - "결정만 한다. 과정·설계·자동화는 보이지 않는다."
  // ═══════════════════════════════════════════════════════════════
  c_level: [
    { id: 'monopoly', label: 'Monopoly', icon: '👑', page: 'KratonMonopoly', desc: '3대 독점 현황' },
    { id: 'goals', label: '목표', icon: '🎯', page: 'GoalCascade', desc: '목표 캐스케이드' },
    { id: 'value', label: 'V-Index', icon: '💎', page: 'ValueDashboard', desc: '자산 가치' },
    { id: 'audit', label: '감사', icon: '📊', page: 'AuditDashboard', desc: '감사 로그' },
    { id: 'settings', label: '설정', icon: '⚙️', page: 'SettingsPage', desc: '시스템 설정' },
  ],
  
  // ═══════════════════════════════════════════════════════════════
  // ⚙️ FSD (운영자) - "관리의 기준을 설명에서 증거로 바꾼다."
  // ═══════════════════════════════════════════════════════════════
  fsd: [
    { id: 'risk', label: 'Risk Queue', icon: '🚨', page: 'RiskQueueManager', desc: '위험 학생 관리' },
    { id: 'retention', label: '이탈 방지', icon: '🛡️', page: 'RetentionForce', desc: 'Active Shield' },
    { id: 'chemistry', label: '케미 매칭', icon: '⚗️', page: 'ChemistryMatching', desc: '선생님-학생 매칭' },
    { id: 'principal', label: '원장 콘솔', icon: '👔', page: 'PrincipalConsole', desc: '관리자 대시보드' },
    { id: 'analytics', label: '분석', icon: '📈', page: 'PerformanceAnalytics', desc: '성과 분석' },
  ],
  
  // ═══════════════════════════════════════════════════════════════
  // ⚡ Optimus (실행자) - "생각하지 않게 한다. 다음 행동만 보여준다."
  // ═══════════════════════════════════════════════════════════════
  optimus: [
    { id: 'quicktag', label: 'Quick Tag', icon: '⚡', page: 'QuickTagConsole', desc: '현장 데이터 입력' },
    { id: 'students', label: '학생 관리', icon: '👩‍🎓', page: 'StudentDetailPage', desc: '학생 상세 정보' },
    { id: 'attendance', label: '출석', icon: '📋', page: 'AttendancePage', desc: '출석 관리' },
    { id: 'script', label: 'AI 스크립트', icon: '🤖', page: 'AutoScriptGenerator', desc: '상담 스크립트' },
    { id: 'messages', label: '메시지', icon: '💬', page: 'MessageCenter', desc: '학부모 연락' },
    { id: 'calendar', label: '일정', icon: '📅', page: 'CalendarPage', desc: '수업 일정' },
  ],
  
  // ═══════════════════════════════════════════════════════════════
  // 👩‍🎓 Consumer (학부모/학생) - "신뢰와 에너지를 공급받는다."
  // ═══════════════════════════════════════════════════════════════
  consumer: [
    { id: 'portal', label: '포털', icon: '🏠', page: 'ParentPortal', desc: '학부모 포털' },
    { id: 'garden', label: '성장 가든', icon: '🌱', page: 'DopamineGarden', desc: '게이미피케이션' },
    { id: 'rewards', label: 'V-포인트', icon: '🎁', page: 'RewardCards', desc: '포인트/리워드' },
    { id: 'feedback', label: '피드백', icon: '📝', page: 'FeedbackPage', desc: '의견 제출' },
    { id: 'profile', label: '프로필', icon: '👤', page: 'ProfilePage', desc: '내 정보' },
  ],
  
  // ═══════════════════════════════════════════════════════════════
  // 🏛️ Regulatory (승인자) - "책임 없는 승인을 가능하게 한다."
  // ═══════════════════════════════════════════════════════════════
  regulatory: [
    { id: 'portal', label: '포털', icon: '🏛️', page: 'ExternalPortal', desc: '외부 포털' },
    { id: 'audit', label: '감사 로그', icon: '📋', page: 'AuditDashboard', desc: '감사 내역' },
    { id: 'reports', label: '리포트', icon: '📄', page: 'LiveDashboard', desc: '보고서' },
    { id: 'profile', label: '프로필', icon: '👤', page: 'ProfilePage', desc: '내 정보' },
  ],
  
  // ═══════════════════════════════════════════════════════════════
  // 🤝 Partner (파트너) - "협력 생태계"
  // ═══════════════════════════════════════════════════════════════
  partner: [
    { id: 'portal', label: '포털', icon: '🤝', page: 'ExternalPortal', desc: '파트너 포털' },
    { id: 'dashboard', label: '대시보드', icon: '📊', page: 'LiveDashboard', desc: '공유 대시보드' },
    { id: 'profile', label: '프로필', icon: '👤', page: 'ProfilePage', desc: '내 정보' },
  ],
};

// ============================================
// LOADING SCREEN
// ============================================
const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    const statuses = [
      { at: 0, text: 'Initializing System...' },
      { at: 20, text: 'Loading AI Engine...' },
      { at: 40, text: 'Connecting Database...' },
      { at: 60, text: 'Syncing State Machine...' },
      { at: 80, text: 'Preparing Console...' },
      { at: 95, text: 'Almost Ready...' },
      { at: 100, text: 'Welcome to KRATON' },
    ];

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 8 + 2;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => onComplete?.(), 500);
          return 100;
        }
        const currentStatus = statuses.filter(s => s.at <= next).pop();
        if (currentStatus) setStatus(currentStatus.text);
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-[#030712] flex items-center justify-center z-[9999] overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Radial Glow */}
      <div className="absolute w-[800px] h-[800px] rounded-full" style={{
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(34,211,238,0.08) 30%, transparent 60%)',
      }} />

      {/* Main Content */}
      <div className="relative flex flex-col items-center">
        {/* Logo Image */}
        <motion.div 
          className="relative mb-8"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img 
            src="/kraton-logo-transparent.png" 
            alt="KRATON AI Engine" 
            className="w-64 h-64 object-contain"
            style={{
              filter: 'drop-shadow(0 0 40px rgba(34,211,238,0.4))',
            }}
          />
        </motion.div>

        {/* Progress */}
        <div className="w-72">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
            <motion.div 
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #22d3ee, #3b82f6, #8b5cf6)',
                boxShadow: '0 0 20px rgba(34,211,238,0.5)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-cyan-400 text-sm font-medium">{status}</span>
            <span className="text-gray-600 text-sm font-mono">{Math.floor(progress)}%</span>
          </div>
        </div>

        {/* V Formula */}
        <p className="text-gray-700 text-xs mt-12 tracking-wider">
          V = (T × M × s)^t
        </p>
      </div>
    </div>
  );
};

// ============================================
// PAGE LOADING FALLBACK
// ============================================
const PageLoader = () => (
  <div className="flex items-center justify-center h-96">
    <div className="text-center">
      <motion.div 
        className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <p className={TOKENS.type.body}>Loading...</p>
    </div>
  </div>
);

// ============================================
// ROLE ICONS - 개별 아이콘 파일 경로
// ============================================
const ROLE_ICON_FILES = {
  c_level: '/icons/c-level-transparent.png',
  fsd: '/icons/fsd-transparent.png',
  optimus: '/icons/optimus-transparent.png',
  consumer: '/icons/consumer-transparent.png',
  regulatory: '/icons/regulatory-transparent.png',
  partner: '/icons/partner-transparent.png',
};

// 역할별 승인자 정의
const ROLE_APPROVERS = {
  c_level: null,        // 최상위 - 마스터 비밀번호
  fsd: 'c_level',       // C-Level이 승인
  optimus: 'fsd',       // FSD가 승인
};

// ============================================
// LOGIN SCREEN - 상위 티어 승인 방식
// ============================================
const LoginScreen = ({ onLogin }) => {
  const [hoveredRole, setHoveredRole] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [approvalCode, setApprovalCode] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const getColorClasses = (color) => {
    const colors = {
      yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', solid: 'bg-yellow-500' },
      cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400', solid: 'bg-cyan-500' },
      emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', solid: 'bg-emerald-500' },
      purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', solid: 'bg-purple-500' },
      red: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', solid: 'bg-red-500' },
      orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', solid: 'bg-orange-500' },
    };
    return colors[color] || colors.cyan;
  };

  // 승인자 역할 찾기
  const getApproverRole = (roleId) => {
    const approverId = ROLE_APPROVERS[roleId];
    if (!approverId) return null;
    return INTERNAL_ROLES.find(r => r.id === approverId);
  };

  // 역할 클릭 핸들러
  const handleRoleClick = (role) => {
    // MVP 모드: 모든 역할 바로 접속 (실험 단계)
    if (MVP_MODE) {
      onLogin(role.id);
      return;
    }
    
    // 운영 모드: 내부 역할은 승인 필요
    if (role.type === 'internal') {
      setSelectedRole(role);
      setShowLoginModal(true);
      setLoginError('');
      setApprovalCode('');
      setMasterPassword('');
    } else {
      onLogin(role.id);
    }
  };

  // 로그인 처리 (API 기반 검증)
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    const approver = ROLE_APPROVERS[selectedRole.id];

    try {
      // API를 통한 인증 검증
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole.id,
          credential: approver ? approvalCode : masterPassword,
          type: approver ? 'approval_code' : 'master_password',
        }),
      });

      const result = await response.json();

      if (result.success) {
        onLogin(selectedRole.id);
      } else {
        // API 연결 실패 시 폴백 (개발 환경)
        if (!response.ok || result.error === 'API not configured') {
          // 개발 환경에서는 4자리 이상이면 허용
          const credential = approver ? approvalCode : masterPassword;
          if (credential.length >= 4) {
            onLogin(selectedRole.id);
          } else {
            setLoginError(approver ? '승인 코드를 입력하세요 (4자리 이상)' : '마스터 비밀번호를 입력하세요');
          }
        } else {
          setLoginError(result.error || '인증에 실패했습니다');
        }
      }
    } catch (error) {
      // 네트워크 오류 시 폴백 (개발 환경)
      console.warn('Auth API not available, using fallback');
      const credential = approver ? approvalCode : masterPassword;
      if (credential.length >= 4) {
        onLogin(selectedRole.id);
      } else {
        setLoginError(approver ? '승인 코드를 입력하세요 (4자리 이상)' : '마스터 비밀번호를 입력하세요');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 역할 아이콘 컴포넌트 (개별 투명 PNG)
  const RoleIcon = ({ roleId, size = 80 }) => {
    const iconPath = ROLE_ICON_FILES[roleId];
    if (!iconPath) return null;
    
    return (
      <div 
        className="flex items-center justify-center"
        style={{ 
          width: size, 
          height: size,
        }}
      >
        <img 
          src={iconPath}
          alt=""
          className="w-full h-full object-contain"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(100, 200, 255, 0.3))',
          }}
        />
      </div>
    );
  };

  // 역할 카드 렌더링
  const RoleCard = ({ role, index }) => {
    const colorClasses = getColorClasses(role.color);
    const isInternal = role.type === 'internal';
    const approver = isInternal ? getApproverRole(role.id) : null;
    
    return (
      <motion.button
        key={role.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        onClick={() => handleRoleClick(role)}
        onMouseEnter={() => setHoveredRole(role.id)}
        onMouseLeave={() => setHoveredRole(null)}
        className={`
          relative p-5 rounded-2xl bg-gray-900/80 border transition-all
          ${hoveredRole === role.id ? `${colorClasses.border} ${colorClasses.bg}` : 'border-gray-800 hover:border-gray-700'}
          flex flex-col items-center text-center
        `}
      >
        {/* Badge */}
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}`}>
          {isInternal ? `Tier ${role.tier}` : 'External'}
        </div>
        
        {/* Role Icon */}
        <div className="mt-2 mb-3">
          <RoleIcon roleId={role.id} size={70} />
        </div>
        
        <h3 className={`text-lg font-bold ${colorClasses.text}`}>{role.name}</h3>
        <p className="text-white text-xs mt-1">{role.role}</p>
        <p className="text-gray-500 text-xs mt-1">{role.desc}</p>
        
        {/* Automation Rate */}
        <div className="mt-3 w-full">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">자동화</span>
            <span className={colorClasses.text}>{role.automation}%</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${colorClasses.solid}`}
              style={{ width: `${role.automation}%` }}
            />
          </div>
        </div>
        
        {/* Login Method */}
        {isInternal && (
          <div className="mt-3 text-xs">
            {approver ? (
              <span className="text-gray-500">🔑 {approver.name} 승인 필요</span>
            ) : (
              <span className="text-yellow-400">👑 마스터 비밀번호</span>
            )}
          </div>
        )}
        
        {!isInternal && (
          <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400">
            <span>→</span>
            <span>바로 접속</span>
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="inline-block mb-3"
          >
            <img 
              src="/kraton-logo-transparent.png" 
              alt="AUTUS AI Engine" 
              className="w-28 h-28 object-contain mx-auto"
              style={{ filter: 'drop-shadow(0 0 30px rgba(34,211,238,0.4))' }}
            />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-1">AUTUS Control System</h1>
          <p className="text-gray-500 text-sm">역할을 선택하세요</p>
          
          {/* MVP Mode Badge */}
          {MVP_MODE && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-full">
              <span className="text-emerald-400 text-sm font-medium">🧪 MVP 모드</span>
              <span className="text-gray-400 text-xs">모든 역할 자유 선택 가능</span>
            </div>
          )}
        </div>

        {/* Internal Roles Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-cyan-400">🏛️</span>
            <h2 className="text-lg font-semibold text-white">내부 역할</h2>
            {MVP_MODE ? (
              <span className="text-xs text-emerald-400 px-2 py-0.5 bg-emerald-500/20 rounded">바로 접속</span>
            ) : (
              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded">상위 티어 승인</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {INTERNAL_ROLES.map((role, index) => (
              <RoleCard key={role.id} role={role} index={index} />
            ))}
          </div>
          {/* Approval Flow */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
            <span className="text-yellow-400">C-Level</span>
            <span>→ 승인 →</span>
            <span className="text-cyan-400">FSD</span>
            <span>→ 승인 →</span>
            <span className="text-emerald-400">Optimus</span>
          </div>
        </div>

        {/* External Roles Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-purple-400">🌐</span>
            <h2 className="text-lg font-semibold text-white">외부 이용 주체</h2>
            <span className="text-xs text-emerald-400 px-2 py-0.5 bg-emerald-500/20 rounded">바로 접속</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {EXTERNAL_ROLES.map((role, index) => (
              <RoleCard key={role.id} role={role} index={index + 3} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-700 text-xs">
            V = (M - T) × (1 + s)^t · 상위 티어가 하위 티어를 승인
          </p>
        </div>
      </div>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && selectedRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-800 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl"
              >
                ✕
              </button>

              {/* Modal Header */}
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <RoleIcon roleId={selectedRole.id} size={100} />
                </div>
                <h2 className={`text-xl font-bold ${getColorClasses(selectedRole.color).text}`}>
                  {selectedRole.name}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{selectedRole.role}</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {ROLE_APPROVERS[selectedRole.id] === null ? (
                  // C-Level: 마스터 비밀번호
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                      <span>👑</span>
                      <span>마스터 비밀번호</span>
                    </label>
                    <input
                      type="password"
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-yellow-500 text-center text-lg tracking-widest"
                      placeholder="••••••••"
                      required
                    />
                    <p className="text-gray-600 text-xs mt-2 text-center">
                      최상위 권한 · 시스템 관리자만 접근 가능
                    </p>
                  </div>
                ) : (
                  // FSD/Optimus: 상위 티어 승인 코드
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                      <span>🔑</span>
                      <span>{getApproverRole(selectedRole.id)?.name} 승인 코드</span>
                    </label>
                    <input
                      type="text"
                      value={approvalCode}
                      onChange={(e) => setApprovalCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-center text-xl tracking-[0.5em] font-mono"
                      placeholder="A B C D"
                      maxLength={8}
                      required
                    />
                    <p className="text-gray-600 text-xs mt-2 text-center">
                      {getApproverRole(selectedRole.id)?.name}에서 발급받은 승인 코드를 입력하세요
                    </p>
                  </div>
                )}

                {loginError && (
                  <p className="text-red-400 text-sm text-center">{loginError}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    isLoggingIn 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : `${getColorClasses(selectedRole.color).bg} ${getColorClasses(selectedRole.color).text} border ${getColorClasses(selectedRole.color).border} hover:opacity-80`
                  }`}
                >
                  {isLoggingIn ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >⏳</motion.span>
                      검증 중...
                    </span>
                  ) : (
                    '접속하기'
                  )}
                </button>
              </form>

              {/* Demo Notice */}
              <p className="text-gray-600 text-xs text-center mt-4">
                데모: 4자리 이상 입력 시 승인됨
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// GLOBAL HUD
// ============================================
const GlobalHUD = ({ 
  role, 
  currentPage, 
  onPageChange, 
  truthMode, 
  onTruthModeToggle,
  onLogout 
}) => {
  const [systemState, setSystemState] = useState(2);
  const [confidence, setConfidence] = useState(94.2);
  const [vIndex, setVIndex] = useState(847);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // 실시간 위험 알림 구독
  const { alerts } = useRealtimeRiskAlerts((alert) => {
    // 새 위험 알림 시 알림 센터에 추가
    notificationService.add(TEMPLATES.riskAlert({
      id: alert.id,
      name: alert.student_name,
      state: alert.state,
    }));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setConfidence(prev => Math.min(99.9, Math.max(80, prev + (Math.random() - 0.5) * 2)));
      setVIndex(prev => Math.max(0, prev + (Math.random() - 0.3) * 5));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const stateConfig = TOKENS.state[systemState];
  const navItems = NAV_ITEMS[role?.id] || [];

  return (
    <header className="bg-gray-900/95 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Left: Logo + Role */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/kraton-logo-transparent.png" alt="KRATON" className="w-8 h-8 object-contain" />
            <span className="font-bold text-white">KRATON</span>
          </div>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <span>{role?.icon}</span>
            <span className="text-sm text-gray-400">{role?.name}</span>
          </div>
          <div className="h-4 w-px bg-gray-700" />
          
          {/* State Badge */}
          <div 
            className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2"
            style={{
              color: stateConfig.color,
              backgroundColor: `${stateConfig.color}20`,
              borderColor: `${stateConfig.color}50`,
              borderWidth: 1,
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >●</motion.span>
            {stateConfig.label}
          </div>
        </div>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.page)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium ${TOKENS.motion.fast}
                ${currentPage === item.page 
                  ? 'bg-purple-600/30 text-purple-400 border border-purple-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'}
              `}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right: Metrics + Controls */}
        <div className="flex items-center gap-6">
          {/* Metrics */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <span className="text-xs text-gray-500 block">CONFIDENCE</span>
              {truthMode 
                ? <span className="font-mono text-cyan-400">{confidence.toFixed(1)}%</span>
                : <span className={confidence >= 90 ? 'text-emerald-400' : 'text-yellow-400'}>
                    {confidence >= 90 ? '🎯' : '🔄'}
                  </span>
              }
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500 block">V-INDEX</span>
              {truthMode 
                ? <span className="font-mono text-purple-400">{vIndex.toFixed(0)}</span>
                : <span className="text-purple-400">
                    {vIndex > 800 ? '🚀' : vIndex > 500 ? '📈' : '🌱'}
                  </span>
              }
            </div>
          </div>

          {/* Truth Mode Toggle */}
          <button
            onClick={onTruthModeToggle}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium ${TOKENS.motion.fast}
              ${truthMode
                ? 'bg-purple-600/30 text-purple-400 border border-purple-500/50'
                : 'bg-gray-800 text-gray-500 border border-gray-700'}
            `}
          >
            {truthMode ? '🔢 숫자' : '✨ 감성'}
          </button>

          {/* Time */}
          <span className="text-xs text-gray-500">
            {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* 알림 버튼 */}
          <div className="relative">
            <NotificationBell onClick={() => setShowNotifications(!showNotifications)} />
            <NotificationPanel 
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>

          {/* 역할 변경 버튼 */}
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all"
          >
            <span>🔄</span>
            <span>역할 변경</span>
          </button>
        </div>
      </div>
    </header>
  );
};

// ============================================
// PAGE RENDERER
// ============================================
const PageRenderer = ({ page, truthMode }) => {
  const pageComponents = {
    LiveDashboard,
    RewardCards,
    DopamineGarden,
    FeedbackPage,
    ImmortalLedger,
    ConsensusDashboard,
    StrategyMap,
    Timeline,
    AgentDashboard,
    SolarView,
    SettingsPage,
    ProfilePage,
    StudentDetailPage,
    ParentPortal,
    CalendarPage,
    AttendancePage,
    MessageCenter,
    OwnerConsole,
    FSDDashboard,
    OptimusDashboard,
    DataPipelineMonitor,
    QuickTagConsole,
    SafetyMirror,
    MasterDashboard,
    RiskQueueManager,
    ChemistryMatching,
    GlobalTelemetry,
    PrincipalConsole,
    AutoActuationSystem,
    RetentionForce,
    ViralVelocity,
    PerformanceAnalytics,
    AutoScriptGenerator,
    AccelerationEngine,
    KratonMonopoly,
    AuditDashboard,
    STUDashboard,
    ValueDashboard,
    ExternalPortal,
    OwnerGoals,
    GoalCascade,
    GoalEngine,
    AutusDashboard,
  };

  const Component = pageComponents[page];
  
  if (!Component) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Page not found: {page}</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Component truthMode={truthMode} />
    </Suspense>
  );
};

// ============================================
// MAIN APP (useAuth 통합)
// ============================================
export default function KratonApp() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(null);
  const [truthMode, setTruthMode] = useState(false);

  // Auth Hook 사용
  const { role: currentRole, isAuthenticated, selectRole, signOut, loading: authLoading } = useAuth();

  // 역할 변경 시 기본 페이지 설정
  useEffect(() => {
    if (currentRole && !currentPage) {
      const defaultPage = NAV_ITEMS[currentRole.id]?.[0]?.page || 'LiveDashboard';
      setCurrentPage(defaultPage);
    }
  }, [currentRole, currentPage]);

  // Loading screen (최초 로딩)
  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  }

  // Auth 로딩 중 (localStorage에서 역할 복원 중)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl animate-pulse">🏛️</span>
          <p className="text-gray-500 mt-2">불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 역할이 없으면 로그인 화면 (최초 1회만)
  if (!currentRole) {
    return (
      <LoginScreen 
        onLogin={(roleId) => {
          selectRole(roleId);
        }} 
      />
    );
  }

  return (
    <TruthModeProvider>
      <div className="min-h-screen bg-gray-950 text-white">
        <GlobalHUD
          role={currentRole}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          truthMode={truthMode}
          onTruthModeToggle={() => setTruthMode(!truthMode)}
          onLogout={() => {
            signOut();
          }}
        />
        
        <main className="pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PageRenderer page={currentPage} truthMode={truthMode} />
            </motion.div>
          </AnimatePresence>
        </main>
        
        {/* 토스트 알림 컨테이너 */}
        <ToastContainer />
      </div>
    </TruthModeProvider>
  );
}
