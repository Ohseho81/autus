/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Teacher Performance Page
 * 강사 개인 성과 페이지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PerformanceData {
  contributionScore: number;
  contributionTrend: number;
  breakdown: {
    studentImprovement: number;
    taskCompletion: number;
    attendanceRate: number;
    parentSatisfaction: number;
  };
}

interface Impact {
  studentsImproved: { count: number; names: string[] };
  studentsRetained: { count: number; value: number };
  averageRating: number;
}

interface Activity {
  classesTaught: number;
  consultationsCompleted: number;
  tasksCompleted: number;
  responseTimeAvg: string;
}

interface Recognition {
  id: string;
  type: 'badge' | 'feedback' | 'compliment';
  title: string;
  description: string;
  from?: string;
  date: Date;
  icon: string;
}

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const PERFORMANCE: PerformanceData = {
  contributionScore: 82,
  contributionTrend: 5,
  breakdown: {
    studentImprovement: 85,
    taskCompletion: 92,
    attendanceRate: 88,
    parentSatisfaction: 78,
  },
};

const IMPACT: Impact = {
  studentsImproved: { count: 8, names: ['김민수', '박준호', '이서연', '최유진', '정하늘', '강예은', '오지훈', '신미래'] },
  studentsRetained: { count: 3, value: 450 },
  averageRating: 4.7,
};

const ACTIVITY: Activity = {
  classesTaught: 24,
  consultationsCompleted: 6,
  tasksCompleted: 18,
  responseTimeAvg: '2.3시간',
};

const RECOGNITIONS: Recognition[] = [
  {
    id: '1',
    type: 'badge',
    title: '이달의 강사 🏆',
    description: '1월 우수 강사로 선정되었습니다',
    date: new Date(Date.now() - 86400000 * 5),
    icon: '🏆',
  },
  {
    id: '2',
    type: 'feedback',
    title: '원장님 피드백',
    description: '학생 관리가 체계적이고 꼼꼼합니다. 특히 위험 학생 케어가 인상적이에요.',
    from: '김원장',
    date: new Date(Date.now() - 86400000 * 10),
    icon: '💬',
  },
  {
    id: '3',
    type: 'compliment',
    title: '학부모 감사 인사',
    description: '민수가 수학에 자신감이 생겼어요. 정말 감사합니다!',
    from: '김민수 학부모',
    date: new Date(Date.now() - 86400000 * 3),
    icon: '❤️',
  },
  {
    id: '4',
    type: 'badge',
    title: '연속 출근 30일 📅',
    description: '30일 연속 출근을 달성했습니다',
    date: new Date(Date.now() - 86400000 * 15),
    icon: '📅',
  },
];

const GOALS: Goal[] = [
  { id: '1', title: '담당 학생 온도 평균', target: 70, current: 65, unit: '°' },
  { id: '2', title: '상담 완료', target: 10, current: 6, unit: '건' },
  { id: '3', title: '태스크 완료율', target: 95, current: 92, unit: '%' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Score Gauge Component
// ─────────────────────────────────────────────────────────────────────────────

function ScoreGauge({ score, trend }: { score: number; trend: number }) {
  const reducedMotion = useReducedMotion();
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx="80"
          cy="80"
          r="45"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
        />
        {/* Progress Circle */}
        <motion.circle
          cx="80"
          cy="80"
          r="45"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reducedMotion ? 0 : 1, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-4xl font-bold text-slate-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-slate-500">기여도 점수</span>
        <span className={`text-xs ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs 지난주
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Breakdown Card
// ─────────────────────────────────────────────────────────────────────────────

function BreakdownCard({ breakdown }: { breakdown: PerformanceData['breakdown'] }) {
  const items = [
    { label: '학생 향상도', value: breakdown.studentImprovement, icon: '📈' },
    { label: '태스크 완료', value: breakdown.taskCompletion, icon: '✅' },
    { label: '출근율', value: breakdown.attendanceRate, icon: '📅' },
    { label: '학부모 만족도', value: breakdown.parentSatisfaction, icon: '❤️' },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-slate-700 mb-3">📊 세부 항목</h3>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xl">{item.icon}</span>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{item.label}</span>
                <span className="font-medium">{item.value}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    item.value >= 80 ? 'bg-green-500' :
                    item.value >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Impact Card
// ─────────────────────────────────────────────────────────────────────────────

function ImpactCard({ impact }: { impact: Impact }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-slate-700 mb-3">💪 나의 영향력</h3>
      
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-green-50 rounded-xl">
          <div className="text-2xl font-bold text-green-600">{impact.studentsImproved.count}</div>
          <div className="text-xs text-slate-500">향상된 학생</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-xl">
          <div className="text-2xl font-bold text-blue-600">{impact.studentsRetained.count}</div>
          <div className="text-xs text-slate-500">이탈 방지</div>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded-xl">
          <div className="text-2xl font-bold text-amber-600">{impact.averageRating}</div>
          <div className="text-xs text-slate-500">평균 평점</div>
        </div>
      </div>
      
      {/* Students List */}
      <div className="p-3 bg-slate-50 rounded-xl">
        <div className="text-xs text-slate-500 mb-2">향상된 학생들</div>
        <div className="flex flex-wrap gap-1">
          {impact.studentsImproved.names.slice(0, 5).map(name => (
            <span key={name} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
              {name}
            </span>
          ))}
          {impact.studentsImproved.names.length > 5 && (
            <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-full text-xs">
              +{impact.studentsImproved.names.length - 5}명
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Stats Card
// ─────────────────────────────────────────────────────────────────────────────

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-slate-700 mb-3">📋 이번 달 활동</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-purple-50 rounded-xl">
          <div className="text-2xl font-bold text-purple-600">{activity.classesTaught}</div>
          <div className="text-xs text-slate-500">수업 진행</div>
        </div>
        <div className="p-3 bg-pink-50 rounded-xl">
          <div className="text-2xl font-bold text-pink-600">{activity.consultationsCompleted}</div>
          <div className="text-xs text-slate-500">상담 완료</div>
        </div>
        <div className="p-3 bg-cyan-50 rounded-xl">
          <div className="text-2xl font-bold text-cyan-600">{activity.tasksCompleted}</div>
          <div className="text-xs text-slate-500">태스크 완료</div>
        </div>
        <div className="p-3 bg-orange-50 rounded-xl">
          <div className="text-lg font-bold text-orange-600">{activity.responseTimeAvg}</div>
          <div className="text-xs text-slate-500">평균 응답</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recognition Card
// ─────────────────────────────────────────────────────────────────────────────

function RecognitionCard({ recognition }: { recognition: Recognition }) {
  const typeStyles = {
    badge: 'bg-amber-50 border-amber-200',
    feedback: 'bg-blue-50 border-blue-200',
    compliment: 'bg-pink-50 border-pink-200',
  };

  return (
    <div className={`p-4 rounded-xl border ${typeStyles[recognition.type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{recognition.icon}</span>
        <div className="flex-1">
          <div className="font-medium text-slate-800">{recognition.title}</div>
          <div className="text-sm text-slate-600 mt-1">{recognition.description}</div>
          {recognition.from && (
            <div className="text-xs text-slate-400 mt-2">- {recognition.from}</div>
          )}
          <div className="text-xs text-slate-400 mt-1">
            {recognition.date.toLocaleDateString('ko-KR')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Goals Card
// ─────────────────────────────────────────────────────────────────────────────

function GoalsCard({ goals }: { goals: Goal[] }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-slate-700 mb-3">🎯 이번 달 목표</h3>
      
      <div className="space-y-4">
        {goals.map(goal => {
          const progress = (goal.current / goal.target) * 100;
          const isAchieved = progress >= 100;
          
          return (
            <div key={goal.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{goal.title}</span>
                <span className={`font-medium ${isAchieved ? 'text-green-600' : 'text-slate-700'}`}>
                  {goal.current}/{goal.target}{goal.unit}
                  {isAchieved && ' ✓'}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    isAchieved ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TeacherPerformancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'recognition' | 'goals'>('overview');

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 pb-24">
        <h1 className="text-xl font-bold">📊 내 성과</h1>
        <p className="text-white/80 text-sm">개인 성장과 기여도를 확인하세요</p>
      </div>
      
      {/* Score Card (Overlapping) */}
      <div className="max-w-lg mx-auto px-4 -mt-20">
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <ScoreGauge score={PERFORMANCE.contributionScore} trend={PERFORMANCE.contributionTrend} />
        </div>
      </div>
      
      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        <div className="flex bg-white rounded-xl p-1 shadow-sm">
          {[
            { id: 'overview', label: '📈 종합' },
            { id: 'recognition', label: '🏆 인정' },
            { id: 'goals', label: '🎯 목표' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'text-slate-600'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        {activeTab === 'overview' && (
          <>
            <BreakdownCard breakdown={PERFORMANCE.breakdown} />
            <ImpactCard impact={IMPACT} />
            <ActivityCard activity={ACTIVITY} />
          </>
        )}
        
        {activeTab === 'recognition' && (
          <div className="space-y-3">
            {RECOGNITIONS.map(recognition => (
              <RecognitionCard key={recognition.id} recognition={recognition} />
            ))}
          </div>
        )}
        
        {activeTab === 'goals' && (
          <>
            <GoalsCard goals={GOALS} />
            
            {/* Encouragement */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💪</span>
                <div>
                  <div className="font-bold">잘 하고 있어요!</div>
                  <div className="text-sm text-white/90">
                    목표 달성률 87% - 조금만 더 화이팅!
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TeacherPerformancePage;
