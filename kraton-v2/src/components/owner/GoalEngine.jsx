/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 AUTUS Goal Engine - Maximum Efficiency Version
 * 
 * 설계 원칙:
 * 1. 최소 입력: 목표 유형 + 숫자 + 기한 = 3개 입력으로 끝
 * 2. AI 자동 생성: 계획, 태스크, KPI 모두 자동 제안
 * 3. 숫자 중심: 감성 배제, 데이터만
 * 4. 원클릭 액션: 모든 조작 1번 클릭
 * 5. 실시간 연동: 모든 데이터 자동 동기화
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// 상수 (최소화)
// ============================================
const GOAL_TYPES = {
  revenue: { icon: '💰', unit: '원', format: v => `₩${(v/1e8).toFixed(1)}억` },
  margin: { icon: '📈', unit: '%', format: v => `${v}%` },
  students: { icon: '👩‍🎓', unit: '명', format: v => `${v}명` },
  retention: { icon: '🔒', unit: '%', format: v => `${v}%` },
  branches: { icon: '🏢', unit: '개', format: v => `${v}개` },
  cost: { icon: '✂️', unit: '%', format: v => `-${v}%` },
};

const STATUS_COLORS = {
  achieved: 'emerald',
  on_track: 'cyan',
  at_risk: 'yellow',
  behind: 'red',
};

// ============================================
// AI 자동 생성 로직
// ============================================
const generatePlans = (goal) => {
  const templates = {
    revenue: [
      { title: '신규 등록', weight: 0.4, kpi: '신규 등록 수' },
      { title: '재등록 유지', weight: 0.35, kpi: '재등록률' },
      { title: '객단가 상승', weight: 0.25, kpi: '평균 객단가' },
    ],
    margin: [
      { title: '매출 증대', weight: 0.4, kpi: '매출 성장률' },
      { title: '인건비 효율화', weight: 0.35, kpi: '인건비 비율' },
      { title: '고정비 절감', weight: 0.25, kpi: '고정비 비율' },
    ],
    students: [
      { title: '신규 유치', weight: 0.5, kpi: '신규 등록 수' },
      { title: '이탈 방지', weight: 0.5, kpi: '이탈률' },
    ],
    retention: [
      { title: '이탈 감지', weight: 0.4, kpi: 'Risk Score 평균' },
      { title: '만족도 개선', weight: 0.35, kpi: 'NPS' },
      { title: '관계 강화', weight: 0.25, kpi: 'σ 평균' },
    ],
    branches: [
      { title: '부지 선정', weight: 0.3, kpi: '후보지 수' },
      { title: '계약/인테리어', weight: 0.4, kpi: '진행률' },
      { title: '개원/운영', weight: 0.3, kpi: '개원 완료' },
    ],
    cost: [
      { title: '인건비', weight: 0.4, kpi: '인건비 절감액' },
      { title: '임대료', weight: 0.3, kpi: '임대료 절감액' },
      { title: '운영비', weight: 0.3, kpi: '운영비 절감액' },
    ],
  };
  
  const plans = templates[goal.type] || templates.revenue;
  return plans.map((p, i) => ({
    id: `plan-${i}`,
    ...p,
    target: Math.round(goal.target * p.weight),
    current: Math.round(goal.current * p.weight * (0.8 + Math.random() * 0.3)),
    status: Math.random() > 0.3 ? 'on_track' : 'at_risk',
  }));
};

const generateTasks = (plan) => {
  const taskCount = 2 + Math.floor(Math.random() * 3);
  return Array.from({ length: taskCount }, (_, i) => ({
    id: `task-${plan.id}-${i}`,
    title: `${plan.title} 실행 ${i + 1}`,
    progress: Math.floor(Math.random() * 100),
    assignee: ['김실무', '박실무', '이실무'][i % 3],
  }));
};

// ============================================
// 데이터 생성
// ============================================
const generateGoals = () => [
  {
    id: 'g1',
    type: 'revenue',
    target: 150000000,
    current: 127500000,
    deadline: '2026-01-31',
    created: '2026-01-01',
    velocity: 4250000,
    sigma: 0.72,
    external: +2,
  },
  {
    id: 'g2',
    type: 'retention',
    target: 90,
    current: 87,
    deadline: '2026-03-31',
    created: '2026-01-01',
    velocity: 0.3,
    sigma: 0.65,
    external: -1,
  },
  {
    id: 'g3',
    type: 'margin',
    target: 25,
    current: 21.5,
    deadline: '2026-12-31',
    created: '2026-01-01',
    velocity: 0.08,
    sigma: 0.58,
    external: 0,
  },
];

// ============================================
// 유틸 함수
// ============================================
const calcProgress = (current, target) => Math.min(100, (current / target) * 100);

const calcDaysLeft = (deadline) => {
  const diff = new Date(deadline) - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
};

const calcStatus = (progress, daysLeft, totalDays) => {
  const expectedProgress = ((totalDays - daysLeft) / totalDays) * 100;
  if (progress >= 100) return 'achieved';
  if (progress >= expectedProgress - 5) return 'on_track';
  if (progress >= expectedProgress - 15) return 'at_risk';
  return 'behind';
};

const calcPredicted = (current, velocity, daysLeft) => current + velocity * daysLeft;

// ============================================
// 목표 입력 모달 (3개 입력만)
// ============================================
const GoalInputModal = memo(function GoalInputModal({ isOpen, onClose, onSave }) {
  const [type, setType] = useState('revenue');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSave = () => {
    if (!target || !deadline) return;
    onSave({
      id: `g${Date.now()}`,
      type,
      target: Number(target),
      current: 0,
      deadline,
      created: new Date().toISOString().split('T')[0],
      velocity: 0,
      sigma: 0.5,
      external: 0,
    });
    onClose();
    setTarget('');
    setDeadline('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 p-6 rounded-2xl w-96 border border-gray-800" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-bold text-lg mb-4">🎯 목표 추가</h2>
        
        {/* Type Selection */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(GOAL_TYPES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`p-2 rounded-lg border text-center ${
                type === key 
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
                  : 'border-gray-700 text-gray-500'
              }`}
            >
              <span className="text-lg">{val.icon}</span>
              <p className="text-xs mt-1">{key}</p>
            </button>
          ))}
        </div>

        {/* Target */}
        <div className="mb-4">
          <label className="text-gray-500 text-xs">목표값 ({GOAL_TYPES[type].unit})</label>
          <input
            type="number"
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="w-full mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg"
            placeholder={type === 'revenue' ? '150000000' : '90'}
          />
        </div>

        {/* Deadline */}
        <div className="mb-6">
          <label className="text-gray-500 text-xs">기한</label>
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 p-3 bg-gray-800 text-gray-400 rounded-lg">
            취소
          </button>
          <button 
            onClick={handleSave}
            disabled={!target || !deadline}
            className="flex-1 p-3 bg-cyan-500 text-white rounded-lg disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================
// 목표 행 (한 줄에 모든 정보)
// ============================================
const GoalRow = memo(function GoalRow({ goal, isExpanded, onToggle, onUpdate }) {
  const config = GOAL_TYPES[goal.type];
  const progress = calcProgress(goal.current, goal.target);
  const daysLeft = calcDaysLeft(goal.deadline);
  const totalDays = Math.ceil((new Date(goal.deadline) - new Date(goal.created)) / 86400000);
  const status = calcStatus(progress, daysLeft, totalDays);
  const predicted = calcPredicted(goal.current, goal.velocity, daysLeft);
  const predictedProgress = (predicted / goal.target) * 100;
  
  const plans = useMemo(() => generatePlans(goal), [goal.id, goal.type]);

  return (
    <div className="border-b border-gray-800">
      {/* Main Row */}
      <div 
        className="grid grid-cols-12 gap-2 p-4 items-center cursor-pointer hover:bg-gray-800/30"
        onClick={onToggle}
      >
        {/* Icon + Type */}
        <div className="col-span-1 text-2xl text-center">{config.icon}</div>
        
        {/* Progress Bar */}
        <div className="col-span-3">
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden relative">
            <motion.div 
              className={`h-full bg-${STATUS_COLORS[status]}-500`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
            {/* Predicted marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white/50"
              style={{ left: `${Math.min(predictedProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-500">{config.format(goal.current)}</span>
            <span className={`text-${STATUS_COLORS[status]}-400 font-bold`}>{progress.toFixed(0)}%</span>
          </div>
        </div>
        
        {/* Target */}
        <div className="col-span-2 text-right">
          <p className="text-white font-bold">{config.format(goal.target)}</p>
          <p className="text-gray-600 text-xs">목표</p>
        </div>
        
        {/* Velocity */}
        <div className="col-span-1 text-center">
          <p className={`font-mono ${goal.velocity >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {goal.velocity >= 0 ? '+' : ''}{goal.velocity > 1000 ? (goal.velocity/1e6).toFixed(1) + 'M' : goal.velocity.toFixed(1)}
          </p>
          <p className="text-gray-600 text-xs">/일</p>
        </div>
        
        {/* Predicted */}
        <div className="col-span-2 text-center">
          <p className={`font-bold ${predictedProgress >= 100 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {config.format(Math.round(predicted))}
          </p>
          <p className="text-gray-600 text-xs">예상</p>
        </div>
        
        {/* Sigma */}
        <div className="col-span-1 text-center">
          <p className={`font-mono ${goal.sigma >= 0.7 ? 'text-purple-400' : 'text-gray-400'}`}>
            σ {goal.sigma.toFixed(2)}
          </p>
        </div>
        
        {/* Days Left */}
        <div className="col-span-1 text-center">
          <p className={`font-bold ${daysLeft <= 7 ? 'text-red-400' : 'text-gray-300'}`}>{daysLeft}</p>
          <p className="text-gray-600 text-xs">일</p>
        </div>
        
        {/* Status + Expand */}
        <div className="col-span-1 flex items-center justify-end gap-2">
          <span className={`w-2 h-2 rounded-full bg-${STATUS_COLORS[status]}-500`} />
          <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {/* Expanded: Plans & Tasks */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-900/50 border-t border-gray-800"
          >
            <div className="p-4 grid grid-cols-3 gap-4">
              {plans.map(plan => {
                const planProgress = calcProgress(plan.current, plan.target);
                const tasks = generateTasks(plan);
                
                return (
                  <div key={plan.id} className="p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                    {/* Plan Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{plan.title}</span>
                      <span className="text-cyan-400 text-xs">{(plan.weight * 100)}%</span>
                    </div>
                    
                    {/* Plan Progress */}
                    <div className="h-1.5 bg-gray-700 rounded-full mb-2">
                      <div 
                        className={`h-full bg-${STATUS_COLORS[plan.status]}-500 rounded-full`}
                        style={{ width: `${planProgress}%` }}
                      />
                    </div>
                    
                    {/* Tasks */}
                    <div className="space-y-1">
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between text-xs">
                          <span className={`${task.progress >= 100 ? 'text-gray-500 line-through' : 'text-gray-400'}`}>
                            {task.progress >= 100 ? '✓' : '○'} {task.title}
                          </span>
                          <span className="text-gray-600">{task.progress}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ============================================
// 요약 헤더
// ============================================
const SummaryHeader = memo(function SummaryHeader({ goals }) {
  const summary = useMemo(() => {
    const total = goals.length;
    const achieved = goals.filter(g => calcProgress(g.current, g.target) >= 100).length;
    const onTrack = goals.filter(g => {
      const p = calcProgress(g.current, g.target);
      return p < 100 && p >= 80;
    }).length;
    const avgProgress = goals.reduce((sum, g) => sum + calcProgress(g.current, g.target), 0) / total;
    const avgSigma = goals.reduce((sum, g) => sum + g.sigma, 0) / total;
    
    return { total, achieved, onTrack, avgProgress, avgSigma };
  }, [goals]);

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <div className="p-4 bg-gray-800/30 rounded-xl text-center">
        <p className="text-3xl font-bold text-white">{summary.total}</p>
        <p className="text-gray-500 text-xs">목표</p>
      </div>
      <div className="p-4 bg-emerald-500/10 rounded-xl text-center border border-emerald-500/30">
        <p className="text-3xl font-bold text-emerald-400">{summary.achieved}</p>
        <p className="text-gray-500 text-xs">달성</p>
      </div>
      <div className="p-4 bg-cyan-500/10 rounded-xl text-center border border-cyan-500/30">
        <p className="text-3xl font-bold text-cyan-400">{summary.onTrack}</p>
        <p className="text-gray-500 text-xs">순조</p>
      </div>
      <div className="p-4 bg-gray-800/30 rounded-xl text-center">
        <p className="text-3xl font-bold text-white">{summary.avgProgress.toFixed(0)}%</p>
        <p className="text-gray-500 text-xs">평균</p>
      </div>
      <div className="p-4 bg-purple-500/10 rounded-xl text-center border border-purple-500/30">
        <p className="text-3xl font-bold text-purple-400">σ {summary.avgSigma.toFixed(2)}</p>
        <p className="text-gray-500 text-xs">시너지</p>
      </div>
    </div>
  );
});

// ============================================
// 실시간 트래커 (미니 차트)
// ============================================
const RealtimeTracker = memo(function RealtimeTracker({ goals }) {
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-medium">📡 실시간</span>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 bg-emerald-500 rounded-full"
        />
      </div>
      
      <div className="space-y-2">
        {goals.slice(0, 3).map(goal => {
          const config = GOAL_TYPES[goal.type];
          const progress = calcProgress(goal.current, goal.target);
          
          return (
            <div key={goal.id} className="flex items-center gap-2">
              <span className="text-sm">{config.icon}</span>
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-cyan-500"
                  animate={{ width: `${progress + (tick % 3) * 0.5}%` }}
                />
              </div>
              <span className="text-cyan-400 text-xs font-mono w-10 text-right">
                {progress.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ============================================
// AI 추천 패널
// ============================================
const AIRecommendations = memo(function AIRecommendations({ goals }) {
  const recommendations = useMemo(() => {
    const recs = [];
    
    goals.forEach(goal => {
      const progress = calcProgress(goal.current, goal.target);
      const daysLeft = calcDaysLeft(goal.deadline);
      const config = GOAL_TYPES[goal.type];
      
      if (progress < 80 && daysLeft < 14) {
        recs.push({
          type: 'urgent',
          icon: '🚨',
          text: `${config.icon} 목표 긴급 조치 필요 (${daysLeft}일 남음, ${progress.toFixed(0)}%)`,
        });
      }
      
      if (goal.sigma < 0.6) {
        recs.push({
          type: 'warning',
          icon: '⚠️',
          text: `${config.icon} 소비자 반응 저조 (σ ${goal.sigma.toFixed(2)})`,
        });
      }
      
      if (goal.velocity < 0) {
        recs.push({
          type: 'alert',
          icon: '📉',
          text: `${config.icon} 역성장 감지 (${goal.velocity.toFixed(1)}/일)`,
        });
      }
    });
    
    if (recs.length === 0) {
      recs.push({
        type: 'ok',
        icon: '✅',
        text: '모든 목표 정상 진행 중',
      });
    }
    
    return recs.slice(0, 4);
  }, [goals]);

  return (
    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700">
      <span className="text-white font-medium">🤖 AI</span>
      
      <div className="mt-3 space-y-2">
        {recommendations.map((rec, i) => (
          <div 
            key={i}
            className={`p-2 rounded-lg text-xs ${
              rec.type === 'urgent' ? 'bg-red-500/20 text-red-400' :
              rec.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
              rec.type === 'alert' ? 'bg-orange-500/20 text-orange-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {rec.icon} {rec.text}
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// 빠른 액션 버튼들
// ============================================
const QuickActions = memo(function QuickActions({ onAddGoal }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onAddGoal}
        className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600"
      >
        + 목표
      </button>
      <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">
        📊 리포트
      </button>
      <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">
        ⚙️ 설정
      </button>
    </div>
  );
});

// ============================================
// 테이블 헤더
// ============================================
const TableHeader = memo(function TableHeader() {
  return (
    <div className="grid grid-cols-12 gap-2 p-3 bg-gray-800/50 text-gray-500 text-xs font-medium border-b border-gray-700">
      <div className="col-span-1 text-center">유형</div>
      <div className="col-span-3">진행률</div>
      <div className="col-span-2 text-right">목표</div>
      <div className="col-span-1 text-center">속도</div>
      <div className="col-span-2 text-center">예상</div>
      <div className="col-span-1 text-center">σ</div>
      <div className="col-span-1 text-center">D-Day</div>
      <div className="col-span-1 text-right">상태</div>
    </div>
  );
});

// ============================================
// 메인 컴포넌트
// ============================================
export default function GoalEngine() {
  const [goals, setGoals] = useState(generateGoals);
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // 실시간 업데이트 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setGoals(prev => prev.map(g => ({
        ...g,
        current: g.current + (Math.random() - 0.3) * g.velocity * 0.1,
        sigma: Math.max(0, Math.min(1, g.sigma + (Math.random() - 0.5) * 0.01)),
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddGoal = useCallback((newGoal) => {
    setGoals(prev => [...prev, newGoal]);
  }, []);

  const handleToggle = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">🎯 Goal Engine</h1>
            <p className="text-gray-500 text-sm">3-Click Goal Setting · AI Auto-Planning · Real-time Tracking</p>
          </div>
          <QuickActions onAddGoal={() => setShowModal(true)} />
        </div>

        {/* Summary */}
        <SummaryHeader goals={goals} />

        {/* Main Grid */}
        <div className="grid grid-cols-4 gap-6">
          {/* Left: Goal Table (3 cols) */}
          <div className="col-span-3 bg-gray-800/20 rounded-xl border border-gray-800 overflow-hidden">
            <TableHeader />
            {goals.map(goal => (
              <GoalRow
                key={goal.id}
                goal={goal}
                isExpanded={expandedId === goal.id}
                onToggle={() => handleToggle(goal.id)}
              />
            ))}
          </div>

          {/* Right: Sidebar (1 col) */}
          <div className="space-y-4">
            <RealtimeTracker goals={goals} />
            <AIRecommendations goals={goals} />
            
            {/* External Factors */}
            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700">
              <span className="text-white font-medium">🌍 외부 요인</span>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">시장</span>
                  <span className="text-emerald-400">+5%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">경쟁</span>
                  <span className="text-red-400">-3%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">경제</span>
                  <span className="text-yellow-400">-1%</span>
                </div>
                <div className="border-t border-gray-700 pt-2 flex justify-between text-xs font-medium">
                  <span className="text-gray-300">합계</span>
                  <span className="text-cyan-400">+1%</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="p-4 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/30">
              <div className="text-center">
                <p className="text-gray-400 text-xs">전체 V-Index</p>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                  ₩2.87B
                </p>
                <p className="text-emerald-400 text-xs mt-1">▲ 3.2%/월</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        <GoalInputModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleAddGoal}
        />
      </div>
    </div>
  );
}
