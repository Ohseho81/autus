/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎯 AUTUS Event Service - V-Index 자동 계산
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Event Ledger에 이벤트를 기록하고 V-Index를 자동 업데이트합니다.
 *
 * 지원하는 이벤트:
 * - attendance: 출석
 * - absence: 결석
 * - late: 지각
 * - payment_completed: 결제 완료
 * - payment_pending: 미납
 * - consultation: 상담
 * - enrollment: 등록
 * - feedback_positive: 긍정적 피드백
 * - feedback_negative: 부정적 피드백
 * - video_upload: 영상 업로드
 * - class_completion: 수업 완료
 * - achievement: 성취
 */

import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface EventInput {
  entity_id: string;
  universal_id?: string;
  event_type: string;
  value?: number;
  metadata?: Record<string, unknown>;
  related_entity_id?: string;
}

export interface EventResult {
  id: string;
  entity_id: string;
  universal_id?: string;
  event_type: string;
  value: number;
  created_at: string;
}

export interface VIndexCalculation {
  entity_id: string;
  universal_id?: string;
  v_index: number;
  motions: number;
  threats: number;
  events_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Service
// ═══════════════════════════════════════════════════════════════════════════════

export const eventService = {
  /**
   * 이벤트 기록
   * Event Ledger에 이벤트를 추가하고, 트리거가 자동으로 V-Index를 계산합니다.
   */
  async logEvent(input: EventInput): Promise<EventResult | null> {
    try {
      // Supabase 함수 호출 (log_event)
      const { data, error } = await supabase.rpc('log_event', {
        p_entity_id: input.entity_id,
        p_event_type: input.event_type,
        p_value: input.value ?? null,
        p_metadata: input.metadata ?? {},
        p_related_entity_id: input.related_entity_id ?? null,
      });

      if (error) {
        if (__DEV__) console.warn('[eventService] logEvent error:', error.message);
        return null;
      }

      // 성공 시 이벤트 ID 반환
      return {
        id: data,
        entity_id: input.entity_id,
        universal_id: input.universal_id,
        event_type: input.event_type,
        value: input.value ?? 1.0,
        created_at: new Date().toISOString(),
      };
    } catch (error: unknown) {
      if (__DEV__) console.warn('[eventService] logEvent failed:', error);
      return null;
    }
  },

  /**
   * V-Index 조회
   * 특정 학생의 현재 V-Index를 조회합니다.
   */
  async getVIndex(entity_id: string): Promise<VIndexCalculation | null> {
    try {
      const { data, error } = await supabase
        .from('v_index_calculation')
        .select('*')
        .eq('entity_id', entity_id)
        .single();

      if (error) {
        if (__DEV__) console.warn('[eventService] V-Index query error:', error.message);
        return null;
      }

      return {
        entity_id: data.entity_id,
        universal_id: data.universal_id,
        v_index: data.calculated_v_index ?? 50,
        motions: data.motions ?? 0,
        threats: data.threats ?? 0,
        events_count: data.total_events ?? 0,
      };
    } catch (error: unknown) {
      if (__DEV__) console.warn('[eventService] getVIndex failed:', error);
      return null;
    }
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // 헬퍼 메서드 (자주 사용하는 이벤트)
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * 출석 체크 이벤트
   */
  async logAttendance(
    student_id: string,
    status: 'present' | 'absent' | 'late',
    metadata?: Record<string, unknown>
  ): Promise<EventResult | null> {
    const event_type = status === 'present' ? 'attendance' : status;

    return this.logEvent({
      entity_id: student_id,
      event_type,
      metadata: {
        status,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  },

  /**
   * 결제 이벤트
   */
  async logPayment(
    student_id: string,
    status: 'completed' | 'pending',
    amount: number,
    metadata?: Record<string, unknown>
  ): Promise<EventResult | null> {
    const event_type = status === 'completed' ? 'payment_completed' : 'payment_pending';

    // 금액을 10만원 기준으로 정규화 (10만원 = 1.0)
    const normalizedValue = amount / 100000;

    return this.logEvent({
      entity_id: student_id,
      event_type,
      value: normalizedValue,
      metadata: {
        status,
        amount,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  },

  /**
   * 상담 이벤트
   */
  async logConsultation(
    student_id: string,
    metadata?: Record<string, unknown>
  ): Promise<EventResult | null> {
    return this.logEvent({
      entity_id: student_id,
      event_type: 'consultation',
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  },

  /**
   * 등록 이벤트
   */
  async logEnrollment(
    student_id: string,
    class_name: string,
    metadata?: Record<string, unknown>
  ): Promise<EventResult | null> {
    return this.logEvent({
      entity_id: student_id,
      event_type: 'enrollment',
      value: 2.0, // 등록은 2배 가중치
      metadata: {
        class_name,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  },

  /**
   * 피드백 이벤트
   */
  async logFeedback(
    student_id: string,
    is_positive: boolean,
    feedback: string,
    metadata?: Record<string, unknown>
  ): Promise<EventResult | null> {
    const event_type = is_positive ? 'feedback_positive' : 'feedback_negative';

    return this.logEvent({
      entity_id: student_id,
      event_type,
      metadata: {
        feedback,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  },

  /**
   * 영상 업로드 이벤트
   */
  async logVideoUpload(
    student_id: string,
    video_url: string,
    metadata?: Record<string, unknown>
  ): Promise<EventResult | null> {
    return this.logEvent({
      entity_id: student_id,
      event_type: 'video_upload',
      metadata: {
        video_url,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  },

  /**
   * 수업 완료 이벤트
   */
  async logClassCompletion(
    student_id: string,
    class_name: string,
    metadata?: Record<string, unknown>
  ): Promise<EventResult | null> {
    return this.logEvent({
      entity_id: student_id,
      event_type: 'class_completion',
      metadata: {
        class_name,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  },

  /**
   * 성취 이벤트 (대회, 승급 등)
   */
  async logAchievement(
    student_id: string,
    achievement: string,
    metadata?: Record<string, unknown>
  ): Promise<EventResult | null> {
    return this.logEvent({
      entity_id: student_id,
      event_type: 'achievement',
      value: 2.0, // 성취는 2배 가중치
      metadata: {
        achievement,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // 배치 작업
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * 여러 학생의 출석 체크 (일괄 처리)
   */
  async logBatchAttendance(
    students: Array<{ id: string; status: 'present' | 'absent' | 'late' }>,
    metadata?: Record<string, unknown>
  ): Promise<number> {
    let successCount = 0;

    for (const student of students) {
      const result = await this.logAttendance(student.id, student.status, metadata);
      if (result) successCount++;
    }

    return successCount;
  },
};
