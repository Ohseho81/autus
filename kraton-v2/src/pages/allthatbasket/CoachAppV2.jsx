import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConnected } from '../../lib/supabase';

/**
 * AUTUS Coach App - TodayScreen v2.0
 *
 * 스펙 준수 사항:
 * - Screen: TodayScreen 단 1개
 * - State Machine: SCHEDULED | IN_PROGRESS | COMPLETED
 * - PrimaryActionButton: START|END (동시 1개만)
 * - 금지 컴포넌트: TextInput, Checkbox, Rating, AttendanceMark, ParentContact, PaymentStatus, Memo
 * - Local Outbox: silent retry, UI 노출 없음
 * - Optimistic UI: 탭 반응 즉시
 */

// ============================================
// CONSTANTS & TYPES
// ============================================
const SESSION_STATE = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
};

// ============================================
// LOCAL OUTBOX (Coach Event Queue)
// ============================================
const OUTBOX_KEY = 'coach_event_outbox';

const createEventOutbox = () => {
  // Load from localStorage
  const loadQueue = () => {
    try {
      const saved = localStorage.getItem(OUTBOX_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveQueue = (queue) => {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('[Outbox] Save failed:', e);
    }
  };

  let queue = loadQueue();

  const enqueue = (event) => {
    const eventPayload = {
      event_id: crypto.randomUUID(),
      event_type: event.type,
      occurred_at: new Date().toISOString(),
      actor_type: 'COACH',
      actor_id: event.coach_id,
      org_id: event.org_id,
      academy_id: event.academy_id,
      session_id: event.session_id,
      idempotency_key: `${event.type}-${event.session_id}-${Date.now()}`,
      device_id: localStorage.getItem('device_id') || 'device_001',
      payload: event.payload || {}
    };
    queue.push(eventPayload);
    saveQueue(queue);
    // Silent sync - no UI feedback
    syncQueue();
    return eventPayload;
  };

  const syncQueue = async () => {
    if (!isSupabaseConnected() || queue.length === 0) return;

    const eventsToSync = [...queue];
    const synced = [];

    for (const event of eventsToSync) {
      try {
        const { error } = await supabase
          .from('atb_session_events')
          .insert({
            session_id: event.session_id,
            event_type: event.event_type.toLowerCase(),
            event_data: {
              ...event.payload,
              actor_id: event.actor_id,
              occurred_at: event.occurred_at
            },
            created_by: event.actor_id,
            idempotency_key: event.idempotency_key,
            device_info: { device_id: event.device_id }
          });

        if (!error) {
          synced.push(event.event_id);
          console.log('[Outbox] Synced:', event.event_type);
        }
      } catch (e) {
        console.log('[Outbox] Retry scheduled:', event.event_type);
      }
    }

    // Remove synced events
    queue = queue.filter(e => !synced.includes(e.event_id));
    saveQueue(queue);
  };

  // Auto-sync when online
  if (typeof window !== 'undefined') {
    window.addEventListener('online', syncQueue);
  }

  return { enqueue, syncQueue, getQueueSize: () => queue.length };
};

const eventOutbox = createEventOutbox();

// ============================================
// COMPONENTS
// ============================================

// HeaderBar: date, group_label, settings
const HeaderBar = ({ brandName }) => (
  <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center">
        <span className="text-xs font-bold">🏀</span>
      </div>
      <span className="font-semibold text-lg">{brandName}</span>
    </div>
    <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  </div>
);

// DateLocationSelector
const DateLocationSelector = ({ date, location, court }) => (
  <div className="bg-white border-b">
    <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
      <span className="text-gray-800 font-medium">
        {date} · {location}, {court}
      </span>
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
);

// Status Chip
const StatusChip = ({ state, hasWarning }) => {
  const configs = {
    [SESSION_STATE.SCHEDULED]: {
      bg: hasWarning ? 'bg-amber-100' : 'bg-blue-100',
      text: hasWarning ? 'text-amber-700' : 'text-blue-700',
      dot: hasWarning ? 'bg-amber-500' : 'bg-blue-500',
      label: '예정'
    },
    [SESSION_STATE.IN_PROGRESS]: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: '진행중'
    },
    [SESSION_STATE.COMPLETED]: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
      label: '완료'
    },
    'OFF': {
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      dot: 'bg-gray-400',
      label: 'OFF'
    }
  };

  const config = configs[state] || configs[SESSION_STATE.SCHEDULED];

  return (
    <div className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
      {config.label}
    </div>
  );
};

// Session Card
const SessionCard = ({
  session,
  isActive,
  onStart,
  onEnd,
  elapsedMinutes
}) => {
  const { time, name, state, court, courtStatus, studentCount, recording, warning, isOff, students } = session;

  const displayState = isOff ? 'OFF' : state;

  return (
    <div className={`bg-white rounded-xl mx-4 mb-3 p-4 shadow-sm border ${
      isActive ? 'border-green-200 bg-green-50/30' : 'border-gray-100'
    }`}>
      {/* Time & Class Name */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{time} {name}</h3>
        </div>
        <StatusChip state={displayState} hasWarning={!!warning} />
      </div>

      {/* In Progress Details */}
      {state === SESSION_STATE.IN_PROGRESS && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-green-700 font-semibold text-sm">진행중</span>
            <span className="text-gray-500">·</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">코트 {court}</span>
            <span className="text-gray-400">/</span>
            <span className="text-green-600">{courtStatus}</span>
            {recording && (
              <>
                <span className="text-gray-400">·</span>
                <span className="flex items-center gap-1 text-red-500">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  REC
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Student List (Read-only) */}
      {students && students.length > 0 && state !== SESSION_STATE.COMPLETED && (
        <div className="mb-3 bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2">학생 목록</p>
          <div className="flex flex-wrap gap-2">
            {students.map((student, idx) => (
              <span key={idx} className="text-sm bg-white px-2 py-1 rounded border border-gray-200">
                {student.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warning */}
      {warning && (
        <div className="flex items-center gap-2 mb-3 text-amber-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">{warning}</span>
        </div>
      )}

      {/* Court & Student Info */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {state === SESSION_STATE.IN_PROGRESS ? (
            <span>경과 {elapsedMinutes}분</span>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                코트 {court} {state === SESSION_STATE.SCHEDULED ? '예정' : ''}
              </span>
              <span className="text-gray-400 ml-2">학생 {studentCount}명</span>
            </>
          )}
        </div>

        {/* Primary Action Button - 동시 1개만 */}
        {state === SESSION_STATE.SCHEDULED && !isOff && (
          <button
            onClick={onStart}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors active:scale-95"
          >
            수업 시작
          </button>
        )}
        {state === SESSION_STATE.IN_PROGRESS && (
          <button
            onClick={onEnd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors active:scale-95"
          >
            수업 종료
          </button>
        )}
      </div>
    </div>
  );
};

// Now Indicator
const NowIndicator = () => (
  <div className="flex items-center justify-center py-3">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
      <span>지금</span>
    </div>
  </div>
);

// Incident Button (항상 하단)
const IncidentButton = ({ onPress, disabled }) => (
  <button
    onClick={onPress}
    disabled={disabled}
    className="mx-4 mb-4 w-[calc(100%-2rem)] py-3 border-2 border-red-200 text-red-600 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  >
    <span className="text-lg">🚨</span>
    사고 발생 신고
  </button>
);

// Bottom Navigation
const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'today', label: '오늘 일정', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
    { id: 'video', label: '영상 상태', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'settings', label: '설정', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )}
  ];

  return (
    <div className="bg-white border-t flex justify-around py-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center px-6 py-2 rounded-lg transition-colors ${
            activeTab === tab.id
              ? 'text-blue-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {tab.icon}
          <span className="text-xs mt-1 font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

// Incident Modal
const IncidentModal = ({ onClose, sessionId }) => {
  const handleComplete = () => {
    eventOutbox.enqueue({
      type: 'INCIDENT_RESOLVED',
      session_id: sessionId,
      coach_id: localStorage.getItem('coach_id') || 'coach_001',
      org_id: 'org_001',
      academy_id: 'academy_001'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚨</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">사고 대응 모드</h3>
          <p className="text-sm text-gray-500 mt-2">
            관리자에게 자동 알림이 전송되었습니다
          </p>
        </div>

        <div className="bg-red-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-700 leading-relaxed">
            • 학생 안전 확보 최우선<br/>
            • 필요시 119 신고<br/>
            • 상황 정리 후 처리 완료 버튼
          </p>
        </div>

        <button
          onClick={handleComplete}
          className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors active:scale-98"
        >
          사고 처리 완료
        </button>
      </div>
    </div>
  );
};

// Video Status Tab
const VideoStatusTab = () => (
  <div className="flex-1 overflow-y-auto p-4">
    <div className="bg-white rounded-xl p-6 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">영상 녹화 상태</h3>
      <p className="text-sm text-gray-500">진행 중인 수업의 녹화 상태를 확인합니다</p>
    </div>
  </div>
);

// Settings Tab
const SettingsTab = () => (
  <div className="flex-1 overflow-y-auto p-4">
    <div className="bg-white rounded-xl divide-y">
      <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50">
        <span className="text-gray-800">알림 설정</span>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50">
        <span className="text-gray-800">계정 정보</span>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50">
        <span className="text-gray-800">앱 버전</span>
        <span className="text-gray-400 text-sm">v2.0.0</span>
      </button>
    </div>
  </div>
);

// ============================================
// MAIN APP
// ============================================
const CoachAppV2 = () => {
  // State
  const [activeTab, setActiveTab] = useState('today');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Sessions data
  const [sessions, setSessions] = useState([]);

  // Format time helper
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:MM
  };

  // Format date helper
  const getFormattedDate = () => {
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${now.getMonth() + 1}/${now.getDate()} (${days[now.getDay()]})`;
  };

  // Load sessions from Supabase or demo data
  const loadSessions = useCallback(async () => {
    setIsLoading(true);

    if (isSupabaseConnected()) {
      try {
        const { data, error } = await supabase
          .from('atb_today_sessions')
          .select('*');

        if (!error && data && data.length > 0) {
          const mapped = data.map(s => ({
            id: s.id,
            time: formatTime(s.start_time),
            name: s.class_name,
            state: s.status === 'in_progress' ? SESSION_STATE.IN_PROGRESS :
                   s.status === 'completed' ? SESSION_STATE.COMPLETED :
                   SESSION_STATE.SCHEDULED,
            court: 'A',
            courtStatus: s.status === 'in_progress' ? '정상' : '예정',
            studentCount: s.total_students || 0,
            recording: s.recording_status === 'recording',
            warning: null,
            isOff: s.status === 'cancelled',
            can_start: s.status === 'scheduled',
            can_end: s.status === 'in_progress',
            started_at: s.started_at,
            students: [] // Will be loaded separately if needed
          }));
          setSessions(mapped);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error('[Coach] Load error:', e);
      }
    }

    // Demo data fallback
    setSessions([
      {
        id: 'session_001',
        time: '16:00',
        name: '농구 U12',
        state: SESSION_STATE.IN_PROGRESS,
        court: 'A',
        courtStatus: '정상',
        studentCount: 8,
        recording: true,
        warning: null,
        isOff: false,
        can_start: false,
        can_end: true,
        started_at: new Date(Date.now() - 18 * 60000).toISOString(),
        students: [
          { name: '김민준' }, { name: '이서연' }, { name: '박지호' },
          { name: '최예린' }, { name: '정우진' }, { name: '강하은' },
          { name: '조현우' }, { name: '윤서아' }
        ]
      },
      {
        id: 'session_002',
        time: '17:30',
        name: '농구 U15',
        state: SESSION_STATE.SCHEDULED,
        court: 'A',
        courtStatus: '예정',
        studentCount: 10,
        recording: false,
        warning: null,
        isOff: false,
        can_start: true,
        can_end: false,
        students: [
          { name: '김태현' }, { name: '이수빈' }, { name: '박준서' },
          { name: '최지원' }, { name: '정다은' }, { name: '강민재' },
          { name: '조서현' }, { name: '윤지민' }, { name: '장하율' }, { name: '임도윤' }
        ]
      },
      {
        id: 'session_003',
        time: '19:00',
        name: '농구 성인 초급',
        state: SESSION_STATE.SCHEDULED,
        court: 'A',
        courtStatus: '예정',
        studentCount: 6,
        recording: false,
        warning: null,
        isOff: true,
        can_start: false,
        can_end: false,
        students: []
      },
      {
        id: 'session_004',
        time: '20:30',
        name: '농구 성인',
        state: SESSION_STATE.SCHEDULED,
        court: 'B',
        courtStatus: '예정',
        studentCount: 6,
        recording: false,
        warning: '지각 위험: 시작 확인 필요',
        isOff: false,
        can_start: true,
        can_end: false,
        students: [
          { name: '홍길동' }, { name: '김철수' }, { name: '이영희' },
          { name: '박민수' }, { name: '최지영' }, { name: '정대호' }
        ]
      }
    ]);
    setIsLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Elapsed time counter for active session
  useEffect(() => {
    const activeSession = sessions.find(s => s.state === SESSION_STATE.IN_PROGRESS);
    if (activeSession?.started_at) {
      const startTime = new Date(activeSession.started_at).getTime();
      const updateElapsed = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 60000);
        setElapsedTime(elapsed);
      };
      updateElapsed();
      const timer = setInterval(updateElapsed, 60000);
      return () => clearInterval(timer);
    }
  }, [sessions]);

  // State Machine Transitions (Optimistic)
  const handleStart = useCallback(async (sessionId) => {
    const now = new Date().toISOString();

    // Optimistic UI update
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, state: SESSION_STATE.IN_PROGRESS, can_start: false, can_end: true, started_at: now }
        : s
    ));

    // Update DB
    if (isSupabaseConnected()) {
      try {
        await supabase
          .from('atb_sessions')
          .update({ status: 'in_progress', started_at: now })
          .eq('id', sessionId);
      } catch (e) {
        console.error('[Coach] Start error:', e);
      }
    }

    // Enqueue event to local outbox
    eventOutbox.enqueue({
      type: 'SESSION_START',
      session_id: sessionId,
      coach_id: localStorage.getItem('coach_id') || 'coach_001',
      org_id: 'org_001',
      academy_id: 'academy_001'
    });
  }, []);

  const handleEnd = useCallback(async (sessionId) => {
    const now = new Date().toISOString();

    // Optimistic UI update
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, state: SESSION_STATE.COMPLETED, can_start: false, can_end: false }
        : s
    ));

    // Update DB
    if (isSupabaseConnected()) {
      try {
        await supabase
          .from('atb_sessions')
          .update({ status: 'completed', ended_at: now })
          .eq('id', sessionId);
      } catch (e) {
        console.error('[Coach] End error:', e);
      }
    }

    // Enqueue event
    eventOutbox.enqueue({
      type: 'SESSION_END',
      session_id: sessionId,
      coach_id: localStorage.getItem('coach_id') || 'coach_001',
      org_id: 'org_001',
      academy_id: 'academy_001'
    });
  }, []);

  const handleIncident = useCallback(() => {
    const activeSession = sessions.find(s => s.state === SESSION_STATE.IN_PROGRESS);

    setShowIncidentModal(true);

    // Enqueue incident event
    eventOutbox.enqueue({
      type: 'INCIDENT_FLAG',
      session_id: activeSession?.id,
      coach_id: localStorage.getItem('coach_id') || 'coach_001',
      org_id: 'org_001',
      academy_id: 'academy_001'
    });
  }, [sessions]);

  const activeSession = sessions.find(s => s.state === SESSION_STATE.IN_PROGRESS);

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'video':
        return <VideoStatusTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return (
          <>
            {/* Session List */}
            <div className="flex-1 overflow-y-auto py-2">
              <NowIndicator />

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  오늘 예정된 수업이 없습니다
                </div>
              ) : (
                sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isActive={session.state === SESSION_STATE.IN_PROGRESS}
                    onStart={() => handleStart(session.id)}
                    onEnd={() => handleEnd(session.id)}
                    elapsedMinutes={session.state === SESSION_STATE.IN_PROGRESS ? elapsedTime : 0}
                  />
                ))
              )}
            </div>

            {/* Incident Button (항상 하단) */}
            <IncidentButton
              onPress={handleIncident}
              disabled={!activeSession}
            />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '812px' }}>

        {/* Header */}
        <HeaderBar brandName="올댓바스켓 코치" />

        {/* Date/Location Selector */}
        <DateLocationSelector
          date={getFormattedDate()}
          location="지점 A"
          court="코트 A"
        />

        {/* Tab Content */}
        {renderContent()}

        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Incident Modal */}
        {showIncidentModal && (
          <IncidentModal
            sessionId={activeSession?.id}
            onClose={() => setShowIncidentModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CoachAppV2;
