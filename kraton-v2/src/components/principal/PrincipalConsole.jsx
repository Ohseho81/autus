/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👔 KRATON Principal Console
 * 관리자용 위험 알림 대시보드
 * 학원장/지점장급이 실시간으로 현장 상황을 파악하고 즉시 대응
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudents, useSupabaseQuery } from '../../hooks/useSupabaseData';

// ============================================
// MOCK DATA GENERATORS
// ============================================

const generateAlerts = () => [
  {
    id: 'ALT-001',
    type: 'churn_risk',
    priority: 'critical',
    title: '즉시 개입 필요',
    message: '오연우 학생 이탈 징후 - 3회 연속 결석, 학부모 앱 미접속 7일',
    target: { type: 'student', name: '오연우', id: 'STU-2013' },
    teacher: { name: '이선생', id: 'TCH-007' },
    metrics: { sIndex: 0.32, churnProb: 0.78, daysToChurn: 14 },
    suggestedAction: '48시간 내 학부모 상담 전화 필수',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'open',
  },
  {
    id: 'ALT-002',
    type: 'payment_issue',
    priority: 'high',
    title: '수강료 미납',
    message: '김민지 학생 수강료 2개월 연체 - 총 ₩640,000',
    target: { type: 'student', name: '김민지', id: 'STU-1087' },
    teacher: { name: '박선생', id: 'TCH-003' },
    metrics: { overdueAmount: 640000, overdueDays: 62 },
    suggestedAction: '분납 제안 또는 휴원 안내',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'open',
  },
  {
    id: 'ALT-003',
    type: 'satisfaction_drop',
    priority: 'high',
    title: '만족도 급락',
    message: '이준혁 학생 s-Index 2주간 -25% 하락',
    target: { type: 'student', name: '이준혁', id: 'STU-0892' },
    teacher: { name: '최선생', id: 'TCH-012' },
    metrics: { sIndex: 0.45, sIndexDelta: -0.25, period: '2주' },
    suggestedAction: '담당 선생님 면담 및 수업 방식 조정',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'in_progress',
  },
  {
    id: 'ALT-004',
    type: 'chemistry_mismatch',
    priority: 'medium',
    title: '케미 부조화',
    message: '선생님-학생 상성 점수 낮음 - 변경 고려 필요',
    target: { type: 'student', name: '박서윤', id: 'STU-1456' },
    teacher: { name: '정선생', id: 'TCH-009' },
    metrics: { chemistryScore: -0.42, optimalMatch: '김선생' },
    suggestedAction: '담당 선생님 변경 검토',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: 'open',
  },
  {
    id: 'ALT-005',
    type: 'parent_concern',
    priority: 'medium',
    title: '학부모 우려 감지',
    message: '장현우 학부모 - 비용 관련 민감 키워드 3회 언급',
    target: { type: 'parent', name: '장현우 어머니', id: 'PAR-0567' },
    teacher: { name: '이선생', id: 'TCH-007' },
    metrics: { concernType: '비용', mentionCount: 3 },
    suggestedAction: '장학금/할인 프로그램 안내',
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    status: 'open',
  },
];

const generateTodayStats = () => ({
  totalStudents: 245,
  attendanceRate: 0.94,
  avgSIndex: 0.72,
  activeAlerts: 5,
  resolvedToday: 3,
  upcomingCalls: 4,
  vIndexToday: 12500000,
  vIndexDelta: 0.08,
});

const generateTeacherStatus = () => [
  { id: 'TCH-001', name: '김선생', status: 'teaching', students: 18, avgS: 0.82, alerts: 0 },
  { id: 'TCH-003', name: '박선생', status: 'available', students: 15, avgS: 0.75, alerts: 1 },
  { id: 'TCH-007', name: '이선생', status: 'teaching', students: 22, avgS: 0.68, alerts: 2 },
  { id: 'TCH-009', name: '정선생', status: 'break', students: 12, avgS: 0.58, alerts: 1 },
  { id: 'TCH-012', name: '최선생', status: 'teaching', students: 20, avgS: 0.71, alerts: 1 },
];

const generateScheduledCalls = () => [
  { id: 1, time: '14:00', target: '오연우 어머니', type: 'urgent', reason: '이탈 방지 상담' },
  { id: 2, time: '15:30', target: '김민지 어머니', type: 'payment', reason: '수강료 상담' },
  { id: 3, time: '16:00', target: '이준혁 아버지', type: 'feedback', reason: '정기 피드백' },
  { id: 4, time: '17:30', target: '박서윤 어머니', type: 'general', reason: '담당 변경 안내' },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (value) => {
  if (value >= 1e6) return `₩${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `₩${(value / 1e3).toFixed(0)}K`;
  return `₩${value.toLocaleString()}`;
};

const formatTime = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000 / 60);
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return date.toLocaleDateString('ko-KR');
};

const getPriorityConfig = (priority) => ({
  critical: { color: 'red', bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', label: '긴급' },
  high: { color: 'orange', bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', label: '높음' },
  medium: { color: 'yellow', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', label: '보통' },
  low: { color: 'gray', bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400', label: '낮음' },
}[priority]);

const getAlertTypeConfig = (type) => ({
  churn_risk: { icon: '🚨', label: '이탈 위험' },
  payment_issue: { icon: '💳', label: '결제 문제' },
  satisfaction_drop: { icon: '📉', label: '만족도 하락' },
  chemistry_mismatch: { icon: '⚗️', label: '케미 부조화' },
  parent_concern: { icon: '👪', label: '학부모 우려' },
}[type] || { icon: '⚠️', label: '알림' });

// ============================================
// SUB COMPONENTS
// ============================================

// 오늘의 요약 통계
const TodayStats = memo(function TodayStats({ stats }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">재원생</span>
          <span className="text-2xl">👨‍🎓</span>
        </div>
        <p className="text-2xl font-bold text-white">{stats.totalStudents}명</p>
        <p className="text-emerald-400 text-xs">출석률 {(stats.attendanceRate * 100).toFixed(0)}%</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">평균 만족도</span>
          <span className="text-2xl">😊</span>
        </div>
        <p className={`text-2xl font-bold ${stats.avgSIndex >= 0.7 ? 'text-emerald-400' : 'text-yellow-400'}`}>
          {(stats.avgSIndex * 100).toFixed(0)}%
        </p>
        <p className="text-gray-500 text-xs">전체 s-Index</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">활성 알림</span>
          <span className="text-2xl">🔔</span>
        </div>
        <p className={`text-2xl font-bold ${stats.activeAlerts > 3 ? 'text-red-400' : 'text-cyan-400'}`}>
          {stats.activeAlerts}건
        </p>
        <p className="text-emerald-400 text-xs">오늘 해결: {stats.resolvedToday}건</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">오늘 V-Index</span>
          <span className="text-2xl">💎</span>
        </div>
        <p className="text-2xl font-bold text-cyan-400">{formatCurrency(stats.vIndexToday)}</p>
        <p className={`text-xs ${stats.vIndexDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {stats.vIndexDelta >= 0 ? '+' : ''}{(stats.vIndexDelta * 100).toFixed(1)}% vs 어제
        </p>
      </div>
    </div>
  );
});

// 알림 카드
const AlertCard = memo(function AlertCard({ alert, onAction, selected, onClick }) {
  const priority = getPriorityConfig(alert.priority);
  const alertType = getAlertTypeConfig(alert.type);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected
          ? `${priority.bg} ${priority.border}`
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{alertType.icon}</span>
          <div>
            <p className="text-white font-medium">{alert.title}</p>
            <p className="text-gray-500 text-xs">{alertType.label} · {formatTime(alert.createdAt)}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-lg text-xs ${priority.bg} ${priority.text} ${priority.border} border`}>
          {priority.label}
        </span>
      </div>

      <p className="text-gray-300 text-sm mb-3">{alert.message}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-gray-700/50 rounded text-gray-400">
            👤 {alert.target.name}
          </span>
          <span className="px-2 py-1 bg-gray-700/50 rounded text-gray-400">
            🎓 {alert.teacher.name}
          </span>
        </div>
        {alert.status === 'open' && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(alert.id, 'acknowledge'); }}
            className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs hover:bg-cyan-500/30 transition-colors"
          >
            확인
          </button>
        )}
      </div>
    </motion.div>
  );
});

// 알림 상세 패널
const AlertDetailPanel = memo(function AlertDetailPanel({ alert, onAction }) {
  if (!alert) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <span className="text-4xl mb-4 block">👈</span>
          <p>알림을 선택하면 상세 정보가 표시됩니다</p>
        </div>
      </div>
    );
  }

  const priority = getPriorityConfig(alert.priority);
  const alertType = getAlertTypeConfig(alert.type);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-xl ${priority.bg} border ${priority.border}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{alertType.icon}</span>
          <div>
            <h3 className="text-white font-bold text-lg">{alert.title}</h3>
            <p className={`${priority.text} text-sm`}>{alertType.label}</p>
          </div>
        </div>
        <p className="text-gray-300">{alert.message}</p>
      </div>

      {/* Target Info */}
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <h4 className="text-white font-medium mb-3">대상 정보</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs mb-1">{alert.target.type === 'student' ? '학생' : '학부모'}</p>
            <p className="text-white">{alert.target.name}</p>
            <p className="text-gray-500 text-xs">{alert.target.id}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">담당 선생님</p>
            <p className="text-white">{alert.teacher.name}</p>
            <p className="text-gray-500 text-xs">{alert.teacher.id}</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <h4 className="text-white font-medium mb-3">핵심 지표</h4>
        <div className="space-y-2">
          {alert.metrics.sIndex !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400">s-Index</span>
              <span className={`font-mono ${alert.metrics.sIndex < 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                {(alert.metrics.sIndex * 100).toFixed(0)}%
              </span>
            </div>
          )}
          {alert.metrics.churnProb !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400">이탈 확률</span>
              <span className="text-red-400 font-mono">{(alert.metrics.churnProb * 100).toFixed(0)}%</span>
            </div>
          )}
          {alert.metrics.daysToChurn !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400">예상 이탈일</span>
              <span className="text-yellow-400 font-mono">{alert.metrics.daysToChurn}일 후</span>
            </div>
          )}
          {alert.metrics.overdueAmount !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400">미납 금액</span>
              <span className="text-red-400 font-mono">{formatCurrency(alert.metrics.overdueAmount)}</span>
            </div>
          )}
          {alert.metrics.chemistryScore !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400">케미 점수</span>
              <span className="text-red-400 font-mono">{(alert.metrics.chemistryScore * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Action */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30">
        <h4 className="text-cyan-400 font-medium mb-2 flex items-center gap-2">
          <span>💡</span> AI 권장 액션
        </h4>
        <p className="text-white">{alert.suggestedAction}</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onAction(alert.id, 'call')}
          className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <span>📞</span> 전화 연결
        </button>
        <button
          onClick={() => onAction(alert.id, 'message')}
          className="p-3 bg-blue-500/20 text-blue-400 rounded-xl font-medium hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <span>💬</span> 메시지 전송
        </button>
        <button
          onClick={() => onAction(alert.id, 'assign')}
          className="p-3 bg-purple-500/20 text-purple-400 rounded-xl font-medium hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <span>👤</span> 담당자 배정
        </button>
        <button
          onClick={() => onAction(alert.id, 'resolve')}
          className="p-3 bg-gray-500/20 text-gray-400 rounded-xl font-medium hover:bg-gray-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <span>✓</span> 해결 완료
        </button>
      </div>
    </div>
  );
});

// 선생님 현황
const TeacherStatusPanel = memo(function TeacherStatusPanel({ teachers }) {
  return (
    <div className="space-y-2">
      {teachers.map(teacher => (
        <div key={teacher.id} className="p-3 bg-gray-800/50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              teacher.status === 'teaching' ? 'bg-emerald-400' :
              teacher.status === 'available' ? 'bg-cyan-400' :
              'bg-yellow-400'
            }`} />
            <div>
              <p className="text-white font-medium">{teacher.name}</p>
              <p className="text-gray-500 text-xs">
                {teacher.status === 'teaching' ? '수업 중' :
                 teacher.status === 'available' ? '대기 중' : '휴식 중'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-center">
              <p className="text-white">{teacher.students}명</p>
              <p className="text-gray-600">담당</p>
            </div>
            <div className="text-center">
              <p className={teacher.avgS >= 0.7 ? 'text-emerald-400' : 'text-yellow-400'}>
                {(teacher.avgS * 100).toFixed(0)}%
              </p>
              <p className="text-gray-600">s-Index</p>
            </div>
            {teacher.alerts > 0 && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg">
                {teacher.alerts}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

// 예정된 전화 목록
const ScheduledCalls = memo(function ScheduledCalls({ calls }) {
  const getCallTypeStyle = (type) => ({
    urgent: 'bg-red-500/20 text-red-400',
    payment: 'bg-orange-500/20 text-orange-400',
    feedback: 'bg-blue-500/20 text-blue-400',
    general: 'bg-gray-500/20 text-gray-400',
  }[type]);

  return (
    <div className="space-y-2">
      {calls.map(call => (
        <div key={call.id} className="p-3 bg-gray-800/50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-mono text-sm">{call.time}</span>
            <div>
              <p className="text-white">{call.target}</p>
              <p className="text-gray-500 text-xs">{call.reason}</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs ${getCallTypeStyle(call.type)}`}>
            {call.type === 'urgent' ? '긴급' :
             call.type === 'payment' ? '수납' :
             call.type === 'feedback' ? '피드백' : '일반'}
          </span>
        </div>
      ))}
    </div>
  );
});

// 빠른 액션 버튼들
const QuickActions = memo(function QuickActions({ onAction }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onAction('broadcast')}
        className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-cyan-500/50 transition-all text-left"
      >
        <span className="text-2xl mb-2 block">📢</span>
        <p className="text-white font-medium">전체 공지</p>
        <p className="text-gray-500 text-xs">학부모/선생님에게 메시지</p>
      </button>
      <button
        onClick={() => onAction('report')}
        className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-cyan-500/50 transition-all text-left"
      >
        <span className="text-2xl mb-2 block">📊</span>
        <p className="text-white font-medium">일일 보고서</p>
        <p className="text-gray-500 text-xs">오늘의 통계 요약</p>
      </button>
      <button
        onClick={() => onAction('schedule')}
        className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-cyan-500/50 transition-all text-left"
      >
        <span className="text-2xl mb-2 block">📅</span>
        <p className="text-white font-medium">상담 예약</p>
        <p className="text-gray-500 text-xs">학부모 상담 일정 관리</p>
      </button>
      <button
        onClick={() => onAction('emergency')}
        className="p-4 bg-red-500/10 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-all text-left"
      >
        <span className="text-2xl mb-2 block">🚨</span>
        <p className="text-red-400 font-medium">긴급 대응</p>
        <p className="text-gray-500 text-xs">위기 상황 프로토콜</p>
      </button>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function PrincipalConsole() {
  // Supabase hooks
  const { data: students, loading: studentsLoading, isLive: studentsLive } = useStudents();
  const { data: coaches, loading: coachesLoading, isLive: coachesLive } = useSupabaseQuery('atb_coaches', {
    select: '*',
    fallback: [],
  });

  const isLive = studentsLive || coachesLive;

  // Transform students into alerts
  const liveAlerts = useMemo(() => {
    if (!students || students.length === 0) return null;
    const alertStudents = students.filter(s => s.riskLevel === 'warning' || s.riskLevel === 'high' || s.riskLevel === 'critical');
    if (alertStudents.length === 0) return null;

    return alertStudents.map((s, idx) => {
      const priorityMap = { critical: 'critical', high: 'high', warning: 'medium' };
      const typeMap = {
        critical: 'churn_risk',
        high: 'satisfaction_drop',
        warning: 'parent_concern',
      };
      return {
        id: `ALT-LIVE-${s.id || idx}`,
        type: typeMap[s.riskLevel] || 'satisfaction_drop',
        priority: priorityMap[s.riskLevel] || 'medium',
        title: s.riskLevel === 'critical' ? '즉시 개입 필요' :
               s.riskLevel === 'high' ? '만족도 급락' : '모니터링 필요',
        message: `${s.name} - 참여도 ${s.engagement_score || 0}%, V-Index ${s.vIndex || 0}`,
        target: { type: 'student', name: s.name || `Student`, id: s.id || `STU-${idx}` },
        teacher: { name: '담당미정', id: 'TCH-000' },
        metrics: {
          sIndex: (s.engagement_score || 70) / 100,
          churnProb: s.riskLevel === 'critical' ? 0.78 : s.riskLevel === 'high' ? 0.45 : 0.20,
          daysToChurn: s.riskLevel === 'critical' ? 14 : s.riskLevel === 'high' ? 45 : 90,
        },
        suggestedAction: s.riskLevel === 'critical'
          ? '48시간 내 학부모 상담 전화 필수'
          : '담당 선생님 면담 및 수업 방식 조정',
        createdAt: new Date(Date.now() - (idx * 1000 * 60 * 30)).toISOString(),
        status: 'open',
      };
    });
  }, [students]);

  // Transform students into today stats
  const liveTodayStats = useMemo(() => {
    if (!students || students.length === 0) return null;
    const active = students.filter(s => s.status === 'active');
    const avgEngagement = active.length > 0
      ? active.reduce((sum, s) => sum + (s.engagement_score || 70), 0) / active.length
      : 72;
    const warningCount = students.filter(s => s.riskLevel === 'warning' || s.riskLevel === 'high' || s.riskLevel === 'critical').length;
    const totalVIndex = students.reduce((sum, s) => sum + (s.vIndex || 0), 0);

    return {
      totalStudents: students.length,
      attendanceRate: 0.94,
      avgSIndex: avgEngagement / 100,
      activeAlerts: warningCount,
      resolvedToday: 0,
      upcomingCalls: 4,
      vIndexToday: totalVIndex,
      vIndexDelta: 0.08,
    };
  }, [students]);

  // Transform coaches into teacher status
  const liveTeachers = useMemo(() => {
    if (!coaches || coaches.length === 0) return null;
    return coaches.map(c => ({
      id: c.id || c.coach_id || 'TCH-000',
      name: c.name || 'Unknown',
      status: c.status || 'available',
      students: c.student_count || 0,
      avgS: (c.avg_satisfaction || 70) / 100,
      alerts: c.alert_count || 0,
    }));
  }, [coaches]);

  // Use live data when available, fallback to mock
  const [alerts, setAlerts] = useState(generateAlerts);
  const [todayStats, setTodayStats] = useState(generateTodayStats);
  const [teachers, setTeachers] = useState(generateTeacherStatus);
  const [scheduledCalls] = useState(generateScheduledCalls);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filter, setFilter] = useState('all');

  // Sync live data into state when available
  useEffect(() => {
    if (liveAlerts && liveAlerts.length > 0) {
      setAlerts(liveAlerts);
    }
  }, [liveAlerts]);

  useEffect(() => {
    if (liveTodayStats) {
      setTodayStats(liveTodayStats);
    }
  }, [liveTodayStats]);

  useEffect(() => {
    if (liveTeachers && liveTeachers.length > 0) {
      setTeachers(liveTeachers);
    }
  }, [liveTeachers]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return alerts;
    if (filter === 'critical') return alerts.filter(a => a.priority === 'critical');
    if (filter === 'open') return alerts.filter(a => a.status === 'open');
    return alerts;
  }, [alerts, filter]);

  // Handle actions
  const handleAlertAction = useCallback((alertId, action) => {
    console.log(`Action: ${action} on alert: ${alertId}`);
    
    if (action === 'resolve') {
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, status: 'resolved' } : a
      ));
      setSelectedAlert(null);
    } else if (action === 'acknowledge') {
      setAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, status: 'in_progress' } : a
      ));
    }
  }, []);

  const handleQuickAction = useCallback((action) => {
    console.log(`Quick action: ${action}`);
  }, []);

  // Count critical alerts
  const criticalCount = useMemo(() => 
    alerts.filter(a => a.priority === 'critical' && a.status === 'open').length,
    [alerts]
  );

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">👔</span>
              Principal Console
              {isLive && <span className="text-xs font-normal bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">🟢 LIVE</span>}
            </h1>
            <p className="text-gray-400 mt-1">관리자 위험 알림 대시보드</p>
          </div>
          
          {criticalCount > 0 && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-2"
            >
              <span className="text-red-400 text-xl">🚨</span>
              <span className="text-red-400 font-bold">{criticalCount}건의 긴급 알림</span>
            </motion.div>
          )}
        </div>

        {/* Today Stats */}
        <TodayStats stats={todayStats} />

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Alerts List */}
          <div className="col-span-2 space-y-4">
            {/* Filter */}
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: '전체' },
                { id: 'critical', label: '긴급' },
                { id: 'open', label: '미처리' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === f.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="ml-auto text-gray-500 text-sm">
                {filteredAlerts.length}건의 알림
              </span>
            </div>

            {/* Alerts */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              <AnimatePresence>
                {filteredAlerts.map(alert => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                  >
                    <AlertCard
                      alert={alert}
                      selected={selectedAlert?.id === alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      onAction={handleAlertAction}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Alert Detail */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4">알림 상세</h3>
              <AlertDetailPanel 
                alert={selectedAlert} 
                onAction={handleAlertAction}
              />
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-cyan-400">⚡</span>
                빠른 액션
              </h3>
              <QuickActions onAction={handleQuickAction} />
            </div>

            {/* Teacher Status */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-emerald-400">🎓</span>
                선생님 현황
              </h3>
              <TeacherStatusPanel teachers={teachers} />
            </div>

            {/* Scheduled Calls */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-purple-400">📞</span>
                오늘의 상담 일정
              </h3>
              <ScheduledCalls calls={scheduledCalls} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
