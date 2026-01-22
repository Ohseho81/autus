'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Clock, CheckCircle, XCircle, Shield, 
  Send, Calendar, CreditCard, Settings, Activity,
  TrendingUp, TrendingDown, Zap, Bell
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface RiskStudent {
  id: string;
  name: string;
  riskScore: number;
  riskBand: 'critical' | 'high' | 'medium' | 'low';
  signals: string[];
  slaHours: number;
  lastIntervention?: Date;
  unpaidAmount?: number;
  attendanceRate?: number;
}

interface InterventionAction {
  id: string;
  name: string;
  icon: React.ReactNode;
  cooldownDays: number;
  vImpact: number;
  description: string;
  available: boolean;
  cooldownUntil?: Date;
}

interface FailsafeEvent {
  id: string;
  timestamp: Date;
  studentName: string;
  reason: string;
  status: 'active' | 'resolved' | 'pending';
}

interface SafetyPolicy {
  maxCardsPerWeek: number;
  maxConsultationsPerMonth: number;
  maxBudgetPerMonth: number;
  failsafeThreshold: number;
}

// ============================================
// Media Query Hook
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
// Risk Queue Component (Responsive)
// ============================================

interface RiskQueueProps {
  students: RiskStudent[];
  onSelectStudent: (student: RiskStudent) => void;
  selectedStudent: RiskStudent | null;
}

const RiskQueue: React.FC<RiskQueueProps> = ({ students, onSelectStudent, selectedStudent }) => {
  const getRiskColor = (band: string) => {
    switch (band) {
      case 'critical': return 'bg-red-500/20 border-red-500 text-red-400';
      case 'high': return 'bg-orange-500/20 border-orange-500 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      default: return 'bg-green-500/20 border-green-500 text-green-400';
    }
  };

  const getRiskIcon = (band: string) => {
    switch (band) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      default: return '🟢';
    }
  };

  const getSLAStatus = (hours: number) => {
    if (hours <= 6) return { color: 'text-red-400', label: '긴급', icon: <Zap className="w-3 h-3" /> };
    if (hours <= 12) return { color: 'text-orange-400', label: '주의', icon: <Clock className="w-3 h-3" /> };
    if (hours <= 24) return { color: 'text-yellow-400', label: '정상', icon: <Clock className="w-3 h-3" /> };
    return { color: 'text-green-400', label: 'OK', icon: <CheckCircle className="w-3 h-3" /> };
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-3 md:p-4">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
          RISK QUEUE
        </h3>
        <span className="text-[10px] md:text-xs text-gray-400">
          {students.filter(s => s.riskBand === 'critical').length}명 긴급
        </span>
      </div>

      <div className="space-y-2 max-h-[300px] md:max-h-[400px] overflow-y-auto">
        {students.map((student, idx) => {
          const slaStatus = getSLAStatus(student.slaHours);
          const isSelected = selectedStudent?.id === student.id;

          return (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelectStudent(student)}
              className={`
                p-2 md:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.98]
                ${getRiskColor(student.riskBand)}
                ${isSelected ? 'ring-2 ring-white/50 scale-[1.02]' : 'hover:scale-[1.01]'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base md:text-lg">{getRiskIcon(student.riskBand)}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm md:text-base truncate">{student.name}</p>
                    <p className="text-[10px] md:text-xs opacity-70">위험도: {student.riskScore}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`flex items-center gap-1 text-[10px] md:text-xs ${slaStatus.color}`}>
                    {slaStatus.icon}
                    <span>{student.slaHours}시간</span>
                  </div>
                  <span className="text-[10px] md:text-xs opacity-50">{slaStatus.label}</span>
                </div>
              </div>

              {student.signals.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {student.signals.slice(0, 3).map((signal, i) => (
                    <span key={i} className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 bg-black/30 rounded">
                      {signal}
                    </span>
                  ))}
                </div>
              )}

              {isSelected && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-white/10"
                >
                  <div className="grid grid-cols-3 gap-1 md:gap-2 text-xs">
                    <button className="px-2 py-1.5 md:py-2 bg-green-600 hover:bg-green-500 rounded font-semibold min-h-[36px]">
                      액션
                    </button>
                    <button className="px-2 py-1.5 md:py-2 bg-yellow-600 hover:bg-yellow-500 rounded font-semibold min-h-[36px]">
                      보류
                    </button>
                    <button className="px-2 py-1.5 md:py-2 bg-gray-600 hover:bg-gray-500 rounded font-semibold min-h-[36px]">
                      기각
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// Actuation Panel Component (Responsive)
// ============================================

interface ActuationPanelProps {
  selectedStudent: RiskStudent | null;
  onExecuteAction: (action: InterventionAction) => void;
  failsafeEnabled: boolean;
  onToggleFailsafe: () => void;
}

const ActuationPanel: React.FC<ActuationPanelProps> = ({
  selectedStudent,
  onExecuteAction,
  failsafeEnabled,
  onToggleFailsafe
}) => {
  const actions: InterventionAction[] = [
    {
      id: 'card',
      name: '보상 카드 발송',
      icon: <Send className="w-4 h-4 md:w-5 md:h-5" />,
      cooldownDays: 3,
      vImpact: 3.2,
      description: 'AI 생성 보상 카드를 학부모에게 발송',
      available: true,
    },
    {
      id: 'consultation',
      name: '상담 예약',
      icon: <Calendar className="w-4 h-4 md:w-5 md:h-5" />,
      cooldownDays: 7,
      vImpact: 5.1,
      description: '학부모 상담 일정 예약 및 알림',
      available: true,
    },
    {
      id: 'payment',
      name: '분할 결제 제안',
      icon: <CreditCard className="w-4 h-4 md:w-5 md:h-5" />,
      cooldownDays: 14,
      vImpact: 4.8,
      description: '미납금 분할 결제 플랜 제시',
      available: selectedStudent?.unpaidAmount ? selectedStudent.unpaidAmount > 0 : false,
    },
  ];

  const totalVImpact = actions.reduce((sum, a) => sum + (a.available ? a.vImpact : 0), 0) / actions.length;

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-3 md:p-4">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
          ACTUATION PANEL
        </h3>
      </div>

      {selectedStudent ? (
        <>
          <div className="mb-3 md:mb-4 p-2 md:p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
            <p className="text-xs md:text-sm text-blue-300">선택된 학생</p>
            <p className="font-bold text-white text-base md:text-lg">{selectedStudent.name}</p>
            <p className="text-[10px] md:text-xs text-gray-400">위험도: {selectedStudent.riskScore}</p>
          </div>

          <div className="space-y-2 mb-3 md:mb-4">
            {actions.map((action) => (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!action.available}
                onClick={() => onExecuteAction(action)}
                className={`
                  w-full p-2 md:p-3 rounded-lg border flex items-center justify-between
                  transition-all min-h-[60px] md:min-h-[72px]
                  ${action.available 
                    ? 'bg-gray-800 border-gray-600 hover:border-blue-500 hover:bg-gray-700' 
                    : 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed'}
                `}
              >
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className={`p-1.5 md:p-2 rounded-lg ${action.available ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    {action.icon}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-white text-xs md:text-sm">{action.name}</p>
                    <p className="text-[10px] md:text-xs text-gray-400 truncate">{action.description}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs md:text-sm text-green-400 font-semibold">+{action.vImpact}% V</p>
                  <p className="text-[10px] md:text-xs text-gray-500">쿨다운: {action.cooldownDays}일</p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* FailSafe Toggle */}
          <div className="p-2 md:p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 md:w-5 md:h-5 ${failsafeEnabled ? 'text-yellow-400' : 'text-gray-500'}`} />
                <div>
                  <p className="text-xs md:text-sm font-semibold text-white">FailSafe 모드</p>
                  <p className="text-[10px] md:text-xs text-gray-400">과발송 자동 방지</p>
                </div>
              </div>
              <button
                onClick={onToggleFailsafe}
                className={`
                  px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-bold transition-all min-h-[32px]
                  ${failsafeEnabled 
                    ? 'bg-yellow-500 text-black' 
                    : 'bg-gray-700 text-gray-400'}
                `}
              >
                {failsafeEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* V Impact Preview */}
          <div className="mt-3 md:mt-4 p-2 md:p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-gray-400">예상 V 변화</span>
              <span className="text-base md:text-lg font-bold text-green-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                +{totalVImpact.toFixed(1)}%
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 md:py-12 text-gray-500">
          <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-3 opacity-30" />
          <p className="text-xs md:text-sm">Risk Queue에서 학생을 선택하세요</p>
        </div>
      )}
    </div>
  );
};

// ============================================
// Safety Center Component (Responsive)
// ============================================

interface SafetyCenterProps {
  policy: SafetyPolicy;
  onUpdatePolicy: (policy: SafetyPolicy) => void;
  failsafeEvents: FailsafeEvent[];
  thisWeekCardCount: number;
  thisMonthConsultCount: number;
}

const SafetyCenter: React.FC<SafetyCenterProps> = ({
  policy,
  onUpdatePolicy,
  failsafeEvents,
  thisWeekCardCount,
  thisMonthConsultCount
}) => {
  const [editMode, setEditMode] = useState(false);
  const [tempPolicy, setTempPolicy] = useState(policy);

  const activeEvents = failsafeEvents.filter(e => e.status === 'active');

  const handleSave = () => {
    onUpdatePolicy(tempPolicy);
    setEditMode(false);
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-3 md:p-4">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
          SAFETY CENTER
        </h3>
        <button
          onClick={() => setEditMode(!editMode)}
          className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded min-h-[28px]"
        >
          {editMode ? '취소' : '설정'}
        </button>
      </div>

      {/* FailSafe Status */}
      <div className={`
        p-2 md:p-3 rounded-lg border mb-3 md:mb-4
        ${activeEvents.length > 0 
          ? 'bg-red-900/30 border-red-500/50' 
          : 'bg-green-900/30 border-green-500/50'}
      `}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm font-semibold text-white">
              FailSafe 상태
            </p>
            <p className={`text-[10px] md:text-xs ${activeEvents.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {activeEvents.length > 0 ? `${activeEvents.length}건 활성` : '정상'}
            </p>
          </div>
          <div className={`
            w-2.5 h-2.5 md:w-3 md:h-3 rounded-full
            ${activeEvents.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}
          `} />
        </div>
      </div>

      {/* Policy Settings */}
      <div className="space-y-2 md:space-y-3 mb-3 md:mb-4">
        <div className="flex items-center justify-between p-1.5 md:p-2 bg-gray-800/50 rounded">
          <span className="text-xs md:text-sm text-gray-400">최대 카드 발송</span>
          {editMode ? (
            <input
              type="number"
              value={tempPolicy.maxCardsPerWeek}
              onChange={(e) => setTempPolicy({ ...tempPolicy, maxCardsPerWeek: parseInt(e.target.value) })}
              className="w-14 md:w-16 px-2 py-1 bg-gray-700 rounded text-right text-white text-xs md:text-sm"
            />
          ) : (
            <span className="text-xs md:text-sm text-white font-semibold">
              {thisWeekCardCount}/{policy.maxCardsPerWeek} /주
            </span>
          )}
        </div>

        <div className="flex items-center justify-between p-1.5 md:p-2 bg-gray-800/50 rounded">
          <span className="text-xs md:text-sm text-gray-400">최대 상담 예약</span>
          {editMode ? (
            <input
              type="number"
              value={tempPolicy.maxConsultationsPerMonth}
              onChange={(e) => setTempPolicy({ ...tempPolicy, maxConsultationsPerMonth: parseInt(e.target.value) })}
              className="w-14 md:w-16 px-2 py-1 bg-gray-700 rounded text-right text-white text-xs md:text-sm"
            />
          ) : (
            <span className="text-xs md:text-sm text-white font-semibold">
              {thisMonthConsultCount}/{policy.maxConsultationsPerMonth} /월
            </span>
          )}
        </div>

        <div className="flex items-center justify-between p-1.5 md:p-2 bg-gray-800/50 rounded">
          <span className="text-xs md:text-sm text-gray-400">FailSafe 임계값</span>
          {editMode ? (
            <input
              type="number"
              value={tempPolicy.failsafeThreshold}
              onChange={(e) => setTempPolicy({ ...tempPolicy, failsafeThreshold: parseInt(e.target.value) })}
              className="w-14 md:w-16 px-2 py-1 bg-gray-700 rounded text-right text-white text-xs md:text-sm"
            />
          ) : (
            <span className="text-xs md:text-sm text-white font-semibold">
              위험도 {policy.failsafeThreshold}+
            </span>
          )}
        </div>
      </div>

      {editMode && (
        <button
          onClick={handleSave}
          className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded font-semibold text-white mb-3 md:mb-4 text-sm min-h-[40px]"
        >
          정책 저장
        </button>
      )}

      {/* Circuit Breaker Log */}
      <div>
        <p className="text-xs md:text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
          <Bell className="w-3 h-3 md:w-4 md:h-4" />
          서킷브레이커 로그
        </p>
        <div className="space-y-2 max-h-[150px] md:max-h-[200px] overflow-y-auto">
          {failsafeEvents.length > 0 ? (
            failsafeEvents.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className={`
                  p-1.5 md:p-2 rounded border text-[10px] md:text-xs
                  ${event.status === 'active' 
                    ? 'bg-red-900/30 border-red-500/30' 
                    : 'bg-gray-800/50 border-gray-700'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">
                    {new Date(event.timestamp).toLocaleDateString('ko-KR')}
                  </span>
                  <span className={`
                    px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs
                    ${event.status === 'active' ? 'bg-red-600' : 'bg-gray-600'}
                  `}>
                    {event.status === 'active' ? '활성' : '해결됨'}
                  </span>
                </div>
                <p className="text-white mt-1">대상: {event.studentName}</p>
                <p className="text-gray-500 truncate">사유: {event.reason}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-center py-4 text-xs">발동 기록 없음</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Principal Console (Responsive)
// ============================================

interface PrincipalConsoleEnhancedProps {
  students: RiskStudent[];
}

export const PrincipalConsoleEnhanced: React.FC<PrincipalConsoleEnhancedProps> = ({ students }) => {
  const [selectedStudent, setSelectedStudent] = useState<RiskStudent | null>(null);
  const [failsafeEnabled, setFailsafeEnabled] = useState(true);
  const [policy, setPolicy] = useState<SafetyPolicy>({
    maxCardsPerWeek: 3,
    maxConsultationsPerMonth: 8,
    maxBudgetPerMonth: 2000000,
    failsafeThreshold: 250,
  });
  const [failsafeEvents, setFailsafeEvents] = useState<FailsafeEvent[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      studentName: '김철수',
      reason: '주 3회 카드 발송 한도 도달',
      status: 'resolved',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      studentName: '최진호',
      reason: '위험도 > 250 (학부모 민원)',
      status: 'active',
    },
  ]);

  const isMobile = useMediaQuery('(max-width: 768px)');

  // 학생 데이터에 SLA 추가
  const studentsWithSLA = students
    .map(s => ({
      ...s,
      slaHours: Math.max(1, 24 - Math.floor(s.riskScore / 15)),
    }))
    .sort((a, b) => b.riskScore - a.riskScore);

  const handleExecuteAction = (action: InterventionAction) => {
    if (failsafeEnabled && selectedStudent) {
      // FailSafe 체크
      if (selectedStudent.riskScore >= policy.failsafeThreshold) {
        const newEvent: FailsafeEvent = {
          id: Date.now().toString(),
          timestamp: new Date(),
          studentName: selectedStudent.name,
          reason: `위험도 ${selectedStudent.riskScore} >= 임계값 ${policy.failsafeThreshold}`,
          status: 'active',
        };
        setFailsafeEvents([newEvent, ...failsafeEvents]);
        alert(`FailSafe 발동: ${selectedStudent.name}에 대한 ${action.name} 차단됨`);
        return;
      }
    }
    
    // 실행 로직
    alert(`${action.name} 실행됨: ${selectedStudent?.name}`);
  };

  return (
    <div className="p-3 md:p-6">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">👔 Principal Console</h2>
        <p className="text-sm md:text-base text-gray-400">운영의 심장 — 위험 감지, 즉각 개입, 결과 검증</p>
      </div>

      {/* Mobile: Stack / Desktop: 3-column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Risk Queue */}
        <RiskQueue
          students={studentsWithSLA}
          onSelectStudent={setSelectedStudent}
          selectedStudent={selectedStudent}
        />

        {/* Actuation Panel */}
        <ActuationPanel
          selectedStudent={selectedStudent}
          onExecuteAction={handleExecuteAction}
          failsafeEnabled={failsafeEnabled}
          onToggleFailsafe={() => setFailsafeEnabled(!failsafeEnabled)}
        />

        {/* Safety Center */}
        <SafetyCenter
          policy={policy}
          onUpdatePolicy={setPolicy}
          failsafeEvents={failsafeEvents}
          thisWeekCardCount={2}
          thisMonthConsultCount={5}
        />
      </div>
    </div>
  );
};

export default PrincipalConsoleEnhanced;
