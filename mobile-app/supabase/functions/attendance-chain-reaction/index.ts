/**
 * Supabase Edge Function: attendance-chain-reaction
 * QR 출석 완료 시 체인 반응 트리거
 *
 * 1. 학부모 알림 발송 (카카오 알림톡 / FCM Push)
 * 2. 성장 기록 업데이트
 * 3. 피드백 세션 준비
 * 4. 포인트 적립
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const results: Record<string, any> = {};

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

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Chain reaction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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
  supabase: any,
  student: any,
  lessonSlot: any
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
  supabase: any,
  studentId: string,
  attendanceId: string | undefined,
  lessonSlot: any
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
  supabase: any,
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
  supabase: any,
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
  } catch (error) {
    console.error('Kakao alimtalk error:', error);
    return { sent: false, error: error.message };
  }
}

/**
 * FCM Push 발송
 */
async function sendFCMPush(
  token: string,
  notification: { title: string; body: string; data?: any }
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
  } catch (error) {
    console.error('FCM push error:', error);
    return { sent: false };
  }
}