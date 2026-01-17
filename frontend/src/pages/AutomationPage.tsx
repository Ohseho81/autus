/**
 * AUTUS 업무 자동화 대시보드
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * - 자동화 레벨 (L1 반사 / L2 체득 / L3 의식)
 * - 업무 목록 및 자동화 진행률
 * - LLM 호출 최적화 현황
 * - 삭제(일체화) 대기 업무
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Brain, RefreshCw, Trash2, CheckCircle2,
  TrendingUp, Clock, AlertCircle, Play, Pause,
  Settings, ChevronRight, Bot, Sparkles
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type AutomationLevel = 'L1' | 'L2' | 'L3';

interface Task {
  id: string;
  name: string;
  category: string;
  level: AutomationLevel;
  progress: number; // 0~100
  executionCount: number;
  lastExecuted: string;
  status: 'active' | 'pending' | 'ready_to_delete';
}

interface SystemMetrics {
  totalTasks: number;
  automatedTasks: number;
  llmCallsSaved: number;
  embodimentScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_TASKS: Task[] = [
  { id: '1', name: '일일 매출 리포트 생성', category: '재무', level: 'L1', progress: 100, executionCount: 247, lastExecuted: '10분 전', status: 'ready_to_delete' },
  { id: '2', name: '이메일 자동 분류', category: '커뮤니케이션', level: 'L1', progress: 98, executionCount: 1523, lastExecuted: '방금', status: 'ready_to_delete' },
  { id: '3', name: '재고 수준 알림', category: '운영', level: 'L2', progress: 85, executionCount: 89, lastExecuted: '1시간 전', status: 'active' },
  { id: '4', name: '고객 문의 초기 응답', category: '고객서비스', level: 'L2', progress: 72, executionCount: 312, lastExecuted: '15분 전', status: 'active' },
  { id: '5', name: '주간 성과 분석', category: '분석', level: 'L2', progress: 65, executionCount: 24, lastExecuted: '3일 전', status: 'active' },
  { id: '6', name: '신규 직원 온보딩 체크리스트', category: 'HR', level: 'L3', progress: 45, executionCount: 8, lastExecuted: '1주일 전', status: 'pending' },
  { id: '7', name: '프로젝트 리스크 평가', category: '프로젝트', level: 'L3', progress: 30, executionCount: 12, lastExecuted: '2일 전', status: 'pending' },
  { id: '8', name: '전략적 파트너십 분석', category: '전략', level: 'L3', progress: 15, executionCount: 3, lastExecuted: '2주일 전', status: 'pending' },
];

const MOCK_METRICS: SystemMetrics = {
  totalTasks: 156,
  automatedTasks: 89,
  llmCallsSaved: 12847,
  embodimentScore: 67,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function getLevelColor(level: AutomationLevel): string {
  if (level === 'L1') return '#22c55e';
  if (level === 'L2') return '#3b82f6';
  return '#a855f7';
}

function getLevelLabel(level: AutomationLevel): string {
  if (level === 'L1') return '반사 (Reflex)';
  if (level === 'L2') return '체득 (Embodied)';
  return '의식 (Conscious)';
}

function getLevelDescription(level: AutomationLevel): string {
  if (level === 'L1') return 'LLM 호출 없이 즉시 실행';
  if (level === 'L2') return '패턴 인식 후 자동 실행';
  return 'LLM 추론 필요';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, subtitle, icon, color }) => (
  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-sm">{title}</p>
        <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="p-2 rounded-lg" style={{ backgroundColor: color + '20' }}>
        {icon}
      </div>
    </div>
  </div>
);

const LevelBadge: React.FC<{ level: AutomationLevel }> = ({ level }) => (
  <span
    className="px-2 py-0.5 rounded text-xs font-medium"
    style={{
      backgroundColor: getLevelColor(level) + '20',
      color: getLevelColor(level),
    }}
  >
    {level}
  </span>
);

const ProgressBar: React.FC<{ progress: number; color: string }> = ({ progress, color }) => (
  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
    <motion.div
      className="h-full rounded-full"
      style={{ backgroundColor: color }}
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.5 }}
    />
  </div>
);

const TaskRow: React.FC<{
  task: Task;
  onDelete: (id: string) => void;
}> = ({ task, onDelete }) => {
  const color = getLevelColor(task.level);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 hover:border-slate-600/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <LevelBadge level={task.level} />
          <span className="font-medium">{task.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {task.status === 'ready_to_delete' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDelete(task.id)}
              className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              삭제(일체화)
            </motion.button>
          )}
          <span className="text-xs text-slate-500">{task.lastExecuted}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-2">
        <span className="text-xs text-slate-400">{task.category}</span>
        <span className="text-xs text-slate-500">실행 {task.executionCount}회</span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ProgressBar progress={task.progress} color={color} />
        </div>
        <span className="text-sm font-mono" style={{ color }}>{task.progress}%</span>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function AutomationPage() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [metrics, setMetrics] = useState<SystemMetrics>(MOCK_METRICS);
  const [filter, setFilter] = useState<AutomationLevel | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.level === filter);

  const levelCounts = {
    L1: tasks.filter(t => t.level === 'L1').length,
    L2: tasks.filter(t => t.level === 'L2').length,
    L3: tasks.filter(t => t.level === 'L3').length,
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== id));
      setDeletingId(null);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
            <Bot className="w-6 h-6 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold">업무 자동화</h1>
        </div>
        <p className="text-slate-400">AUTUS 신경계 기반 업무 자동화 현황</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="전체 업무"
          value={metrics.totalTasks}
          subtitle="등록된 업무 수"
          icon={<Settings className="w-5 h-5 text-slate-400" />}
          color="#94a3b8"
        />
        <MetricCard
          title="자동화된 업무"
          value={`${metrics.automatedTasks}`}
          subtitle={`${Math.round(metrics.automatedTasks / metrics.totalTasks * 100)}% 완료`}
          icon={<Zap className="w-5 h-5 text-emerald-400" />}
          color="#22c55e"
        />
        <MetricCard
          title="LLM 호출 절감"
          value={metrics.llmCallsSaved.toLocaleString()}
          subtitle="이번 달 절감량"
          icon={<Brain className="w-5 h-5 text-blue-400" />}
          color="#3b82f6"
        />
        <MetricCard
          title="체득 점수"
          value={`${metrics.embodimentScore}%`}
          subtitle="시스템 숙련도"
          icon={<Sparkles className="w-5 h-5 text-purple-400" />}
          color="#a855f7"
        />
      </div>

      {/* Level Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {(['L1', 'L2', 'L3'] as AutomationLevel[]).map(level => (
          <div
            key={level}
            className={`bg-slate-800/50 rounded-xl p-4 border cursor-pointer transition-all ${
              filter === level ? 'border-white/30' : 'border-slate-700/50 hover:border-slate-600/50'
            }`}
            onClick={() => setFilter(filter === level ? 'all' : level)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getLevelColor(level) }}
                />
                <span className="font-semibold">{getLevelLabel(level)}</span>
              </div>
              <span className="text-2xl font-bold" style={{ color: getLevelColor(level) }}>
                {levelCounts[level]}
              </span>
            </div>
            <p className="text-xs text-slate-400">{getLevelDescription(level)}</p>
          </div>
        ))}
      </div>

      {/* Task List */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">업무 목록</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              전체
            </button>
            {(['L1', 'L2', 'L3'] as AutomationLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filter === level ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map(task => (
              <TaskRow key={task.id} task={task} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>해당 레벨의 업무가 없습니다</p>
          </div>
        )}
      </div>

      {/* Ready to Delete Section */}
      {tasks.filter(t => t.status === 'ready_to_delete').length > 0 && (
        <div className="mt-8 bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-emerald-400">일체화 준비 완료</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            아래 업무들은 100% 자동화되어 삭제(일체화) 준비가 완료되었습니다.
            삭제 시 해당 업무는 AUTUS 신경계에 완전히 흡수됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {tasks.filter(t => t.status === 'ready_to_delete').map(task => (
              <span
                key={task.id}
                className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm"
              >
                {task.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
