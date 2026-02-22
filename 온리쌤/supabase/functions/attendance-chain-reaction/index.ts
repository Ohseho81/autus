/**
 * Supabase Edge Function: attendance-chain-reaction
 * QR 출석 완료 시 체인 반응 트리거
 *
 * 1. 학부모 알림 발송 (카카오 알림톡 / FCM Push)
 * 2. 성장 기록 업데이트
 * 3. 피드백 세션 준비
 * 4. 포인트 적립
 * 5. 기록선생 — 출석 → lesson_records 빈도 로그 자동 생성
 *
 * IOO Trace:
 *   Input: attendance_records (QR 출석 완료)
 *   Operation: 체인 반응 5단계 실행
 *   Output: 알림 + 성장 + 피드백 + 포인트 + lesson_records(빈도)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// Inline type definitions (Edge Functions cannot import from src/)
// ============================================

interface Student {
  id: string;
  name: string;
  parent_phone?: string;
  fcm_token?: string;
  total_points?: number;
  student_payments?: Record<string, unknown>[];
}

interface LessonSlot {
  id: string;
  name: string;
  location?: string;
  start_time?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChainReactionPayload {
  student_id: string;
  lesson_slot_id: string;
  attendance_id?: string;
  actions: string[];
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: ChainReactionPayload = await req.json();
    const { student_id, lesson_slot_id, attendance_id, actions } = payload;

    const results: Record<string, unknown> = {};

    // 학생 + 레슨 정보 조회
    const { data: student } = await supabase
      .from('students')
      .select('*, student_payments(*)')
      .eq('id', student_id)
      .single();

    const { data: lessonSlot } = await supabase
      .from('lesson_slots')
      .select('*')
      .eq('id', lesson_slot_id)
      .single();

    if (!student || !lessonSlot) {
      throw new Error('Student or lesson slot not found');
    }

    // ============================================
    // 1. 학부모 알림 발송
    // ============================================
    if (actions.includes('send_parent_notification')) {
      const notificationResult = await sendParentNotification(
        supabase,
        student,
        lessonSlot
      );
      results.notification = notificationResult;

      // 출석 기록에 알림 발송 완료 표시
      if (attendance_id) {
        await supabase
          .from('attendance_records')
          .update({ parent_notified: true })
          .eq('id', attendance_id);
      }
    }

    // ============================================
    // 2. 성장 기록 업데이트
    // ============================================
    if (actions.includes('update_growth_log')) {
      const growthResult = await updateGrowthLog(
        supabase,
        student_id,
        attendance_id,
        lessonSlot
      );
      results.growth = growthResult;
    }

    // ============================================
    // 3. 피드백 세션 준비
    // ============================================
    if (actions.includes('prepare_feedback_session')) {
      const feedbackResult = await prepareFeedbackSession(
        supabase,
        student_id,
        lesson_slot_id
      );
      results.feedback = feedbackResult;
    }

    // ============================================
    // 4. 포인트 적립
    // ============================================
    if (actions.includes('earn_points')) {
      const pointsResult = await earnPoints(
        supabase,
        student_id,
        'attendance',
        100  // 출석 포인트
      );
      results.points = pointsResult;
    }

    // ============================================
    // 5. 기록선생 — 출석 → lesson_records 빈도 로그
    // "로그를 모아서 클론을 만든다"
    // ============================================
    if (actions.includes('create_lesson_record')) {
      const recordResult = await createLessonRecordFromAttendance(
        supabase,
        student_id,
        attendance_id,
        lessonSlot
      );
      results.lesson_record = recordResult;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          results,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('Chain reaction error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
        code: 'CHAIN_REACTION_ERROR',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// ============================================
// Helper Functions
// ============================================

/**
 * 학부모 알림 발송 (카카오 알림톡 + FCM)
 */
async function sendParentNotification(
  supabase: SupabaseClient,
  student: Student,
  lessonSlot: LessonSlot
) {
  const message = `[ATB Hub] ${student.name} 학생이 ${lessonSlot.name} 수업에 출석했습니다! ⚽
📍 ${lessonSlot.location}
🕐 ${lessonSlot.start_time}
📝 피드백이 곧 전달됩니다.`;

  // 1. 카카오 알림톡 발송
  const kakaoResult = await sendKakaoAlimtalk(
    student.parent_phone,
    'attendance_complete',
    {
      student_name: student.name,
      lesson_name: lessonSlot.name,
      location: lessonSlot.location,
      time: lessonSlot.start_time,
    }
  );

  // 2. FCM Push 발송 (앱 설치된 경우)
  if (student.fcm_token) {
    await sendFCMPush(student.fcm_token, {
      title: '출석 완료! ⚽',
      body: `${student.name}님이 ${lessonSlot.name}에 출석했습니다`,
      data: {
        type: 'attendance',
        student_id: student.id,
        lesson_slot_id: lessonSlot.id,
      },
    });
  }

  // 3. 알림 기록 저장
  await supabase.from('notifications').insert({
    student_id: student.id,
    type: 'attendance',
    channel: 'kakao',
    title: '출석 완료',
    message,
  });

  return { sent: true, channels: ['kakao', student.fcm_token ? 'fcm' : null] };
}

/**
 * 성장 기록 업데이트
 */
async function updateGrowthLog(
  supabase: SupabaseClient,
  studentId: string,
  attendanceId: string | undefined,
  _lessonSlot: LessonSlot
) {
  // 성장 로그 생성 (기본값)
  const { data, error } = await supabase.from('growth_logs').insert({
    student_id: studentId,
    attendance_id: attendanceId,
    log_date: new Date().toISOString().split('T')[0],
    skill_ratings: {},  // 코치가 나중에 업데이트
    points_earned: 100,
  }).select().single();

  return { created: !error, log_id: data?.id };
}

/**
 * 피드백 세션 준비
 */
async function prepareFeedbackSession(
  supabase: SupabaseClient,
  studentId: string,
  lessonSlotId: string
) {
  // 피드백 세션 생성 (비어있는 상태로)
  const { data, error } = await supabase.from('feedback_sessions').insert({
    student_id: studentId,
    lesson_slot_id: lessonSlotId,
    status: 'pending',
    created_at: new Date().toISOString(),
  }).select().single();

  return { prepared: !error, session_id: data?.id };
}

/**
 * 포인트 적립
 */
async function earnPoints(
  supabase: SupabaseClient,
  studentId: string,
  type: string,
  amount: number
) {
  // 포인트 트랜잭션 기록
  await supabase.from('point_transactions').insert({
    student_id: studentId,
    type,
    amount,
    description: type === 'attendance' ? '출석 포인트' : '활동 포인트',
  });

  // 총 포인트 업데이트
  const { data: student } = await supabase
    .from('students')
    .select('total_points')
    .eq('id', studentId)
    .single();

  await supabase
    .from('students')
    .update({ total_points: (student?.total_points || 0) + amount })
    .eq('id', studentId);

  return { earned: amount, total: (student?.total_points || 0) + amount };
}

/**
 * 기록선생 — 출석 완료 → lesson_records 빈도 로그 자동 생성
 * 학생이 커널, 학원이 모듈 — org를 초월하여 학생에게 로그가 수렴
 */
async function createLessonRecordFromAttendance(
  supabase: SupabaseClient,
  studentId: string,
  attendanceId: string | undefined,
  lessonSlot: LessonSlot
) {
  const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
  const today = new Date().toISOString().split('T')[0];
  const dateStr = today.replace(/-/g, '');
  const dedupeKey = `RECORD-${DEFAULT_ORG_ID}-${studentId}-${dateStr}-frequency`;

  try {
    // 중복 체크 (idempotency)
    const { data: existing } = await supabase
      .from('lesson_records')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .maybeSingle();

    if (existing) {
      console.log(`[기록선생] 이미 존재: ${dedupeKey}`);
      return { created: false, reason: 'duplicate', record_id: existing.id };
    }

    // lesson_records INSERT (빈도 로그)
    const { data: record, error } = await supabase
      .from('lesson_records')
      .insert({
        student_id: studentId,
        org_id: DEFAULT_ORG_ID,
        lesson_date: today,
        log_type: 'frequency',
        metadata: {
          source: 'attendance_chain_reaction',
          attendance_id: attendanceId,
          lesson_slot_id: lessonSlot?.id,
          lesson_name: lessonSlot?.name,
        },
        attendance_event_id: attendanceId,
        dedupe_key: dedupeKey,
      })
      .select()
      .single();

    if (error) {
      // 23505 = unique violation (중복 키) → 무시
      if (error.code === '23505') {
        return { created: false, reason: 'duplicate_constraint' };
      }
      throw error;
    }

    // IOO Trace 이벤트 로그
    await supabase.from('events').insert({
      org_id: DEFAULT_ORG_ID,
      type: 'lesson_record_created',
      entity_id: studentId,
      value: 0,
      status: 'completed',
      source: 'system',
      idempotency_key: `RECORD-EVENT-CHAIN-${dedupeKey}`,
    });

    console.log(`[기록선생] 빈도 로그 생성: ${studentId} / ${today}`);
    return { created: true, record_id: record?.id };
  } catch (error: unknown) {
    console.error(`[기록선생] 빈도 로그 실패:`, error);
    return { created: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 카카오 알림톡 발송
 */
async function sendKakaoAlimtalk(
  phone: string,
  templateCode: string,
  variables: Record<string, string>
) {
  const KAKAO_API_KEY = Deno.env.get('KAKAO_ALIMTALK_API_KEY');
  const KAKAO_SENDER_KEY = Deno.env.get('KAKAO_SENDER_KEY');

  if (!KAKAO_API_KEY) {
    console.log('Kakao API key not configured, skipping...');
    return { sent: false, reason: 'api_key_missing' };
  }

  try {
    const response = await fetch('https://alimtalk-api.kakao.com/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KAKAO_API_KEY}`,
      },
      body: JSON.stringify({
        senderKey: KAKAO_SENDER_KEY,
        templateCode,
        recipientList: [{
          recipientNo: phone.replace(/-/g, ''),
          templateParameter: variables,
        }],
      }),
    });

    return { sent: response.ok };
  } catch (error: unknown) {
    console.error('Kakao alimtalk error:', error);
    return { sent: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * FCM Push 발송
 */
async function sendFCMPush(
  token: string,
  notification: { title: string; body: string; data?: Record<string, unknown> }
) {
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');

  if (!FCM_SERVER_KEY) {
    console.log('FCM server key not configured, skipping...');
    return { sent: false };
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
      }),
    });

    return { sent: response.ok };
  } catch (error: unknown) {
    console.error('FCM push error:', error);
    return { sent: false };
  }
}