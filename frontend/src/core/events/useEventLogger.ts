/**
 * useEventLogger - React Hook
 *
 * 사용법:
 *   const { track, trackPageView, trackFeatureUsed } = useEventLogger();
 *   track('attendance.check_in', { class_id: '...', method: 'qr_scan' }, { studentId: '...' });
 *   trackPageView('dashboard');
 *   trackFeatureUsed('schedule', 'tap');
 */

import { useEffect, useRef, useCallback } from 'react';
import { EventStore, ActivityEventType, ActorRole } from './event-store';
import supabaseService from '../../services/supabase';

// 싱글톤 인스턴스 (앱 전체에서 하나)
let globalEventStore: EventStore | null = null;

function getEventStore(): EventStore {
  if (!globalEventStore) {
    const client = supabaseService.getSupabase();
    if (!client) throw new Error('Supabase client not configured');
    globalEventStore = new EventStore({
      supabase: client,
      appId: 'allthatbasket',
      brand: 'allthatbasket',
      flushInterval: 5000,
      maxBufferSize: 50,
    });
  }
  return globalEventStore;
}

// ============================================================
// Main Hook
// ============================================================

export function useEventLogger() {
  const store = useRef(getEventStore());

  // 컴포넌트 언마운트 시 플러시 (앱 종료는 EventStore 내부에서 처리)
  useEffect(() => {
    return () => {
      // 싱글톤이므로 destroy하지 않음. flush만.
      store.current.flush();
    };
  }, []);

  const track = useCallback((
    eventType: ActivityEventType,
    data?: Record<string, unknown>,
    options?: { studentId?: string; vIndexDelta?: number; source?: string }
  ) => {
    store.current.track(eventType, data || {}, options);
  }, []);

  const trackPageView = useCallback((page: string, extra?: Record<string, unknown>) => {
    store.current.trackPageView(page, extra);
  }, []);

  const trackFeatureUsed = useCallback((feature: string, action: string, extra?: Record<string, unknown>) => {
    store.current.trackFeatureUsed(feature, action, extra);
  }, []);

  const trackMenuTap = useCallback((menuItem: string) => {
    store.current.trackMenuTap(menuItem);
  }, []);

  const trackAttendance = useCallback((
    eventType: 'attendance.check_in' | 'attendance.check_out' | 'attendance.absent_marked',
    studentId: string,
    data: Record<string, unknown>
  ) => {
    store.current.trackAttendance(eventType, studentId, data);
  }, []);

  const trackPayment = useCallback((
    eventType: 'payment.completed' | 'payment.failed' | 'payment.overdue',
    studentId: string,
    data: Record<string, unknown>
  ) => {
    store.current.trackPayment(eventType, studentId, data);
  }, []);

  const trackSkill = useCallback((
    eventType: 'skill.assessed' | 'skill.improved' | 'skill.badge_earned',
    studentId: string,
    data: Record<string, unknown>
  ) => {
    store.current.trackSkill(eventType, studentId, data);
  }, []);

  // 조회 API
  const getCompletionRate = useCallback((days?: number) => {
    return store.current.getCompletionRate(days);
  }, []);

  const getChurnRiskStudents = useCallback((threshold?: number) => {
    return store.current.getChurnRiskStudents(threshold);
  }, []);

  const getParentReport = useCallback((studentId: string, days?: number) => {
    return store.current.getParentReport(studentId, days);
  }, []);

  const getFeatureUsage = useCallback(() => {
    return store.current.getFeatureUsage();
  }, []);

  const getStudentVIndex = useCallback((studentId: string) => {
    return store.current.getStudentVIndex(studentId);
  }, []);

  return {
    // 기록
    track,
    trackPageView,
    trackFeatureUsed,
    trackMenuTap,
    trackAttendance,
    trackPayment,
    trackSkill,
    // 조회
    getCompletionRate,
    getChurnRiskStudents,
    getParentReport,
    getFeatureUsage,
    getStudentVIndex,
    // 직접 접근 (필요시)
    store: store.current,
  };
}

// ============================================================
// Actor 설정 (로그인 후 1회 호출)
// ============================================================

export function setEventActor(actorId: string, role: ActorRole, coachId?: string): void {
  getEventStore().setActor(actorId, role, coachId);
}

// ============================================================
// 배럴 export
// ============================================================

export { EventStore } from './event-store';
export type { ActivityEventType, ActorRole, ActivityLog } from './event-store';
