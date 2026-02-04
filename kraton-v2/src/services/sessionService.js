/**
 * 🏀 세션 서비스 - 강사 앱 API
 *
 * 핵심 기능:
 * - 오늘의 세션 조회
 * - 세션 시작/종료
 * - 이상 보고
 * - 오프라인 큐 처리
 */

import { supabase, isSupabaseConnected } from '../pages/allthatbasket/lib/supabase.js';
import { sendAbsentAlert } from './kakaoAlimtalk.js';

// ============================================
// 세션 상태
// ============================================
export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FLAGGED: 'flagged',
  CANCELLED: 'cancelled',
};

// ============================================
// 이벤트 타입
// ============================================
export const EVENT_TYPES = {
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  FLAG_REPORT: 'flag_report',
  ATTENDANCE_UPDATE: 'attendance_update',
};

// ============================================
// 오프라인 큐 (로컬 스토리지)
// ============================================
const OFFLINE_QUEUE_KEY = 'atb_offline_queue';

const getOfflineQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveOfflineQueue = (queue) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

const addToOfflineQueue = (event) => {
  const queue = getOfflineQueue();
  queue.push({
    ...event,
    id: crypto.randomUUID(),
    idempotency_key: `${event.event_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    client_created_at: new Date().toISOString(),
  });
  saveOfflineQueue(queue);
  return queue;
};

// ============================================
// 데모 데이터 (Supabase 미연결 시)
// ============================================
const getDemoSessions = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const isMWF = [1, 3, 5].includes(dayOfWeek);
  const isTT = [2, 4].includes(dayOfWeek);

  const allClasses = [
    { id: 'class_1', name: '유아 기초반', time: '15:00', duration: 50, days: '월수금' },
    { id: 'class_2', name: '초저 기초반', time: '16:00', duration: 60, days: '월수금' },
    { id: 'class_3', name: '초고 심화반', time: '17:00', duration: 60, days: '월수금' },
    { id: 'class_4', name: '중등 기초반', time: '18:00', duration: 90, days: '월수금' },
    { id: 'class_5', name: '유아 심화반', time: '15:00', duration: 50, days: '화목' },
    { id: 'class_6', name: '걸스 클럽', time: '16:00', duration: 60, days: '화목' },
  ];

  const students = {
    class_1: [
      { id: 101, name: '김민서' }, { id: 102, name: '이서준' },
      { id: 103, name: '박지안' }, { id: 104, name: '최예린' },
      { id: 105, name: '정하윤' }, { id: 106, name: '강민준' },
      { id: 107, name: '조서연' }, { id: 108, name: '윤지호' },
    ],
    class_2: [
      { id: 201, name: '최여찬' }, { id: 202, name: '송은호' },
      { id: 203, name: '김한준' }, { id: 204, name: '이선우' },
      { id: 205, name: '최원준' }, { id: 206, name: '안도윤' },
      { id: 207, name: '박서현' }, { id: 208, name: '정재원' },
      { id: 209, name: '황시우' }, { id: 210, name: '임하린' },
    ],
    class_3: [
      { id: 301, name: '김태현' }, { id: 302, name: '이준혁' },
      { id: 303, name: '박민재' }, { id: 304, name: '정우진' },
      { id: 305, name: '최성민' }, { id: 306, name: '강지훈' },
      { id: 307, name: '조현우' }, { id: 308, name: '윤서진' },
    ],
    class_4: [
      { id: 401, name: '김지효' }, { id: 402, name: '박서연' },
      { id: 403, name: '이도현' }, { id: 404, name: '정민규' },
      { id: 405, name: '최서윤' }, { id: 406, name: '강현서' },
    ],
    class_5: [
      { id: 501, name: '오예준' }, { id: 502, name: '신지우' },
      { id: 503, name: '유하은' }, { id: 504, name: '노시현' },
      { id: 505, name: '문도윤' },
    ],
    class_6: [
      { id: 601, name: '한소율' }, { id: 602, name: '백지민' },
      { id: 603, name: '임서아' }, { id: 604, name: '양하린' },
      { id: 605, name: '권수빈' }, { id: 606, name: '조은서' },
    ],
  };

  return allClasses
    .filter(c => (c.days === '월수금' && isMWF) || (c.days === '화목' && isTT))
    .map(c => ({
      id: `session_${c.id}_${today.toISOString().split('T')[0]}`,
      class_id: c.id,
      class_name: c.name,
      session_date: today.toISOString().split('T')[0],
      start_time: c.time,
      duration_minutes: c.duration,
      status: SESSION_STATUS.SCHEDULED,
      students: students[c.id] || [],
      total_students: (students[c.id] || []).length,
      present_count: 0,
      absent_count: 0,
      recording_status: null,
      started_at: null,
      ended_at: null,
    }));
};

// ============================================
// 세션 서비스 API
// ============================================
export const sessionService = {
  // 오늘의 세션 조회
  async getTodaySessions(coachId = null) {
    if (!isSupabaseConnected()) {
      console.log('[Session] 로컬 모드 - 데모 데이터 사용');
      return { data: getDemoSessions(), error: null };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 세션이 없으면 자동 생성
      await this.ensureTodaySessions();

      let query = supabase
        .from('atb_today_sessions')
        .select('*');

      if (coachId) {
        query = query.eq('coach_id', coachId);
      }

      const { data: sessions, error } = await query;

      if (error) throw error;

      // 각 세션별 학생 목록 조회
      const sessionsWithStudents = await Promise.all(
        (sessions || []).map(async (session) => {
          const { data: students } = await supabase
            .from('atb_session_students')
            .select('*')
            .eq('session_id', session.id);

          return {
            ...session,
            students: students || [],
          };
        })
      );

      return { data: sessionsWithStudents, error: null };
    } catch (error) {
      console.error('[Session] 조회 실패:', error);
      return { data: getDemoSessions(), error };
    }
  },

  // 오늘 세션 자동 생성 (수업 일정 기반)
  async ensureTodaySessions() {
    if (!isSupabaseConnected()) return;

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const todayName = dayNames[dayOfWeek];

    // 오늘 해당하는 수업 조회
    const { data: classes } = await supabase
      .from('atb_classes')
      .select('*')
      .eq('status', 'active')
      .ilike('schedule_days', `%${todayName}%`);

    if (!classes || classes.length === 0) return;

    // 이미 생성된 세션 확인
    const { data: existingSessions } = await supabase
      .from('atb_sessions')
      .select('class_id')
      .eq('session_date', today);

    const existingClassIds = (existingSessions || []).map(s => s.class_id);

    // 없는 세션 생성
    const newSessions = classes
      .filter(c => !existingClassIds.includes(c.id))
      .map(c => ({
        class_id: c.id,
        session_date: today,
        start_time: c.schedule_time,
        duration_minutes: c.duration_minutes,
        status: SESSION_STATUS.SCHEDULED,
      }));

    if (newSessions.length > 0) {
      await supabase.from('atb_sessions').insert(newSessions);
    }
  },

  // 세션 시작
  async startSession(sessionId, coachName = null) {
    const event = {
      event_type: EVENT_TYPES.SESSION_START,
      session_id: sessionId,
      created_by: coachName,
      event_data: { timestamp: new Date().toISOString() },
    };

    if (!isSupabaseConnected()) {
      console.log('[Session] 로컬 모드 - 시작 이벤트 큐 저장');
      addToOfflineQueue(event);
      return { success: true, offline: true };
    }

    try {
      // 세션 상태 업데이트
      const { error: updateError } = await supabase
        .from('atb_sessions')
        .update({
          status: SESSION_STATUS.IN_PROGRESS,
          started_at: new Date().toISOString(),
          recording_status: 'recording',
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // 이벤트 기록
      await supabase.from('atb_session_events').insert(event);

      // 전체 출석 처리
      await this.markAllPresent(sessionId);

      return { success: true };
    } catch (error) {
      console.error('[Session] 시작 실패:', error);
      addToOfflineQueue(event);
      return { success: true, offline: true, error };
    }
  },

  // 세션 종료
  async endSession(sessionId, coachName = null) {
    const event = {
      event_type: EVENT_TYPES.SESSION_END,
      session_id: sessionId,
      created_by: coachName,
      event_data: { timestamp: new Date().toISOString() },
    };

    if (!isSupabaseConnected()) {
      console.log('[Session] 로컬 모드 - 종료 이벤트 큐 저장');
      addToOfflineQueue(event);
      return { success: true, offline: true };
    }

    try {
      const { error } = await supabase
        .from('atb_sessions')
        .update({
          status: SESSION_STATUS.COMPLETED,
          ended_at: new Date().toISOString(),
          recording_status: 'saved',
        })
        .eq('id', sessionId);

      if (error) throw error;

      await supabase.from('atb_session_events').insert(event);

      return { success: true };
    } catch (error) {
      console.error('[Session] 종료 실패:', error);
      addToOfflineQueue(event);
      return { success: true, offline: true, error };
    }
  },

  // 이상 보고
  async reportFlag(sessionId, flagData, coachName = null) {
    const { flagType, studentIds, note } = flagData;

    const event = {
      event_type: EVENT_TYPES.FLAG_REPORT,
      session_id: sessionId,
      created_by: coachName,
      event_data: { flagType, studentIds, note, timestamp: new Date().toISOString() },
    };

    if (!isSupabaseConnected()) {
      console.log('[Session] 로컬 모드 - 이상보고 큐 저장');
      addToOfflineQueue(event);
      return { success: true, offline: true };
    }

    try {
      // 이상 보고 저장
      const flagReports = studentIds.map(studentId => ({
        session_id: sessionId,
        student_id: studentId,
        flag_type: flagType,
        note,
        status: 'pending',
      }));

      await supabase.from('atb_flag_reports').insert(flagReports);

      // 세션 상태 업데이트
      await supabase
        .from('atb_sessions')
        .update({ status: SESSION_STATUS.FLAGGED })
        .eq('id', sessionId);

      // 이벤트 기록
      await supabase.from('atb_session_events').insert(event);

      // 결석인 경우 출석 상태 업데이트 + 알림 발송
      if (flagType === 'absent') {
        await this.markAbsent(sessionId, studentIds);
        
        // 결석 학생에게 알림 발송
        await this.sendAbsentNotifications(sessionId, studentIds);
      }

      return { success: true };
    } catch (error) {
      console.error('[Session] 이상보고 실패:', error);
      addToOfflineQueue(event);
      return { success: true, offline: true, error };
    }
  },

  // 전체 출석 처리
  async markAllPresent(sessionId) {
    if (!isSupabaseConnected()) return;

    try {
      // 세션 정보 조회
      const { data: session } = await supabase
        .from('atb_sessions')
        .select('class_id, session_date')
        .eq('id', sessionId)
        .single();

      if (!session) return;

      // 해당 수업의 학생 조회
      const { data: enrollments } = await supabase
        .from('atb_enrollments')
        .select('student_id')
        .eq('class_id', session.class_id)
        .eq('status', 'active');

      if (!enrollments || enrollments.length === 0) return;

      // 출석 기록 생성
      const attendanceRecords = enrollments.map(e => ({
        student_id: e.student_id,
        class_id: session.class_id,
        attendance_date: session.session_date,
        status: 'present',
        check_in_time: new Date().toISOString(),
      }));

      await supabase
        .from('atb_attendance')
        .upsert(attendanceRecords, { onConflict: 'student_id,class_id,attendance_date' });

      // 세션 출석 수 업데이트
      await supabase
        .from('atb_sessions')
        .update({
          total_students: enrollments.length,
          present_count: enrollments.length,
          absent_count: 0,
        })
        .eq('id', sessionId);

    } catch (error) {
      console.error('[Session] 전체 출석 처리 실패:', error);
    }
  },

  // 결석 처리
  async markAbsent(sessionId, studentIds) {
    if (!isSupabaseConnected()) return;

    try {
      const { data: session } = await supabase
        .from('atb_sessions')
        .select('class_id, session_date')
        .eq('id', sessionId)
        .single();

      if (!session) return;

      // 결석 상태로 업데이트
      for (const studentId of studentIds) {
        await supabase
          .from('atb_attendance')
          .upsert({
            student_id: studentId,
            class_id: session.class_id,
            attendance_date: session.session_date,
            status: 'absent',
          }, { onConflict: 'student_id,class_id,attendance_date' });
      }

      // 세션 출석 수 업데이트
      const { data: currentSession } = await supabase
        .from('atb_sessions')
        .select('present_count, absent_count')
        .eq('id', sessionId)
        .single();

      if (currentSession) {
        await supabase
          .from('atb_sessions')
          .update({
            present_count: currentSession.present_count - studentIds.length,
            absent_count: currentSession.absent_count + studentIds.length,
          })
          .eq('id', sessionId);
      }

    } catch (error) {
      console.error('[Session] 결석 처리 실패:', error);
    }
  },

  // 결석 알림 발송
  async sendAbsentNotifications(sessionId, studentIds) {
    if (!isSupabaseConnected()) return;

    try {
      // 세션 정보 조회
      const { data: session } = await supabase
        .from('atb_sessions')
        .select(`
          class_id,
          session_date,
          class:class_id(name)
        `)
        .eq('id', sessionId)
        .single();

      if (!session) return;

      // 학생 정보 조회
      const { data: students } = await supabase
        .from('atb_students')
        .select('id, name, parent_phone')
        .in('id', studentIds);

      if (!students || students.length === 0) return;

      // 각 학생에게 알림 발송
      for (const student of students) {
        if (student.parent_phone) {
          try {
            await sendAbsentAlert({
              studentName: student.name,
              parentPhone: student.parent_phone,
              className: session.class?.name || '수업',
              date: session.session_date,
              withMakeupButton: true,
              makeupLink: `${window.location.origin}/#makeup?student=${student.id}`,
            });
            console.log(`[Notification] 결석 알림 발송: ${student.name}`);
          } catch (e) {
            console.error(`[Notification] 알림 발송 실패: ${student.name}`, e);
          }
        }
      }
    } catch (error) {
      console.error('[Session] 결석 알림 발송 실패:', error);
    }
  },

  // 오프라인 큐 동기화
  async syncOfflineQueue() {
    if (!isSupabaseConnected()) return { synced: 0, pending: getOfflineQueue().length };

    const queue = getOfflineQueue();
    if (queue.length === 0) return { synced: 0, pending: 0 };

    let synced = 0;
    const failedEvents = [];

    for (const event of queue) {
      try {
        // 이벤트 타입별 처리
        switch (event.event_type) {
          case EVENT_TYPES.SESSION_START:
            await this.startSession(event.session_id, event.created_by);
            break;
          case EVENT_TYPES.SESSION_END:
            await this.endSession(event.session_id, event.created_by);
            break;
          case EVENT_TYPES.FLAG_REPORT:
            await this.reportFlag(event.session_id, event.event_data, event.created_by);
            break;
        }
        synced++;
      } catch (error) {
        console.error('[Sync] 이벤트 동기화 실패:', event, error);
        failedEvents.push(event);
      }
    }

    // 실패한 이벤트만 큐에 남김
    saveOfflineQueue(failedEvents);

    return { synced, pending: failedEvents.length };
  },

  // 오프라인 큐 상태 확인
  getOfflineQueueStatus() {
    const queue = getOfflineQueue();
    return {
      count: queue.length,
      events: queue,
    };
  },
};

export default sessionService;
