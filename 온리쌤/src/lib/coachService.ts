/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏀 Coach Service - Supabase 연동
 * Spec v3.0 FREEZE - 3 Events Only
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import personalAIService from '../services/PersonalAIService';
import { env } from '../config/env';

// ═══════════════════════════════════════════════════════════════════════════════
// Utils (외부 의존성 없이)
// ═══════════════════════════════════════════════════════════════════════════════

// UUID 생성
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// 네트워크 상태 체크 (fetch 기반)
const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    await fetch(`${env.supabase.url}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Types (Spec v3.0 FREEZE)
// ═══════════════════════════════════════════════════════════════════════════════

export type SessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
export type EventType = 'SESSION_START' | 'SESSION_END' | 'INCIDENT_FLAG';

export interface LessonSession {
  id: string;
  name: string;
  location: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  status: SessionStatus;
  student_count: number;
  attendance_count: number;
  elapsed_minutes: number;
  actual_start_time?: string;
  actual_end_time?: string;
  coach_id?: string;
  class_id?: string;
}

export interface CoachEvent {
  id: string;
  event_type: EventType;
  session_id: string;
  coach_id?: string;
  idempotency_key: string;
  metadata?: {
    incident_type?: string;
    description?: string;
    [key: string]: unknown;
  };
  actor_type: 'COACH';
  occurred_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Local Event Outbox (오프라인 지원)
// ═══════════════════════════════════════════════════════════════════════════════

const OUTBOX_KEY = '@coach_event_outbox';

export const EventOutbox = {
  async getQueue(): Promise<CoachEvent[]> {
    try {
      const data = await AsyncStorage.getItem(OUTBOX_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async enqueue(event: CoachEvent): Promise<void> {
    const queue = await this.getQueue();
    // 중복 체크 (멱등성)
    const exists = queue.some(e => e.idempotency_key === event.idempotency_key);
    if (!exists) {
      queue.push(event);
      await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
    }
  },

  async dequeue(eventId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(e => e.id !== eventId);
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(filtered));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(OUTBOX_KEY);
  },

  async syncToServer(): Promise<{ success: number; failed: number }> {
    const queue = await this.getQueue();
    let success = 0;
    let failed = 0;

    for (const event of queue) {
      try {
        const { error } = await supabase
          .from('atb_session_events')
          .upsert({
            id: event.id,
            event_type: event.event_type,
            session_id: event.session_id,
            coach_id: event.coach_id,
            idempotency_key: event.idempotency_key,
            metadata: event.metadata,
            actor_type: event.actor_type,
            occurred_at: event.occurred_at,
          }, {
            onConflict: 'idempotency_key'
          });

        if (!error) {
          await this.dequeue(event.id);
          success++;
        } else {
          if (__DEV__) console.error('Sync error:', error);
          failed++;
        }
      } catch (err: unknown) {
        if (__DEV__) console.error('Sync exception:', err);
        failed++;
      }
    }

    return { success, failed };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Coach Service
// ═══════════════════════════════════════════════════════════════════════════════

export const CoachService = {
  // 오늘의 수업 목록 조회
  async getTodaySessions(coachId?: string): Promise<LessonSession[]> {
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('atb_lesson_sessions')
      .select('*')
      .eq('session_date', today)
      .order('start_time', { ascending: true });

    if (coachId) {
      query = query.eq('coach_id', coachId);
    }

    const { data, error } = await query;

    if (error) {
      if (__DEV__) console.error('Error fetching sessions:', error);
      return [];
    }

    return data || [];
  },

  // 세션 시작 (Spec v3.0 - EVENT 1)
  async startSession(sessionId: string, coachId?: string): Promise<boolean> {
    const event: CoachEvent = {
      id: generateUUID(),
      event_type: 'SESSION_START',
      session_id: sessionId,
      coach_id: coachId,
      idempotency_key: `START-${sessionId}-${Date.now()}`,
      actor_type: 'COACH',
      occurred_at: new Date().toISOString(),
    };

    // 항상 로컬에 먼저 저장 (오프라인 지원)
    await EventOutbox.enqueue(event);

    // 네트워크 상태 확인 후 즉시 동기화 시도
    const isConnected = await checkNetworkConnection();
    if (isConnected) {
      await EventOutbox.syncToServer();
    }

    // Personal AI 로그
    try {
      await personalAIService.logEvent('SESSION_START', { classId: sessionId, coachId });
    } catch { /* ignore */ }

    return true;
  },

  // 세션 종료 (Spec v3.0 - EVENT 2)
  async endSession(sessionId: string, coachId?: string): Promise<boolean> {
    const event: CoachEvent = {
      id: generateUUID(),
      event_type: 'SESSION_END',
      session_id: sessionId,
      coach_id: coachId,
      idempotency_key: `END-${sessionId}-${Date.now()}`,
      actor_type: 'COACH',
      occurred_at: new Date().toISOString(),
    };

    await EventOutbox.enqueue(event);

    const isConnected = await checkNetworkConnection();
    if (isConnected) {
      await EventOutbox.syncToServer();
    }

    // Personal AI 로그
    try {
      await personalAIService.logEvent('SESSION_END', { classId: sessionId, coachId });
    } catch { /* ignore */ }

    return true;
  },

  // 사고 신고 (Spec v3.0 - EVENT 3)
  async reportIncident(
    sessionId: string,
    incidentType: string,
    description?: string,
    coachId?: string
  ): Promise<boolean> {
    const event: CoachEvent = {
      id: generateUUID(),
      event_type: 'INCIDENT_FLAG',
      session_id: sessionId,
      coach_id: coachId,
      idempotency_key: `INCIDENT-${sessionId}-${Date.now()}`,
      metadata: {
        incident_type: incidentType,
        description: description,
      },
      actor_type: 'COACH',
      occurred_at: new Date().toISOString(),
    };

    await EventOutbox.enqueue(event);

    const isConnected = await checkNetworkConnection();
    if (isConnected) {
      await EventOutbox.syncToServer();
    }

    return true;
  },

  // 오프라인 큐 동기화
  async syncOfflineEvents(): Promise<{ success: number; failed: number }> {
    return EventOutbox.syncToServer();
  },

  // 대기 중인 이벤트 수 조회
  async getPendingEventCount(): Promise<number> {
    const queue = await EventOutbox.getQueue();
    return queue.length;
  },

  // Optimistic UI를 위한 로컬 세션 상태 업데이트
  getOptimisticSession(
    session: LessonSession,
    eventType: EventType
  ): LessonSession {
    switch (eventType) {
      case 'SESSION_START':
        return {
          ...session,
          status: 'IN_PROGRESS',
          actual_start_time: new Date().toISOString(),
        };
      case 'SESSION_END':
        return {
          ...session,
          status: 'COMPLETED',
          actual_end_time: new Date().toISOString(),
        };
      default:
        return session;
    }
  }
};

export default CoachService;
