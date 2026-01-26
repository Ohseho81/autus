/**
 * Supabase Realtime 훅
 * 
 * 실시간 데이터 구독 + 알림 처리
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase/client';

// ============================================
// Realtime 구독 훅
// ============================================
export function useRealtimeSubscription(table, options = {}) {
  const {
    event = '*', // INSERT, UPDATE, DELETE, *
    filter = null,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
  } = options;

  const [lastEvent, setLastEvent] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!supabase) {
      console.warn('[Realtime] Supabase 미설정 - Mock 모드');
      return;
    }

    // 채널 생성
    const channelName = `realtime:${table}:${Date.now()}`;
    let channel = supabase.channel(channelName);

    // 필터 설정
    const subscriptionConfig = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    // 이벤트 핸들러
    channel = channel.on('postgres_changes', subscriptionConfig, (payload) => {
      console.log(`[Realtime] ${table}:`, payload.eventType, payload);
      
      setLastEvent({
        type: payload.eventType,
        data: payload.new || payload.old,
        timestamp: new Date().toISOString(),
      });

      // 콜백 실행
      onChange?.(payload);
      
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload.new);
          break;
        case 'UPDATE':
          onUpdate?.(payload.new, payload.old);
          break;
        case 'DELETE':
          onDelete?.(payload.old);
          break;
      }
    });

    // 구독 시작
    channel.subscribe((status) => {
      console.log(`[Realtime] ${table} 구독 상태:`, status);
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, event, filter, onInsert, onUpdate, onDelete, onChange]);

  return { lastEvent, isConfigured: isSupabaseConfigured };
}

// ============================================
// 학생 실시간 구독
// ============================================
export function useRealtimeStudents(onStudentChange) {
  const [updates, setUpdates] = useState([]);

  const handleChange = useCallback((payload) => {
    const update = {
      id: Date.now(),
      type: payload.eventType,
      student: payload.new || payload.old,
      timestamp: new Date(),
    };
    
    setUpdates(prev => [update, ...prev].slice(0, 50)); // 최근 50개만 유지
    onStudentChange?.(update);
  }, [onStudentChange]);

  const { lastEvent } = useRealtimeSubscription('students', {
    event: '*',
    onChange: handleChange,
  });

  return { updates, lastEvent };
}

// ============================================
// 위험 알림 실시간 구독
// ============================================
export function useRealtimeRiskAlerts(onAlert) {
  const [alerts, setAlerts] = useState([]);

  const handleInsert = useCallback((newRisk) => {
    const alert = {
      id: newRisk.id || Date.now(),
      student_name: newRisk.student_name,
      state: newRisk.state,
      signals: newRisk.signals || [],
      timestamp: new Date(),
    };
    
    setAlerts(prev => [alert, ...prev].slice(0, 20));
    onAlert?.(alert);
  }, [onAlert]);

  useRealtimeSubscription('risks', {
    event: 'INSERT',
    onInsert: handleInsert,
  });

  // Mock 모드: 시뮬레이션
  useEffect(() => {
    if (isSupabaseConfigured) return;

    // 랜덤 알림 시뮬레이션 (30초~2분 간격)
    const simulateAlert = () => {
      const mockNames = ['김민수', '이지은', '박서연', '최준혁', '정다은'];
      const mockSignals = ['연속 결석', '성적 하락', '학부모 민원', '과제 미제출'];
      
      const alert = {
        id: Date.now(),
        student_name: mockNames[Math.floor(Math.random() * mockNames.length)],
        state: Math.floor(Math.random() * 2) + 5, // 5 or 6
        signals: [mockSignals[Math.floor(Math.random() * mockSignals.length)]],
        timestamp: new Date(),
      };

      setAlerts(prev => [alert, ...prev].slice(0, 20));
      onAlert?.(alert);
    };

    // 초기 딜레이 후 시작
    const timeout = setTimeout(() => {
      const interval = setInterval(simulateAlert, 60000 + Math.random() * 60000);
      return () => clearInterval(interval);
    }, 30000);

    return () => clearTimeout(timeout);
  }, [onAlert]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return { alerts, clearAlerts };
}

// ============================================
// 활동 피드 실시간 구독
// ============================================
export function useRealtimeActivities() {
  const [activities, setActivities] = useState([]);

  const handleInsert = useCallback((newActivity) => {
    setActivities(prev => [newActivity, ...prev].slice(0, 30));
  }, []);

  useRealtimeSubscription('activities', {
    event: 'INSERT',
    onInsert: handleInsert,
  });

  // Mock 모드: 시뮬레이션
  useEffect(() => {
    if (isSupabaseConfigured) return;

    const mockActivities = [
      { type: 'alert', message: '김민수 State 변경', delta_v: -0.3 },
      { type: 'success', message: '리포트 자동 발송', delta_v: 0.2 },
      { type: 'payment', message: '결제 완료', delta_v: 0.1 },
      { type: 'standard', message: '새 표준 승인', delta_v: 0.5 },
    ];

    const interval = setInterval(() => {
      const mock = mockActivities[Math.floor(Math.random() * mockActivities.length)];
      const activity = {
        id: Date.now(),
        ...mock,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(),
      };
      setActivities(prev => [activity, ...prev].slice(0, 30));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return { activities };
}

// ============================================
// Presence (온라인 상태)
// ============================================
export function usePresence(userId, userMeta = {}) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.entries(state).map(([key, value]) => ({
          id: key,
          ...value[0],
        }));
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] 접속:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] 퇴장:', key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...userMeta,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, userMeta]);

  return { onlineUsers };
}

export default {
  useRealtimeSubscription,
  useRealtimeStudents,
  useRealtimeRiskAlerts,
  useRealtimeActivities,
  usePresence,
};
