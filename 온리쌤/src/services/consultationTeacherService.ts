/**
 * consultationTeacherService.ts
 * 상담선생 — 결제선생(Payment Truth) 연동 → 위험 감지 → 자동 상담 예약
 *
 * IOO Trace:
 *   Input: 결제선생 미납/V-Index 하락/연속 결석
 *   Operation: risk_flag → 상담 자동 예약
 *   Output: 알림톡 발송 + consultation_sessions INSERT
 *
 * Pattern: paySSAMService.ts 동일 (functional service)
 */

import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

/** 위험 트리거 유형 */
export type RiskTriggerType =
  | 'overdue_payment'
  | 'low_vindex'
  | 'failed_payment'
  | 'absent_streak'
  | 'no_response';

/** 상담 상태 */
export type ConsultationStatus =
  | 'scheduled'
  | 'reminded'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'follow_up';

/** 감지된 위험 */
export interface DetectedRisk {
  studentId: string;
  studentName: string;
  parentPhone: string;
  triggerType: RiskTriggerType;
  severity: 'low' | 'medium' | 'high';
  snapshot: {
    vIndex?: number;
    overdueAmount?: number;
    absentCount?: number;
    paymentStatus?: string;
    riskLevel?: string;
  };
}

/** 위험 감지 결과 */
export interface RiskDetectionResult {
  success: boolean;
  risksDetected: DetectedRisk[];
  scannedAt: string;
  error?: { code: string; message: string };
}

/** 상담 예약 요청 */
export interface ScheduleConsultationRequest {
  studentId: string;
  parentPhone: string;
  triggerType: RiskTriggerType;
  triggerSnapshot: Record<string, unknown>;
  orgId?: string;
  scheduledAt?: string;
}

/** 상담 예약 결과 */
export interface ScheduleResult {
  success: boolean;
  consultationId?: string;
  dedupeKey?: string;
  error?: { code: string; message: string };
}

/** 상담 완료 결과 */
export interface CompleteResult {
  success: boolean;
  consultationId?: string;
  error?: { code: string; message: string };
}

/** 일일 배치 결과 */
export interface DailyBatchResult {
  success: boolean;
  risksDetected: number;
  consultationsScheduled: number;
  errors: Array<{ studentId: string; error: string }>;
}

/** Supabase consultation_sessions 레코드 */
export interface ConsultationRecord {
  id: string;
  org_id: string;
  student_id: string;
  parent_phone: string;
  status: ConsultationStatus;
  trigger_type: RiskTriggerType;
  trigger_snapshot: Record<string, unknown>;
  scheduled_at: string | null;
  reminded_at: string | null;
  completed_at: string | null;
  coach_notes: string | null;
  follow_up_actions: Array<{ action: string; due_date: string; status: string }>;
  dedupe_key: string;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ 설정
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/** V-Index 위험 기준 */
const RISK_THRESHOLDS = {
  HIGH: 40,
  MEDIUM: 60,
};

/** 연속 결석 위험 기준 */
const ABSENT_STREAK_THRESHOLD = 3;

/** 미납 위험 기준 (일) */
const OVERDUE_DAYS_THRESHOLD = 3;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 헬퍼
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 상담선생 설정 확인
 * DB 기반이므로 항상 true (외부 API 의존 없음)
 */
export const isConfigured = (): boolean => {
  return true;
};

/**
 * 중복 방지 키 생성
 * Format: CONSULT-{orgId}-{studentId}-{YYYYMMDD}
 */
const generateDedupeKey = (orgId: string, studentId: string): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  return `CONSULT-${orgId}-${studentId}-${dateStr}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 위험 감지 (IOO: Input)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 미납 + V-Index + 연속 결석 기반 위험 학생 탐지
 */
export const detectRisks = async (
  orgId: string = DEFAULT_ORG_ID
): Promise<RiskDetectionResult> => {
  try {
    const risks: DetectedRisk[] = [];

    // 1) 미납 청구서 조회 (결제선생 연동)
    const { data: overdueInvoices } = await supabase
      .from('payment_invoices')
      .select('student_id, parent_phone, amount, due_date, status')
      .eq('org_id', orgId)
      .in('status', ['sent', 'overdue'])
      .lt('due_date', new Date(Date.now() - OVERDUE_DAYS_THRESHOLD * 86400000).toISOString());

    if (overdueInvoices) {
      for (const inv of overdueInvoices) {
        // 학생 이름 조회
        const { data: student } = await supabase
          .from('students')
          .select('name')
          .eq('id', inv.student_id)
          .single();

        risks.push({
          studentId: inv.student_id,
          studentName: student?.name || '알 수 없음',
          parentPhone: inv.parent_phone,
          triggerType: 'overdue_payment',
          severity: 'high',
          snapshot: {
            overdueAmount: inv.amount,
            paymentStatus: inv.status,
          },
        });
      }
    }

    // 2) V-Index 낮은 학생 조회
    const { data: lowVIndexStudents } = await supabase
      .from('students')
      .select('id, name, parent_phone, v_index, risk_level')
      .eq('status', 'active')
      .lt('v_index', RISK_THRESHOLDS.MEDIUM);

    if (lowVIndexStudents) {
      for (const s of lowVIndexStudents) {
        // 이미 미납으로 감지된 학생은 스킵
        if (risks.some(r => r.studentId === s.id)) continue;

        const severity = (s.v_index ?? 50) < RISK_THRESHOLDS.HIGH ? 'high' : 'medium';
        risks.push({
          studentId: s.id,
          studentName: s.name,
          parentPhone: s.parent_phone || '',
          triggerType: 'low_vindex',
          severity,
          snapshot: {
            vIndex: s.v_index,
            riskLevel: s.risk_level,
          },
        });
      }
    }

    // 3) 연속 결석 조회
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: recentAbsences } = await supabase
      .from('attendance_records')
      .select('student_id')
      .eq('status', 'absent')
      .gte('attendance_date', sevenDaysAgo);

    if (recentAbsences) {
      // 학생별 결석 횟수 집계
      const absentCounts: Record<string, number> = {};
      for (const a of recentAbsences) {
        absentCounts[a.student_id] = (absentCounts[a.student_id] || 0) + 1;
      }

      for (const [studentId, count] of Object.entries(absentCounts)) {
        if (count >= ABSENT_STREAK_THRESHOLD) {
          // 이미 다른 트리거로 감지된 학생은 스킵
          if (risks.some(r => r.studentId === studentId)) continue;

          const { data: student } = await supabase
            .from('students')
            .select('name, parent_phone')
            .eq('id', studentId)
            .single();

          risks.push({
            studentId,
            studentName: student?.name || '알 수 없음',
            parentPhone: student?.parent_phone || '',
            triggerType: 'absent_streak',
            severity: count >= 5 ? 'high' : 'medium',
            snapshot: { absentCount: count },
          });
        }
      }
    }

    return {
      success: true,
      risksDetected: risks,
      scannedAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[온리쌤] 상담선생 위험 감지 실패:', errMsg);
    return {
      success: false,
      risksDetected: [],
      scannedAt: new Date().toISOString(),
      error: { code: 'RISK_DETECTION_FAILED', message: errMsg },
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 상담 예약 (IOO: Operation)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 위험 학생에 대한 상담 자동 예약
 */
export const scheduleConsultation = async (
  request: ScheduleConsultationRequest
): Promise<ScheduleResult> => {
  const orgId = request.orgId || DEFAULT_ORG_ID;
  const dedupeKey = generateDedupeKey(orgId, request.studentId);

  try {
    // 1) 중복 체크 (같은 날 같은 학생 상담 방지)
    const { data: existing } = await supabase
      .from('consultation_sessions')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .single();

    if (existing) {
      return {
        success: true,
        consultationId: existing.id,
        dedupeKey,
        error: { code: 'DUPLICATE', message: '오늘 이미 상담이 예약되어 있습니다.' },
      };
    }

    // 2) 상담 세션 생성
    const scheduledAt = request.scheduledAt || new Date(Date.now() + 86400000).toISOString();

    const { data: consultation, error } = await supabase
      .from('consultation_sessions')
      .insert({
        org_id: orgId,
        student_id: request.studentId,
        parent_phone: request.parentPhone,
        status: 'scheduled',
        trigger_type: request.triggerType,
        trigger_snapshot: request.triggerSnapshot,
        scheduled_at: scheduledAt,
        dedupe_key: dedupeKey,
      })
      .select('id')
      .single();

    if (error) throw error;

    // 3) events 테이블에 IOO Trace 로그
    await supabase.from('events').insert({
      org_id: orgId,
      type: 'consultation_scheduled',
      entity_id: request.studentId,
      value: 0,
      status: 'completed',
      source: 'system',
      idempotency_key: `CONSULT-EVENT-${dedupeKey}`,
    });

    // 4) metadata에 IOO 상세 저장
    await supabase.rpc('set_metadata', {
      p_target_type: 'event',
      p_target_id: consultation.id,
      p_key: 'ioo_trace',
      p_value: JSON.stringify({
        input: `위험 감지: ${request.triggerType}`,
        operation: '상담 자동 예약',
        output: `상담 ID: ${consultation.id}`,
        trigger_snapshot: request.triggerSnapshot,
      }),
    });

    return {
      success: true,
      consultationId: consultation.id,
      dedupeKey,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[온리쌤] 상담선생 예약 실패:', errMsg);
    return {
      success: false,
      error: { code: 'SCHEDULE_FAILED', message: errMsg },
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 리마인드 발송
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 상담 리마인드 발송 (상태: scheduled → reminded)
 */
export const remindConsultation = async (
  consultationId: string
): Promise<ScheduleResult> => {
  try {
    const { data, error } = await supabase
      .from('consultation_sessions')
      .update({
        status: 'reminded',
        reminded_at: new Date().toISOString(),
      })
      .eq('id', consultationId)
      .eq('status', 'scheduled')
      .select('id, dedupe_key')
      .single();

    if (error) throw error;

    // TODO: 카카오 알림톡 발송 (kakaoAlimtalk 서비스 연동)

    return {
      success: true,
      consultationId: data.id,
      dedupeKey: data.dedupe_key,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[온리쌤] 상담선생 리마인드 실패:', errMsg);
    return {
      success: false,
      error: { code: 'REMIND_FAILED', message: errMsg },
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ 상담 완료 (IOO: Output)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 상담 완료 처리 + IOO Trace 기록
 */
export const completeConsultation = async (
  consultationId: string,
  notes: string,
  followUpActions?: Array<{ action: string; dueDate: string }>
): Promise<CompleteResult> => {
  try {
    const followUp = followUpActions?.map(a => ({
      action: a.action,
      due_date: a.dueDate,
      status: 'pending',
    })) || [];

    const newStatus: ConsultationStatus = followUp.length > 0 ? 'follow_up' : 'completed';

    const { data, error } = await supabase
      .from('consultation_sessions')
      .update({
        status: newStatus,
        completed_at: new Date().toISOString(),
        coach_notes: notes,
        follow_up_actions: followUp,
      })
      .eq('id', consultationId)
      .in('status', ['scheduled', 'reminded', 'in_progress'])
      .select('id, org_id, student_id, dedupe_key')
      .single();

    if (error) throw error;

    // IOO Trace 로그
    await supabase.from('events').insert({
      org_id: data.org_id,
      type: 'consultation_completed',
      entity_id: data.student_id,
      value: 1,
      status: 'completed',
      source: 'manual',
      idempotency_key: `CONSULT-COMPLETE-${data.dedupe_key}`,
    });

    return { success: true, consultationId: data.id };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[온리쌤] 상담선생 완료 처리 실패:', errMsg);
    return {
      success: false,
      error: { code: 'COMPLETE_FAILED', message: errMsg },
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 일일 배치 (cron-consultation-risk에서 호출)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 일일 위험 감지 + 자동 상담 예약 배치
 */
export const processDailyRisks = async (
  orgId: string = DEFAULT_ORG_ID
): Promise<DailyBatchResult> => {
  const result: DailyBatchResult = {
    success: true,
    risksDetected: 0,
    consultationsScheduled: 0,
    errors: [],
  };

  try {
    // 1) 위험 감지
    const detection = await detectRisks(orgId);
    if (!detection.success) {
      return { ...result, success: false };
    }

    result.risksDetected = detection.risksDetected.length;

    // 2) 각 위험에 대해 상담 예약
    for (const risk of detection.risksDetected) {
      // 심각도 medium 이상만 자동 예약
      if (risk.severity === 'low') continue;

      const scheduleResult = await scheduleConsultation({
        studentId: risk.studentId,
        parentPhone: risk.parentPhone,
        triggerType: risk.triggerType,
        triggerSnapshot: risk.snapshot,
        orgId,
      });

      if (scheduleResult.success && scheduleResult.error?.code !== 'DUPLICATE') {
        result.consultationsScheduled++;
      } else if (!scheduleResult.success) {
        result.errors.push({
          studentId: risk.studentId,
          error: scheduleResult.error?.message || 'Unknown error',
        });
      }
    }

    return result;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[온리쌤] 상담선생 일일 배치 실패:', errMsg);
    return { ...result, success: false };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 연결 상태 확인
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 상담선생 연결 상태 확인 (DB 접근 테스트)
 */
export const getConnectionStatus = async (): Promise<{
  connected: boolean;
  consultationCount: number;
  pendingCount: number;
}> => {
  try {
    const { count: total } = await supabase
      .from('consultation_sessions')
      .select('*', { count: 'exact', head: true });

    const { count: pending } = await supabase
      .from('consultation_sessions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['scheduled', 'reminded']);

    return {
      connected: true,
      consultationCount: total || 0,
      pendingCount: pending || 0,
    };
  } catch {
    return { connected: false, consultationCount: 0, pendingCount: 0 };
  }
};
