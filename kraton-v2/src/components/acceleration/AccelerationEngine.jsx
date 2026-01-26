/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚡ KRATON Acceleration Engine
 * 시스템 가속도 대시보드 - 실무자가 관계에만 집중하도록
 * 반복 업무 제로화 + 자동화 현황 + 가속도 측정
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * P = (M × I × A) / R
 * A (Acceleration) = 시스템이 제공하는 업무 가속도
 */

import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MOCK DATA GENERATORS
// ============================================

const generateAccelerationMetrics = () => ({
  // 가속도 지표
  accelerationIndex: 2.8, // 시스템이 제공하는 배속
  potentialIndex: 4.2, // 최적화 시 가능한 배속
  
  // 시간 절감
  weeklyHoursSaved: 142,
  monthlyHoursSaved: 568,
  yearlyHoursSaved: 6816,
  hourlyValueKRW: 35000, // 시간당 가치
  
  // 자동화율
  automationRate: 0.73,
  targetAutomation: 0.90,
  
  // 업무 분포
  relationWorkRatio: 0.42, // 관계 업무 비율 (목표: 0.8+)
  adminWorkRatio: 0.35, // 행정 업무 비율 (목표: 0.1-)
  teachingWorkRatio: 0.23, // 교육 업무 비율
  
  // 워크플로우
  activeWorkflows: 12,
  executionsToday: 847,
  successRate: 0.96,
});

const generateWorkflowList = () => [
  {
    id: 'WF-001',
    name: '출석 자동 체크',
    description: 'QR/NFC 스캔 시 자동 출석 처리 + 학부모 알림',
    trigger: 'QR 스캔',
    frequency: '실시간',
    executions: 245,
    timeSaved: 12.5, // hours/week
    status: 'active',
    category: 'admin',
  },
  {
    id: 'WF-002',
    name: '성적 리포트 자동 생성',
    description: '월말 자동으로 개인별 성적 리포트 생성 및 발송',
    trigger: '매월 말일',
    frequency: '월 1회',
    executions: 245,
    timeSaved: 8.0,
    status: 'active',
    category: 'admin',
  },
  {
    id: 'WF-003',
    name: '이탈 징후 자동 감지',
    description: 's-Index 하락 시 자동 알림 + Risk Queue 등록',
    trigger: 's-Index < 40%',
    frequency: '실시간',
    executions: 47,
    timeSaved: 6.0,
    status: 'active',
    category: 'relation',
  },
  {
    id: 'WF-004',
    name: '수납 알림 자동화',
    description: '납부일 3일 전 자동 알림 + 미납 시 팔로업',
    trigger: 'D-3, D+1, D+7',
    frequency: '일별',
    executions: 156,
    timeSaved: 15.0,
    status: 'active',
    category: 'admin',
  },
  {
    id: 'WF-005',
    name: '상담 일지 자동 요약',
    description: '음성 상담 후 AI가 자동으로 핵심 요약 생성',
    trigger: '상담 종료',
    frequency: '실시간',
    executions: 89,
    timeSaved: 10.0,
    status: 'active',
    category: 'relation',
  },
  {
    id: 'WF-006',
    name: '케미 매칭 추천',
    description: '신규 학생 등록 시 최적 선생님 자동 추천',
    trigger: '신규 등록',
    frequency: '이벤트',
    executions: 34,
    timeSaved: 4.0,
    status: 'active',
    category: 'relation',
  },
];

const generatePendingAutomations = () => [
  { id: 1, name: '학부모 면담 일정 조율', timeSavePotential: 8, difficulty: 'medium', priority: 'high' },
  { id: 2, name: '교재 재고 자동 발주', timeSavePotential: 3, difficulty: 'easy', priority: 'medium' },
  { id: 3, name: '월간 정산 보고서', timeSavePotential: 6, difficulty: 'medium', priority: 'high' },
  { id: 4, name: '직원 근태 관리', timeSavePotential: 4, difficulty: 'easy', priority: 'low' },
];

const generateTimeAllocation = () => ({
  current: [
    { category: '관계 구축', hours: 16.8, color: 'emerald', icon: '💝' },
    { category: '행정 업무', hours: 14.0, color: 'red', icon: '📋' },
    { category: '교육/수업', hours: 9.2, color: 'cyan', icon: '📚' },
  ],
  target: [
    { category: '관계 구축', hours: 32.0, color: 'emerald', icon: '💝' },
    { category: '행정 업무', hours: 4.0, color: 'red', icon: '📋' },
    { category: '교육/수업', hours: 4.0, color: 'cyan', icon: '📚' },
  ],
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (value) => {
  if (value >= 1e6) return `₩${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `₩${(value / 1e3).toFixed(0)}K`;
  return `₩${value.toLocaleString()}`;
};

// ============================================
// SUB COMPONENTS
// ============================================

// Acceleration Gauge
const AccelerationGauge = memo(function AccelerationGauge({ current, potential }) {
  const percentage = (current / potential) * 100;
  
  return (
    <div className="relative w-56 h-56">
      {/* Background */}
      <svg viewBox="0 0 100 100" className="transform -rotate-90">
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="10"
        />
        {/* Potential arc */}
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="rgba(168, 85, 247, 0.3)"
          strokeWidth="10"
          strokeDasharray="283"
          strokeDashoffset="0"
        />
        {/* Current arc */}
        <motion.circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="#10b981"
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ strokeDashoffset: 283 }}
          animate={{ strokeDashoffset: 283 - (283 * percentage / 100) }}
          style={{ strokeDasharray: 283 }}
          transition={{ duration: 1.5 }}
        />
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-emerald-400">{current.toFixed(1)}x</span>
        <span className="text-gray-400 text-sm">System Acceleration</span>
        <div className="mt-2 text-xs text-gray-500">
          잠재력: <span className="text-purple-400">{potential.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
});

// Time Saved Counter
const TimeSavedCounter = memo(function TimeSavedCounter({ metrics }) {
  const monthlySaving = metrics.monthlyHoursSaved * metrics.hourlyValueKRW;
  const yearlySaving = metrics.yearlyHoursSaved * metrics.hourlyValueKRW;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 text-center">
        <p className="text-gray-400 text-sm mb-2">주간 절감</p>
        <p className="text-3xl font-bold text-cyan-400">{metrics.weeklyHoursSaved}h</p>
        <p className="text-emerald-400 text-xs">{formatCurrency(metrics.weeklyHoursSaved * metrics.hourlyValueKRW)}</p>
      </div>
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 text-center">
        <p className="text-gray-400 text-sm mb-2">월간 절감</p>
        <p className="text-3xl font-bold text-purple-400">{metrics.monthlyHoursSaved}h</p>
        <p className="text-emerald-400 text-xs">{formatCurrency(monthlySaving)}</p>
      </div>
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 text-center">
        <p className="text-gray-400 text-sm mb-2">연간 절감</p>
        <p className="text-3xl font-bold text-emerald-400">{metrics.yearlyHoursSaved}h</p>
        <p className="text-emerald-400 text-xs">{formatCurrency(yearlySaving)}</p>
      </div>
    </div>
  );
});

// Work Distribution Chart
const WorkDistribution = memo(function WorkDistribution({ allocation }) {
  const totalCurrent = allocation.current.reduce((sum, c) => sum + c.hours, 0);
  const totalTarget = allocation.target.reduce((sum, c) => sum + c.hours, 0);

  return (
    <div className="space-y-6">
      {/* Current */}
      <div>
        <p className="text-gray-400 text-sm mb-3">현재 업무 분배 (주 40시간 기준)</p>
        <div className="flex h-8 rounded-full overflow-hidden bg-gray-700">
          {allocation.current.map((item, idx) => (
            <motion.div
              key={item.category}
              initial={{ width: 0 }}
              animate={{ width: `${(item.hours / totalCurrent) * 100}%` }}
              transition={{ duration: 1, delay: idx * 0.2 }}
              className={`bg-${item.color}-500 flex items-center justify-center`}
              title={`${item.category}: ${item.hours}h`}
            >
              <span className="text-xs text-white font-medium">{item.icon}</span>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs">
          {allocation.current.map(item => (
            <span key={item.category} className={`text-${item.color}-400`}>
              {item.icon} {item.category} {item.hours}h ({((item.hours / totalCurrent) * 100).toFixed(0)}%)
            </span>
          ))}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-2xl text-gray-500"
        >
          ⬇️
        </motion.div>
      </div>

      {/* Target */}
      <div>
        <p className="text-emerald-400 text-sm mb-3">목표 업무 분배 (자동화 후)</p>
        <div className="flex h-8 rounded-full overflow-hidden bg-gray-700">
          {allocation.target.map((item, idx) => (
            <motion.div
              key={item.category}
              initial={{ width: 0 }}
              animate={{ width: `${(item.hours / totalTarget) * 100}%` }}
              transition={{ duration: 1, delay: idx * 0.2 }}
              className={`bg-${item.color}-500 flex items-center justify-center`}
            >
              <span className="text-xs text-white font-medium">{item.icon}</span>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs">
          {allocation.target.map(item => (
            <span key={item.category} className={`text-${item.color}-400`}>
              {item.icon} {item.category} {item.hours}h ({((item.hours / totalTarget) * 100).toFixed(0)}%)
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

// Active Workflows
const ActiveWorkflows = memo(function ActiveWorkflows({ workflows }) {
  const getCategoryStyle = (category) => ({
    admin: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '행정' },
    relation: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '관계' },
    teaching: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: '교육' },
  }[category]);

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
      {workflows.map(wf => {
        const style = getCategoryStyle(wf.category);
        return (
          <motion.div
            key={wf.id}
            whileHover={{ scale: 1.01 }}
            className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-emerald-500/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-medium">{wf.name}</p>
                <p className="text-gray-500 text-xs">{wf.description}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${style.bg} ${style.text}`}>
                {style.label}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-gray-500">
                  트리거: <span className="text-cyan-400">{wf.trigger}</span>
                </span>
                <span className="text-gray-500">
                  실행: <span className="text-purple-400">{wf.executions}회</span>
                </span>
              </div>
              <span className="text-emerald-400 font-medium">
                -{wf.timeSaved}h/주
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

// Pending Automations
const PendingAutomations = memo(function PendingAutomations({ items, onAutomate }) {
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          className="p-3 bg-gray-800/50 rounded-xl flex items-center justify-between"
        >
          <div>
            <p className="text-white text-sm">{item.name}</p>
            <p className="text-gray-500 text-xs">
              예상 절감: <span className="text-emerald-400">{item.timeSavePotential}h/주</span>
            </p>
          </div>
          <button
            onClick={() => onAutomate(item.id)}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
              item.priority === 'high'
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            자동화
          </button>
        </div>
      ))}
    </div>
  );
});

// Acceleration Formula
const AccelerationFormula = memo(function AccelerationFormula({ metrics }) {
  return (
    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/30">
      <h4 className="text-purple-400 font-medium mb-4">⚡ KRATON Acceleration Formula</h4>
      
      <div className="text-center mb-4">
        <span className="text-2xl font-mono text-white">
          A = T<sub>saved</sub> × V<sub>hour</sub> × η
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <p className="text-cyan-400 font-mono text-lg">{metrics.monthlyHoursSaved}h</p>
          <p className="text-gray-500">T<sub>saved</sub></p>
          <p className="text-gray-600 text-xs">월간 절감 시간</p>
        </div>
        <div>
          <p className="text-purple-400 font-mono text-lg">₩35K</p>
          <p className="text-gray-500">V<sub>hour</sub></p>
          <p className="text-gray-600 text-xs">시간당 가치</p>
        </div>
        <div>
          <p className="text-emerald-400 font-mono text-lg">{(metrics.successRate * 100).toFixed(0)}%</p>
          <p className="text-gray-500">η</p>
          <p className="text-gray-600 text-xs">자동화 효율</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 text-center">
        <p className="text-gray-400 text-sm">월간 가속도 가치</p>
        <p className="text-3xl font-bold text-emerald-400">
          {formatCurrency(metrics.monthlyHoursSaved * metrics.hourlyValueKRW * metrics.successRate)}
        </p>
      </div>
    </div>
  );
});

// Relation Focus Score
const RelationFocusScore = memo(function RelationFocusScore({ currentRatio, targetRatio }) {
  const score = (currentRatio / targetRatio) * 100;
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-medium">💝 관계 집중도</h4>
        <span className={`text-lg font-bold ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
          {score.toFixed(0)}%
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-3">
        실무자가 관계 업무에 집중하는 비율
      </p>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 1 }}
          className={`h-full rounded-full ${
            score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs">
        <span className="text-gray-500">현재: {(currentRatio * 100).toFixed(0)}%</span>
        <span className="text-emerald-400">목표: {(targetRatio * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function AccelerationEngine() {
  const [metrics] = useState(generateAccelerationMetrics);
  const [workflows] = useState(generateWorkflowList);
  const [pendingAutomations, setPendingAutomations] = useState(generatePendingAutomations);
  const [timeAllocation] = useState(generateTimeAllocation);

  const handleAutomate = (id) => {
    console.log(`Automate: ${id}`);
    setPendingAutomations(prev => prev.filter(a => a.id !== id));
  };

  const totalTimeSaved = useMemo(() => 
    workflows.reduce((sum, wf) => sum + wf.timeSaved, 0),
    [workflows]
  );

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">⚡</span>
              Acceleration Engine
            </h1>
            <p className="text-gray-400 mt-1">시스템 가속도 - 실무자가 관계에만 집중하도록</p>
          </div>
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-xl">
            <span className="text-emerald-400">
              주간 <span className="font-bold">{totalTimeSaved}시간</span> 자동화
            </span>
          </div>
        </div>

        {/* Main Gauge + Time Saved */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6 flex flex-col items-center">
            <AccelerationGauge 
              current={metrics.accelerationIndex} 
              potential={metrics.potentialIndex} 
            />
            <p className="text-gray-500 text-sm mt-4 text-center">
              시스템이 실무자 업무를 <span className="text-emerald-400">{metrics.accelerationIndex}배</span> 가속
            </p>
          </div>

          <div className="col-span-2 space-y-4">
            <TimeSavedCounter metrics={metrics} />
            <RelationFocusScore 
              currentRatio={metrics.relationWorkRatio} 
              targetRatio={0.8} 
            />
          </div>
        </div>

        {/* Work Distribution */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <span className="text-cyan-400">📊</span>
            업무 시간 재분배 (자동화 효과)
          </h3>
          <WorkDistribution allocation={timeAllocation} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Active Workflows */}
          <div className="col-span-2 bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <span className="text-purple-400">🔄</span>
              활성 워크플로우 ({workflows.length}개)
              <span className="ml-auto text-gray-500 text-sm">
                오늘 {metrics.executionsToday}회 실행
              </span>
            </h3>
            <ActiveWorkflows workflows={workflows} />
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Formula */}
            <AccelerationFormula metrics={metrics} />

            {/* Pending Automations */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-yellow-400">⏳</span>
                자동화 대기
              </h3>
              <PendingAutomations 
                items={pendingAutomations} 
                onAutomate={handleAutomate}
              />
            </div>

            {/* Key Insight */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30">
              <h4 className="text-emerald-400 font-medium mb-2">💡 가속도 인사이트</h4>
              <div className="space-y-2 text-sm text-white">
                <p>• 행정 업무 <span className="text-red-400">35%</span> → <span className="text-emerald-400">10%</span> 감소 목표</p>
                <p>• 관계 업무 <span className="text-yellow-400">42%</span> → <span className="text-emerald-400">80%</span> 증가 목표</p>
                <p>• 연간 <span className="text-cyan-400">₩238M</span> 인건비 가치 창출</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
