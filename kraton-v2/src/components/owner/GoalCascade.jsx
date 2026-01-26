/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 AUTUS Goal Cascade System
 * 목표 → 계획 → 실행의 계층적 운영 시스템
 * 
 * 구조:
 * - C-Level (오너): 목표 설정 (WHAT)
 * - FSD (관리자): 계획 수립 (HOW)
 * - Optimus (실무자): 실행 (DO)
 * 
 * 특징:
 * - 실시간 달성 현황 모니터링
 * - 달성 기울기(Trajectory) 예측
 * - 외부 환경 & 소비자 반응 반영
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// 상수 정의
// ============================================

const GOAL_TYPES = {
  revenue: { icon: '💰', name: '매출', color: 'emerald', unit: '원' },
  margin: { icon: '📈', name: '이익률', color: 'purple', unit: '%' },
  students: { icon: '👩‍🎓', name: '학생수', color: 'cyan', unit: '명' },
  branches: { icon: '🏢', name: '지점', color: 'blue', unit: '개' },
  retention: { icon: '🔒', name: '유지율', color: 'yellow', unit: '%' },
  nps: { icon: '⭐', name: 'NPS', color: 'pink', unit: '점' },
  custom: { icon: '🎯', name: '커스텀', color: 'gray', unit: '' },
};

const TRAJECTORY_STATUS = {
  accelerating: { label: '가속', icon: '🚀', color: 'emerald', desc: '목표 초과 달성 예상' },
  on_track: { label: '정상', icon: '✅', color: 'blue', desc: '계획대로 진행 중' },
  slowing: { label: '둔화', icon: '⚠️', color: 'yellow', desc: '속도 저하 감지' },
  at_risk: { label: '위험', icon: '🔴', color: 'red', desc: '목표 미달 예상' },
  stalled: { label: '정체', icon: '⏸️', color: 'gray', desc: '진행 정체' },
};

const EXTERNAL_FACTORS = {
  market: { name: '시장 환경', icon: '📊' },
  competition: { name: '경쟁 상황', icon: '⚔️' },
  economy: { name: '경제 지표', icon: '📉' },
  regulation: { name: '규제 변화', icon: '📜' },
  season: { name: '계절 요인', icon: '🗓️' },
};

// ============================================
// Mock 데이터 생성
// ============================================

const generateMockData = () => ({
  goals: [
    {
      id: 'goal-1',
      type: 'revenue',
      title: '월매출 1.5억원 달성',
      target: 150000000,
      current: 127500000,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      owner: 'CEO',
      trajectory: {
        status: 'on_track',
        velocity: 4250000, // 일일 증가량
        predictedEnd: 148500000,
        daysRemaining: 7,
        confidence: 0.85,
      },
      externalFactors: [
        { type: 'season', impact: +5, desc: '신학기 시즌 호조' },
        { type: 'competition', impact: -3, desc: '신규 경쟁 학원 오픈' },
      ],
      consumerSignals: {
        sigma: 0.72, // 소비자 반응 (시너지)
        trend: 'up', // 추세
        inquiries: 45, // 문의 건수
        conversions: 12, // 등록 전환
      },
      plans: [
        {
          id: 'plan-1-1',
          title: '신규 등록 30명 확보',
          owner: 'FSD',
          target: 30,
          current: 24,
          weight: 0.4, // 목표 기여도
          status: 'on_track',
          tasks: [
            { id: 't1', title: '전단지 5000매 배포', assignee: '김실무', status: 'done', progress: 100 },
            { id: 't2', title: '네이버 광고 집행', assignee: '박실무', status: 'in_progress', progress: 70 },
            { id: 't3', title: '체험 수업 20회 진행', assignee: '이실무', status: 'in_progress', progress: 80 },
            { id: 't4', title: '학부모 상담 50건', assignee: '최실무', status: 'in_progress', progress: 60 },
          ],
        },
        {
          id: 'plan-1-2',
          title: '재등록률 85% 유지',
          owner: 'FSD',
          target: 85,
          current: 82,
          weight: 0.3,
          status: 'at_risk',
          tasks: [
            { id: 't5', title: '이탈 위험 학생 케어', assignee: '김실무', status: 'in_progress', progress: 50 },
            { id: 't6', title: '학부모 감사 이벤트', assignee: '박실무', status: 'pending', progress: 0 },
            { id: 't7', title: '성적 향상 리포트 발송', assignee: '이실무', status: 'done', progress: 100 },
          ],
        },
        {
          id: 'plan-1-3',
          title: '객단가 50만원 유지',
          owner: 'FSD',
          target: 500000,
          current: 480000,
          weight: 0.3,
          status: 'slowing',
          tasks: [
            { id: 't8', title: '프리미엄 반 홍보', assignee: '최실무', status: 'in_progress', progress: 40 },
            { id: 't9', title: '추가 과목 상담', assignee: '김실무', status: 'pending', progress: 0 },
          ],
        },
      ],
    },
    {
      id: 'goal-2',
      type: 'retention',
      title: '학생 유지율 90% 달성',
      target: 90,
      current: 87,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      owner: 'CEO',
      trajectory: {
        status: 'slowing',
        velocity: 0.3,
        predictedEnd: 89.5,
        daysRemaining: 66,
        confidence: 0.72,
      },
      externalFactors: [
        { type: 'economy', impact: -2, desc: '경기 침체 우려' },
      ],
      consumerSignals: {
        sigma: 0.65,
        trend: 'stable',
        inquiries: 12,
        conversions: 3,
      },
      plans: [
        {
          id: 'plan-2-1',
          title: '이탈 위험 조기 감지',
          owner: 'FSD',
          target: 100,
          current: 78,
          weight: 0.5,
          status: 'on_track',
          tasks: [
            { id: 't10', title: 'Risk Queue 모니터링', assignee: '시스템', status: 'in_progress', progress: 100 },
            { id: 't11', title: '주간 FSD 리뷰', assignee: 'FSD', status: 'in_progress', progress: 75 },
          ],
        },
        {
          id: 'plan-2-2',
          title: '학부모 만족도 개선',
          owner: 'FSD',
          target: 4.5,
          current: 4.2,
          weight: 0.5,
          status: 'at_risk',
          tasks: [
            { id: 't12', title: 'Safety Mirror 리포트 발송', assignee: '시스템', status: 'in_progress', progress: 90 },
            { id: 't13', title: '월간 학부모 간담회', assignee: '박실무', status: 'pending', progress: 0 },
          ],
        },
      ],
    },
  ],
  dailyData: generateDailyData(),
});

// 일별 데이터 생성 (차트용)
function generateDailyData() {
  const data = [];
  const startValue = 95000000;
  let current = startValue;
  
  for (let i = 0; i < 24; i++) {
    const date = new Date(2026, 0, 1 + i);
    const dailyGrowth = 3500000 + (Math.random() - 0.3) * 2000000;
    current += dailyGrowth;
    
    data.push({
      date: date.toISOString().split('T')[0],
      actual: Math.round(current),
      planned: startValue + (i + 1) * 4166667, // 선형 계획
      forecast: null, // 예측값은 이후 날짜에만
    });
  }
  
  // 예측 데이터 추가
  for (let i = 24; i < 31; i++) {
    const date = new Date(2026, 0, 1 + i);
    data.push({
      date: date.toISOString().split('T')[0],
      actual: null,
      planned: startValue + (i + 1) * 4166667,
      forecast: current + (i - 23) * 3200000,
    });
  }
  
  return data;
}

// ============================================
// 서브 컴포넌트
// ============================================

// 달성 기울기 게이지
const TrajectoryGauge = memo(function TrajectoryGauge({ trajectory, target, current }) {
  const status = TRAJECTORY_STATUS[trajectory.status];
  const progress = (current / target) * 100;
  const predictedProgress = (trajectory.predictedEnd / target) * 100;
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-medium flex items-center gap-2">
          <span>📐</span> 달성 기울기
        </h4>
        <div className={`px-3 py-1 rounded-full text-xs bg-${status.color}-500/20 text-${status.color}-400 flex items-center gap-1`}>
          <span>{status.icon}</span>
          <span>{status.label}</span>
        </div>
      </div>
      
      {/* Progress Bar with Prediction */}
      <div className="relative h-8 bg-gray-700 rounded-full overflow-hidden mb-3">
        {/* Actual Progress */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 1 }}
          className={`absolute h-full bg-gradient-to-r from-${status.color}-600 to-${status.color}-400`}
        />
        {/* Predicted End Line */}
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `${Math.min(predictedProgress, 100)}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-white/50"
        />
        {/* Target Line */}
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-yellow-400/50" />
        
        {/* Labels */}
        <div className="absolute inset-0 flex items-center px-3">
          <span className="text-white text-sm font-bold">{progress.toFixed(1)}%</span>
        </div>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center p-2 bg-gray-900/50 rounded-lg">
          <p className="text-gray-500">일일 증가</p>
          <p className="text-emerald-400 font-bold">
            {trajectory.velocity > 0 ? '+' : ''}{(trajectory.velocity / 1e6).toFixed(1)}M
          </p>
        </div>
        <div className="text-center p-2 bg-gray-900/50 rounded-lg">
          <p className="text-gray-500">예상 달성</p>
          <p className={`font-bold ${predictedProgress >= 100 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {predictedProgress.toFixed(0)}%
          </p>
        </div>
        <div className="text-center p-2 bg-gray-900/50 rounded-lg">
          <p className="text-gray-500">신뢰도</p>
          <p className="text-cyan-400 font-bold">{(trajectory.confidence * 100).toFixed(0)}%</p>
        </div>
      </div>
      
      <p className="text-gray-500 text-xs mt-2 text-center">{status.desc}</p>
    </div>
  );
});

// 외부 환경 요인 패널
const ExternalFactorsPanel = memo(function ExternalFactorsPanel({ factors }) {
  const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-medium flex items-center gap-2">
          <span>🌍</span> 외부 환경
        </h4>
        <span className={`text-sm font-bold ${totalImpact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {totalImpact >= 0 ? '+' : ''}{totalImpact}%
        </span>
      </div>
      
      <div className="space-y-2">
        {factors.map((factor, idx) => {
          const config = EXTERNAL_FACTORS[factor.type];
          return (
            <div key={idx} className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span>{config?.icon || '📌'}</span>
                <span className="text-gray-300 text-sm">{factor.desc}</span>
              </div>
              <span className={`text-sm font-bold ${factor.impact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {factor.impact >= 0 ? '+' : ''}{factor.impact}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// 소비자 반응 패널
const ConsumerSignalsPanel = memo(function ConsumerSignalsPanel({ signals }) {
  const trendIcon = signals.trend === 'up' ? '📈' : signals.trend === 'down' ? '📉' : '➡️';
  const trendColor = signals.trend === 'up' ? 'emerald' : signals.trend === 'down' ? 'red' : 'gray';
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-medium flex items-center gap-2">
          <span>👥</span> 소비자 반응
        </h4>
        <span className={`text-${trendColor}-400`}>{trendIcon}</span>
      </div>
      
      {/* Sigma (시너지 지수) */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">시너지 지수 (σ)</span>
          <span className="text-purple-400 font-bold">{signals.sigma.toFixed(2)}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${signals.sigma * 100}%` }}
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
          />
        </div>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-gray-900/50 rounded-lg text-center">
          <p className="text-gray-500">문의</p>
          <p className="text-white font-bold">{signals.inquiries}건</p>
        </div>
        <div className="p-2 bg-gray-900/50 rounded-lg text-center">
          <p className="text-gray-500">전환</p>
          <p className="text-emerald-400 font-bold">{signals.conversions}명</p>
        </div>
      </div>
      
      {/* Conversion Rate */}
      <div className="mt-2 p-2 bg-cyan-500/10 rounded-lg text-center">
        <span className="text-gray-400 text-xs">전환율 </span>
        <span className="text-cyan-400 font-bold text-sm">
          {((signals.conversions / signals.inquiries) * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
});

// 계획 카드 (FSD 영역)
const PlanCard = memo(function PlanCard({ plan, onTaskUpdate }) {
  const [expanded, setExpanded] = useState(true);
  const progress = (plan.current / plan.target) * 100;
  const statusConfig = TRAJECTORY_STATUS[plan.status] || TRAJECTORY_STATUS.on_track;
  
  const completedTasks = plan.tasks.filter(t => t.status === 'done').length;
  const totalTasks = plan.tasks.length;
  
  return (
    <div className="p-4 bg-gray-800/30 rounded-xl border border-cyan-500/30">
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full bg-${statusConfig.color}-500`} />
          <div>
            <h4 className="text-white font-medium">{plan.title}</h4>
            <p className="text-gray-500 text-xs">담당: {plan.owner} · 기여도 {(plan.weight * 100).toFixed(0)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-cyan-400 font-bold">{progress.toFixed(0)}%</p>
            <p className="text-gray-500 text-xs">{completedTasks}/{totalTasks} 완료</p>
          </div>
          <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          className={`h-full bg-${statusConfig.color}-500 rounded-full`}
        />
      </div>
      
      {/* Tasks (Optimus 영역) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 space-y-2"
          >
            {plan.tasks.map(task => (
              <div 
                key={task.id}
                className={`p-3 rounded-lg border ${
                  task.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/30' :
                  task.status === 'in_progress' ? 'bg-blue-500/10 border-blue-500/30' :
                  'bg-gray-700/30 border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${
                      task.status === 'done' ? 'text-emerald-400' :
                      task.status === 'in_progress' ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                      {task.status === 'done' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳'}
                    </span>
                    <span className={`text-sm ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-white'}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">{task.assignee}</span>
                    <span className={`text-xs font-bold ${
                      task.progress >= 100 ? 'text-emerald-400' :
                      task.progress >= 50 ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                      {task.progress}%
                    </span>
                  </div>
                </div>
                {task.status !== 'done' && (
                  <div className="h-1 bg-gray-600 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// 목표 대시보드 카드
const GoalDashboard = memo(function GoalDashboard({ goal }) {
  const typeConfig = GOAL_TYPES[goal.type];
  const progress = (goal.current / goal.target) * 100;
  const trajectoryStatus = TRAJECTORY_STATUS[goal.trajectory.status];
  
  // 계획별 가중 진행률 계산
  const weightedProgress = goal.plans.reduce((sum, plan) => {
    const planProgress = (plan.current / plan.target) * 100;
    return sum + (planProgress * plan.weight);
  }, 0);
  
  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Goal Header - C-Level 영역 */}
      <div className={`p-6 bg-gradient-to-r from-${typeConfig.color}-500/20 to-transparent border-b border-gray-800`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{typeConfig.icon}</span>
              <div>
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                  👑 {goal.owner}
                </span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{goal.title}</h2>
            <p className="text-gray-400 text-sm">
              {goal.startDate} ~ {goal.endDate} · {goal.trajectory.daysRemaining}일 남음
            </p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold text-${typeConfig.color}-400`}>
              {typeConfig.unit === '원' 
                ? `₩${(goal.current / 1e8).toFixed(2)}억`
                : `${goal.current}${typeConfig.unit}`}
            </p>
            <p className="text-gray-500 text-sm">
              / {typeConfig.unit === '원' 
                ? `₩${(goal.target / 1e8).toFixed(1)}억`
                : `${goal.target}${typeConfig.unit}`}
            </p>
          </div>
        </div>
        
        {/* Main Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">목표 달성률</span>
            <span className={`font-bold text-${typeConfig.color}-400`}>{progress.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1 }}
              className={`h-full bg-gradient-to-r from-${typeConfig.color}-600 to-${typeConfig.color}-400 rounded-full relative`}
            >
              {/* Weighted Progress Marker */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white/50"
                style={{ left: `${(weightedProgress / progress) * 100}%` }}
              />
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Analytics Section */}
      <div className="p-6 grid grid-cols-3 gap-4 border-b border-gray-800">
        <TrajectoryGauge 
          trajectory={goal.trajectory} 
          target={goal.target} 
          current={goal.current} 
        />
        <ExternalFactorsPanel factors={goal.externalFactors} />
        <ConsumerSignalsPanel signals={goal.consumerSignals} />
      </div>
      
      {/* Plans Section - FSD 영역 */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium flex items-center gap-2">
            <span className="text-cyan-400">🎯</span> 
            실행 계획 (FSD)
          </h3>
          <span className="text-gray-500 text-sm">{goal.plans.length}개 계획</span>
        </div>
        
        <div className="space-y-4">
          {goal.plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </div>
  );
});

// 실시간 차트 (간단한 SVG 구현)
const RealtimeChart = memo(function RealtimeChart({ data, target }) {
  const width = 600;
  const height = 200;
  const padding = 40;
  
  const actualData = data.filter(d => d.actual !== null);
  const forecastData = data.filter(d => d.forecast !== null);
  
  const maxValue = Math.max(target * 1.1, ...data.map(d => d.actual || d.forecast || 0));
  const minValue = Math.min(...actualData.map(d => d.actual)) * 0.9;
  
  const scaleX = (i) => padding + (i / (data.length - 1)) * (width - padding * 2);
  const scaleY = (v) => height - padding - ((v - minValue) / (maxValue - minValue)) * (height - padding * 2);
  
  // Path 생성
  const actualPath = actualData.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.actual)}`
  ).join(' ');
  
  const plannedPath = data.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.planned)}`
  ).join(' ');
  
  const forecastPath = forecastData.length > 0 
    ? `M ${scaleX(actualData.length - 1)} ${scaleY(actualData[actualData.length - 1].actual)} ` +
      forecastData.map((d, i) => 
        `L ${scaleX(actualData.length + i)} ${scaleY(d.forecast)}`
      ).join(' ')
    : '';
  
  return (
    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
      <h4 className="text-white font-medium mb-4 flex items-center gap-2">
        <span>📊</span> 실시간 추이
      </h4>
      
      <svg width={width} height={height} className="w-full">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
          <g key={ratio}>
            <line
              x1={padding}
              y1={padding + ratio * (height - padding * 2)}
              x2={width - padding}
              y2={padding + ratio * (height - padding * 2)}
              stroke="#374151"
              strokeDasharray="4"
            />
            <text
              x={padding - 5}
              y={padding + ratio * (height - padding * 2) + 4}
              fill="#6b7280"
              fontSize="10"
              textAnchor="end"
            >
              {((maxValue - (maxValue - minValue) * ratio) / 1e8).toFixed(1)}억
            </text>
          </g>
        ))}
        
        {/* Target Line */}
        <line
          x1={padding}
          y1={scaleY(target)}
          x2={width - padding}
          y2={scaleY(target)}
          stroke="#eab308"
          strokeWidth="2"
          strokeDasharray="8"
        />
        <text
          x={width - padding + 5}
          y={scaleY(target) + 4}
          fill="#eab308"
          fontSize="10"
        >
          목표
        </text>
        
        {/* Planned Path */}
        <path
          d={plannedPath}
          fill="none"
          stroke="#6b7280"
          strokeWidth="1"
          strokeDasharray="4"
        />
        
        {/* Actual Path */}
        <path
          d={actualPath}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="3"
        />
        
        {/* Forecast Path */}
        {forecastPath && (
          <path
            d={forecastPath}
            fill="none"
            stroke="#a855f7"
            strokeWidth="2"
            strokeDasharray="6"
          />
        )}
        
        {/* Current Point */}
        {actualData.length > 0 && (
          <circle
            cx={scaleX(actualData.length - 1)}
            cy={scaleY(actualData[actualData.length - 1].actual)}
            r="6"
            fill="#22d3ee"
          />
        )}
      </svg>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-cyan-400" /> 실제
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-gray-500" style={{ borderStyle: 'dashed' }} /> 계획
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-purple-500" style={{ borderStyle: 'dashed' }} /> 예측
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-yellow-500" style={{ borderStyle: 'dashed' }} /> 목표
        </span>
      </div>
    </div>
  );
});

// 역할별 현황 요약
const RoleSummary = memo(function RoleSummary({ goals }) {
  const summary = useMemo(() => {
    let cLevelGoals = goals.length;
    let fsdPlans = 0;
    let optimusTasks = { total: 0, done: 0, inProgress: 0 };
    
    goals.forEach(goal => {
      fsdPlans += goal.plans.length;
      goal.plans.forEach(plan => {
        plan.tasks.forEach(task => {
          optimusTasks.total++;
          if (task.status === 'done') optimusTasks.done++;
          if (task.status === 'in_progress') optimusTasks.inProgress++;
        });
      });
    });
    
    return { cLevelGoals, fsdPlans, optimusTasks };
  }, [goals]);
  
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* C-Level */}
      <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">👑</span>
          <span className="text-yellow-400 font-medium">C-Level (오너)</span>
        </div>
        <p className="text-2xl font-bold text-white">{summary.cLevelGoals}</p>
        <p className="text-gray-500 text-sm">설정된 목표</p>
      </div>
      
      {/* FSD */}
      <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🎯</span>
          <span className="text-cyan-400 font-medium">FSD (관리자)</span>
        </div>
        <p className="text-2xl font-bold text-white">{summary.fsdPlans}</p>
        <p className="text-gray-500 text-sm">수립된 계획</p>
      </div>
      
      {/* Optimus */}
      <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⚡</span>
          <span className="text-emerald-400 font-medium">Optimus (실무자)</span>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-emerald-400">{summary.optimusTasks.done}</p>
          <p className="text-gray-500">/ {summary.optimusTasks.total} 완료</p>
        </div>
        <div className="h-1 bg-gray-700 rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-emerald-500 rounded-full"
            style={{ width: `${(summary.optimusTasks.done / summary.optimusTasks.total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
});

// ============================================
// 메인 컴포넌트
// ============================================

export default function GoalCascade() {
  const [data, setData] = useState(() => generateMockData());
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 실시간 업데이트 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const updated = { ...prev };
        // 소비자 반응 업데이트
        updated.goals = prev.goals.map(goal => ({
          ...goal,
          consumerSignals: {
            ...goal.consumerSignals,
            sigma: Math.min(1, Math.max(0, goal.consumerSignals.sigma + (Math.random() - 0.5) * 0.02)),
            inquiries: goal.consumerSignals.inquiries + Math.floor(Math.random() * 3),
          },
          current: goal.current + (Math.random() * 500000),
        }));
        return updated;
      });
      setRefreshKey(k => k + 1);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const activeGoal = selectedGoal 
    ? data.goals.find(g => g.id === selectedGoal) 
    : data.goals[0];
  
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🏛️</span>
              Goal Cascade System
            </h1>
            <p className="text-gray-400 mt-1">
              목표(C-Level) → 계획(FSD) → 실행(Optimus) · 실시간 달성 기울기 분석
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-emerald-400 text-sm">실시간 모니터링 중</span>
            </motion.div>
          </div>
        </div>
        
        {/* Role Summary */}
        <RoleSummary goals={data.goals} />
        
        {/* Goal Tabs */}
        <div className="flex gap-2 mb-6">
          {data.goals.map(goal => {
            const typeConfig = GOAL_TYPES[goal.type];
            const isActive = (selectedGoal || data.goals[0].id) === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id)}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  isActive
                    ? `bg-${typeConfig.color}-500/20 border border-${typeConfig.color}-500 text-${typeConfig.color}-400`
                    : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <span>{typeConfig.icon}</span>
                <span className="text-sm">{goal.title}</span>
              </button>
            );
          })}
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Goal Dashboard (2 cols) */}
          <div className="col-span-2">
            {activeGoal && <GoalDashboard goal={activeGoal} />}
          </div>
          
          {/* Right: Chart & Quick Actions */}
          <div className="space-y-4">
            <RealtimeChart data={data.dailyData} target={activeGoal?.target || 150000000} />
            
            {/* Quick Actions */}
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <h4 className="text-white font-medium mb-3">⚡ 빠른 액션</h4>
              <div className="space-y-2">
                <button className="w-full p-3 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 text-left flex items-center gap-2">
                  <span>🎯</span> 새 계획 추가 (FSD)
                </button>
                <button className="w-full p-3 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 text-left flex items-center gap-2">
                  <span>📊</span> 외부 환경 업데이트
                </button>
                <button className="w-full p-3 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 text-left flex items-center gap-2">
                  <span>📈</span> 기울기 재계산
                </button>
                <button className="w-full p-3 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30 text-left flex items-center gap-2">
                  <span>📋</span> 리포트 생성
                </button>
              </div>
            </div>
            
            {/* AI Recommendation */}
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/30">
              <h4 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                <span>🤖</span> AI 추천
              </h4>
              <p className="text-gray-300 text-sm mb-3">
                "재등록률이 목표 대비 3% 부족합니다. 이탈 위험 학생 5명에 대한 <span className="text-cyan-400">긴급 케어</span>를 
                권장합니다."
              </p>
              <button className="w-full p-2 bg-purple-500/30 text-purple-400 rounded-lg text-sm hover:bg-purple-500/40">
                AI 추천 실행하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
