'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, User, GraduationCap, Settings, Users, Sprout,
  Activity, Shield, MapPin, ChevronRight, Zap, Menu, X,
  TrendingUp, AlertTriangle, CheckCircle, Clock, ChevronDown
} from 'lucide-react';

// Import Enhanced Components
import { PrincipalConsoleEnhanced } from '../components/PrincipalConsole';
import { MultiPanelDashboard } from '../components/MultiPanelDashboard';

// ============================================
// Types
// ============================================

type FSDState = 'IDLE' | 'WATCHING' | 'ALERT' | 'PLAN_READY' | 'EXECUTING' | 'VERIFYING' | 'LEARNING' | 'FAILSAFE';
type UserRole = 'owner' | 'principal' | 'teacher' | 'admin' | 'parent' | 'student';

interface GlobalState {
  state: FSDState;
  confidence: number;
  mode: 'manual' | 'assisted' | 'auto';
  dataFreshness: number;
}

interface RiskStudent {
  id: string;
  name: string;
  riskScore: number;
  riskBand: 'critical' | 'high' | 'medium' | 'low';
  signals: string[];
  slaHours: number;
  attendanceRate?: number;
  homeworkRate?: number;
  unpaidAmount?: number;
  lastIntervention?: Date;
}

// ============================================
// State Config (v2.0 Patches Applied)
// ============================================

const STATE_CONFIG: Record<FSDState, { color: string; bg: string; label: string }> = {
  IDLE: { color: 'text-gray-400', bg: 'bg-gray-500/20', label: '대기' },
  WATCHING: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: '감시중' },
  ALERT: { color: 'text-red-400', bg: 'bg-red-500/20', label: '경고' },
  PLAN_READY: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: '계획준비' },
  EXECUTING: { color: 'text-green-400', bg: 'bg-green-500/20', label: '실행중' },
  VERIFYING: { color: 'text-purple-400', bg: 'bg-purple-500/20', label: '검증중' },
  LEARNING: { color: 'text-pink-400', bg: 'bg-pink-500/20', label: '학습중' },
  FAILSAFE: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: '안전모드' },
};

// ============================================
// Responsive Breakpoint Hook
// ============================================

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// ============================================
// Header Component (Responsive)
// ============================================

interface HeaderProps {
  globalState: GlobalState;
  userRole: UserRole;
  onSwitchRole: () => void;
}

const Header: React.FC<HeaderProps> = ({ globalState, userRole, onSwitchRole }) => {
  const stateConfig = STATE_CONFIG[globalState.state];
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <motion.header 
      className="fixed top-2 md:top-3 left-2 md:left-4 right-2 md:right-4 z-50 bg-black/80 backdrop-blur-xl rounded-xl md:rounded-2xl border border-gray-700/50 px-3 md:px-6 py-2 md:py-3"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
    >
      <div className="flex items-center justify-between">
        {/* Left: Logo + State */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="font-black text-white text-base md:text-lg">AUTUS</span>
          </div>
          
          <motion.div 
            className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full ${stateConfig.bg} ${stateConfig.color} font-semibold text-xs md:text-sm`}
            animate={{
              scale: globalState.state === 'ALERT' ? [1, 1.05, 1] : 1,
            }}
            transition={{ duration: 3.4, repeat: Infinity }}
          >
            {stateConfig.label}
          </motion.div>
        </div>

        {/* Center: HUD Items - Desktop Only */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          <HUDItem label="MODE" value={globalState.mode.toUpperCase()} />
          <HUDItem 
            label="CONFIDENCE" 
            value={`${Math.round(globalState.confidence * 100)}%`} 
            color={globalState.confidence > 0.7 ? 'text-green-400' : 'text-yellow-400'}
          />
          <HUDItem label="DATA" value={`${globalState.dataFreshness}s`} />
        </div>

        {/* Right: Role Switcher */}
        <button
          onClick={onSwitchRole}
          className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-gray-800 hover:bg-gray-700 rounded-lg md:rounded-xl transition-all min-h-[40px] md:min-h-[44px]"
        >
          <span className="text-xs md:text-sm text-gray-400 hidden sm:inline">Role:</span>
          <span className="font-semibold text-white capitalize text-sm md:text-base">{userRole}</span>
          <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
        </button>
      </div>

      {/* Mobile HUD Bar */}
      {isMobile && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex justify-around pt-2 mt-2 border-t border-gray-700/50"
        >
          <HUDItem label="MODE" value={globalState.mode.toUpperCase()} />
          <HUDItem 
            label="CONF" 
            value={`${Math.round(globalState.confidence * 100)}%`} 
            color={globalState.confidence > 0.7 ? 'text-green-400' : 'text-yellow-400'}
          />
          <HUDItem label="DATA" value={`${globalState.dataFreshness}s`} />
        </motion.div>
      )}
    </motion.header>
  );
};

// ============================================
// HUD Item Component (Responsive)
// ============================================

interface HUDItemProps {
  label: string;
  value: string;
  color?: string;
}

const HUDItem: React.FC<HUDItemProps> = ({ label, value, color = 'text-white' }) => (
  <div className="text-center">
    <p className="text-[10px] md:text-xs text-gray-500 uppercase">{label}</p>
    <p className={`font-semibold text-xs md:text-base ${color}`}>{value}</p>
  </div>
);

// ============================================
// Owner Console (Responsive)
// ============================================

interface OwnerConsoleProps {
  students: RiskStudent[];
  globalState: GlobalState;
  onExecute: () => void;
  onMultiPanel?: () => void;
  isDesktop?: boolean;
}

const OwnerConsole: React.FC<OwnerConsoleProps> = ({ students, globalState, onExecute, onMultiPanel, isDesktop }) => {
  const criticalCount = students.filter(s => s.riskBand === 'critical').length;
  const highCount = students.filter(s => s.riskBand === 'high').length;
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="p-3 md:p-6">
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">🏢 Owner Console</h2>
          <p className="text-sm md:text-base text-gray-400">전략적 의사결정 & 모니터링</p>
        </div>
        
        {/* Multi-Panel Toggle - Desktop Only */}
        {isDesktop && onMultiPanel && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onMultiPanel}
            className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-white text-sm shadow-lg shadow-cyan-500/20 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            멀티 패널 모드
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Perception Map */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
            Perception Map
          </h3>
          
          {/* Responsive Stats Grid */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4">
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 md:p-4 text-center">
              <p className="text-2xl md:text-3xl font-black text-red-400">{criticalCount}</p>
              <p className="text-xs md:text-sm text-gray-400">Critical</p>
            </div>
            <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3 md:p-4 text-center">
              <p className="text-2xl md:text-3xl font-black text-orange-400">{highCount}</p>
              <p className="text-xs md:text-sm text-gray-400">High</p>
            </div>
          </div>

          {/* Mini Map Visualization */}
          <div className="h-32 md:h-48 bg-gray-800/50 rounded-lg relative overflow-hidden">
            {students.slice(0, 10).map((student, idx) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`
                  absolute w-3 h-3 md:w-4 md:h-4 rounded-full
                  ${student.riskBand === 'critical' ? 'bg-red-500' : 
                    student.riskBand === 'high' ? 'bg-orange-500' : 
                    student.riskBand === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}
                `}
                style={{
                  left: `${20 + (idx % 5) * 15}%`,
                  top: `${20 + Math.floor(idx / 5) * 30}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Risk Queue */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
            Risk Queue
          </h3>
          
          {/* Mobile: Cards / Desktop: List */}
          <div className="space-y-2 max-h-48 md:max-h-64 overflow-y-auto">
            {students.slice(0, 6).map((student, idx) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`
                  p-2 md:p-3 rounded-lg border flex items-center justify-between
                  ${student.riskBand === 'critical' ? 'bg-red-900/30 border-red-500/50' :
                    student.riskBand === 'high' ? 'bg-orange-900/30 border-orange-500/50' :
                    'bg-gray-800/50 border-gray-700'}
                `}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm md:text-base truncate">{student.name}</p>
                  <p className="text-xs text-gray-400 truncate">{student.signals.join(', ')}</p>
                </div>
                <div className="text-right ml-2">
                  <p className={`font-bold text-sm md:text-base ${
                    student.riskBand === 'critical' ? 'text-red-400' : 'text-orange-400'
                  }`}>
                    {student.riskScore}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Execute Button - Touch Friendly (min 48px) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExecute}
            className="w-full mt-4 py-3 md:py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 rounded-xl font-bold text-black shadow-lg shadow-yellow-500/30 text-sm md:text-base min-h-[48px]"
            style={{ boxShadow: '0 6px 20px rgba(234, 179, 8, 0.3)' }}
          >
            Execute Intervention
          </motion.button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Intervention Queue (Responsive)
// ============================================

interface InterventionQueueProps {
  students: RiskStudent[];
  onExecute: () => void;
}

const InterventionQueue: React.FC<InterventionQueueProps> = ({ students, onExecute }) => {
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: '1', type: 'Card Send', student: '김철수', studentId: '2' },
    { id: '2', type: 'Consultation', student: '박영희', studentId: '5' },
  ]);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const criticalStudents = students.filter(s => s.riskBand === 'critical');
  const warningStudents = students.filter(s => s.riskBand === 'high');
  const monitoringStudents = students.filter(s => s.riskBand === 'low' || s.riskBand === 'medium');

  const handleApprove = (approvalId: string) => {
    setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
    onExecute();
  };

  // Mobile: Stacked cards / Desktop: 3-column grid
  const CategoryCard = ({ title, color, borderColor, students: categoryStudents }: {
    title: string;
    color: string;
    borderColor: string;
    students: RiskStudent[];
  }) => (
    <div className={`bg-gray-900/60 rounded-xl border ${borderColor} p-3 md:p-4`}>
      <h3 className={`${color} font-bold text-xs md:text-sm mb-2 md:mb-3 uppercase`}>{title}</h3>
      <div className="space-y-2">
        {categoryStudents.slice(0, 2).map(student => (
          <motion.div
            key={student.id}
            className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-gray-700/50 hover:border-opacity-100 transition-colors cursor-pointer active:scale-[0.98]"
            whileHover={{ scale: 1.02 }}
          >
            <p className="font-semibold text-white text-xs md:text-sm">{student.name}</p>
            <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">{student.signals[0]}</p>
          </motion.div>
        ))}
        {categoryStudents.length === 0 && (
          <p className="text-gray-600 text-xs">없음</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      {/* Main Risk State */}
      <motion.div 
        className="text-center mb-4 md:mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-4xl font-black tracking-widest text-red-400 mb-1 md:mb-2">
          RISK DETECTED
        </h1>
        <p className="text-xs md:text-base text-gray-500">정상 모니터링 중</p>
      </motion.div>

      {/* Intervention Queue Section */}
      <div className="mb-4 md:mb-8">
        <h2 className="text-xs md:text-sm font-semibold text-gray-400 tracking-wider mb-3 md:mb-4 uppercase">
          INTERVENTION QUEUE: 오늘의 행동
        </h2>
        
        {/* Mobile: 1 col / Tablet: 2 col / Desktop: 3 col */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <CategoryCard 
            title="CRITICAL" 
            color="text-red-400" 
            borderColor="border-red-500/30"
            students={criticalStudents}
          />
          <CategoryCard 
            title="WARNING" 
            color="text-yellow-400" 
            borderColor="border-yellow-500/30"
            students={warningStudents}
          />
          <CategoryCard 
            title="MONITORING" 
            color="text-gray-400" 
            borderColor="border-gray-600/30"
            students={monitoringStudents}
          />
        </div>
      </div>

      {/* Pending Approvals Section */}
      <div>
        <h2 className="text-xs md:text-sm font-semibold text-gray-400 tracking-wider mb-3 md:mb-4 uppercase">
          PENDING APPROVALS
        </h2>
        
        {/* Mobile: 1 col / Desktop: 2 col */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {pendingApprovals.map(approval => (
            <motion.div
              key={approval.id}
              className="bg-gray-900/60 rounded-xl border border-gray-700/50 p-3 md:p-4 flex items-center justify-between gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm md:text-base">{approval.type}</p>
                <p className="text-xs md:text-sm text-gray-500">{approval.student}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleApprove(approval.id)}
                className="px-4 md:px-5 py-2 md:py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition-colors text-sm min-h-[44px]"
              >
                Approve
              </motion.button>
            </motion.div>
          ))}
          {pendingApprovals.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center py-6 md:py-8 text-gray-600">
              <CheckCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm md:text-base">모든 승인이 완료되었습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Simple Placeholder Consoles (Responsive)
// ============================================

const TeacherConsole: React.FC = () => (
  <div className="p-3 md:p-6">
    <div className="mb-4 md:mb-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">👨‍🏫 Teacher Console</h2>
      <p className="text-sm md:text-base text-gray-400">일일 수업 관리 & 학생 케어</p>
    </div>
    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 md:p-8 text-center">
      <GraduationCap className="w-12 h-12 md:w-16 md:h-16 text-blue-400 mx-auto mb-3 md:mb-4 opacity-50" />
      <p className="text-sm md:text-base text-gray-500">오늘의 수업 목록과 학생별 과제가 표시됩니다</p>
    </div>
  </div>
);

const AdminConsole: React.FC = () => (
  <div className="p-3 md:p-6">
    <div className="mb-4 md:mb-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">⚙️ Admin Console</h2>
      <p className="text-sm md:text-base text-gray-400">시스템 설정 & 정책 관리</p>
    </div>
    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 md:p-8 text-center">
      <Settings className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4 opacity-50" />
      <p className="text-sm md:text-base text-gray-500">시스템 설정 및 정책 관리 패널</p>
    </div>
  </div>
);

const ParentConsole: React.FC = () => (
  <div className="p-3 md:p-6">
    <div className="mb-4 md:mb-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">👨‍👩‍👧 Parent Console</h2>
      <p className="text-sm md:text-base text-gray-400">자녀 학습 현황 & 성장 추적</p>
    </div>
    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 md:p-8 text-center">
      <Users className="w-12 h-12 md:w-16 md:h-16 text-green-400 mx-auto mb-3 md:mb-4 opacity-50" />
      <p className="text-sm md:text-base text-gray-500">자녀의 학습 진도와 성장 그래프</p>
    </div>
  </div>
);

const StudentConsole: React.FC = () => (
  <div className="p-3 md:p-6">
    <div className="mb-4 md:mb-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">🌱 Student Console</h2>
      <p className="text-sm md:text-base text-gray-400">나의 성장 & 도파민 가든</p>
    </div>
    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 md:p-8 text-center">
      <Sprout className="w-12 h-12 md:w-16 md:h-16 text-emerald-400 mx-auto mb-3 md:mb-4 opacity-50" />
      <p className="text-sm md:text-base text-gray-500">게임화된 학습 경험과 성취 배지</p>
    </div>
  </div>
);

// ============================================
// Main Console Gateway (Responsive)
// ============================================

export default function ConsoleGateway() {
  const [globalState, setGlobalState] = useState<GlobalState>({
    state: 'WATCHING',
    confidence: 0.87,
    mode: 'assisted',
    dataFreshness: 2,
  });

  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showMultiPanel, setShowMultiPanel] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // 테스트 학생 데이터
  const [students] = useState<RiskStudent[]>([
    { id: '1', name: '최진호', riskScore: 250, riskBand: 'critical', signals: ['학부모 민원'], unpaidAmount: 500000, slaHours: 2 },
    { id: '2', name: '김철수', riskScore: 82, riskBand: 'critical', signals: ['출석률 저하', '미납금'], unpaidAmount: 300000, slaHours: 4 },
    { id: '3', name: '박OO', riskScore: 275, riskBand: 'critical', signals: ['긴급'], slaHours: 1 },
    { id: '4', name: '정수현', riskScore: 90, riskBand: 'high', signals: ['진행도 90%'], slaHours: 12 },
    { id: '5', name: '박영희', riskScore: 45, riskBand: 'high', signals: ['숙제 미제출'], slaHours: 24 },
    { id: '6', name: '이민수', riskScore: 12, riskBand: 'low', signals: ['안정권'], slaHours: 72 },
  ]);

  const roles: UserRole[] = ['owner', 'principal', 'teacher', 'admin', 'parent', 'student'];

  const roleIcons: Record<UserRole, React.ReactNode> = {
    owner: <Building2 className="w-4 h-4 md:w-5 md:h-5" />,
    principal: <User className="w-4 h-4 md:w-5 md:h-5" />,
    teacher: <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />,
    admin: <Settings className="w-4 h-4 md:w-5 md:h-5" />,
    parent: <Users className="w-4 h-4 md:w-5 md:h-5" />,
    student: <Sprout className="w-4 h-4 md:w-5 md:h-5" />,
  };

  const handleSwitchRole = () => {
    setShowRoleMenu(!showRoleMenu);
  };

  const selectRole = (role: UserRole) => {
    setUserRole(role);
    setShowRoleMenu(false);
  };

  const handleExecute = () => {
    setGlobalState(prev => ({ ...prev, state: 'EXECUTING' }));
    setTimeout(() => {
      setGlobalState(prev => ({ ...prev, state: 'LEARNING' }));
    }, 2000);
    setTimeout(() => {
      setGlobalState(prev => ({ ...prev, state: 'WATCHING' }));
    }, 4000);
  };

  // Role Menu Modal (Responsive)
  const RoleMenu = () => (
    <AnimatePresence>
      {showRoleMenu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center"
          onClick={() => setShowRoleMenu(false)}
        >
          <motion.div
            initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
            className={`
              bg-gray-900 border border-gray-700 
              ${isMobile 
                ? 'w-full rounded-t-2xl p-4 pb-8' 
                : 'rounded-2xl p-6 w-80'
              }
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            {isMobile && (
              <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
            )}
            
            <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4">역할 선택</h3>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => selectRole(role)}
                  className={`
                    p-3 md:p-3 rounded-xl text-left transition-all flex items-center gap-2 md:gap-3 min-h-[48px]
                    ${userRole === role 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 active:bg-gray-600'}
                  `}
                >
                  {roleIcons[role]}
                  <span className="capitalize font-semibold text-sm md:text-base">{role}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // 탭 상태 (Principal 하위 탭용)
  const [principalTab, setPrincipalTab] = useState<'intervention' | 'console'>('intervention');

  // Multi-Panel Mode for Owner (Desktop only)
  if (showMultiPanel && userRole === 'owner' && isDesktop) {
    return (
      <MultiPanelDashboard
        globalState={globalState}
        students={students}
        onClose={() => setShowMultiPanel(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#05050a] text-white font-sans overflow-x-hidden">
      <Header 
        globalState={globalState} 
        userRole={userRole} 
        onSwitchRole={handleSwitchRole} 
      />
      
      <RoleMenu />

      {/* Main Content - Patch: ALERT vibration */}
      <AnimatePresence mode="wait">
        <motion.div
          key={userRole + principalTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            x: globalState.state === 'ALERT' ? [0, -4, 4, -2, 2, 0] : 0,
          }}
          transition={{
            opacity: { duration: 0.3 },
            y: { duration: 0.3 },
            x: globalState.state === 'ALERT' ? { duration: 0.4, ease: 'easeInOut' } : {},
          }}
          exit={{ opacity: 0, y: -10 }}
          className="pt-20 md:pt-24 min-h-screen pb-safe"
        >
          {/* Principal Role - Show Tabs */}
          {userRole === 'principal' && (
            <div className="px-3 md:px-6 mb-3 md:mb-4">
              <div className="flex gap-1 md:gap-2 bg-gray-900/50 p-1 rounded-xl inline-flex">
                <button
                  onClick={() => setPrincipalTab('intervention')}
                  className={`px-3 md:px-4 py-2 rounded-lg font-semibold transition-all text-sm min-h-[44px] ${
                    principalTab === 'intervention' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-4 h-4 inline mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Intervention</span>
                  <span className="sm:hidden">개입</span>
                </button>
                <button
                  onClick={() => setPrincipalTab('console')}
                  className={`px-3 md:px-4 py-2 rounded-lg font-semibold transition-all text-sm min-h-[44px] ${
                    principalTab === 'console' 
                      ? 'bg-cyan-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4 inline mr-1 md:mr-2" />
                  <span className="hidden sm:inline">3대 콘솔</span>
                  <span className="sm:hidden">콘솔</span>
                </button>
              </div>
            </div>
          )}

          {/* Role-based Content */}
          {userRole === 'owner' && (
            <OwnerConsole 
              students={students} 
              globalState={globalState} 
              onExecute={handleExecute}
              onMultiPanel={() => setShowMultiPanel(true)}
              isDesktop={isDesktop}
            />
          )}
          {userRole === 'principal' && principalTab === 'intervention' && (
            <InterventionQueue students={students} onExecute={handleExecute} />
          )}
          {userRole === 'principal' && principalTab === 'console' && (
            <PrincipalConsoleEnhanced students={students} />
          )}
          {userRole === 'teacher' && <TeacherConsole />}
          {userRole === 'admin' && <AdminConsole />}
          {userRole === 'parent' && <ParentConsole />}
          {userRole === 'student' && <StudentConsole />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
