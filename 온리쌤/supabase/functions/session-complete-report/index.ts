/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎬 Session Complete Report - AI 감동 리포트 자동 생성
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 철학: "강사가 수업 종료 버튼만 누르면, AI 감동 리포트가 완성되어 대기"
 *
 * 트리거: 수업 종료 시 (atb_lesson_sessions.status = 'completed')
 *
 * 워크플로우:
 * 1. 수업 데이터 수집 (출석, 시간, 학생 목록)
 * 2. AI 리포트 초안 생성 (GPT-4 또는 Claude)
 * 3. 학부모별 개인화 메시지 생성
 * 4. 알림톡 발송 (감사 표현 버튼 포함)
 * 5. 리포트 저장 (나중에 대시보드에서 확인 가능)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionCompletePayload {
  session_id: string;
  coach_id?: string;
  coach_feedback?: string; // 코치가 음성으로 남긴 피드백 (STT 변환됨)
  highlight_clips?: string[]; // 자동 캡처된 영상 URL들
}

interface StudentReport {
  student_id: string;
  student_name: string;
  parent_phone: string;
  attendance_status: 'present' | 'late' | 'absent';
  ai_message: string;
  highlight_url?: string;
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

    const payload: SessionCompletePayload = await req.json();
    const { session_id, coach_feedback, highlight_clips } = payload;

    console.log('[SessionReport] Processing session:', session_id);

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. 수업 데이터 수집
    // ═══════════════════════════════════════════════════════════════════════════

    // 세션 정보
    const { data: session, error: sessionError } = await supabase
      .from('atb_lesson_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // 출석 학생 목록
    const { data: attendance } = await supabase
      .from('atb_session_students')
      .select(`
        student_id,
        attendance_status,
        students (id, name, parent_phone, v_index, compatibility_score)
      `)
      .eq('session_id', session_id);

    const students = attendance || [];
    console.log('[SessionReport] Students in session:', students.length);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. AI 리포트 초안 생성
    // ═══════════════════════════════════════════════════════════════════════════

    const presentStudents = students.filter(s => 
      s.attendance_status === 'present' || s.attendance_status === 'late'
    );

    const reports: StudentReport[] = [];

    for (const studentData of presentStudents) {
      const student = (studentData as Record<string, unknown>).students as Record<string, unknown> | null;
      if (!student) continue;

      // AI 개인화 메시지 생성
      const aiMessage = await generateAIMessage({
        studentName: student.name,
        sessionName: session.name,
        sessionTime: `${session.start_time?.slice(0, 5)} ~ ${session.end_time?.slice(0, 5)}`,
        attendanceStatus: studentData.attendance_status,
        vIndex: student.v_index || 50,
        compatibilityScore: student.compatibility_score || 70,
        coachFeedback: coach_feedback,
      });

      // 하이라이트 영상 매칭 (있는 경우)
      const highlightUrl = highlight_clips?.[0]; // TODO: 학생별 영상 매칭

      reports.push({
        student_id: student.id,
        student_name: student.name,
        parent_phone: student.parent_phone,
        attendance_status: studentData.attendance_status as 'present' | 'late' | 'absent',
        ai_message: aiMessage,
        highlight_url: highlightUrl,
      });
    }

    console.log('[SessionReport] Reports generated:', reports.length);

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. 리포트 저장 (session_reports 테이블)
    // ═══════════════════════════════════════════════════════════════════════════

    const reportId = crypto.randomUUID();
    
    await supabase.from('session_reports').insert({
      id: reportId,
      session_id,
      session_name: session.name,
      session_date: session.session_date,
      coach_feedback,
      total_students: students.length,
      present_count: presentStudents.length,
      reports: reports,
      status: 'ready', // 발송 대기
      created_at: new Date().toISOString(),
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. 학부모 알림톡 발송
    // ═══════════════════════════════════════════════════════════════════════════

    const sentCount = { success: 0, failed: 0 };

    for (const report of reports) {
      if (!report.parent_phone) continue;

      const gratitudeLink = `${Deno.env.get('APP_URL') || 'https://autus.app'}/gratitude?session=${session_id}&student=${report.student_id}`;

      try {
        await sendKakaoAlimtalk(report.parent_phone, 'session_complete', {
          studentName: report.student_name,
          sessionName: session.name,
          message: report.ai_message,
          highlightUrl: report.highlight_url || '',
          gratitudeLink,
        });

        sentCount.success++;
        console.log('[SessionReport] Alimtalk sent:', report.student_name);
      } catch (error: unknown) {
        sentCount.failed++;
        console.error('[SessionReport] Alimtalk failed:', report.student_name, error);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. 알림 로그 저장
    // ═══════════════════════════════════════════════════════════════════════════

    await supabase.from('atb_notification_logs').insert({
      type: 'session_report',
      recipients: reports.map(r => r.parent_phone).filter(Boolean),
      message: `${session.name} 수업 종료 리포트`,
      metadata: {
        sessionId: session_id,
        reportId,
        sentCount,
      },
      status: 'sent',
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. 세션 상태 업데이트
    // ═══════════════════════════════════════════════════════════════════════════

    await supabase
      .from('atb_lesson_sessions')
      .update({ 
        report_sent: true,
        report_id: reportId,
      })
      .eq('id', session_id);

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          reportId,
          message: 'AI 감동 리포트 생성 완료',
          stats: {
            totalStudents: students.length,
            presentStudents: presentStudents.length,
            reportsSent: sentCount.success,
            reportsFailed: sentCount.failed,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('[SessionReport] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ ok: false, error: message, code: 'SESSION_REPORT_ERROR' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI Message Generation
// ═══════════════════════════════════════════════════════════════════════════════

async function generateAIMessage(params: {
  studentName: string;
  sessionName: string;
  sessionTime: string;
  attendanceStatus: string;
  vIndex: number;
  compatibilityScore: number;
  coachFeedback?: string;
}): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

  // OpenAI API가 없으면 템플릿 기반 메시지 생성
  if (!OPENAI_API_KEY) {
    return generateTemplateMessage(params);
  }

  try {
    const prompt = `
당신은 농구 아카데미의 친근한 코치입니다. 학부모에게 보낼 수업 완료 메시지를 작성해주세요.

학생 정보:
- 이름: ${params.studentName}
- 수업: ${params.sessionName}
- 시간: ${params.sessionTime}
- 출석: ${params.attendanceStatus === 'present' ? '출석' : '지각'}
- V-Index (성장지수): ${params.vIndex}/100
- 코치 궁합: ${params.compatibilityScore}%
${params.coachFeedback ? `- 코치 피드백: ${params.coachFeedback}` : ''}

요구사항:
1. 2-3문장으로 간결하게
2. 학생의 이름을 포함
3. 긍정적이고 따뜻한 톤
4. 구체적인 성장 포인트 언급
5. 이모지 1-2개 사용

메시지:
`.trim();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || generateTemplateMessage(params);

  } catch (error: unknown) {
    console.error('[SessionReport] AI generation error:', error);
    return generateTemplateMessage(params);
  }
}

function generateTemplateMessage(params: {
  studentName: string;
  sessionName: string;
  sessionTime: string;
  attendanceStatus: string;
  vIndex: number;
  coachFeedback?: string;
}): string {
  const { studentName, sessionName, sessionTime, attendanceStatus, vIndex, coachFeedback } = params;

  // V-Index 기반 맞춤 코멘트
  let growthComment = '';
  if (vIndex >= 80) {
    growthComment = '꾸준히 성장하고 있어요! 앞으로가 더 기대됩니다 🌟';
  } else if (vIndex >= 60) {
    growthComment = '열심히 노력하는 모습이 보여요! 💪';
  } else {
    growthComment = '오늘도 최선을 다해주었어요! 응원합니다 ❤️';
  }

  // 출석 상태 기반 인사
  const attendanceGreeting = attendanceStatus === 'late' 
    ? '조금 늦었지만 끝까지 열심히 해주었어요.'
    : '오늘도 수업에 참여해주었어요.';

  // 코치 피드백이 있으면 추가
  const feedbackLine = coachFeedback 
    ? `\n\n💬 코치 코멘트: "${coachFeedback}"`
    : '';

  return `${studentName} 학생, ${sessionName} 수업 완료! 🏀

${attendanceGreeting} ${growthComment}${feedbackLine}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Kakao Alimtalk
// ═══════════════════════════════════════════════════════════════════════════════

async function sendKakaoAlimtalk(phone: string, templateCode: string, variables: Record<string, string>) {
  const SOLAPI_API_KEY = Deno.env.get('SOLAPI_API_KEY');
  const SOLAPI_API_SECRET = Deno.env.get('SOLAPI_API_SECRET');
  const SOLAPI_PFID = Deno.env.get('SOLAPI_PFID');

  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET) {
    console.log('[SessionReport] Solapi not configured, skipping alimtalk');
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const timestamp = new Date().toISOString();
    const signature = await generateSignature(timestamp, SOLAPI_API_SECRET);

    // 알림톡 메시지 내용 구성
    const messageContent = `
[온리쌤] 수업 완료 알림

${variables.studentName} 학생의 오늘 수업이 끝났습니다.

📚 ${variables.sessionName}

${variables.message}

${variables.highlightUrl ? `\n▶ 성장 영상 보기\n${variables.highlightUrl}` : ''}

💝 감사 표현하기
${variables.gratitudeLink}
`.trim();

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${timestamp}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: phone.replace(/-/g, ''),
          from: Deno.env.get('SOLAPI_SENDER') || '01000000000',
          text: messageContent,
          kakaoOptions: {
            pfId: SOLAPI_PFID,
            templateId: templateCode,
            variables,
            buttons: [
              {
                buttonType: 'WL',
                buttonName: '성장 영상 보기',
                linkMobile: variables.highlightUrl || (Deno.env.get('APP_URL') || 'https://autus.app'),
                linkPc: variables.highlightUrl || (Deno.env.get('APP_URL') || 'https://autus.app'),
              },
              {
                buttonType: 'WL',
                buttonName: '💝 감사 표현하기',
                linkMobile: variables.gratitudeLink,
                linkPc: variables.gratitudeLink,
              },
            ],
          },
        },
      }),
    });

    return { sent: response.ok };
  } catch (error: unknown) {
    console.error('[SessionReport] Alimtalk error:', error);
    return { sent: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function generateSignature(timestamp: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
