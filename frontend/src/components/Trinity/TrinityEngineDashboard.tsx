import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrinityEngineStore, useTrinityEngineData, useTrinityEngineActions, useTrinityEngineUI } from '../../stores/trinityEngineStore';
import { MOCK_TRINITY_DATA, DesireCategory } from '../../api/trinity';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 AUTUS Trinity Dashboard (Enhanced Version)
// ═══════════════════════════════════════════════════════════════════════════════
// "무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다."

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

interface TargetNode {
  id: string;
  name: string;
  current: number;
  target: number;
}

interface PainBreakdown {
  financial: number;
  cognitive: number;
  temporal: number;
  emotional: number;
}

interface CrystallizationData {
  rawDesire: string;
  targetNodes: TargetNode[];
  requiredMonths: number;
  requiredHours: number;
  feasibility: number;
  totalPain: number;
  painBreakdown: PainBreakdown;
}

interface EnvironmentData {
  eliminated: number;
  automated: number;
  parallelized: number;
  preserved: number;
  energyEfficiency: number;
  cognitiveLeakage: number;
  friction: number;
  environmentScore: number;
}

interface ProgressData {
  progress: number;
  currentCheckpoint: number;
  totalCheckpoints: number;
  remainingDays: number;
  remainingHours: number;
  painEndDate: string;
  uncertainty: number;
  confidence: number;
  onTrack: boolean;
  deviation: number;
}

interface TrinityData {
  crystallization: CrystallizationData;
  environment: EnvironmentData;
  progress: ProgressData;
  actions: string[];
}

type ColorKey = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 아이콘 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  Crystal: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  Environment: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  ),
  Radar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  TrendingUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Brain: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z" />
    </svg>
  ),
  Heart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  DollarSign: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 애니메이션 Variants
// ═══════════════════════════════════════════════════════════════════════════════

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  hover: { y: -4, transition: { duration: 0.2 } }
};

const progressVariants = {
  hidden: { width: 0 },
  visible: (custom: number) => ({
    width: `${custom}%`,
    transition: { duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] as const, delay: 0.3 }
  })
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 }
  })
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: { duration: 2, repeat: Infinity }
  }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 공통 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

const ProgressBar: React.FC<{
  value: number;
  color?: ColorKey;
  label?: string;
  showValue?: boolean;
}> = ({ value, color = 'blue', label, showValue = true }) => {
  const colorClasses: Record<ColorKey, string> = {
    blue: 'bg-gradient-to-r from-blue-600 to-cyan-500',
    green: 'bg-gradient-to-r from-green-600 to-emerald-500',
    yellow: 'bg-gradient-to-r from-yellow-600 to-amber-500',
    red: 'bg-gradient-to-r from-red-600 to-rose-500',
    purple: 'bg-gradient-to-r from-purple-600 to-violet-500',
    cyan: 'bg-gradient-to-r from-cyan-600 to-blue-500',
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-gray-400">{label}</span>
          {showValue && <span className="text-gray-300 font-medium">{value}%</span>}
        </div>
      )}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorClasses[color]}`}
          initial="hidden"
          animate="visible"
          custom={value}
          variants={progressVariants}
        />
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.FC;
  label: string;
  value: number | string;
  unit?: string;
  color: ColorKey;
  trend?: number;
}> = ({ icon: Icon, label, value, unit, color, trend }) => {
  const colorClasses: Record<ColorKey, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <motion.div
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon />
        </div>
        <div className="flex-1">
          <p className="text-gray-400 text-xs">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white">{value}</span>
            {unit && <span className="text-gray-500 text-sm">{unit}</span>}
          </div>
        </div>
        {trend !== undefined && (
          <div className={`text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Badge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' }> = ({ 
  children, 
  color = 'blue' 
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border border-red-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClasses[color]}`}>
      {children}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 입력 모달
// ═══════════════════════════════════════════════════════════════════════════════

const DESIRE_PRESETS: Array<{ label: string; value: string; icon: string; category: DesireCategory }> = [
  { label: '부자가 되고 싶다', value: '부자가 되고 싶다', icon: '💰', category: 'WEALTH' },
  { label: '건강하게 살고 싶다', value: '건강하게 살고 싶다', icon: '💪', category: 'HEALTH' },
  { label: '자유롭게 살고 싶다', value: '자유롭게 살고 싶다', icon: '🦅', category: 'FREEDOM' },
  { label: '영향력을 갖고 싶다', value: '영향력을 갖고 싶다', icon: '⭐', category: 'INFLUENCE' },
  { label: '전문가가 되고 싶다', value: '전문가가 되고 싶다', icon: '🎯', category: 'MASTERY' },
  { label: '평화롭게 살고 싶다', value: '평화롭게 살고 싶다', icon: '🕊️', category: 'PEACE' },
];

const InputModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (desire: string) => void;
  isLoading?: boolean;
}> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [desire, setDesire] = useState('');

  const handleSubmit = () => {
    if (desire.trim()) {
      onSubmit(desire.trim());
    }
  };

  const handlePresetClick = (value: string) => {
    setDesire(value);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Modal */}
          <motion.div
            className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-cyan-400">
                  <Icons.Sparkles />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">목표 설정</h2>
                  <p className="text-sm text-gray-400">당신의 욕망을 입력하세요</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            {/* Presets */}
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">빠른 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {DESIRE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetClick(preset.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      desire === preset.value
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <span className="mr-2">{preset.icon}</span>
                    <span className="text-sm">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">또는 직접 입력</p>
              <textarea
                value={desire}
                onChange={(e) => setDesire(e.target.value)}
                placeholder="예: 5년 안에 순자산 10억 달성"
                className="w-full h-24 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!desire.trim() || isLoading}
              className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                desire.trim() && !isLoading
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <span>분석 중...</span>
                </>
              ) : (
                <>
                  <Icons.Zap />
                  <span>목표 결정질화</span>
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 1. CRYSTALLIZATION 섹션 (결정질화)
// ═══════════════════════════════════════════════════════════════════════════════

const CrystallizationSection: React.FC<{ data: CrystallizationData }> = ({ data }) => {
  const painTypes: { key: keyof PainBreakdown; label: string; icon: React.FC; color: ColorKey }[] = [
    { key: 'financial', label: '재무적 절제', icon: Icons.DollarSign, color: 'blue' },
    { key: 'cognitive', label: '인지적 집중', icon: Icons.Brain, color: 'purple' },
    { key: 'temporal', label: '시간적 희생', icon: Icons.Clock, color: 'yellow' },
    { key: 'emotional', label: '감정적 인내', icon: Icons.Heart, color: 'red' },
  ];

  return (
    <motion.div
      className="bg-gray-900/30 backdrop-blur-xl border border-gray-800 rounded-2xl p-6"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400">
          <Icons.Crystal />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">CRYSTALLIZATION</h2>
          <p className="text-sm text-gray-500">목표 결정질화</p>
        </div>
        <Badge color="blue">Step 1</Badge>
      </div>

      {/* 원본 욕망 */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <p className="text-gray-400 text-sm mb-1">원본 욕망</p>
        <p className="text-xl font-bold text-white">{data.rawDesire}</p>
        <div className="flex items-center gap-2 mt-2">
          <Icons.ArrowRight />
          <span className="text-cyan-400 text-sm">노드 목표로 변환됨</span>
        </div>
      </div>

      {/* 노드 목표 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {data.targetNodes.map((node, i) => (
          <motion.div
            key={node.id}
            className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
            custom={i}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-xs">{node.id}</span>
              <span className={`text-xs ${node.current > node.target ? 'text-red-400' : 'text-green-400'}`}>
                {node.current}% → {node.target}%
              </span>
            </div>
            <p className="text-sm text-white font-medium">{node.name}</p>
            <div className="h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${100 - node.target}%` }}
                transition={{ duration: 1, delay: i * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 활성화 에너지 */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icons.Zap />
          <span className="text-cyan-400 font-medium">활성화 에너지 (Ea)</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-xs">필요 기간</p>
            <p className="text-2xl font-bold text-white">{data.requiredMonths}<span className="text-sm text-gray-400">개월</span></p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">필요 집중</p>
            <p className="text-2xl font-bold text-white">{data.requiredHours.toLocaleString()}<span className="text-sm text-gray-400">시간</span></p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">실현 가능성</p>
            <p className="text-2xl font-bold text-green-400">{data.feasibility}%</p>
          </div>
        </div>
      </div>

      {/* 고통 분포 */}
      <div>
        <p className="text-gray-400 text-sm mb-3">고통 지수 분포 (총 {data.totalPain}%)</p>
        <div className="space-y-3">
          {painTypes.map((pain, i) => (
            <motion.div
              key={pain.key}
              className="flex items-center gap-3"
              custom={i}
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
            >
              <div className={`p-1.5 rounded ${
                pain.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                pain.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                pain.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                <pain.icon />
              </div>
              <div className="flex-1">
                <ProgressBar value={data.painBreakdown[pain.key]} color={pain.color} label={pain.label} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 2. OPTIMIZED ENVIRONMENT 섹션 (최적 환경)
// ═══════════════════════════════════════════════════════════════════════════════

const EnvironmentSection: React.FC<{ data: EnvironmentData }> = ({ data }) => {
  const ertItems = [
    { key: 'eliminated', label: '삭제 (E)', icon: '🗑️', color: 'red' as const, count: data.eliminated },
    { key: 'automated', label: '자동화 (R)', icon: '🤖', color: 'blue' as const, count: data.automated },
    { key: 'parallelized', label: '병렬화 (T)', icon: '🔀', color: 'purple' as const, count: data.parallelized },
    { key: 'preserved', label: '보존', icon: '👤', color: 'green' as const, count: data.preserved },
  ];

  const totalERT = data.eliminated + data.automated + data.parallelized;
  const totalAll = totalERT + data.preserved;
  const optimizationRate = Math.round((totalERT / totalAll) * 100);

  return (
    <motion.div
      className="bg-gray-900/30 backdrop-blur-xl border border-gray-800 rounded-2xl p-6"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 text-emerald-400">
          <Icons.Environment />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">OPTIMIZED ENVIRONMENT</h2>
          <p className="text-sm text-gray-500">최적 환경</p>
        </div>
        <Badge color="green">Step 2</Badge>
      </div>

      {/* ERT 분류 원형 */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <svg className="w-40 h-40" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="url(#ertGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${optimizationRate * 2.51} 251`}
              transform="rotate(-90 50 50)"
              initial={{ strokeDasharray: '0 251' }}
              animate={{ strokeDasharray: `${optimizationRate * 2.51} 251` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="ertGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-3xl font-bold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {optimizationRate}%
            </motion.span>
            <span className="text-xs text-gray-400">유령화</span>
          </div>
        </div>
      </div>

      {/* ERT 분류 리스트 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {ertItems.map((item, i) => (
          <motion.div
            key={item.key}
            className={`p-3 rounded-xl border ${
              item.color === 'red' ? 'bg-red-500/10 border-red-500/20' :
              item.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20' :
              item.color === 'purple' ? 'bg-purple-500/10 border-purple-500/20' :
              'bg-green-500/10 border-green-500/20'
            }`}
            custom={i}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-white font-bold">{item.count}건</p>
                <p className="text-xs text-gray-400">{item.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 효율 지표 */}
      <div className="space-y-4">
        <ProgressBar value={data.energyEfficiency} color="green" label="에너지 효율" />
        <ProgressBar value={data.cognitiveLeakage} color="yellow" label="인지 산란" />
        <ProgressBar value={data.friction} color="cyan" label="마찰 계수" />
      </div>

      {/* 환경 점수 */}
      <div className="mt-6 p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">환경 점수</span>
          <div className="flex items-center gap-2">
            <motion.span
              className="text-3xl font-bold text-emerald-400"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
            >
              {data.environmentScore}
            </motion.span>
            <span className="text-gray-400">/100</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 3. PROGRESS RADAR 섹션 (불확실성 제거)
// ═══════════════════════════════════════════════════════════════════════════════

const ProgressSection: React.FC<{ data: ProgressData }> = ({ data }) => {
  const checkpoints = [1, 2, 3, 4, 5];
  
  return (
    <motion.div
      className="bg-gray-900/30 backdrop-blur-xl border border-gray-800 rounded-2xl p-6"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-400">
          <Icons.Radar />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">NAVIGATION & CERTAINTY</h2>
          <p className="text-sm text-gray-500">불확실성 제거</p>
        </div>
        <Badge color="purple">Step 3</Badge>
      </div>

      {/* 핵심 메시지 */}
      <div className="mb-6 p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
        <p className="text-violet-300 text-center italic">
          "끝을 아는 고통은 견딜 수 있다"
        </p>
      </div>

      {/* 진행률 원형 */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <svg className="w-48 h-48" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1f2937" strokeWidth="6" />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${data.progress * 2.64} 264`}
              transform="rotate(-90 50 50)"
              initial={{ strokeDasharray: '0 264' }}
              animate={{ strokeDasharray: `${data.progress * 2.64} 264` }}
              transition={{ duration: 2, ease: 'easeOut' }}
            />
            
            {checkpoints.map((cp, i) => {
              const angle = ((i + 1) / 5) * 360 - 90;
              const rad = (angle * Math.PI) / 180;
              const x = 50 + 42 * Math.cos(rad);
              const y = 50 + 42 * Math.sin(rad);
              const isPassed = data.currentCheckpoint > cp;
              const isCurrent = data.currentCheckpoint === cp;
              
              return (
                <motion.circle
                  key={cp}
                  cx={x}
                  cy={y}
                  r={isCurrent ? 4 : 3}
                  fill={isPassed ? '#a78bfa' : isCurrent ? '#8b5cf6' : '#374151'}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                />
              );
            })}
            
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-4xl font-bold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {data.progress}%
            </motion.span>
            <span className="text-xs text-gray-400">진행률</span>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-violet-400 text-sm font-medium">
                {data.currentCheckpoint}/{data.totalCheckpoints}
              </span>
              <span className="text-gray-500 text-xs">체크포인트</span>
            </div>
          </div>
        </div>
      </div>

      {/* 남은 고통 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Icons.Clock />
            <span>남은 고통</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.remainingDays}<span className="text-sm text-gray-400">일</span></p>
          <p className="text-sm text-gray-500">{data.remainingHours.toLocaleString()}시간 집중</p>
        </div>
        
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Icons.Target />
            <span>종료 예상</span>
          </div>
          <p className="text-xl font-bold text-white">{data.painEndDate}</p>
          <p className="text-sm text-gray-500">
            {data.onTrack ? (
              <span className="text-green-400">✓ 정상 진행</span>
            ) : (
              <span className="text-yellow-400">⚠ {data.deviation > 0 ? '+' : ''}{data.deviation}일 이탈</span>
            )}
          </p>
        </div>
      </div>

      {/* 불확실성 지표 */}
      <div className="space-y-4">
        <ProgressBar value={data.uncertainty} color="yellow" label="불확실성 지수 (낮을수록 좋음)" />
        <ProgressBar value={data.confidence} color="purple" label="확신 수준" />
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 액션 카드 (지금 해야 할 것)
// ═══════════════════════════════════════════════════════════════════════════════

const ActionCard: React.FC<{ actions: string[] }> = ({ actions }) => (
  <motion.div
    className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6"
    variants={cardVariants}
    initial="hidden"
    animate="visible"
  >
    <div className="flex items-center gap-3 mb-4">
      <motion.div 
        className="p-2 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-400"
        variants={pulseVariants}
        animate="pulse"
      >
        <Icons.Zap />
      </motion.div>
      <div>
        <h3 className="text-lg font-semibold text-white">💡 지금 당신이 해야 할 것</h3>
        <p className="text-sm text-gray-400">단 3가지만 집중하세요</p>
      </div>
    </div>
    
    <div className="space-y-3">
      {actions.map((action, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50"
          custom={i}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          whileHover={{ x: 4 }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {i + 1}
          </div>
          <p className="text-white flex-1">{action}</p>
          <Icons.ArrowRight />
        </motion.div>
      ))}
    </div>
    
    <div className="mt-6 pt-4 border-t border-gray-700">
      <p className="text-center text-gray-400 italic text-sm">
        "인간의 의지와 아우투스의 지능이 만났습니다."
      </p>
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 Empty State (목표 미설정 시)
// ═══════════════════════════════════════════════════════════════════════════════

const EmptyState: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => (
  <motion.div
    className="flex flex-col items-center justify-center py-20"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="p-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 mb-6">
      <Icons.Target />
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">목표를 설정해주세요</h2>
    <p className="text-gray-400 mb-8 text-center max-w-md">
      당신의 욕망을 입력하면 AUTUS Trinity Engine이<br />
      실현 가능한 구체적 목표로 변환합니다.
    </p>
    <button
      onClick={onOpenModal}
      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-medium text-white hover:from-cyan-400 hover:to-blue-400 transition-all flex items-center gap-2"
    >
      <Icons.Plus />
      <span>목표 설정하기</span>
    </button>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 메인 대시보드
// ═══════════════════════════════════════════════════════════════════════════════

const TrinityEngineDashboard: React.FC = () => {
  // Store 연결
  const { data, isLoading, hasData } = useTrinityEngineData();
  const { runAnalysis, setUserDesire, toggleInputModal } = useTrinityEngineActions();
  const { showInputModal, userDesire } = useTrinityEngineUI();

  // 폴백: 스토어에 데이터 없으면 Mock 사용 (개발용)
  const displayData: TrinityData = data || MOCK_TRINITY_DATA;

  const handleSubmitDesire = useCallback(async (desire: string) => {
    setUserDesire(desire);
    await runAnalysis();
  }, [setUserDesire, runAnalysis]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      {/* 배경 그라데이션 */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-gray-950 to-purple-900/20 pointer-events-none" />
      
      {/* 배경 그리드 */}
      <div className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      <div className="relative max-w-7xl mx-auto">
        {/* 헤더 */}
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
                whileHover={{ scale: 1.05 }}
              >
                <Icons.Target />
              </motion.div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    AUTUS TRINITY
                  </span>
                </h1>
                <p className="text-gray-400 text-sm">목표 달성 가속기</p>
              </div>
            </div>
            
            {/* 액션 버튼들 */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleInputModal}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
              >
                <Icons.Sparkles />
                <span className="hidden sm:inline">새 목표</span>
              </button>
            </div>
          </div>
          <p className="text-gray-500 text-sm md:text-base italic mt-4 max-w-2xl">
            "무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다."
          </p>
        </motion.header>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <motion.div
              className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {/* 메인 콘텐츠 */}
        {!isLoading && (
          <>
            {/* 상단 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Icons.Clock} label="필요 기간" value={displayData.crystallization.requiredMonths} unit="개월" color="blue" />
              <StatCard icon={Icons.TrendingUp} label="진행률" value={displayData.progress.progress} unit="%" color="green" trend={2.3} />
              <StatCard icon={Icons.Shield} label="실현 가능성" value={displayData.crystallization.feasibility} unit="%" color="yellow" />
              <StatCard icon={Icons.Zap} label="환경 점수" value={displayData.environment.environmentScore} unit="/100" color="purple" />
            </div>

            {/* Trinity 섹션 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <CrystallizationSection data={displayData.crystallization} />
              <EnvironmentSection data={displayData.environment} />
              <ProgressSection data={displayData.progress} />
            </div>

            {/* 액션 카드 */}
            <ActionCard actions={displayData.actions} />
          </>
        )}

        {/* 푸터 */}
        <footer className="mt-8 text-center text-gray-600 text-sm">
          <p>AUTUS v3.0 Trinity Engine • 2026</p>
        </footer>
      </div>

      {/* 입력 모달 */}
      <InputModal
        isOpen={showInputModal}
        onClose={toggleInputModal}
        onSubmit={handleSubmitDesire}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TrinityEngineDashboard;
