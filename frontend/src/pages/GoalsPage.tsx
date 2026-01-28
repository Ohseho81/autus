/**
 * AUTUS Goals Page
 * ==================
 * 목표 설정 및 추세선 예측
 * API 연동: /api/goals
 */

import React, { useState, useEffect, useCallback } from 'react';
import { goalsApi } from '../api/autus';

// ============================================
// Types
// ============================================

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'health' | 'career' | 'learning' | 'relationship' | 'lifestyle';
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  targetDate: string;
  milestones: Milestone[];
  logs: DailyLog[];
  status: 'on_track' | 'at_risk' | 'behind' | 'completed';
}

interface Milestone {
  id: string;
  title: string;
  targetValue: number;
  targetDate: string;
  completed: boolean;
}

interface DailyLog {
  date: string;
  value: number;
  note: string;
}

// ============================================
// Mock Data
// ============================================

const generateLogs = (startValue: number, endValue: number, days: number): DailyLog[] => {
  const logs: DailyLog[] = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const progress = (days - i) / days;
    const noise = (Math.random() - 0.5) * (endValue - startValue) * 0.1;
    const value = startValue + (endValue - startValue) * progress + noise;
    
    logs.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
      note: '',
    });
  }
  
  return logs;
};

const MOCK_GOALS: Goal[] = [
  {
    id: 'g1',
    title: '월 수익 1000만원',
    description: '안정적인 월 수익 달성',
    category: 'financial',
    targetValue: 10000000,
    currentValue: 6500000,
    unit: '원',
    startDate: '2025-01-01',
    targetDate: '2026-06-30',
    milestones: [
      { id: 'm1', title: '500만원 달성', targetValue: 5000000, targetDate: '2025-06-30', completed: true },
      { id: 'm2', title: '750만원 달성', targetValue: 7500000, targetDate: '2025-12-31', completed: false },
    ],
    logs: generateLogs(2000000, 6500000, 365),
    status: 'on_track',
  },
  {
    id: 'g2',
    title: '체중 75kg',
    description: '건강한 체중 유지',
    category: 'health',
    targetValue: 75,
    currentValue: 82,
    unit: 'kg',
    startDate: '2025-10-01',
    targetDate: '2026-03-31',
    milestones: [
      { id: 'm3', title: '80kg 달성', targetValue: 80, targetDate: '2026-01-15', completed: false },
    ],
    logs: generateLogs(88, 82, 100),
    status: 'at_risk',
  },
  {
    id: 'g3',
    title: '고객 100명',
    description: '활성 고객 수 확보',
    category: 'career',
    targetValue: 100,
    currentValue: 45,
    unit: '명',
    startDate: '2025-07-01',
    targetDate: '2026-07-01',
    milestones: [
      { id: 'm4', title: '50명 달성', targetValue: 50, targetDate: '2026-01-01', completed: false },
    ],
    logs: generateLogs(10, 45, 190),
    status: 'behind',
  },
];

const CATEGORY_CONFIG = {
  financial: { icon: '💰', label: '재무', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  health: { icon: '❤️', label: '건강', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  career: { icon: '💼', label: '커리어', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  learning: { icon: '📚', label: '학습', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  relationship: { icon: '👥', label: '관계', color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  lifestyle: { icon: '🌟', label: '라이프', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
};

const STATUS_CONFIG = {
  on_track: { label: '순조로움', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  at_risk: { label: '주의필요', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  behind: { label: '지연', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  completed: { label: '완료', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
};

// ============================================
// Components
// ============================================

const TrendChart = ({ 
  goal, 
  showPrediction = true 
}: { 
  goal: Goal;
  showPrediction?: boolean;
}) => {
  const { logs, targetValue, targetDate, startDate, currentValue } = goal;
  
  // 캔버스 크기
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 40, bottom: 30, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // 데이터 범위
  const values = logs.map(l => l.value);
  const minValue = Math.min(...values, targetValue) * 0.9;
  const maxValue = Math.max(...values, targetValue) * 1.1;
  
  // 스케일
  const xScale = (index: number) => padding.left + (index / (logs.length - 1)) * chartWidth;
  const yScale = (value: number) => 
    padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
  
  // 실제 데이터 경로
  const actualPath = logs.map((log, i) => 
    `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(log.value)}`
  ).join(' ');
  
  // 예측선 계산 (선형 회귀)
  const n = logs.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;
  
  // 목표일까지 예측
  const daysToTarget = Math.ceil(
    (new Date(targetDate).getTime() - new Date(logs[logs.length - 1].date).getTime()) / (1000 * 60 * 60 * 24)
  );
  const predictedEndValue = values[n - 1] + slope * daysToTarget;
  
  // 예측선 경로
  const predictionStartX = xScale(n - 1);
  const predictionEndX = width - padding.right;
  const predictionPath = showPrediction
    ? `M ${predictionStartX} ${yScale(values[n - 1])} L ${predictionEndX} ${yScale(predictedEndValue)}`
    : '';
  
  // 목표선
  const targetY = yScale(targetValue);
  
  // 예측 달성 여부
  const willAchieve = goal.category === 'health' 
    ? predictedEndValue <= targetValue  // 감소 목표 (체중 등)
    : predictedEndValue >= targetValue; // 증가 목표
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">📈 추세선 분석</h3>
        <div className={`px-2 py-1 rounded text-sm ${
          willAchieve ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {willAchieve ? '✅ 달성 예상' : '⚠️ 달성 위험'}
        </div>
      </div>
      
      <svg width={width} height={height} className="w-full">
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding.top + chartHeight * (1 - ratio);
          const value = minValue + (maxValue - minValue) * ratio;
          return (
            <g key={i}>
              <line 
                x1={padding.left} 
                y1={y} 
                x2={width - padding.right} 
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4"
              />
              <text 
                x={padding.left - 10} 
                y={y} 
                textAnchor="end" 
                dominantBaseline="middle"
                className="text-xs fill-slate-500"
              >
                {value >= 1000000 
                  ? `${(value / 1000000).toFixed(1)}M` 
                  : value >= 1000 
                    ? `${(value / 1000).toFixed(0)}K`
                    : value.toFixed(0)}
              </text>
            </g>
          );
        })}
        
        {/* Target Line */}
        <line
          x1={padding.left}
          y1={targetY}
          x2={width - padding.right}
          y2={targetY}
          stroke="#22c55e"
          strokeWidth="2"
          strokeDasharray="8,4"
        />
        <text
          x={width - padding.right + 5}
          y={targetY}
          className="text-xs fill-green-400"
          dominantBaseline="middle"
        >
          목표
        </text>
        
        {/* Actual Data */}
        <path
          d={actualPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* Prediction Line */}
        {showPrediction && (
          <path
            d={predictionPath}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeDasharray="6,3"
          />
        )}
        
        {/* Current Point */}
        <circle
          cx={xScale(n - 1)}
          cy={yScale(values[n - 1])}
          r="6"
          fill="#3b82f6"
          stroke="white"
          strokeWidth="2"
        />
        
        {/* Legend */}
        <g transform={`translate(${padding.left}, ${height - 10})`}>
          <circle cx="0" cy="0" r="4" fill="#3b82f6" />
          <text x="10" y="4" className="text-xs fill-slate-400">실제</text>
          
          <circle cx="60" cy="0" r="4" fill="#8b5cf6" />
          <text x="70" y="4" className="text-xs fill-slate-400">예측</text>
          
          <line x1="120" y1="0" x2="140" y2="0" stroke="#22c55e" strokeWidth="2" strokeDasharray="4" />
          <text x="145" y="4" className="text-xs fill-slate-400">목표</text>
        </g>
      </svg>
      
      {/* Prediction Info */}
      <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-slate-400">현재</div>
            <div className="text-lg font-bold text-white">
              {currentValue.toLocaleString()}{goal.unit}
            </div>
          </div>
          <div>
            <div className="text-slate-400">예측</div>
            <div className={`text-lg font-bold ${willAchieve ? 'text-green-400' : 'text-red-400'}`}>
              {Math.round(predictedEndValue).toLocaleString()}{goal.unit}
            </div>
          </div>
          <div>
            <div className="text-slate-400">목표</div>
            <div className="text-lg font-bold text-blue-400">
              {targetValue.toLocaleString()}{goal.unit}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GoalCard = ({ 
  goal, 
  onSelect, 
  isSelected 
}: { 
  goal: Goal;
  onSelect: () => void;
  isSelected: boolean;
}) => {
  const category = CATEGORY_CONFIG[goal.category];
  const status = STATUS_CONFIG[goal.status];
  const progress = (goal.currentValue / goal.targetValue) * 100;
  const daysLeft = Math.ceil(
    (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  return (
    <div 
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected 
          ? 'bg-blue-500/20 border-blue-500' 
          : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded ${category.bgColor}`}>
            {category.icon} {category.label}
          </span>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${status.bgColor} ${status.color}`}>
          {status.label}
        </span>
      </div>
      
      <h3 className="text-lg font-bold text-white mb-1">{goal.title}</h3>
      <p className="text-sm text-slate-400 mb-4">{goal.description}</p>
      
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">
            {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
          </span>
          <span className="text-white font-medium">{Math.min(100, Math.round(progress))}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
      
      {/* Milestones */}
      <div className="flex gap-2 mb-3">
        {goal.milestones.map((m) => (
          <span 
            key={m.id}
            className={`px-2 py-0.5 rounded text-xs ${
              m.completed 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-slate-600 text-slate-400'
            }`}
          >
            {m.completed ? '✓' : '○'} {m.title}
          </span>
        ))}
      </div>
      
      <div className="text-sm text-slate-400">
        📅 D-{daysLeft} | 시작: {goal.startDate}
      </div>
    </div>
  );
};

const GoalEditor = ({ goal }: { goal: Goal | null }) => {
  if (!goal) {
    return (
      <div className="bg-slate-800/80 rounded-xl p-8 border border-slate-700 text-center">
        <div className="text-slate-400 mb-4">👈 목표를 선택하세요</div>
        <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
          + 새 목표 만들기
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <TrendChart goal={goal} />
      
      {/* Daily Log */}
      <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-medium mb-4">📝 오늘 기록</h3>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-1">현재 값</label>
            <input 
              type="number"
              defaultValue={goal.currentValue}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-1">메모</label>
            <input 
              type="text"
              placeholder="오늘의 진행 상황..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <button className="self-end px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg">
            저장
          </button>
        </div>
      </div>
      
      {/* Recent Logs */}
      <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-medium mb-4">📊 최근 기록</h3>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {goal.logs.slice(-10).reverse().map((log, i) => (
            <div 
              key={i}
              className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg"
            >
              <span className="text-slate-400 text-sm">{log.date}</span>
              <span className="text-white font-medium">
                {log.value.toLocaleString()} {goal.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>(MOCK_GOALS);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  
  const selectedGoal = goals.find(g => g.id === selectedGoalId) || null;
  
  return (
    <div className="min-h-full bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🎯 목표 설정</h1>
          <p className="text-slate-400 mt-1">
            목표를 구체화하고, 일자별 로그로 추세선을 예측하세요
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">
          + 새 목표 추가
        </button>
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = goals.filter(g => g.status === key).length;
          return (
            <div key={key} className={`p-4 rounded-xl ${config.bgColor} border border-slate-700`}>
              <div className={`text-2xl font-bold ${config.color}`}>{count}</div>
              <div className="text-slate-400 text-sm">{config.label}</div>
            </div>
          );
        })}
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Goals List */}
        <div className="col-span-5 space-y-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              isSelected={selectedGoalId === goal.id}
              onSelect={() => setSelectedGoalId(goal.id)}
            />
          ))}
        </div>
        
        {/* Right: Goal Detail */}
        <div className="col-span-7">
          <GoalEditor goal={selectedGoal} />
        </div>
      </div>
    </div>
  );
}
