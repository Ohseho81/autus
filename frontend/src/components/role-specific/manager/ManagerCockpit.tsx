/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Manager Cockpit
 * ⚙️ 관리자용 운영 명령 센터
 * autus-ai.com API 연동
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoleContext } from '../../../contexts/RoleContext';
import { useBreakpoint } from '../../../hooks/useResponsive';
import { useReducedMotion } from '../../../hooks/useAccessibility';
import { useAcademyData } from '../../../hooks/useAcademyData';
import { TrafficLight, StatusBadge } from '../../shared/StatusIndicator';
import { ResponsiveCard, CardGrid } from '../../shared/RoleBasedLayout';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QuickStats {
  unresolved: number;
  atRiskStudents: number;
  pendingConsultations: number;
  todayTasks: number;
}

interface OperationsStatus {
  totalStudents: number;
  atRisk: number;
  watching: number;
  pending: number;
  activeTeachers: number;
  todayClasses: number;
}

interface EnvironmentStatus {
  weather: { tomorrow: string; sigma: number };
  threats: { count: number; details: string[] };
  resonance: { active: boolean; description: string };
}

interface TeacherStatus {
  id: string;
  name: string;
  avatar?: string;
  performance: number;
  assignedStudents: number;
  atRiskStudents: number;
  todayClasses: number;
  status: 'available' | 'teaching' | 'consulting' | 'off';
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignee?: string;
  assigneeName?: string;
  deadline: string;
  priority: 'urgent' | 'today' | 'this_week';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  source: 'system' | 'owner' | 'manual';
}

interface Notification {
  id: string;
  message: string;
  type: 'action_required' | 'info' | 'warning';
  daysElapsed: number;
  studentName?: string;
}

interface ManagerDashboardData {
  quickStats: QuickStats;
  operations: OperationsStatus;
  environment: EnvironmentStatus;
  status: { overall: 'good' | 'caution' | 'warning' | 'critical'; assessment: string };
  teachers: TeacherStatus[];
  tasks: Task[];
  notifications: Notification[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockData: ManagerDashboardData = {
  quickStats: {
    unresolved: 5,
    atRiskStudents: 8,
    pendingConsultations: 3,
    todayTasks: 12,
  },
  operations: {
    totalStudents: 132,
    atRisk: 8,
    watching: 15,
    pending: 3,
    activeTeachers: 6,
    todayClasses: 18,
  },
  environment: {
    weather: { tomorrow: '폭풍 예보', sigma: 2.3 },
    threats: { count: 2, details: ['D학원 할인 이벤트', 'B학원 신규 강사 영입'] },
    resonance: { active: true, description: '남동쪽 학부모 그룹 불만 확산' },
  },
  status: {
    overall: 'caution',
    assessment: '운영 정상, 위험학생 관리 필요',
  },
  teachers: [
    { id: '1', name: '박영희', performance: 92, assignedStudents: 24, atRiskStudents: 2, todayClasses: 4, status: 'teaching' },
    { id: '2', name: '김철수', performance: 85, assignedStudents: 20, atRiskStudents: 3, todayClasses: 3, status: 'available' },
    { id: '3', name: '이미영', performance: 88, assignedStudents: 22, atRiskStudents: 1, todayClasses: 5, status: 'consulting' },
    { id: '4', name: '정민수', performance: 78, assignedStudents: 18, atRiskStudents: 2, todayClasses: 3, status: 'available' },
    { id: '5', name: '최지연', performance: 95, assignedStudents: 26, atRiskStudents: 0, todayClasses: 4, status: 'teaching' },
    { id: '6', name: '한승호', performance: 82, assignedStudents: 22, atRiskStudents: 0, todayClasses: 2, status: 'off' },
  ],
  tasks: [
    { id: '1', title: '김민수 학부모 상담 예약', description: '비용 관련 상담 요청', deadline: '오늘 14:00', priority: 'urgent', status: 'pending', source: 'system' },
    { id: '2', title: '위험학생 리포트 작성', description: '주간 리포트 제출', assignee: '1', assigneeName: '박영희', deadline: '오늘 18:00', priority: 'today', status: 'assigned', source: 'owner' },
    { id: '3', title: '신규 교재 검토', description: '수학 심화 교재', deadline: '01/30', priority: 'this_week', status: 'pending', source: 'manual' },
    { id: '4', title: '학부모 불만 처리', description: '남동쪽 그룹 응대', assignee: '3', assigneeName: '이미영', deadline: '오늘 17:00', priority: 'urgent', status: 'in_progress', source: 'system' },
    { id: '5', title: '2월 시간표 작성', description: '강사별 배정', deadline: '01/31', priority: 'this_week', status: 'pending', source: 'manual' },
  ],
  notifications: [
    { id: '1', message: '김민수 3일 연속 결석', type: 'action_required', daysElapsed: 3, studentName: '김민수' },
    { id: '2', message: '이수진 숙제 미제출 5회', type: 'warning', daysElapsed: 2, studentName: '이수진' },
    { id: '3', message: '박지호 학부모 회신 없음', type: 'action_required', daysElapsed: 5, studentName: '박지호' },
    { id: '4', message: '월말 결제 독촉 대상 2명', type: 'info', daysElapsed: 1 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ManagerCockpit() {
  const { theme } = useRoleContext();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const reducedMotion = useReducedMotion();
  const [data] = useState<ManagerDashboardData>(mockData);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);

  // Greeting
  const now = new Date();
  const greeting = now.getHours() < 12 ? '좋은 아침입니다' : now.getHours() < 18 ? '안녕하세요' : '수고하셨습니다';

  return (
    <div 
      className="min-h-screen"
      style={{
        background: theme.mode === 'dark' 
          ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' 
          : undefined,
      }}
    >
      {/* Header */}
      <header className="px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-medium opacity-80">
            ⚙️ 관리자님, {greeting}
          </h1>
          <p className="text-sm opacity-50">
            {now.toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            })}
          </p>
        </div>
        <button
          className="p-3 rounded-xl hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px]"
          aria-label="설정"
        >
          ⚙️
        </button>
      </header>

      {/* Quick Stats Bar */}
      <QuickStatsBar stats={data.quickStats} />

      {/* Alert Banner */}
      <UnresolvedAlertBanner notifications={data.notifications} />

      {/* Main Content */}
      <main className="px-4 md:px-6 lg:px-8 py-4 space-y-6">
        {/* Status Section */}
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-3' : isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <OperationsPanel operations={data.operations} />
          <StatusLightPanel status={data.status} />
          <EnvironmentPanel environment={data.environment} />
        </div>

        {/* Teacher & Tasks */}
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TeacherGrid 
            teachers={data.teachers} 
            selectedTeacher={selectedTeacher}
            onSelectTeacher={setSelectedTeacher}
          />
          <TaskQueue tasks={data.tasks} />
        </div>

        {/* Unresolved Notifications Bar */}
        <NotificationsBar notifications={data.notifications} />
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Stats Bar
// ─────────────────────────────────────────────────────────────────────────────

function QuickStatsBar({ stats }: { stats: QuickStats }) {
  const { theme } = useRoleContext();

  const items = [
    { icon: '🔴', label: '미조치', value: stats.unresolved, color: 'text-red-500', critical: true },
    { icon: '⚠️', label: '위험학생', value: stats.atRiskStudents, color: 'text-amber-500', critical: stats.atRiskStudents > 5 },
    { icon: '📞', label: '상담대기', value: stats.pendingConsultations, color: 'text-blue-500', critical: false },
    { icon: '📋', label: '오늘 태스크', value: stats.todayTasks, color: 'text-slate-400', critical: false },
  ];

  return (
    <div className="px-4 md:px-6 lg:px-8 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {items.map((item) => (
          <button
            key={item.label}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl flex-shrink-0
              ${item.critical 
                ? 'bg-red-500/10 border border-red-500/20' 
                : theme.mode === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'
              }
              hover:opacity-80 transition-opacity min-h-[44px]
            `}
            aria-label={`${item.label}: ${item.value}건`}
          >
            <span>{item.icon}</span>
            <span className="text-sm opacity-70">{item.label}</span>
            <span className={`font-bold ${item.critical ? 'text-red-500' : item.color}`}>
              {item.value}건
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unresolved Alert Banner
// ─────────────────────────────────────────────────────────────────────────────

function UnresolvedAlertBanner({ notifications }: { notifications: Notification[] }) {
  const actionRequired = notifications.filter(n => n.type === 'action_required');
  const [expanded, setExpanded] = useState(false);

  if (actionRequired.length === 0) return null;

  return (
    <div className="mx-4 md:mx-6 lg:mx-8 mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-3 hover:bg-amber-500/30 transition-colors min-h-[48px]"
        aria-expanded={expanded}
      >
        <span className="text-xl">⚡</span>
        <span className="flex-1 text-left font-medium text-amber-400">
          조치 필요 {actionRequired.length}건
        </span>
        <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 space-y-2 overflow-hidden"
          >
            {actionRequired.map((notif) => (
              <div 
                key={notif.id}
                className="px-4 py-3 bg-white/5 rounded-lg flex items-center gap-3"
              >
                <span className="text-amber-400">⚠️</span>
                <span className="flex-1">{notif.message}</span>
                <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                  {notif.daysElapsed}일 경과
                </span>
                <button className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium min-h-[36px]">
                  처리
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Operations Panel
// ─────────────────────────────────────────────────────────────────────────────

function OperationsPanel({ operations }: { operations: OperationsStatus }) {
  const items = [
    { icon: '👤', label: '총 재원생', value: operations.totalStudents },
    { icon: '🔴', label: '위험', value: operations.atRisk, color: 'text-red-500' },
    { icon: '🟡', label: '주의', value: operations.watching, color: 'text-amber-500' },
    { icon: '📞', label: '상담대기', value: operations.pending, color: 'text-blue-500' },
    { icon: '✅', label: '활동 강사', value: operations.activeTeachers, color: 'text-emerald-500' },
    { icon: '📚', label: '오늘 수업', value: operations.todayClasses },
  ];

  return (
    <ResponsiveCard padding="md" className="space-y-3">
      <h2 className="text-sm font-medium opacity-70">📊 운영 현황</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="p-2 bg-white/5 rounded-lg">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{item.icon}</span>
              <span className="text-xs opacity-60">{item.label}</span>
            </div>
            <span className={`text-xl font-bold ${item.color || ''}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </ResponsiveCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Light Panel
// ─────────────────────────────────────────────────────────────────────────────

function StatusLightPanel({ status }: { status: ManagerDashboardData['status'] }) {
  return (
    <ResponsiveCard padding="md" className="flex flex-col items-center justify-center">
      <TrafficLight 
        status={status.overall === 'good' ? 'good' : status.overall === 'caution' ? 'caution' : 'warning'}
        size="lg"
      />
      <p className="mt-4 text-center font-medium">{status.assessment}</p>
      <button
        className="mt-3 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm min-h-[44px]"
        aria-label="상세 보기"
      >
        상세 분석 →
      </button>
    </ResponsiveCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment Panel
// ─────────────────────────────────────────────────────────────────────────────

function EnvironmentPanel({ environment }: { environment: EnvironmentStatus }) {
  return (
    <ResponsiveCard padding="md" className="space-y-3">
      <h2 className="text-sm font-medium opacity-70">🌍 외부 환경</h2>
      <div className="space-y-3">
        {/* Weather */}
        <div className={`p-3 rounded-lg ${environment.weather.sigma > 2 ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
          <div className="flex items-center gap-2">
            <span>🌤️</span>
            <span className="text-sm opacity-70">내일</span>
            <span className={`font-medium ${environment.weather.sigma > 2 ? 'text-red-400' : ''}`}>
              {environment.weather.tomorrow}
            </span>
          </div>
          {environment.weather.sigma > 2 && (
            <p className="text-xs text-red-400 mt-1">⚠️ 수업 조정 필요</p>
          )}
        </div>

        {/* Threats */}
        <div className={`p-3 rounded-lg ${environment.threats.count > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5'}`}>
          <div className="flex items-center gap-2">
            <span>📡</span>
            <span className="text-sm opacity-70">위협</span>
            <span className={`font-medium ${environment.threats.count > 0 ? 'text-amber-400' : ''}`}>
              {environment.threats.count}건
            </span>
          </div>
          {environment.threats.details.slice(0, 2).map((detail, i) => (
            <p key={i} className="text-xs opacity-60 mt-1 truncate">• {detail}</p>
          ))}
        </div>

        {/* Resonance */}
        {environment.resonance.active && (
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2">
              <span>💥</span>
              <span className="text-sm text-purple-400 font-medium">공명 감지</span>
            </div>
            <p className="text-xs opacity-70 mt-1">{environment.resonance.description}</p>
          </div>
        )}
      </div>
    </ResponsiveCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Teacher Grid
// ─────────────────────────────────────────────────────────────────────────────

function TeacherGrid({ 
  teachers, 
  selectedTeacher, 
  onSelectTeacher 
}: { 
  teachers: TeacherStatus[];
  selectedTeacher: string | null;
  onSelectTeacher: (id: string | null) => void;
}) {
  const { theme } = useRoleContext();
  const reducedMotion = useReducedMotion();

  const statusColors = {
    available: { bg: 'bg-emerald-500', text: '대기중' },
    teaching: { bg: 'bg-blue-500', text: '수업중' },
    consulting: { bg: 'bg-purple-500', text: '상담중' },
    off: { bg: 'bg-slate-500', text: '부재' },
  };

  return (
    <ResponsiveCard padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium opacity-70">👥 강사 현황</h2>
        <button className="text-xs text-blue-400 hover:underline min-h-[32px]">
          전체 관리 →
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {teachers.map((teacher) => {
          const statusStyle = statusColors[teacher.status];
          return (
            <motion.button
              key={teacher.id}
              onClick={() => onSelectTeacher(selectedTeacher === teacher.id ? null : teacher.id)}
              className={`
                p-3 rounded-xl text-left transition-all
                ${selectedTeacher === teacher.id 
                  ? 'bg-blue-500/20 border-2 border-blue-500/50' 
                  : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                }
                min-h-[100px]
              `}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-sm font-bold">
                  {teacher.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{teacher.name}</p>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${statusStyle.bg}`} />
                    <span className="text-xs opacity-60">{statusStyle.text}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-1">
                {/* Performance */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        teacher.performance >= 90 ? 'bg-emerald-500' :
                        teacher.performance >= 80 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${teacher.performance}%` }}
                    />
                  </div>
                  <span className="text-xs opacity-60">{teacher.performance}%</span>
                </div>
                
                {/* Metrics */}
                <div className="flex justify-between text-xs opacity-60">
                  <span>👤 {teacher.assignedStudents}명</span>
                  {teacher.atRiskStudents > 0 && (
                    <span className="text-red-400">⚠️ {teacher.atRiskStudents}</span>
                  )}
                  <span>📚 {teacher.todayClasses}</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Quick Action */}
      <button className="w-full py-2.5 mt-2 bg-blue-500/10 text-blue-400 rounded-lg font-medium hover:bg-blue-500/20 transition-colors min-h-[44px]">
        📋 태스크 배분하기
      </button>
    </ResponsiveCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Queue
// ─────────────────────────────────────────────────────────────────────────────

function TaskQueue({ tasks }: { tasks: Task[] }) {
  const { theme } = useRoleContext();

  const priorityStyles = {
    urgent: { border: 'border-l-red-500', bg: 'bg-red-500/10', label: '⚡ 긴급' },
    today: { border: 'border-l-amber-500', bg: 'bg-amber-500/10', label: '📅 오늘' },
    this_week: { border: 'border-l-slate-500', bg: '', label: '📆 이번 주' },
  };

  const statusLabels = {
    pending: { text: '대기', color: 'text-slate-400' },
    assigned: { text: '배정됨', color: 'text-blue-400' },
    in_progress: { text: '진행중', color: 'text-emerald-400' },
    completed: { text: '완료', color: 'text-slate-500' },
  };

  // Group by priority
  const urgentTasks = tasks.filter(t => t.priority === 'urgent');
  const todayTasks = tasks.filter(t => t.priority === 'today');
  const weekTasks = tasks.filter(t => t.priority === 'this_week');

  const renderTasks = (taskList: Task[], priority: 'urgent' | 'today' | 'this_week') => {
    const style = priorityStyles[priority];
    if (taskList.length === 0) return null;

    return (
      <div className="space-y-2">
        <span className={`text-xs font-medium ${priority === 'urgent' ? 'text-red-400' : priority === 'today' ? 'text-amber-400' : 'opacity-50'}`}>
          {style.label}
        </span>
        {taskList.map((task) => {
          const statusStyle = statusLabels[task.status];
          return (
            <div
              key={task.id}
              className={`
                p-3 rounded-lg border-l-4 ${style.border} ${style.bg || 'bg-white/5'}
                hover:opacity-80 transition-opacity cursor-pointer
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{task.title}</h3>
                  <p className="text-xs opacity-50 mt-0.5 truncate">{task.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.color} bg-white/10`}>
                  {statusStyle.text}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="opacity-50">
                  {task.assigneeName ? `👤 ${task.assigneeName}` : '미배정'}
                </span>
                <span className="opacity-50">⏰ {task.deadline}</span>
              </div>
              {!task.assignee && (
                <button className="mt-2 w-full py-1.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium hover:bg-blue-500/30 transition-colors min-h-[32px]">
                  지시하기
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ResponsiveCard padding="md" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium opacity-70">📋 태스크 큐</h2>
        <button className="text-xs text-blue-400 hover:underline min-h-[32px]">
          전체 보기 →
        </button>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {renderTasks(urgentTasks, 'urgent')}
        {renderTasks(todayTasks, 'today')}
        {renderTasks(weekTasks, 'this_week')}
      </div>

      <button className="w-full py-2.5 border-2 border-dashed border-white/20 rounded-lg text-sm opacity-50 hover:opacity-70 hover:border-white/40 transition-all min-h-[44px]">
        + 새 태스크 추가
      </button>
    </ResponsiveCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications Bar
// ─────────────────────────────────────────────────────────────────────────────

function NotificationsBar({ notifications }: { notifications: Notification[] }) {
  const { theme } = useRoleContext();

  return (
    <ResponsiveCard padding="sm" className="overflow-hidden">
      <h2 className="text-sm font-medium opacity-70 px-2 mb-3">🔔 미처리 알림</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`
              flex-shrink-0 px-4 py-3 rounded-lg min-w-[200px] max-w-[280px]
              ${notif.type === 'action_required' 
                ? 'bg-red-500/10 border border-red-500/20' 
                : notif.type === 'warning'
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-white/5'
              }
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full">
                {notif.daysElapsed}일 경과
              </span>
              {notif.type === 'action_required' && (
                <span className="text-xs text-red-400">조치 필요</span>
              )}
            </div>
            <p className="text-sm font-medium truncate">{notif.message}</p>
            <button className="mt-2 text-xs text-blue-400 hover:underline min-h-[24px]">
              처리하기 →
            </button>
          </div>
        ))}
      </div>
    </ResponsiveCard>
  );
}

export default ManagerCockpit;
