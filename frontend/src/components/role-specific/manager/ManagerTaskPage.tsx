/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Manager Task Management Page
 * ⚙️ 관리자용 태스크 관리 페이지 (칸반 보드)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useRoleContext } from '../../../contexts/RoleContext';
import { useBreakpoint } from '../../../hooks/useResponsive';
import { useReducedMotion } from '../../../hooks/useAccessibility';
import { ResponsiveCard, PageContainer } from '../../shared/RoleBasedLayout';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string;
  assignee?: string;
  assigneeName?: string;
  deadline: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  source: 'system' | 'owner' | 'manual';
  studentName?: string;
  createdAt: string;
}

interface Teacher {
  id: string;
  name: string;
  avatar?: string;
  workload: number; // 0-100
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockTasks: Task[] = [
  { id: '1', title: '김민수 학부모 상담 예약', description: '비용 관련 상담 요청', deadline: '오늘 14:00', priority: 'urgent', status: 'pending', source: 'system', studentName: '김민수', createdAt: '2026-01-27' },
  { id: '2', title: '위험학생 리포트 작성', description: '주간 리포트 제출', assignee: '1', assigneeName: '박영희', deadline: '오늘 18:00', priority: 'high', status: 'in_progress', source: 'owner', createdAt: '2026-01-26' },
  { id: '3', title: '신규 교재 검토', description: '수학 심화 교재', deadline: '01/30', priority: 'normal', status: 'pending', source: 'manual', createdAt: '2026-01-25' },
  { id: '4', title: '학부모 불만 처리', description: '남동쪽 그룹 응대', assignee: '3', assigneeName: '이미영', deadline: '오늘 17:00', priority: 'urgent', status: 'in_progress', source: 'system', createdAt: '2026-01-27' },
  { id: '5', title: '2월 시간표 작성', description: '강사별 배정', deadline: '01/31', priority: 'high', status: 'pending', source: 'manual', createdAt: '2026-01-24' },
  { id: '6', title: '이수진 출석 현황 확인', description: '3일 연속 지각', assignee: '2', assigneeName: '김철수', deadline: '오늘', priority: 'normal', status: 'completed', source: 'system', studentName: '이수진', createdAt: '2026-01-26' },
  { id: '7', title: '월말 결제 안내', description: '미납 학생 3명', deadline: '01/28', priority: 'high', status: 'pending', source: 'system', createdAt: '2026-01-25' },
  { id: '8', title: '박지호 학부모 연락', description: '회신 없음 5일차', assignee: '4', assigneeName: '정민수', deadline: '오늘', priority: 'urgent', status: 'in_progress', source: 'system', studentName: '박지호', createdAt: '2026-01-22' },
];

const mockTeachers: Teacher[] = [
  { id: '1', name: '박영희', workload: 75 },
  { id: '2', name: '김철수', workload: 45 },
  { id: '3', name: '이미영', workload: 85 },
  { id: '4', name: '정민수', workload: 55 },
  { id: '5', name: '최지연', workload: 30 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ManagerTaskPage() {
  const { theme } = useRoleContext();
  const { isMobile, isDesktop } = useBreakpoint();
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'unassigned' | 'overdue'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'urgent':
        return tasks.filter(t => t.priority === 'urgent');
      case 'unassigned':
        return tasks.filter(t => !t.assignee);
      case 'overdue':
        return tasks.filter(t => t.deadline.includes('오늘') && t.status !== 'completed');
      default:
        return tasks;
    }
  }, [tasks, filter]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => ({
    pending: filteredTasks.filter(t => t.status === 'pending'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    completed: filteredTasks.filter(t => t.status === 'completed'),
  }), [filteredTasks]);

  // Move task to different status
  const moveTask = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
  };

  return (
    <div className={`min-h-screen ${theme.mode === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <PageContainer 
        title="📋 태스크 관리"
        subtitle="태스크 생성, 배정 및 추적"
        actions={
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors min-h-[44px]"
          >
            + 새 태스크
          </button>
        }
      >
        {/* Stats Summary */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <StatBadge 
            label="전체" 
            value={tasks.length} 
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <StatBadge 
            label="긴급" 
            value={tasks.filter(t => t.priority === 'urgent').length} 
            color="red"
            active={filter === 'urgent'}
            onClick={() => setFilter('urgent')}
          />
          <StatBadge 
            label="미배정" 
            value={tasks.filter(t => !t.assignee).length} 
            color="amber"
            active={filter === 'unassigned'}
            onClick={() => setFilter('unassigned')}
          />
          <StatBadge 
            label="오늘 마감" 
            value={tasks.filter(t => t.deadline.includes('오늘') && t.status !== 'completed').length} 
            color="purple"
            active={filter === 'overdue'}
            onClick={() => setFilter('overdue')}
          />
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('kanban')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]
              ${view === 'kanban' 
                ? 'bg-blue-500 text-white' 
                : theme.mode === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'
              }
            `}
          >
            📊 칸반 보드
          </button>
          <button
            onClick={() => setView('list')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]
              ${view === 'list' 
                ? 'bg-blue-500 text-white' 
                : theme.mode === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'
              }
            `}
          >
            📋 리스트
          </button>
        </div>

        {/* Kanban Board */}
        {view === 'kanban' && (
          <KanbanBoard 
            tasksByStatus={tasksByStatus}
            onMoveTask={moveTask}
            onSelectTask={setSelectedTask}
          />
        )}

        {/* List View */}
        {view === 'list' && (
          <ListView 
            tasks={filteredTasks}
            onSelectTask={setSelectedTask}
          />
        )}

        {/* Task Detail Modal */}
        <AnimatePresence>
          {selectedTask && (
            <TaskDetailModal 
              task={selectedTask}
              teachers={mockTeachers}
              onClose={() => setSelectedTask(null)}
              onUpdate={(updated) => {
                setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
                setSelectedTask(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Create Task Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <CreateTaskModal 
              teachers={mockTeachers}
              onClose={() => setShowCreateModal(false)}
              onCreate={(newTask) => {
                setTasks(prev => [...prev, { ...newTask, id: Date.now().toString() }]);
                setShowCreateModal(false);
              }}
            />
          )}
        </AnimatePresence>
      </PageContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Badge
// ─────────────────────────────────────────────────────────────────────────────

function StatBadge({ 
  label, 
  value, 
  color, 
  active,
  onClick 
}: { 
  label: string; 
  value: number;
  color?: 'red' | 'amber' | 'purple';
  active: boolean;
  onClick: () => void;
}) {
  const { theme } = useRoleContext();

  const colorStyles = {
    red: 'text-red-500',
    amber: 'text-amber-500',
    purple: 'text-purple-500',
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all min-h-[44px]
        ${active 
          ? 'bg-blue-500 text-white' 
          : theme.mode === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50 shadow-sm'
        }
      `}
    >
      <span className="text-sm">{label}</span>
      <span className={`font-bold ${!active && color ? colorStyles[color] : ''}`}>{value}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Kanban Board
// ─────────────────────────────────────────────────────────────────────────────

function KanbanBoard({ 
  tasksByStatus, 
  onMoveTask,
  onSelectTask 
}: { 
  tasksByStatus: Record<string, Task[]>;
  onMoveTask: (taskId: string, newStatus: Task['status']) => void;
  onSelectTask: (task: Task) => void;
}) {
  const { theme } = useRoleContext();
  const { isMobile } = useBreakpoint();

  const columns = [
    { id: 'pending', title: '대기', icon: '📥', color: 'border-slate-400' },
    { id: 'in_progress', title: '진행중', icon: '🔄', color: 'border-blue-500' },
    { id: 'completed', title: '완료', icon: '✅', color: 'border-emerald-500' },
  ];

  return (
    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
      {columns.map((column) => (
        <div 
          key={column.id}
          className={`
            rounded-xl p-4 border-t-4 ${column.color}
            ${theme.mode === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'}
          `}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <span>{column.icon}</span>
              {column.title}
            </h3>
            <span className="text-sm px-2 py-0.5 bg-white/10 rounded-full">
              {tasksByStatus[column.id]?.length || 0}
            </span>
          </div>

          {/* Tasks */}
          <div className="space-y-3 min-h-[200px]">
            {tasksByStatus[column.id]?.map((task) => (
              <TaskCard 
                key={task.id}
                task={task}
                onClick={() => onSelectTask(task)}
                onStatusChange={(status) => onMoveTask(task.id, status)}
              />
            ))}
            
            {tasksByStatus[column.id]?.length === 0 && (
              <div className="text-center py-8 opacity-30">
                <p>태스크 없음</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Card
// ─────────────────────────────────────────────────────────────────────────────

function TaskCard({ 
  task, 
  onClick,
  onStatusChange 
}: { 
  task: Task;
  onClick: () => void;
  onStatusChange: (status: Task['status']) => void;
}) {
  const { theme } = useRoleContext();
  const reducedMotion = useReducedMotion();

  const priorityStyles = {
    urgent: { border: 'border-l-red-500', bg: 'bg-red-500/10', label: '긴급' },
    high: { border: 'border-l-amber-500', bg: 'bg-amber-500/10', label: '높음' },
    normal: { border: 'border-l-blue-500', bg: '', label: '보통' },
    low: { border: 'border-l-slate-400', bg: '', label: '낮음' },
  };

  const priority = priorityStyles[task.priority];

  const sourceIcons = {
    system: '🤖',
    owner: '👑',
    manual: '✍️',
  };

  return (
    <motion.div
      layout={!reducedMotion}
      className={`
        p-3 rounded-lg border-l-4 cursor-pointer
        ${priority.border} ${priority.bg || 'bg-white/5'}
        hover:opacity-80 transition-opacity
      `}
      onClick={onClick}
      whileTap={reducedMotion ? {} : { scale: 0.98 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
        <span className="text-xs opacity-50 flex-shrink-0">{sourceIcons[task.source]}</span>
      </div>

      {/* Description */}
      <p className="text-xs opacity-60 mb-2 line-clamp-2">{task.description}</p>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {task.assigneeName ? (
            <span className="px-2 py-0.5 bg-white/10 rounded">
              👤 {task.assigneeName}
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
              미배정
            </span>
          )}
        </div>
        <span className={`opacity-60 ${task.deadline.includes('오늘') ? 'text-red-400' : ''}`}>
          ⏰ {task.deadline}
        </span>
      </div>

      {/* Quick Status Change */}
      {task.status !== 'completed' && (
        <div className="flex gap-1 mt-2">
          {task.status === 'pending' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange('in_progress');
              }}
              className="flex-1 py-1.5 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
            >
              시작하기
            </button>
          )}
          {task.status === 'in_progress' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange('completed');
              }}
              className="flex-1 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
            >
              완료
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// List View
// ─────────────────────────────────────────────────────────────────────────────

function ListView({ 
  tasks, 
  onSelectTask 
}: { 
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}) {
  const { theme } = useRoleContext();

  const priorityLabels = {
    urgent: { text: '긴급', color: 'text-red-500 bg-red-500/10' },
    high: { text: '높음', color: 'text-amber-500 bg-amber-500/10' },
    normal: { text: '보통', color: 'text-blue-500 bg-blue-500/10' },
    low: { text: '낮음', color: 'text-slate-500 bg-slate-500/10' },
  };

  const statusLabels = {
    pending: { text: '대기', color: 'text-slate-400' },
    in_progress: { text: '진행중', color: 'text-blue-400' },
    completed: { text: '완료', color: 'text-emerald-400' },
  };

  return (
    <div className={`rounded-xl overflow-hidden ${theme.mode === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 p-4 text-xs font-medium opacity-60 border-b border-white/10">
        <div className="col-span-4">태스크</div>
        <div className="col-span-2">담당자</div>
        <div className="col-span-2">우선순위</div>
        <div className="col-span-2">상태</div>
        <div className="col-span-2">마감</div>
      </div>

      {/* Rows */}
      {tasks.map((task) => (
        <button
          key={task.id}
          onClick={() => onSelectTask(task)}
          className="w-full grid grid-cols-12 gap-4 p-4 text-sm hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
        >
          <div className="col-span-4">
            <p className="font-medium truncate">{task.title}</p>
            <p className="text-xs opacity-50 truncate">{task.description}</p>
          </div>
          <div className="col-span-2">
            {task.assigneeName || <span className="text-amber-400">미배정</span>}
          </div>
          <div className="col-span-2">
            <span className={`px-2 py-0.5 rounded text-xs ${priorityLabels[task.priority].color}`}>
              {priorityLabels[task.priority].text}
            </span>
          </div>
          <div className="col-span-2">
            <span className={statusLabels[task.status].color}>
              {statusLabels[task.status].text}
            </span>
          </div>
          <div className="col-span-2">
            <span className={task.deadline.includes('오늘') ? 'text-red-400' : 'opacity-60'}>
              {task.deadline}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

function TaskDetailModal({ 
  task, 
  teachers,
  onClose,
  onUpdate 
}: { 
  task: Task;
  teachers: Teacher[];
  onClose: () => void;
  onUpdate: (task: Task) => void;
}) {
  const { theme } = useRoleContext();
  const [editedTask, setEditedTask] = useState(task);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`
          w-full max-w-lg rounded-2xl p-6
          ${theme.mode === 'dark' ? 'bg-slate-800' : 'bg-white'}
          shadow-xl
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">태스크 상세</h2>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm opacity-60 block mb-1">제목</label>
            <input
              type="text"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className={`
                w-full px-4 py-3 rounded-lg border-0 outline-none
                ${theme.mode === 'dark' ? 'bg-white/10' : 'bg-slate-100'}
                focus:ring-2 focus:ring-blue-500
              `}
            />
          </div>

          <div>
            <label className="text-sm opacity-60 block mb-1">설명</label>
            <textarea
              value={editedTask.description}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              rows={3}
              className={`
                w-full px-4 py-3 rounded-lg border-0 outline-none resize-none
                ${theme.mode === 'dark' ? 'bg-white/10' : 'bg-slate-100'}
                focus:ring-2 focus:ring-blue-500
              `}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm opacity-60 block mb-1">담당자</label>
              <select
                value={editedTask.assignee || ''}
                onChange={(e) => {
                  const teacher = teachers.find(t => t.id === e.target.value);
                  setEditedTask({ 
                    ...editedTask, 
                    assignee: e.target.value || undefined,
                    assigneeName: teacher?.name,
                  });
                }}
                className={`
                  w-full px-4 py-3 rounded-lg border-0 outline-none
                  ${theme.mode === 'dark' ? 'bg-white/10' : 'bg-slate-100'}
                  focus:ring-2 focus:ring-blue-500
                `}
              >
                <option value="">미배정</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (업무량 {t.workload}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm opacity-60 block mb-1">우선순위</label>
              <select
                value={editedTask.priority}
                onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as Task['priority'] })}
                className={`
                  w-full px-4 py-3 rounded-lg border-0 outline-none
                  ${theme.mode === 'dark' ? 'bg-white/10' : 'bg-slate-100'}
                  focus:ring-2 focus:ring-blue-500
                `}
              >
                <option value="urgent">긴급</option>
                <option value="high">높음</option>
                <option value="normal">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onUpdate(editedTask)}
            className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors min-h-[48px]"
          >
            저장
          </button>
          <button
            onClick={onClose}
            className={`
              px-6 py-3 rounded-xl font-medium transition-colors min-h-[48px]
              ${theme.mode === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}
            `}
          >
            취소
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Task Modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateTaskModal({ 
  teachers,
  onClose,
  onCreate 
}: { 
  teachers: Teacher[];
  onClose: () => void;
  onCreate: (task: Omit<Task, 'id'>) => void;
}) {
  const { theme } = useRoleContext();
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'normal',
    status: 'pending',
    source: 'manual',
    deadline: '',
  });

  const handleCreate = () => {
    if (!newTask.title || !newTask.deadline) return;
    
    onCreate({
      ...newTask as Task,
      createdAt: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`
          w-full max-w-lg rounded-2xl p-6
          ${theme.mode === 'dark' ? 'bg-slate-800' : 'bg-white'}
          shadow-xl
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">새 태스크 생성</h2>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm opacity-60 block mb-1">제목 *</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="태스크 제목 입력..."
              className={`
                w-full px-4 py-3 rounded-lg border-0 outline-none
                ${theme.mode === 'dark' ? 'bg-white/10' : 'bg-slate-100'}
                focus:ring-2 focus:ring-blue-500
              `}
            />
          </div>

          <div>
            <label className="text-sm opacity-60 block mb-1">설명</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="상세 설명..."
              rows={3}
              className={`
                w-full px-4 py-3 rounded-lg border-0 outline-none resize-none
                ${theme.mode === 'dark' ? 'bg-white/10' : 'bg-slate-100'}
                focus:ring-2 focus:ring-blue-500
              `}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm opacity-60 block mb-1">마감일 *</label>
              <input
                type="text"
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                placeholder="예: 오늘 18:00"
                className={`
                  w-full px-4 py-3 rounded-lg border-0 outline-none
                  ${theme.mode === 'dark' ? 'bg-white/10' : 'bg-slate-100'}
                  focus:ring-2 focus:ring-blue-500
                `}
              />
            </div>

            <div>
              <label className="text-sm opacity-60 block mb-1">우선순위</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                className={`
                  w-full px-4 py-3 rounded-lg border-0 outline-none
                  ${theme.mode === 'dark' ? 'bg-white/10' : 'bg-slate-100'}
                  focus:ring-2 focus:ring-blue-500
                `}
              >
                <option value="urgent">긴급</option>
                <option value="high">높음</option>
                <option value="normal">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm opacity-60 block mb-1">담당자</label>
            <select
              value={newTask.assignee || ''}
              onChange={(e) => {
                const teacher = teachers.find(t => t.id === e.target.value);
                setNewTask({ 
                  ...newTask, 
                  assignee: e.target.value || undefined,
                  assigneeName: teacher?.name,
                });
              }}
              className={`
                w-full px-4 py-3 rounded-lg border-0 outline-none
                ${theme.mode === 'dark' ? 'bg-white/10' : 'bg-slate-100'}
                focus:ring-2 focus:ring-blue-500
              `}
            >
              <option value="">나중에 배정</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (업무량 {t.workload}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCreate}
            disabled={!newTask.title || !newTask.deadline}
            className={`
              flex-1 py-3 rounded-xl font-medium transition-colors min-h-[48px]
              ${newTask.title && newTask.deadline 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            생성
          </button>
          <button
            onClick={onClose}
            className={`
              px-6 py-3 rounded-xl font-medium transition-colors min-h-[48px]
              ${theme.mode === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}
            `}
          >
            취소
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ManagerTaskPage;
