/**
 * recordTeacherService.ts
 * 기록선생 (온리쌤의 핵심 정체성) — 출결선생(Presence Truth) 연동
 * 수업 결과 로그(노션+유튜브)를 학생별로 누적 → 클론의 데이터 레이어
 *
 * "로그를 모아서 클론을 만든다"
 *
 * IOO Trace:
 *   Input: 출결선생 출석 완료 / 코치 수업 기록
 *   Operation: lesson_records 생성 (5대 로그)
 *   Output: 학생 포트폴리오 업데이트 + events 로그
 *
 * Pattern: paySSAMService.ts 동일 (functional service)
 */

import { supabase } from '../lib/supabase';
import { captureError } from '../lib/sentry';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

/** 5대 로그 유형 (클론에 필요한 데이터) */
export type LogType =
  | 'movement'      // 움직임 — 유튜브 비공개 링크
  | 'observation'   // 관찰 — 노션 피드백
  | 'frequency'     // 빈도 — 출결선생 출석
  | 'persistence'   // 지속 — 결제선생 수납
  | 'pattern';      // 패턴 — 상담선생 스케줄

/** 수업 기록 생성 요청 */
export interface CreateLessonRecordRequest {
  studentId: string;
  orgId?: string;
  lessonDate: string;               // 'YYYY-MM-DD'
  logType: LogType;
  youtubeUrl?: string;              // 비공개 링크
  notionUrl?: string;               // 노션 페이지 링크
  coachFeedback?: string;           // 코치 한줄 피드백
  performanceScore?: number;        // 0~100
  metadata?: Record<string, unknown>;
  attendanceEventId?: string;       // 출석 이벤트 연결
}

/** 수업 기록 생성 결과 */
export interface CreateRecordResult {
  success: boolean;
  recordId?: string;
  dedupeKey?: string;
  error?: { code: string; message: string };
}

/** 학생 포트폴리오 */
export interface StudentPortfolio {
  studentId: string;
  totalRecords: number;
  academyCount: number;
  firstRecord: string | null;
  lastRecord: string | null;
  recordSpanDays: number;
  byType: {
    movement: number;
    observation: number;
    frequency: number;
    persistence: number;
    pattern: number;
  };
  mediaCount: {
    youtube: number;
    notion: number;
  };
  avgPerformance: number | null;
  cloneReadinessScore: number;   // 0~5 (각 로그 타입 존재 시 +1)
  cloneReady: boolean;           // 5대 로그 모두 존재
  records: LessonRecordRow[];
}

/** 포트폴리오 통계 */
export interface PortfolioStats {
  totalRecords: number;
  avgPerformance: number | null;
  cloneReadinessScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

/** 미디어 업데이트 결과 */
export interface UpdateMediaResult {
  success: boolean;
  error?: { code: string; message: string };
}

/** Supabase lesson_records 레코드 */
export interface LessonRecordRow {
  id: string;
  student_id: string;
  org_id: string;
  lesson_date: string;
  log_type: LogType;
  youtube_url: string | null;
  notion_url: string | null;
  coach_feedback: string | null;
  performance_score: number | null;
  metadata: Record<string, unknown>;
  attendance_event_id: string | null;
  dedupe_key: string;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ 설정
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 헬퍼
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 기록선생 설정 확인
 * DB 기반이므로 항상 true
 */
export const isConfigured = (): boolean => {
  return true;
};

/**
 * 중복 방지 키 생성
 * Format: RECORD-{orgId}-{studentId}-{YYYYMMDD}-{seq}
 */
const generateDedupeKey = (
  orgId: string,
  studentId: string,
  lessonDate: string,
  logType: LogType
): string => {
  const dateStr = lessonDate.replace(/-/g, '');
  return `RECORD-${orgId}-${studentId}-${dateStr}-${logType}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 수업 기록 생성 (IOO: Operation)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 수업 기록 생성 — 클론의 원재료 1건 추가
 */
export const createLessonRecord = async (
  request: CreateLessonRecordRequest
): Promise<CreateRecordResult> => {
  const orgId = request.orgId || DEFAULT_ORG_ID;
  const dedupeKey = generateDedupeKey(orgId, request.studentId, request.lessonDate, request.logType);

  try {
    // 1) 중복 체크
    const { data: existing } = await supabase
      .from('lesson_records')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .single();

    if (existing) {
      return {
        success: true,
        recordId: existing.id,
        dedupeKey,
        error: { code: 'DUPLICATE', message: '이미 동일한 기록이 존재합니다.' },
      };
    }

    // 2) lesson_records INSERT
    const { data: record, error } = await supabase
      .from('lesson_records')
      .insert({
        student_id: request.studentId,
        org_id: orgId,
        lesson_date: request.lessonDate,
        log_type: request.logType,
        youtube_url: request.youtubeUrl || null,
        notion_url: request.notionUrl || null,
        coach_feedback: request.coachFeedback || null,
        performance_score: request.performanceScore ?? null,
        metadata: request.metadata || {},
        attendance_event_id: request.attendanceEventId || null,
        dedupe_key: dedupeKey,
      })
      .select('id')
      .single();

    if (error) throw error;

    // 3) events 테이블에 IOO Trace 로그
    await supabase.from('events').insert({
      org_id: orgId,
      type: 'lesson_record_created',
      entity_id: request.studentId,
      value: request.performanceScore || 0,
      status: 'completed',
      source: request.attendanceEventId ? 'webhook' : 'manual',
      idempotency_key: `RECORD-EVENT-${dedupeKey}`,
    });

    return {
      success: true,
      recordId: record.id,
      dedupeKey,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    captureError(error instanceof Error ? error : new Error(errMsg), { context: 'recordTeacher_create' });
    return {
      success: false,
      error: { code: 'CREATE_FAILED', message: errMsg },
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 출석 이벤트 기반 자동 생성
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 출결선생 출석 이벤트 → 빈도 로그 자동 생성
 * attendance-chain-reaction Edge Function에서 호출
 */
export const createRecordFromAttendance = async (
  attendanceEventId: string,
  studentId: string,
  orgId: string = DEFAULT_ORG_ID,
  youtubeUrl?: string,
  notionUrl?: string
): Promise<CreateRecordResult> => {
  const today = new Date().toISOString().split('T')[0];

  return createLessonRecord({
    studentId,
    orgId,
    lessonDate: today,
    logType: 'frequency',
    youtubeUrl,
    notionUrl,
    attendanceEventId,
    metadata: {
      source: 'attendance_chain_reaction',
      attendance_event_id: attendanceEventId,
    },
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 학생 포트폴리오 조회 (크로스 org 가능)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 학생별 포트폴리오 조회 — 학생이 커널, org를 초월
 */
export const getStudentPortfolio = async (
  studentId: string,
  orgId?: string,
  limit: number = 100
): Promise<StudentPortfolio> => {
  try {
    let query = supabase
      .from('lesson_records')
      .select('*')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
      .limit(limit);

    // orgId 지정 시 해당 학원만
    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data: records, error } = await query;
    if (error) throw error;

    const rows: LessonRecordRow[] = (records || []) as LessonRecordRow[];

    // 포트폴리오 통계 계산
    const orgs = new Set(rows.map(r => r.org_id));
    const dates = rows.map(r => r.lesson_date).sort();
    const scores = rows.filter(r => r.performance_score !== null).map(r => r.performance_score!);

    const byType = {
      movement: rows.filter(r => r.log_type === 'movement').length,
      observation: rows.filter(r => r.log_type === 'observation').length,
      frequency: rows.filter(r => r.log_type === 'frequency').length,
      persistence: rows.filter(r => r.log_type === 'persistence').length,
      pattern: rows.filter(r => r.log_type === 'pattern').length,
    };

    const cloneReadinessScore =
      (byType.movement > 0 ? 1 : 0) +
      (byType.observation > 0 ? 1 : 0) +
      (byType.frequency > 0 ? 1 : 0) +
      (byType.persistence > 0 ? 1 : 0) +
      (byType.pattern > 0 ? 1 : 0);

    const firstDate = dates[0] || null;
    const lastDate = dates[dates.length - 1] || null;
    const spanDays = firstDate && lastDate
      ? Math.ceil((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / 86400000)
      : 0;

    return {
      studentId,
      totalRecords: rows.length,
      academyCount: orgs.size,
      firstRecord: firstDate,
      lastRecord: lastDate,
      recordSpanDays: spanDays,
      byType,
      mediaCount: {
        youtube: rows.filter(r => r.youtube_url).length,
        notion: rows.filter(r => r.notion_url).length,
      },
      avgPerformance: scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
        : null,
      cloneReadinessScore,
      cloneReady: cloneReadinessScore === 5,
      records: rows,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    captureError(error instanceof Error ? error : new Error(errMsg), { context: 'recordTeacher_portfolio' });
    return {
      studentId,
      totalRecords: 0,
      academyCount: 0,
      firstRecord: null,
      lastRecord: null,
      recordSpanDays: 0,
      byType: { movement: 0, observation: 0, frequency: 0, persistence: 0, pattern: 0 },
      mediaCount: { youtube: 0, notion: 0 },
      avgPerformance: null,
      cloneReadinessScore: 0,
      cloneReady: false,
      records: [],
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 포트폴리오 통계
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 학생 포트폴리오 간단 통계 + 트렌드
 */
export const getPortfolioStats = async (
  studentId: string
): Promise<PortfolioStats> => {
  try {
    // 전체 통계
    const portfolio = await getStudentPortfolio(studentId, undefined, 200);

    // 트렌드 계산 (최근 30일 vs 이전 30일 퍼포먼스 비교)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0];

    const recentScores = portfolio.records
      .filter(r => r.lesson_date >= thirtyDaysAgo && r.performance_score !== null)
      .map(r => r.performance_score!);

    const olderScores = portfolio.records
      .filter(r => r.lesson_date >= sixtyDaysAgo && r.lesson_date < thirtyDaysAgo && r.performance_score !== null)
      .map(r => r.performance_score!);

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentScores.length > 0 && olderScores.length > 0) {
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
    }

    return {
      totalRecords: portfolio.totalRecords,
      avgPerformance: portfolio.avgPerformance,
      cloneReadinessScore: portfolio.cloneReadinessScore,
      trend,
    };
  } catch {
    return {
      totalRecords: 0,
      avgPerformance: null,
      cloneReadinessScore: 0,
      trend: 'stable',
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 미디어 링크 후추가
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 기록에 유튜브/노션 링크 후추가
 * (코치가 수업 후 영상 업로드, 피드백 작성 시)
 */
export const updateRecordMedia = async (
  recordId: string,
  youtubeUrl?: string,
  notionUrl?: string
): Promise<UpdateMediaResult> => {
  try {
    const updateData: Record<string, unknown> = {};
    if (youtubeUrl !== undefined) updateData.youtube_url = youtubeUrl;
    if (notionUrl !== undefined) updateData.notion_url = notionUrl;

    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from('lesson_records')
      .update(updateData)
      .eq('id', recordId);

    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    captureError(error instanceof Error ? error : new Error(errMsg), { context: 'recordTeacher_mediaUpdate' });
    return {
      success: false,
      error: { code: 'UPDATE_FAILED', message: errMsg },
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 연결 상태 확인
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 기록선생 연결 상태 확인
 */
export const getConnectionStatus = async (): Promise<{
  connected: boolean;
  totalRecords: number;
  todayRecords: number;
}> => {
  try {
    const { count: total } = await supabase
      .from('lesson_records')
      .select('*', { count: 'exact', head: true });

    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('lesson_records')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_date', today);

    return {
      connected: true,
      totalRecords: total || 0,
      todayRecords: todayCount || 0,
    };
  } catch {
    return { connected: false, totalRecords: 0, todayRecords: 0 };
  }
};
