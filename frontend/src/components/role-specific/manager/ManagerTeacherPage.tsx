/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Manager Teacher Management Page
 * ⚙️ 관리자용 강사 관리 페이지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoleContext } from '../../../contexts/RoleContext';
import { useBreakpoint } from '../../../hooks/useResponsive';
import { useReducedMotion } from '../../../hooks/useAccessibility';
import { ResponsiveCard, PageContainer, CardGrid } from '../../shared/RoleBasedLayout';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TeacherDetail {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  phone: string;
  subject: string;
  joinDate: string;
  status: 'available' | 'teaching' | 'consulting' | 'off';
  performance: {
    score: number;
    trend: number;
    studentRetention: number;
    taskCompletion: number;
    parentSatisfaction: number;
  };
  students: {
    total: number;
    atRisk: number;
    improved: number;
  };
  schedule: {
    todayClasses: number;
    weeklyHours: number;
    nextAvailable: string;
  };
  tasks: {
    pending: number;
    completed: number;
    overdue: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockTeachers: TeacherDetail[] = [
  {
    id: '1',
    name: '박영희',
    email: 'park@academy.com',
    phone: '010-1234-5678',
    subject: '수학',
    joinDate: '2023-03-01',
    status: 'teaching',
    performance: { score: 92, trend: 5, studentRetention: 95, taskCompletion: 88, parentSatisfaction: 4.8 },
    students: { total: 24, atRisk: 2, improved: 8 },
    schedule: { todayClasses: 4, weeklyHours: 32, nextAvailable: '16:00' },
    tasks: { pending: 3, completed: 15, overdue: 0 },
  },
  {
    id: '2',
    name: '김철수',
    email: 'kim@academy.com',
    phone: '010-2345-6789',
    subject: '영어',
    joinDate: '2022-09-15',
    status: 'available',
    performance: { score: 85, trend: -2, studentRetention: 88, taskCompletion: 75, parentSatisfaction: 4.3 },
    students: { total: 20, atRisk: 3, improved: 5 },
    schedule: { todayClasses: 3, weeklyHours: 28, nextAvailable: '지금' },
    tasks: { pending: 5, completed: 12, overdue: 2 },
  },
  {
    id: '3',
    name: '이미영',
    email: 'lee@academy.com',
    phone: '010-3456-7890',
    subject: '국어',
    joinDate: '2024-01-10',
    status: 'consulting',
    performance: { score: 88, trend: 8, studentRetention: 92, taskCompletion: 90, parentSatisfaction: 4.6 },
    students: { total: 22, atRisk: 1, improved: 10 },
    schedule: { todayClasses: 5, weeklyHours: 35, nextAvailable: '17:30' },
    tasks: { pending: 2, completed: 18, overdue: 0 },
  },
  {
    id: '4',
    name: '정민수',
    email: 'jung@academy.com',
    phone: '010-4567-8901',
    subject: '과학',
    joinDate: '2023-06-01',
    status: 'available',
    performance: { score: 78, trend: 3, studentRetention: 82, taskCompletion: 70, parentSatisfaction: 4.0 },
    students: { total: 18, atRisk: 2, improved: 4 },
    schedule: { todayClasses: 3, weeklyHours: 24, nextAvailable: '지금' },
    tasks: { pending: 6, completed: 8, overdue: 1 },
  },
  {
    id: '5',
    name: '최지연',
    email: 'choi@academy.com',
    phone: '010-5678-9012',
    subject: '수학',
    joinDate: '2021-11-20',
    status: 'teaching',
    performance: { score: 95, trend: 2, studentRetention: 98, taskCompletion: 95, parentSatisfaction: 4.9 },
    students: { total: 26, atRisk: 0, improved: 12 },
    schedule: { todayClasses: 4, weeklyHours: 36, nextAvailable: '18:00' },
    tasks: { pending: 1, completed: 22, overdue: 0 },
  },
  {
    id: '6',
    name: '한승호',
    email: 'han@academy.com',
    phone: '010-6789-0123',
    subject: '영어',
    joinDate: '2024-06-15',
    status: 'off',
    performance: { score: 82, trend: 0, studentRetention: 85, taskCompletion: 80, parentSatisfaction: 4.2 },
    students: { total: 22, atRisk: 0, improved: 6 },
    schedule: { todayClasses: 0, weeklyHours: 20, nextAvailable: '내일' },
    tasks: { pending: 0, completed: 10, overdue: 0 },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ManagerTeacherPage() {
  const { theme } = useRoleContext();
  const { isMobile, isDesktop } = useBreakpoint();
  const [teachers] = useState<TeacherDetail[]>(mockTeachers);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherDetail | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'teaching' | 'off'>('all');
  const [sortBy, setSortBy] = useState<'performance' | 'students' | 'name'>('performance');

  const filteredTeachers = useMemo(() => {
    let result = [...teachers];
    
    // Filter
    if (filter !== 'all') {
      result = result.filter(t => t.status === filter);
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return b.performance.score - a.performance.score;
        case 'students':
          return b.students.total - a.students.total;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    
    return result;
  }, [teachers, filter, sortBy]);

  return (
    <div className={`min-h-screen ${theme.mode === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <PageContainer 
        title="👥 강사 관리"
        subtitle="강사 현황 및 태스크 배분"
        actions={
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors min-h-[44px]">
            + 강사 추가
          </button>
        }
      >
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-2">
            {(['all', 'available', 'teaching', 'off'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]
                  ${filter === f 
                    ? 'bg-blue-500 text-white' 
                    : theme.mode === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-100 shadow-sm'
                  }
                `}
              >
                {f === 'all' && '전체'}
                {f === 'available' && '대기중'}
                {f === 'teaching' && '수업중'}
                {f === 'off' && '부재'}
              </button>
            ))}
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className={`
              px-4 py-2 rounded-lg text-sm min-h-[40px]
              ${theme.mode === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'}
              border-0 outline-none focus:ring-2 focus:ring-blue-500
            `}
          >
            <option value="performance">성과순</option>
            <option value="students">학생수순</option>
            <option value="name">이름순</option>
          </select>
        </div>

        {/* Teacher Grid */}
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-3' : isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {filteredTeachers.map((teacher) => (
            <TeacherCard 
              key={teacher.id}
              teacher={teacher}
              isSelected={selectedTeacher?.id === teacher.id}
              onSelect={() => setSelectedTeacher(selectedTeacher?.id === teacher.id ? null : teacher)}
            />
          ))}
        </div>

        {/* Selected Teacher Detail */}
        <AnimatePresence>
          {selectedTeacher && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6"
            >
              <TeacherDetailPanel 
                teacher={selectedTeacher}
                onClose={() => setSelectedTeacher(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </PageContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Teacher Card
// ─────────────────────────────────────────────────────────────────────────────

function TeacherCard({ 
  teacher, 
  isSelected,
  onSelect 
}: { 
  teacher: TeacherDetail;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { theme } = useRoleContext();
  const reducedMotion = useReducedMotion();

  const statusStyles = {
    available: { bg: 'bg-emerald-500', text: '대기중', textColor: 'text-emerald-400' },
    teaching: { bg: 'bg-blue-500', text: '수업중', textColor: 'text-blue-400' },
    consulting: { bg: 'bg-purple-500', text: '상담중', textColor: 'text-purple-400' },
    off: { bg: 'bg-slate-500', text: '부재', textColor: 'text-slate-400' },
  };

  const status = statusStyles[teacher.status];

  return (
    <motion.button
      onClick={onSelect}
      className={`
        p-4 rounded-xl text-left transition-all w-full
        ${isSelected 
          ? 'ring-2 ring-blue-500 ' + (theme.mode === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50')
          : theme.mode === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:shadow-md shadow-sm'
        }
      `}
      whileTap={reducedMotion ? {} : { scale: 0.98 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-lg font-bold text-white">
          {teacher.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">{teacher.name}</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${status.bg}`} />
            <span className={status.textColor}>{status.text}</span>
            <span className="opacity-50">• {teacher.subject}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${
            teacher.performance.score >= 90 ? 'text-emerald-500' :
            teacher.performance.score >= 80 ? 'text-blue-500' : 'text-amber-500'
          }`}>
            {teacher.performance.score}
          </div>
          <div className={`text-xs ${teacher.performance.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {teacher.performance.trend >= 0 ? '↑' : '↓'} {Math.abs(teacher.performance.trend)}%
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-white/5 rounded-lg">
          <div className="text-lg font-bold">{teacher.students.total}</div>
          <div className="text-xs opacity-50">담당 학생</div>
        </div>
        <div className="p-2 bg-white/5 rounded-lg">
          <div className={`text-lg font-bold ${teacher.students.atRisk > 0 ? 'text-red-500' : ''}`}>
            {teacher.students.atRisk}
          </div>
          <div className="text-xs opacity-50">위험 학생</div>
        </div>
        <div className="p-2 bg-white/5 rounded-lg">
          <div className="text-lg font-bold">{teacher.schedule.todayClasses}</div>
          <div className="text-xs opacity-50">오늘 수업</div>
        </div>
      </div>

      {/* Task Summary */}
      {(teacher.tasks.pending > 0 || teacher.tasks.overdue > 0) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {teacher.tasks.pending > 0 && (
            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full">
              대기 {teacher.tasks.pending}
            </span>
          )}
          {teacher.tasks.overdue > 0 && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
              지연 {teacher.tasks.overdue}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Teacher Detail Panel
// ─────────────────────────────────────────────────────────────────────────────

function TeacherDetailPanel({ 
  teacher, 
  onClose 
}: { 
  teacher: TeacherDetail;
  onClose: () => void;
}) {
  const { theme } = useRoleContext();
  const { isMobile } = useBreakpoint();

  return (
    <ResponsiveCard padding="lg" className="relative">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="닫기"
      >
        ✕
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
          {teacher.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{teacher.name}</h2>
          <p className="text-sm opacity-60">{teacher.subject} 강사 • {teacher.joinDate}부터</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs px-2 py-1 bg-white/10 rounded-full">{teacher.email}</span>
            <span className="text-xs px-2 py-1 bg-white/10 rounded-full">{teacher.phone}</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <MetricBox 
          label="학생 유지율" 
          value={`${teacher.performance.studentRetention}%`}
          trend={teacher.performance.studentRetention >= 90 ? 'good' : 'warning'}
        />
        <MetricBox 
          label="태스크 완료" 
          value={`${teacher.performance.taskCompletion}%`}
          trend={teacher.performance.taskCompletion >= 85 ? 'good' : 'warning'}
        />
        <MetricBox 
          label="학부모 만족도" 
          value={`${teacher.performance.parentSatisfaction}/5`}
          trend={teacher.performance.parentSatisfaction >= 4.5 ? 'good' : 'warning'}
        />
        <MetricBox 
          label="주간 수업 시간" 
          value={`${teacher.schedule.weeklyHours}h`}
          trend="neutral"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button className="px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors min-h-[44px]">
          📋 태스크 배정
        </button>
        <button className="px-4 py-2.5 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors min-h-[44px]">
          💬 메시지 보내기
        </button>
        <button className="px-4 py-2.5 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors min-h-[44px]">
          📅 일정 조정
        </button>
        <button className="px-4 py-2.5 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors min-h-[44px]">
          📊 상세 리포트
        </button>
      </div>
    </ResponsiveCard>
  );
}

function MetricBox({ 
  label, 
  value, 
  trend 
}: { 
  label: string; 
  value: string;
  trend: 'good' | 'warning' | 'neutral';
}) {
  const colors = {
    good: 'text-emerald-500',
    warning: 'text-amber-500',
    neutral: '',
  };

  return (
    <div className="p-3 bg-white/5 rounded-xl text-center">
      <div className={`text-2xl font-bold ${colors[trend]}`}>{value}</div>
      <div className="text-xs opacity-50 mt-1">{label}</div>
    </div>
  );
}

export default ManagerTeacherPage;
