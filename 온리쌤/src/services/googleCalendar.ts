/**
 * googleCalendar.ts
 * 구글 캘린더 연동 서비스
 * - 수업 일정 캘린더 동기화
 * - 학부모/코치 캘린더 초대
 * - 일정 변경 자동 업데이트
 */

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { env } from '../config/env';
import { EXTERNAL_APIS } from '../config/api-endpoints';

// OAuth 완료 후 브라우저 닫기
WebBrowser.maybeCompleteAuthSession();

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'accepted' | 'declined' | 'tentative';
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  colorId?: string;
  recurrence?: string[];
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

export interface LessonSlot {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  coach_id: string;
  coach_name?: string;
  location?: string;
  max_count: number;
  current_count?: number;
  students?: Array<{
    id: string;
    name: string;
    parent_email?: string;
  }>;
}

export interface CalendarSyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 OAuth 설정
// ═══════════════════════════════════════════════════════════════════════════════

const GOOGLE_CLIENT_ID = env.services.google.clientId;
const GOOGLE_WEB_CLIENT_ID = env.services.google.webClientId;
const CALENDAR_SCOPES = EXTERNAL_APIS.google.auth.scopes;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔑 인증 관리
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Google OAuth 훅 (React 컴포넌트에서 사용)
 */
export const useGoogleCalendarAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: CALENDAR_SCOPES,
  });

  return { request, response, promptAsync };
};

/**
 * 액세스 토큰 저장
 */
export const saveGoogleTokens = async (
  userId: string,
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number
) => {
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from('user_oauth_tokens')
    .upsert({
      user_id: userId,
      provider: 'google_calendar',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    if (__DEV__) console.error('토큰 저장 실패:', error);
    throw error;
  }
};

/**
 * 저장된 토큰 가져오기
 */
export const getGoogleTokens = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .single();

  if (error || !data) return null;

  // 토큰 만료 확인
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // TODO: refresh token으로 갱신
    return null;
  }

  return data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 캘린더 API
// ═══════════════════════════════════════════════════════════════════════════════

const CALENDAR_API_BASE = EXTERNAL_APIS.google.calendar;

/**
 * API 요청 헬퍼
 */
const calendarFetch = async (
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
) => {
  const response = await fetch(`${CALENDAR_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Calendar API 오류');
  }

  return response.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏀 수업 이벤트 관리
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 수업 일정을 캘린더 이벤트로 변환
 */
export const lessonToCalendarEvent = (
  lesson: LessonSlot,
  includeAttendees: boolean = true
): CalendarEvent => {
  // 시간 포맷팅 (date: "2026-02-03", start_time: "15:00")
  const startDateTime = `${lesson.date}T${lesson.start_time}:00`;
  const endDateTime = `${lesson.date}T${lesson.end_time}:00`;

  const event: CalendarEvent = {
    summary: `🏀 ${lesson.name}`,
    description: [
      `코치: ${lesson.coach_name || '미정'}`,
      `정원: ${lesson.current_count || 0}/${lesson.max_count}명`,
      '',
      '온리쌤에서 생성된 일정입니다.',
    ].join('\n'),
    location: lesson.location || '농구장',
    start: {
      dateTime: startDateTime,
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Asia/Seoul',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },    // 1시간 전
        { method: 'popup', minutes: 30 },    // 30분 전
      ],
    },
    colorId: '6', // 오렌지 (농구 테마)
    extendedProperties: {
      private: {
        app: 'onlyssam',
        lesson_id: lesson.id,
        coach_id: lesson.coach_id,
      },
    },
  };

  // 학부모 이메일 초대 (선택)
  if (includeAttendees && lesson.students) {
    event.attendees = lesson.students
      .filter(s => s.parent_email)
      .map(s => ({
        email: s.parent_email!,
        displayName: `${s.name} 학부모님`,
        responseStatus: 'needsAction',
      }));
  }

  return event;
};

/**
 * 캘린더에 수업 일정 생성
 */
export const createLessonEvent = async (
  accessToken: string,
  lesson: LessonSlot,
  sendInvites: boolean = true
): Promise<CalendarSyncResult> => {
  try {
    const event = lessonToCalendarEvent(lesson, sendInvites);

    const result = await calendarFetch(
      `/calendars/primary/events?sendUpdates=${sendInvites ? 'all' : 'none'}`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify(event),
      }
    );

    // 동기화 기록 저장
    await supabase.from('calendar_sync_logs').insert({
      lesson_slot_id: lesson.id,
      google_event_id: result.id,
      action: 'create',
      success: true,
    });

    return { success: true, eventId: result.id };
  } catch (error: unknown) {
    if (__DEV__) console.error('캘린더 이벤트 생성 실패:', error);

    await supabase.from('calendar_sync_logs').insert({
      lesson_slot_id: lesson.id,
      action: 'create',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });

    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * 캘린더 이벤트 업데이트
 */
export const updateLessonEvent = async (
  accessToken: string,
  eventId: string,
  lesson: LessonSlot
): Promise<CalendarSyncResult> => {
  try {
    const event = lessonToCalendarEvent(lesson);

    await calendarFetch(
      `/calendars/primary/events/${eventId}?sendUpdates=all`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify(event),
      }
    );

    await supabase.from('calendar_sync_logs').insert({
      lesson_slot_id: lesson.id,
      google_event_id: eventId,
      action: 'update',
      success: true,
    });

    return { success: true, eventId };
  } catch (error: unknown) {
    if (__DEV__) console.error('캘린더 이벤트 업데이트 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * 캘린더 이벤트 삭제
 */
export const deleteLessonEvent = async (
  accessToken: string,
  eventId: string
): Promise<CalendarSyncResult> => {
  try {
    await calendarFetch(
      `/calendars/primary/events/${eventId}?sendUpdates=all`,
      accessToken,
      { method: 'DELETE' }
    );

    return { success: true };
  } catch (error: unknown) {
    if (__DEV__) console.error('캘린더 이벤트 삭제 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 일괄 동기화
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 특정 기간 수업 일괄 동기화
 */
export const syncLessonsToCalendar = async (
  accessToken: string,
  startDate: string,
  endDate: string,
  coachId?: string
): Promise<{ created: number; updated: number; errors: number }> => {
  let query = supabase
    .from('lesson_slots')
    .select(`
      *,
      coach:profiles!coach_id(name),
      enrollments:lesson_enrollments(
        student:students(id, name, parent_email)
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  if (coachId) {
    query = query.eq('coach_id', coachId);
  }

  const { data: lessons, error } = await query;

  if (error || !lessons) {
    throw new Error('수업 데이터 조회 실패');
  }

  const results = { created: 0, updated: 0, errors: 0 };

  for (const lesson of lessons) {
    // 기존 동기화 기록 확인
    const { data: syncLog } = await supabase
      .from('calendar_sync_logs')
      .select('google_event_id')
      .eq('lesson_slot_id', lesson.id)
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const formattedLesson: LessonSlot = {
      ...lesson,
      coach_name: lesson.coach?.name,
      students: lesson.enrollments?.map((e: { student: unknown }) => e.student) || [],
    };

    let result: CalendarSyncResult;

    if (syncLog?.google_event_id) {
      // 업데이트
      result = await updateLessonEvent(accessToken, syncLog.google_event_id, formattedLesson);
      if (result.success) results.updated++;
    } else {
      // 새로 생성
      result = await createLessonEvent(accessToken, formattedLesson);
      if (result.success) results.created++;
    }

    if (!result.success) results.errors++;
  }

  return results;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 반복 수업 (정기 레슨)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 정기 수업 반복 이벤트 생성
 */
export const createRecurringLessonEvent = async (
  accessToken: string,
  lesson: LessonSlot,
  recurrenceRule: string // 예: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12'
): Promise<CalendarSyncResult> => {
  try {
    const event = lessonToCalendarEvent(lesson);
    event.recurrence = [recurrenceRule];

    const result = await calendarFetch(
      '/calendars/primary/events?sendUpdates=all',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify(event),
      }
    );

    return { success: true, eventId: result.id };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * 반복 규칙 생성 헬퍼
 */
export const createRecurrenceRule = (options: {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  days?: Array<'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'>;
  count?: number;
  until?: string; // YYYYMMDD 형식
}): string => {
  let rule = `RRULE:FREQ=${options.frequency}`;

  if (options.days && options.days.length > 0) {
    rule += `;BYDAY=${options.days.join(',')}`;
  }

  if (options.count) {
    rule += `;COUNT=${options.count}`;
  } else if (options.until) {
    rule += `;UNTIL=${options.until}`;
  }

  return rule;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 편의 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 오늘 일정 가져오기
 */
export const getTodayEvents = async (accessToken: string) => {
  const today = new Date().toISOString().split('T')[0];
  const timeMin = `${today}T00:00:00+09:00`;
  const timeMax = `${today}T23:59:59+09:00`;

  const result = await calendarFetch(
    `/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
    accessToken
  );

  return result.items || [];
};

/**
 * 이번 주 일정 가져오기
 */
export const getWeekEvents = async (accessToken: string) => {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const endOfWeek = new Date(now.setDate(now.getDate() + 6));

  const timeMin = startOfWeek.toISOString();
  const timeMax = endOfWeek.toISOString();

  const result = await calendarFetch(
    `/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
    accessToken
  );

  return result.items || [];
};

export default {
  useGoogleCalendarAuth,
  saveGoogleTokens,
  getGoogleTokens,
  createLessonEvent,
  updateLessonEvent,
  deleteLessonEvent,
  syncLessonsToCalendar,
  createRecurringLessonEvent,
  createRecurrenceRule,
  getTodayEvents,
  getWeekEvents,
};
