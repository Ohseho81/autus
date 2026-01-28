/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Teacher Home
 * 🔨 강사용 일일 명령 센터
 * autus-ai.com API 연동
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoleContext } from '../../../contexts/RoleContext';
import { useBreakpoint } from '../../../hooks/useResponsive';
import { useReducedMotion } from '../../../hooks/useAccessibility';
import { useStudents, useRisks } from '../../../hooks/useAcademyData';
import { ResponsiveCard, CardGrid } from '../../shared/RoleBasedLayout';
import { StatusBadge } from '../../shared/StatusIndicator';
import { TemperatureDisplay } from '../../shared/TemperatureDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TeacherStats {
  todayClasses: number;
  assignedStudents: number;
  attentionNeeded: number;
  tasksCompleted: number;
  tasksTotal: number;
}

interface ScheduleBlock {
  id: string;
  startTime: string;
  endTime: string;
  type: 'class' | 'consultation' | 'break' | 'admin';
  title: string;
  studentCount?: number;
  hasAtRiskStudent?: boolean;
  atRiskStudentName?: string;
  room?: string;
}

interface StudentBrief {
  id: string;
  name: string;
  grade: string;
  temperature: number;
  keyIssue: string;
  nextAction: string;
}

interface TeacherTask {
  id: string;
  title: string;
  studentName?: string;
  priority: 'urgent' | 'today';
  completed: boolean;
  tip?: string;
}

interface TeacherDashboardData {
  stats: TeacherStats;
  schedule: ScheduleBlock[];
  students: {
    danger: StudentBrief[];
    warning: StudentBrief[];
    goodCount: number;
  };
  tasks: TeacherTask[];
  tip: { message: string; context: string };
  contribution: { score: number; trend: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockData: TeacherDashboardData = {
  stats: {
    todayClasses: 5,
    assignedStudents: 24,
    attentionNeeded: 3,
    tasksCompleted: 2,
    tasksTotal: 6,
  },
  schedule: [
    { id: '1', startTime: '14:00', endTime: '15:30', type: 'class', title: '중등 수학 A반', studentCount: 8, room: '201호' },
    { id: '2', startTime: '15:30', endTime: '16:00', type: 'break', title: '휴식' },
    { id: '3', startTime: '16:00', endTime: '17:30', type: 'class', title: '고등 수학 B반', studentCount: 6, hasAtRiskStudent: true, atRiskStudentName: '김민수', room: '202호' },
    { id: '4', startTime: '17:30', endTime: '18:00', type: 'consultation', title: '학부모 상담', studentCount: 1 },
    { id: '5', startTime: '18:00', endTime: '19:30', type: 'class', title: '중등 수학 C반', studentCount: 10, room: '201호' },
  ],
  students: {
    danger: [
      { id: '1', name: '김민수', grade: '고2', temperature: 32, keyIssue: '비용 민감', nextAction: '상담 예약' },
    ],
    warning: [
      { id: '2', name: '이수진', grade: '중3', temperature: 48, keyIssue: '출석 불규칙', nextAction: '학부모 연락' },
      { id: '3', name: '박지호', grade: '고1', temperature: 52, keyIssue: '숙제 미제출', nextAction: '면담 필요' },
    ],
    goodCount: 21,
  },
  tasks: [
    { id: '1', title: '김민수 학부모 상담 예약', studentName: '김민수', priority: 'urgent', completed: false, tip: '비용 관련 우려 경청 필요' },
    { id: '2', title: '주간 리포트 작성', priority: 'today', completed: true },
    { id: '3', title: '이수진 출석 현황 체크', studentName: '이수진', priority: 'today', completed: false },
    { id: '4', title: '신규 교재 검토', priority: 'today', completed: false },
    { id: '5', title: 'B반 숙제 검사', priority: 'today', completed: true },
    { id: '6', title: '박지호 면담', studentName: '박지호', priority: 'today', completed: false },
  ],
  tip: {
    message: '김민수 상담 시: 성적 향상 사례를 강조하고, 할부 옵션 안내해 주세요.',
    context: '김민수 학부모 상담 예정',
  },
  contribution: { score: 78, trend: 5 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TeacherHome() {
  const { theme } = useRoleContext();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const reducedMotion = useReducedMotion();
  const [tasks, setTasks] = useState(mockData.tasks);

  // autus-ai.com API 연동
  const orgId = 'demo-org'; // TODO: 실제 org_id로 변경
  const { students: apiStudents, loading: studentsLoading } = useStudents(orgId);
  const { risks, loading: risksLoading } = useRisks(orgId);

  // API 데이터를 컴포넌트 형식으로 변환
  const data = useMemo<TeacherDashboardData>(() => {
    if (studentsLoading || apiStudents.length === 0) return mockData;

    const dangerStudents = apiStudents
      .filter(s => s.status === 'danger')
      .map(s => ({
        id: s.id,
        name: s.name,
        grade: s.grade,
        temperature: s.temperature,
        keyIssue: '주의 필요',
        nextAction: '상담 예약',
      }));

    const warningStudents = apiStudents
      .filter(s => s.status === 'warning')
      .map(s => ({
        id: s.id,
        name: s.name,
        grade: s.grade,
        temperature: s.temperature,
        keyIssue: '관찰 중',
        nextAction: '모니터링',
      }));

    return {
      ...mockData,
      stats: {
        ...mockData.stats,
        assignedStudents: apiStudents.length,
        attentionNeeded: dangerStudents.length + warningStudents.length,
      },
      students: {
        danger: dangerStudents.slice(0, 5),
        warning: warningStudents.slice(0, 5),
        goodCount: apiStudents.filter(s => s.status === 'good').length,
      },
    };
  }, [apiStudents, studentsLoading]);

  // Greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '오늘도 힘내세요';
    return '수고 많으셨어요';
  }, []);

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  return (
    <div className={`min-h-screen ${theme.mode === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className="px-4 md:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-medium">
            🔨 박강사님, {greeting}!
          </h1>
          <p className="text-sm opacity-60 mt-0.5">
            오늘도 좋은 수업 되세요
          </p>
        </div>
        <button
          className={`
            p-2 rounded-full
            ${theme.mode === 'dark' ? 'bg-white/10' : 'bg-slate-200'}
            min-w-[44px] min-h-[44px]
          `}
          aria-label="프로필"
        >
          👤
        </button>
      </header>

      {/* Stats Bar */}
      <div className="px-4 md:px-6 py-3 flex gap-3 overflow-x-auto scrollbar-hide">
        <StatBadge icon="📚" label="오늘 수업" value={data.stats.todayClasses} />
        <StatBadge icon="👤" label="담당 학생" value={data.stats.assignedStudents} />
        <StatBadge icon="⚠️" label="주의 필요" value={data.stats.attentionNeeded} warning />
        <StatBadge 
          icon="✅" 
          label="완료" 
          value={`${tasks.filter(t => t.completed).length}/${tasks.length}`} 
        />
      </div>

      {/* Main Content */}
      <main className="px-4 md:px-6 py-4 space-y-4">
        {/* Schedule Timeline */}
        <ScheduleTimeline schedule={data.schedule} />

        {/* Two Column Layout */}
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Students Status */}
          <StudentStatusPanel students={data.students} />

          {/* Tasks */}
          <TasksPanel tasks={tasks} onToggle={toggleTask} />
        </div>

        {/* Tip */}
        <TipCard tip={data.tip} />
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Badge
// ─────────────────────────────────────────────────────────────────────────────

function StatBadge({ 
  icon, 
  label, 
  value, 
  warning 
}: { 
  icon: string; 
  label: string; 
  value: string | number;
  warning?: boolean;
}) {
  const { theme } = useRoleContext();

  return (
    <div 
      className={`
        flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl
        ${warning 
          ? 'bg-red-500/10 border border-red-500/20' 
          : theme.mode === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'
        }
        min-h-[44px]
      `}
    >
      <span>{icon}</span>
      <span className="text-xs opacity-60">{label}</span>
      <span className={`font-bold ${warning ? 'text-red-500' : ''}`}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule Timeline
// ─────────────────────────────────────────────────────────────────────────────

function ScheduleTimeline({ schedule }: { schedule: ScheduleBlock[] }) {
  const { theme } = useRoleContext();
  const reducedMotion = useReducedMotion();
  
  const typeStyles = {
    class: { bg: 'bg-emerald-500/10', border: 'border-l-emerald-500', icon: '📚' },
    consultation: { bg: 'bg-blue-500/10', border: 'border-l-blue-500', icon: '💬' },
    break: { bg: 'bg-slate-500/10', border: 'border-l-slate-400', icon: '☕' },
    admin: { bg: 'bg-purple-500/10', border: 'border-l-purple-500', icon: '📋' },
  };

  // Current time indicator
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <ResponsiveCard padding="md" className="space-y-3">
      <h2 className="text-sm font-medium opacity-70">📅 오늘 일정</h2>
      <div className="space-y-2">
        {schedule.map((block, index) => {
          const styles = typeStyles[block.type];
          const isCurrentOrNext = block.startTime <= currentTime && block.endTime > currentTime;
          
          return (
            <motion.div
              key={block.id}
              initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                flex items-center gap-3 p-3 rounded-lg border-l-4
                ${styles.bg} ${styles.border}
                ${isCurrentOrNext ? 'ring-2 ring-emerald-500/50' : ''}
              `}
            >
              <div className="text-xl">{styles.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{block.title}</span>
                  {block.hasAtRiskStudent && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded">
                      ⚠️ {block.atRiskStudentName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs opacity-60 mt-0.5">
                  <span>{block.startTime} - {block.endTime}</span>
                  {block.studentCount && <span>• {block.studentCount}명</span>}
                  {block.room && <span>• {block.room}</span>}
                </div>
              </div>
              {isCurrentOrNext && (
                <span className="px-2 py-1 bg-emerald-500 text-white text-xs rounded-full">
                  진행중
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </ResponsiveCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Student Status Panel
// ─────────────────────────────────────────────────────────────────────────────

function StudentStatusPanel({ 
  students 
}: { 
  students: TeacherDashboardData['students'] 
}) {
  const { theme } = useRoleContext();
  const [expanded, setExpanded] = useState<'danger' | 'warning' | null>('danger');

  return (
    <ResponsiveCard padding="md" className="space-y-3">
      <h2 className="text-sm font-medium opacity-70">👥 담당 학생 현황</h2>
      
      {/* Summary */}
      <div className="flex gap-3">
        <button
          onClick={() => setExpanded(expanded === 'danger' ? null : 'danger')}
          className={`
            flex-1 p-3 rounded-lg text-left
            ${expanded === 'danger' ? 'bg-red-500/20 border-2 border-red-500/30' : 'bg-red-500/10'}
            min-h-[64px]
          `}
        >
          <span className="text-2xl">🔴</span>
          <p className="font-bold text-lg">{students.danger.length}명</p>
          <p className="text-xs opacity-60">위험</p>
        </button>
        <button
          onClick={() => setExpanded(expanded === 'warning' ? null : 'warning')}
          className={`
            flex-1 p-3 rounded-lg text-left
            ${expanded === 'warning' ? 'bg-amber-500/20 border-2 border-amber-500/30' : 'bg-amber-500/10'}
            min-h-[64px]
          `}
        >
          <span className="text-2xl">🟡</span>
          <p className="font-bold text-lg">{students.warning.length}명</p>
          <p className="text-xs opacity-60">주의</p>
        </button>
        <div className="flex-1 p-3 rounded-lg bg-emerald-500/10">
          <span className="text-2xl">🟢</span>
          <p className="font-bold text-lg">{students.goodCount}명</p>
          <p className="text-xs opacity-60">양호</p>
        </div>
      </div>

      {/* Expanded List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {(expanded === 'danger' ? students.danger : students.warning).map((student) => (
              <div 
                key={student.id}
                className={`
                  p-3 rounded-lg
                  ${expanded === 'danger' ? 'bg-red-500/10' : 'bg-amber-500/10'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{student.name}</span>
                    <span className="text-xs opacity-60 ml-2">{student.grade}</span>
                  </div>
                  <TemperatureDisplay value={student.temperature} size="sm" variant="gauge" />
                </div>
                <p className="text-sm opacity-70 mt-1">{student.keyIssue}</p>
                <button 
                  className={`
                    mt-2 px-3 py-1.5 rounded-lg text-xs font-medium
                    ${expanded === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-600'}
                    min-h-[36px]
                  `}
                >
                  {student.nextAction}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </ResponsiveCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tasks Panel
// ─────────────────────────────────────────────────────────────────────────────

function TasksPanel({ 
  tasks, 
  onToggle 
}: { 
  tasks: TeacherTask[]; 
  onToggle: (id: string) => void;
}) {
  const { theme } = useRoleContext();
  const reducedMotion = useReducedMotion();

  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && !t.completed);
  const todayTasks = tasks.filter(t => t.priority === 'today' && !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <ResponsiveCard padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium opacity-70">✅ 오늘 할 일</h2>
        <span className="text-xs opacity-50">
          {completedTasks.length}/{tasks.length} 완료
        </span>
      </div>

      <div className="space-y-4">
        {/* Urgent */}
        {urgentTasks.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-red-500">⚡ 긴급</span>
            {urgentTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={onToggle} />
            ))}
          </div>
        )}

        {/* Today */}
        {todayTasks.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium opacity-50">📅 오늘</span>
            {todayTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={onToggle} />
            ))}
          </div>
        )}

        {/* Completed */}
        {completedTasks.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-emerald-500">✓ 완료</span>
            {completedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={onToggle} />
            ))}
          </div>
        )}
      </div>
    </ResponsiveCard>
  );
}

function TaskItem({ 
  task, 
  onToggle 
}: { 
  task: TeacherTask; 
  onToggle: (id: string) => void;
}) {
  const { theme } = useRoleContext();

  return (
    <button
      onClick={() => onToggle(task.id)}
      className={`
        w-full flex items-start gap-3 p-3 rounded-lg text-left
        ${theme.mode === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50 shadow-sm'}
        transition-colors min-h-[48px]
      `}
    >
      <span className={`
        w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5
        ${task.completed 
          ? 'bg-emerald-500 border-emerald-500' 
          : 'border-slate-400'
        }
      `}>
        {task.completed && <span className="text-white text-xs">✓</span>}
      </span>
      <div className="flex-1 min-w-0">
        <span className={task.completed ? 'line-through opacity-50' : ''}>
          {task.title}
        </span>
        {task.studentName && !task.completed && (
          <span className="text-xs px-1.5 py-0.5 ml-2 bg-slate-200 dark:bg-white/10 rounded">
            {task.studentName}
          </span>
        )}
        {task.tip && !task.completed && (
          <p className="text-xs opacity-50 mt-1">💡 {task.tip}</p>
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tip Card
// ─────────────────────────────────────────────────────────────────────────────

function TipCard({ tip }: { tip: TeacherDashboardData['tip'] }) {
  const { theme } = useRoleContext();

  return (
    <ResponsiveCard 
      padding="md" 
      className={`
        ${theme.mode === 'dark' 
          ? 'bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20' 
          : 'bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200'
        }
        border
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div>
          <p className="text-xs opacity-60 mb-1">{tip.context}</p>
          <p className="font-medium">{tip.message}</p>
        </div>
        <button 
          className="ml-auto text-sm opacity-50 hover:opacity-100 min-w-[44px] min-h-[44px]"
          aria-label="팁 닫기"
        >
          ✕
        </button>
      </div>
    </ResponsiveCard>
  );
}

export default TeacherHome;
