/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📴 오프라인 큐 매니저
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 네트워크 연결이 끊겼을 때 이벤트를 로컬에 저장하고,
 * 연결이 복구되면 자동으로 동기화합니다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

const QUEUE_KEY = '@offline_queue';
const MAX_RETRIES = 3;

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueuedEvent {
  id: string;
  type: 'attendance' | 'session_start' | 'session_end' | 'emergency';
  payload: Record<string, unknown>;
  timestamp: string;
  retries: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Queue Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 큐에 이벤트 추가
 */
export async function addToQueue(event: Omit<QueuedEvent, 'id' | 'timestamp' | 'retries'>): Promise<void> {
  const queue = await getQueue();
  
  const newEvent: QueuedEvent = {
    ...event,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    retries: 0,
  };
  
  queue.push(newEvent);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  if (__DEV__) console.log('[OfflineQueue] Event added:', newEvent.type);
}

/**
 * 큐 조회
 */
export async function getQueue(): Promise<QueuedEvent[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 큐에서 이벤트 제거
 */
export async function removeFromQueue(eventId: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(e => e.id !== eventId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

/**
 * 큐 전체 비우기
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sync Logic
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 오프라인 큐 동기화
 */
export async function syncQueue(): Promise<{ success: number; failed: number }> {
  const queue = await getQueue();
  let success = 0;
  let failed = 0;
  
  for (const event of queue) {
    try {
      const result = await processEvent(event);
      
      if (result.success) {
        await removeFromQueue(event.id);
        success++;
        if (__DEV__) console.log('[OfflineQueue] Synced:', event.type);
      } else {
        // 재시도 횟수 증가
        if (event.retries < MAX_RETRIES) {
          await updateEventRetry(event.id);
          failed++;
        } else {
          // 최대 재시도 초과 - 큐에서 제거
          await removeFromQueue(event.id);
          if (__DEV__) console.error('[OfflineQueue] Max retries exceeded:', event.id);
        }
      }
    } catch (error: unknown) {
      if (__DEV__) console.error('[OfflineQueue] Sync error:', error);
      failed++;
    }
  }
  
  return { success, failed };
}

/**
 * 이벤트 재시도 횟수 업데이트
 */
async function updateEventRetry(eventId: string): Promise<void> {
  const queue = await getQueue();
  const updated = queue.map(e => 
    e.id === eventId ? { ...e, retries: e.retries + 1 } : e
  );
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

/**
 * 이벤트 처리
 */
async function processEvent(event: QueuedEvent): Promise<{ success: boolean }> {
  switch (event.type) {
    case 'attendance':
      return processAttendance(event.payload as { sessionId: string; students: Array<{ id: string; status: 'present' | 'absent' }> });

    case 'session_start':
      return processSessionStart(event.payload as { sessionId: string; startedAt: string });

    case 'session_end':
      return processSessionEnd(event.payload as { sessionId: string; endedAt: string; attendanceStats: { present: number; absent: number; total: number } });

    case 'emergency':
      return processEmergency(event.payload as { sessionId?: string; staffId: string; message: string; location?: string });

    default:
      return { success: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Processors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 출석 기록 저장
 */
async function processAttendance(payload: {
  sessionId: string;
  students: Array<{ id: string; status: 'present' | 'absent' }>;
}): Promise<{ success: boolean }> {
  const { sessionId, students } = payload;
  
  const records = students.map(s => ({
    session_id: sessionId,
    student_id: s.id,
    attendance_status: s.status,
    checked_at: new Date().toISOString(),
  }));
  
  const { error } = await supabase
    .from('atb_session_students')
    .upsert(records, { onConflict: 'session_id,student_id' });
  
  return { success: !error };
}

/**
 * 세션 시작 처리
 */
async function processSessionStart(payload: {
  sessionId: string;
  startedAt: string;
}): Promise<{ success: boolean }> {
  const { sessionId, startedAt } = payload;
  
  // 1. 세션 상태 업데이트
  const { error: sessionError } = await supabase
    .from('atb_sessions')
    .update({ 
      status: 'in_progress',
      actual_start_time: startedAt,
    })
    .eq('id', sessionId);
  
  if (sessionError) return { success: false };
  
  // 2. 체인 반응 트리거 (학부모 알림 등)
  try {
    await supabase.functions.invoke('attendance-chain-reaction', {
      body: {
        session_id: sessionId,
        event_type: 'session_start',
        actions: ['send_parent_notification'],
      },
    });
  } catch (e: unknown) {
    if (__DEV__) console.warn('[OfflineQueue] Chain reaction failed:', e);
  }

  return { success: true };
}

/**
 * 세션 종료 처리
 */
async function processSessionEnd(payload: {
  sessionId: string;
  endedAt: string;
  attendanceStats: { present: number; absent: number; total: number };
}): Promise<{ success: boolean }> {
  const { sessionId, endedAt, attendanceStats } = payload;
  
  // 1. 세션 상태 업데이트
  const { error: sessionError } = await supabase
    .from('atb_sessions')
    .update({ 
      status: 'completed',
      actual_end_time: endedAt,
      attendance_count: attendanceStats.present,
    })
    .eq('id', sessionId);
  
  if (sessionError) return { success: false };
  
  // 2. 체인 반응 트리거
  try {
    await supabase.functions.invoke('attendance-chain-reaction', {
      body: {
        session_id: sessionId,
        event_type: 'session_end',
        attendance_stats: attendanceStats,
        actions: ['send_parent_notification', 'update_growth_log'],
      },
    });
  } catch (e: unknown) {
    if (__DEV__) console.warn('[OfflineQueue] Chain reaction failed:', e);
  }

  return { success: true };
}

/**
 * 긴급 신고 처리
 */
async function processEmergency(payload: {
  sessionId?: string;
  staffId: string;
  message: string;
  location?: string;
}): Promise<{ success: boolean }> {
  const { sessionId, staffId, message, location } = payload;
  
  // 1. 긴급 신고 기록
  const { error } = await supabase
    .from('atb_emergency_reports')
    .insert({
      session_id: sessionId,
      staff_id: staffId,
      message,
      location,
      status: 'pending',
      reported_at: new Date().toISOString(),
    });
  
  if (error) return { success: false };
  
  // 2. Edge Function으로 긴급 알림 발송
  try {
    await supabase.functions.invoke('emergency-alert', {
      body: {
        session_id: sessionId,
        staff_id: staffId,
        message,
        location,
      },
    });
  } catch (e: unknown) {
    if (__DEV__) console.warn('[OfflineQueue] Emergency alert failed:', e);
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Network Monitoring
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 네트워크 상태 확인
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

/**
 * 네트워크 복구 시 자동 동기화 리스너 설정
 */
export function setupAutoSync(onSync?: (result: { success: number; failed: number }) => void): () => void {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      const queue = await getQueue();
      if (queue.length > 0) {
        if (__DEV__) console.log('[OfflineQueue] Network restored, syncing...');
        const result = await syncQueue();
        onSync?.(result);
      }
    }
  });
  
  return unsubscribe;
}

export default {
  addToQueue,
  getQueue,
  removeFromQueue,
  clearQueue,
  syncQueue,
  isOnline,
  setupAutoSync,
};
