/**
 * Supabase Edge Function: coach-clock-out-chain
 * 코치 퇴근 시 체인 반응 트리거
 *
 * 1. 오늘 레슨 영상 일괄 업로드 트리거
 * 2. 미전송 피드백 일괄 전송
 * 3. 코치 알림톡 (근무 종료)
 * 4. Owner 대시보드 업데이트
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// Inline type definitions (Edge Functions cannot import from src/)
// ============================================

interface Coach {
  name: string;
  phone?: string;
  email?: string;
}

interface FeedbackStudent {
  name: string;
  parent_phone?: string;
}

interface FeedbackRecord {
  id: string;
  student_id: string;
  voice_note?: string;
  text_note?: string;
  student: FeedbackStudent;
}

interface CoachNotificationData {
  work_hours: string;
  lessons_completed: number;
  students_attended: number;
  total_salary: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClockOutPayload {
  coach_id: string;
  work_date: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: ClockOutPayload = await req.json();
    const { coach_id, work_date } = payload;

    const results: Record<string, unknown> = {};

    // 코치 정보 조회
    const { data: coach } = await supabase
      .from('coaches')
      .select('name, phone, email')
      .eq('id', coach_id)
      .single();

    // 오늘 근무 로그 조회
    const { data: workLog } = await supabase
      .from('coach_work_logs')
      .select('*')
      .eq('coach_id', coach_id)
      .eq('work_date', work_date)
      .single();

    if (!coach || !workLog) {
      throw new Error('Coach or work log not found');
    }

    // ============================================
    // 1. 오늘 레슨 영상 업로드 트리거
    // ============================================
    const { data: pendingVideos } = await supabase
      .from('lesson_videos')
      .select('id, student_id, video_url')
      .eq('coach_id', coach_id)
      .eq('upload_status', 'pending')
      .gte('created_at', work_date);

    if (pendingVideos && pendingVideos.length > 0) {
      // YouTube 업로드 큐에 추가
      for (const video of pendingVideos) {
        await supabase.from('video_upload_queue').insert({
          video_id: video.id,
          student_id: video.student_id,
          source_url: video.video_url,
          status: 'queued',
        });
      }
      results.videos_queued = pendingVideos.length;
    }

    // ============================================
    // 2. 미전송 피드백 일괄 전송
    // ============================================
    const { data: pendingFeedback } = await supabase
      .from('lesson_feedback')
      .select(`
        id, student_id, voice_note, text_note,
        student:students(name, parent_phone)
      `)
      .eq('coach_id', coach_id)
      .eq('sent_to_parent', false)
      .gte('created_at', work_date);

    if (pendingFeedback && pendingFeedback.length > 0) {
      for (const feedback of pendingFeedback) {
        // 학부모에게 피드백 알림 발송
        await sendFeedbackNotification(feedback);

        // 발송 완료 표시
        await supabase
          .from('lesson_feedback')
          .update({ sent_to_parent: true, sent_at: new Date().toISOString() })
          .eq('id', feedback.id);
      }
      results.feedbacks_sent = pendingFeedback.length;
    }

    // ============================================
    // 3. 코치 알림톡 (근무 종료)
    // ============================================
    const hourlyRate = 30000;
    const bonusPerStudent = 500;
    const baseSalary = Math.round((workLog.total_hours || 0) * hourlyRate);
    const attendanceBonus = (workLog.students_attended || 0) * bonusPerStudent;
    const totalSalary = baseSalary + attendanceBonus;

    await sendCoachNotification(coach, {
      work_hours: workLog.total_hours?.toFixed(1) || '0',
      lessons_completed: workLog.lessons_completed || 0,
      students_attended: workLog.students_attended || 0,
      total_salary: totalSalary.toLocaleString(),
    });
    results.coach_notified = true;

    // ============================================
    // 4. Owner 대시보드 업데이트 (실시간)
    // ============================================
    await supabase.from('dashboard_events').insert({
      event_type: 'coach_clock_out',
      event_data: {
        coach_id,
        coach_name: coach.name,
        work_date,
        total_hours: workLog.total_hours,
        lessons_completed: workLog.lessons_completed,
        students_attended: workLog.students_attended,
        estimated_salary: totalSalary,
      },
      created_at: new Date().toISOString(),
    });
    results.dashboard_updated = true;

    // ============================================
    // 5. 월별 급여 통계 갱신
    // ============================================
    const salaryMonth = work_date.substring(0, 7) + '-01';
    const { data: monthlySalary } = await supabase
      .from('coach_salaries')
      .select('*')
      .eq('coach_id', coach_id)
      .eq('salary_month', salaryMonth)
      .single();

    if (monthlySalary) {
      results.monthly_salary = {
        total_hours: monthlySalary.total_hours,
        total_lessons: monthlySalary.total_lessons,
        net_salary: monthlySalary.net_salary,
      };
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
    console.error('Coach clock out chain error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ ok: false, error: message, code: 'COACH_CLOCK_OUT_ERROR' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// 피드백 알림 발송
async function sendFeedbackNotification(feedback: FeedbackRecord) {
  const KAKAO_API_KEY = Deno.env.get('KAKAO_ALIMTALK_API_KEY');
  if (!KAKAO_API_KEY) return;

  const student = feedback.student;
  const message = `[ATB Hub] ${student.name} 학생의 오늘 레슨 피드백이 도착했습니다! 📝
앱에서 확인해주세요.`;

  await fetch('https://alimtalk-api.kakao.com/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KAKAO_API_KEY}`,
    },
    body: JSON.stringify({
      templateCode: 'lesson_feedback',
      recipientList: [{
        recipientNo: student.parent_phone?.replace(/-/g, ''),
        templateParameter: {
          student_name: student.name,
        },
      }],
    }),
  });
}

// 코치 알림 발송
async function sendCoachNotification(coach: Coach, data: CoachNotificationData) {
  const KAKAO_API_KEY = Deno.env.get('KAKAO_ALIMTALK_API_KEY');
  if (!KAKAO_API_KEY) return;

  await fetch('https://alimtalk-api.kakao.com/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KAKAO_API_KEY}`,
    },
    body: JSON.stringify({
      templateCode: 'coach_work_complete',
      recipientList: [{
        recipientNo: coach.phone?.replace(/-/g, ''),
        templateParameter: {
          coach_name: coach.name,
          work_hours: data.work_hours,
          lessons_completed: data.lessons_completed.toString(),
          students_attended: data.students_attended.toString(),
          total_salary: data.total_salary,
        },
      }],
    }),
  });
}
