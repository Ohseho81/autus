/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Admin Dashboard - 운영자 대시보드
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 핵심 기능:
 * 1. 570개 업무 현황 모니터링
 * 2. K/I/Ω 메트릭 추이
 * 3. 실행 로그
 * 4. 삭제 대상 업무 관리
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// =============================================================================
// Types
// =============================================================================

interface Task {
  id: string;
  name: string;
  name_en: string;
  group: string;
  groupName: string;
  layer: string;
  k: number;
  i: number;
  omega: number;
  status: 'active' | 'optimizing' | 'declining' | 'eliminated';
  health: number;
}

interface TaskGroup {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface Log {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

// =============================================================================
// Constants
// =============================================================================

const TASK_GROUPS: TaskGroup[] = [
  { id: '고반복_정형', name: '고반복 정형', icon: '🔄', count: 85 },
  { id: '반구조화_문서', name: '반구조화 문서', icon: '📄', count: 70 },
  { id: '승인_워크플로', name: '승인 워크플로', icon: '✅', count: 65 },
  { id: '고객_영업', name: '고객 영업', icon: '🤝', count: 80 },
  { id: '재무_회계', name: '재무 회계', icon: '💰', count: 75 },
  { id: 'HR_인사', name: 'HR 인사', icon: '👥', count: 70 },
  { id: 'IT_운영', name: 'IT 운영', icon: '🖥️', count: 65 },
  { id: '전략_판단', name: '전략 판단', icon: '🎯', count: 60 },
];

const STATUS_COLORS = {
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  optimizing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  declining: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  eliminated: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const STATUS_LABELS = {
  active: '활성',
  optimizing: '최적화',
  declining: '쇠퇴',
  eliminated: '삭제',
};

// =============================================================================
// Utility Functions
// =============================================================================

function generateTasks(): Task[] {
  const taskNames: Record<string, string[]> = {
    '고반복_정형': ['송장 처리', '데이터 입력', '이메일 분류', '보고서 생성', '파일 정리'],
    '반구조화_문서': ['계약서 검토', '제안서 작성', '회의록 정리', '기술문서 작성', '매뉴얼 생성'],
    '승인_워크플로': ['경비 승인', '휴가 승인', '구매 승인', '출장 승인', '프로젝트 승인'],
    '고객_영업': ['리드 스코어링', '고객 상담', 'CRM 업데이트', '견적서 작성', '계약 관리'],
    '재무_회계': ['청구서 발행', '수금 관리', '예산 분석', '비용 정산', '세금 신고'],
    'HR_인사': ['온보딩', '급여 처리', '성과 평가', '교육 관리', '퇴직 처리'],
    'IT_운영': ['티켓 라우팅', '시스템 모니터링', '백업 관리', '보안 점검', '업데이트 배포'],
    '전략_판단': ['가격 책정', '시장 분석', '투자 검토', '리스크 평가', '전략 기획'],
  };

  const tasks: Task[] = [];
  let taskId = 1;

  TASK_GROUPS.forEach((group) => {
    const names = taskNames[group.id];
    for (let i = 0; i < group.count; i++) {
      const k = 0.3 + Math.random() * 1.5;
      const iVal = -0.5 + Math.random() * 1.5;
      const omega = Math.random() * 0.9;

      let status: Task['status'] = 'active';
      if (k < 0.5 || omega > 0.7) status = 'eliminated';
      else if (k < 0.7) status = 'declining';
      else if (k < 1.0) status = 'optimizing';

      const health = Math.round(
        Math.min(k / 2, 1) * 40 + ((iVal + 1) / 2) * 30 + (1 - omega) * 30
      );

      tasks.push({
        id: `TASK_${String(taskId++).padStart(3, '0')}`,
        name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''),
        name_en: `Task ${taskId}`,
        group: group.id,
        groupName: group.name,
        layer: i < 10 ? '공통엔진' : i < 30 ? '도메인로직' : '엣지커넥터',
        k,
        i: iVal,
        omega,
        status,
        health,
      });
    }
  });

  return tasks;
}

// =============================================================================
// Components
// =============================================================================

function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-white/5 backdrop-blur border border-white/10"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/40 text-sm">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${color || 'text-white'}`}>{value}</div>
      {subtitle && <div className="text-xs text-white/40 mt-1">{subtitle}</div>}
    </motion.div>
  );
}

function TaskRow({ task, onSelect }: { task: Task; onSelect: (task: Task) => void }) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-white/60">{task.id}</td>
      <td className="px-4 py-3 text-sm">{task.name}</td>
      <td className="px-4 py-3 text-sm text-white/60">{task.groupName}</td>
      <td className={`px-4 py-3 text-sm ${task.k >= 1 ? 'text-green-400' : task.k >= 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
        {task.k.toFixed(2)}
      </td>
      <td className={`px-4 py-3 text-sm ${task.i >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
        {task.i >= 0 ? '+' : ''}{task.i.toFixed(2)}
      </td>
      <td className={`px-4 py-3 text-sm ${task.omega < 0.5 ? 'text-green-400' : task.omega < 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
        {task.omega.toFixed(2)}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs border ${STATUS_COLORS[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onSelect(task)}
          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs transition-colors"
        >
          상세
        </button>
      </td>
    </tr>
  );
}

function LogEntry({ log }: { log: Log }) {
  const colors = {
    info: 'bg-blue-500/10 text-blue-400',
    success: 'bg-green-500/10 text-green-400',
    warning: 'bg-amber-500/10 text-amber-400',
    error: 'bg-red-500/10 text-red-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-2 rounded-lg text-xs ${colors[log.type]}`}
    >
      <span className="text-white/40">
        [{log.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
      </span>
      <span className="ml-2">{log.message}</span>
    </motion.div>
  );
}

function MetricBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="p-5 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
      <div className="text-white/40 text-sm mb-2">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {value >= 0 && value < 2 ? (value >= 0 ? '+' : '') : ''}{value.toFixed(2)}
      </div>
      <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Initialize
  useEffect(() => {
    const generatedTasks = generateTasks();
    setTasks(generatedTasks);
    
    addLog('success', '시스템 시작됨');
    addLog('info', `570개 업무 로드 완료`);
    addLog('info', `8개 그룹 초기화 완료`);
  }, []);

  // Computed values
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (groupFilter && t.group !== groupFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, groupFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { active: 0, optimizing: 0, declining: 0, eliminated: 0 };
    tasks.forEach((t) => counts[t.status]++);
    return counts;
  }, [tasks]);

  const avgMetrics = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'eliminated');
    if (active.length === 0) return { k: 1, i: 0, omega: 0.5, health: 50 };

    const k = active.reduce((sum, t) => sum + t.k, 0) / active.length;
    const i = active.reduce((sum, t) => sum + t.i, 0) / active.length;
    const omega = active.reduce((sum, t) => sum + t.omega, 0) / active.length;
    const health = Math.round(Math.min(k / 2, 1) * 40 + ((i + 1) / 2) * 30 + (1 - omega) * 30);

    return { k, i, omega, health };
  }, [tasks]);

  const eliminationCandidates = useMemo(() => {
    return tasks.filter((t) => (t.k < 0.5 || t.omega > 0.7) && t.status !== 'eliminated').slice(0, 12);
  }, [tasks]);

  // Functions
  function addLog(type: Log['type'], message: string) {
    setLogs((prev) => [
      { id: Math.random().toString(36).slice(2), type, message, timestamp: new Date() },
      ...prev.slice(0, 49),
    ]);
  }

  function runEliminationCycle() {
    const candidates = tasks.filter((t) => (t.k < 0.5 || t.omega > 0.7) && t.status !== 'eliminated');

    if (candidates.length === 0) {
      addLog('info', '삭제할 업무가 없습니다');
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        candidates.find((c) => c.id === t.id) ? { ...t, status: 'eliminated' as const } : t
      )
    );

    candidates.forEach((task) => {
      addLog('warning', `${task.id} "${task.name}" 삭제됨 (K=${task.k.toFixed(2)}, Ω=${task.omega.toFixed(2)})`);
    });

    addLog('success', `${candidates.length}개 업무 삭제 사이클 완료`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-bold">
              A
            </div>
            <div>
              <h1 className="text-xl font-semibold">AUTUS Admin</h1>
              <p className="text-sm text-white/40">570개 업무 모니터링</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-green-300">시스템 정상</span>
          </div>
        </div>
      </header>

      <main className="p-8 space-y-8">
        {/* Stats */}
        <section className="grid grid-cols-5 gap-4">
          <StatCard title="총 업무" value="570" icon="📋" subtitle="8개 그룹" />
          <StatCard title="활성" value={statusCounts.active} icon="✅" color="text-green-400" subtitle="60%" />
          <StatCard title="최적화중" value={statusCounts.optimizing} icon="🔄" color="text-blue-400" subtitle="20%" />
          <StatCard title="쇠퇴중" value={statusCounts.declining} icon="⚠️" color="text-amber-400" subtitle="10%" />
          <StatCard title="삭제됨" value={statusCounts.eliminated} icon="🗑️" color="text-red-400" subtitle="10%" />
        </section>

        {/* Metrics */}
        <section className="grid grid-cols-4 gap-4">
          <MetricBar label="평균 K (효율)" value={avgMetrics.k} max={2} color="text-amber-400" />
          <MetricBar label="평균 I (상호작용)" value={avgMetrics.i} max={1} color="text-blue-400" />
          <MetricBar label="평균 Ω (엔트로피)" value={avgMetrics.omega} max={1} color="text-purple-400" />
          <MetricBar label="건강 점수" value={avgMetrics.health} max={100} color="text-green-400" />
        </section>

        {/* Task Table + Logs */}
        <section className="grid grid-cols-3 gap-6">
          {/* Table */}
          <div className="col-span-2 rounded-2xl bg-white/5 backdrop-blur border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold">📋 업무 목록</h3>
              <div className="flex gap-2">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                  <option value="">전체 그룹</option>
                  {TASK_GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                  <option value="">전체 상태</option>
                  <option value="active">활성</option>
                  <option value="optimizing">최적화중</option>
                  <option value="declining">쇠퇴중</option>
                  <option value="eliminated">삭제됨</option>
                </select>
              </div>
            </div>
            <div className="overflow-auto max-h-96">
              <table className="w-full">
                <thead className="sticky top-0 bg-stone-900/90">
                  <tr className="text-left text-white/40 text-sm">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">업무명</th>
                    <th className="px-4 py-3">그룹</th>
                    <th className="px-4 py-3">K</th>
                    <th className="px-4 py-3">I</th>
                    <th className="px-4 py-3">Ω</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.slice(0, 50).map((task) => (
                    <TaskRow key={task.id} task={task} onSelect={setSelectedTask} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Logs */}
          <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold">📝 실행 로그</h3>
              <button
                onClick={() => setLogs([])}
                className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
              >
                클리어
              </button>
            </div>
            <div className="p-4 space-y-2 overflow-auto max-h-96">
              <AnimatePresence>
                {logs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Elimination */}
        <section className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-semibold">⚠️ 삭제 대상 업무</h3>
            <button
              onClick={runEliminationCycle}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 text-sm"
            >
              삭제 사이클 실행
            </button>
          </div>
          <div className="p-4 grid grid-cols-4 gap-3">
            {eliminationCandidates.length === 0 ? (
              <div className="col-span-4 text-center py-8 text-white/40">
                삭제 대상 업무가 없습니다
              </div>
            ) : (
              eliminationCandidates.map((task) => (
                <div key={task.id} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-white/40">{task.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/30 text-red-300">삭제대상</span>
                  </div>
                  <div className="font-medium text-sm mb-2">{task.name}</div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-red-400">K={task.k.toFixed(2)}</span>
                    <span className="text-purple-400">Ω={task.omega.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTask(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-stone-800 rounded-2xl max-w-2xl w-full border border-white/20 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {selectedTask.name} ({selectedTask.id})
                </h3>
                <button onClick={() => setSelectedTask(null)} className="p-2 rounded-lg hover:bg-white/10">
                  ✕
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="text-white/40 text-sm">그룹</div>
                  <div className="font-medium">{selectedTask.groupName}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="text-white/40 text-sm">상태</div>
                  <span className={`px-2 py-1 rounded-full text-xs border ${STATUS_COLORS[selectedTask.status]}`}>
                    {STATUS_LABELS[selectedTask.status]}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10">
                  <div className="text-amber-300 text-sm">K (효율)</div>
                  <div className="text-2xl font-bold text-amber-400">{selectedTask.k.toFixed(3)}</div>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/10">
                  <div className="text-blue-300 text-sm">I (상호작용)</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {selectedTask.i >= 0 ? '+' : ''}{selectedTask.i.toFixed(3)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/10">
                  <div className="text-purple-300 text-sm">Ω (엔트로피)</div>
                  <div className="text-2xl font-bold text-purple-400">{selectedTask.omega.toFixed(3)}</div>
                </div>
                <div className="p-4 rounded-xl bg-green-500/10">
                  <div className="text-green-300 text-sm">건강 점수</div>
                  <div className="text-2xl font-bold text-green-400">{selectedTask.health}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
