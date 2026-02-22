/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 V-Index Analyzer - 이탈 위험 자동 분석
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 철학: "데이터 마이닝으로 이탈 징후를 사전 감지하고 선제적 개입"
 *
 * 트리거:
 * - pg_cron 스케줄 (매일 오전 9시)
 * - 또는 수동 호출
 *
 * 분석 요소:
 * 1. 출석률 하락 (최근 4주 vs 이전 4주)
 * 2. 지각 빈도 증가
 * 3. 결제 지연/미납
 * 4. 감사 발생률 감소
 * 5. 수업 참여도 하락 (피드백 기반)
 *
 * 결과:
 * - V-Index 자동 업데이트
 * - 이탈 위험 학생 알림 (원장/관리자)
 * - 권장 액션 제안
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StudentRiskAnalysis {
  student_id: string;
  student_name: string;
  current_vindex: number;
  new_vindex: number;
  risk_level: 'safe' | 'caution' | 'risk' | 'critical';
  risk_factors: string[];
  recommended_actions: string[];
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

    console.log('[VIndexAnalyzer] Starting analysis...');

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. 모든 활성 학생 조회
    // ═══════════════════════════════════════════════════════════════════════════

    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    console.log('[VIndexAnalyzer] Analyzing', students?.length || 0, 'students');

    const analysisResults: StudentRiskAnalysis[] = [];
    const alerts: Array<{ student_id: string; name: string; v_index: number; risk_level: string; message: string }> = [];

    // 날짜 범위 설정
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. 학생별 분석
    // ═══════════════════════════════════════════════════════════════════════════

    for (const student of students || []) {
      const riskFactors: string[] = [];
      let vIndexDelta = 0;

      // 2-1. 출석률 분석
      const { data: recentAttendance } = await supabase
        .from('atb_session_students')
        .select('attendance_status, created_at')
        .eq('student_id', student.id)
        .gte('created_at', fourWeeksAgo.toISOString());

      const { data: previousAttendance } = await supabase
        .from('atb_session_students')
        .select('attendance_status, created_at')
        .eq('student_id', student.id)
        .gte('created_at', eightWeeksAgo.toISOString())
        .lt('created_at', fourWeeksAgo.toISOString());

      const recentRate = calculateAttendanceRate(recentAttendance || []);
      const previousRate = calculateAttendanceRate(previousAttendance || []);

      if (recentRate < previousRate - 20) {
        riskFactors.push(`출석률 급락 (${previousRate}% → ${recentRate}%)`);
        vIndexDelta -= 10;
      } else if (recentRate < 70) {
        riskFactors.push(`낮은 출석률 (${recentRate}%)`);
        vIndexDelta -= 5;
      }

      // 2-2. 지각 빈도 분석
      const lateCount = (recentAttendance || []).filter(a => a.attendance_status === 'late').length;
      const totalCount = (recentAttendance || []).length;

      if (totalCount > 0 && lateCount / totalCount > 0.3) {
        riskFactors.push(`잦은 지각 (${lateCount}/${totalCount}회)`);
        vIndexDelta -= 5;
      }

      // 2-3. 결제 상태 분석
      const { data: recentPayments } = await supabase
        .from('payment_records')
        .select('status, created_at')
        .eq('student_id', student.id)
        .gte('created_at', fourWeeksAgo.toISOString());

      const unpaidPayments = (recentPayments || []).filter(p => p.status !== 'DONE');
      if (unpaidPayments.length > 0) {
        riskFactors.push(`미납 ${unpaidPayments.length}건`);
        vIndexDelta -= 8;
      }

      // 2-4. 감사 발생률 분석
      const { data: recentGratitude } = await supabase
        .from('gratitude_records')
        .select('*')
        .eq('student_id', student.id)
        .gte('created_at', fourWeeksAgo.toISOString());

      const { data: previousGratitude } = await supabase
        .from('gratitude_records')
        .select('*')
        .eq('student_id', student.id)
        .gte('created_at', eightWeeksAgo.toISOString())
        .lt('created_at', fourWeeksAgo.toISOString());

      if ((previousGratitude?.length || 0) > 0 && (recentGratitude?.length || 0) === 0) {
        riskFactors.push('감사 발생 중단');
        vIndexDelta -= 5;
      }

      // 긍정 신호도 체크
      if ((recentGratitude?.length || 0) > (previousGratitude?.length || 0)) {
        vIndexDelta += 3; // 감사 증가 = 긍정 신호
      }
      if (recentRate > previousRate + 10) {
        vIndexDelta += 5; // 출석률 향상 = 긍정 신호
      }

      // 2-5. 새 V-Index 계산
      const currentVIndex = student.v_index || 50;
      const newVIndex = Math.max(0, Math.min(100, currentVIndex + vIndexDelta));

      // 2-6. 위험 레벨 결정
      let riskLevel: StudentRiskAnalysis['risk_level'] = 'safe';
      if (newVIndex < 30) {
        riskLevel = 'critical';
      } else if (newVIndex < 50) {
        riskLevel = 'risk';
      } else if (newVIndex < 70) {
        riskLevel = 'caution';
      }

      // 2-7. 권장 액션 생성
      const recommendedActions = generateRecommendedActions(riskFactors, riskLevel);

      // 결과 저장
      if (vIndexDelta !== 0 || riskFactors.length > 0) {
        analysisResults.push({
          student_id: student.id,
          student_name: student.name,
          current_vindex: currentVIndex,
          new_vindex: newVIndex,
          risk_level: riskLevel,
          risk_factors: riskFactors,
          recommended_actions: recommendedActions,
        });

        // V-Index 업데이트
        await supabase
          .from('students')
          .update({ 
            v_index: newVIndex,
            risk_level: riskLevel,
            last_analysis_at: new Date().toISOString(),
          })
          .eq('id', student.id);

        // 위험 학생은 알림 목록에 추가
        if (riskLevel === 'risk' || riskLevel === 'critical') {
          alerts.push({
            student_id: student.id,
            name: student.name,
            v_index: newVIndex,
            risk_level: riskLevel,
            message: riskFactors.join(', '),
          });
        }
      }
    }

    console.log('[VIndexAnalyzer] Analysis complete:', analysisResults.length, 'students updated');

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. 관리자 알림 발송 (위험 학생이 있는 경우)
    // ═══════════════════════════════════════════════════════════════════════════

    if (alerts.length > 0) {
      // 관리자 FCM 토큰 조회
      const { data: admins } = await supabase
        .from('staff')
        .select('fcm_token, phone')
        .eq('role', 'admin')
        .not('fcm_token', 'is', null);

      for (const admin of admins || []) {
        if (admin.fcm_token) {
          await sendFCMPush(admin.fcm_token, {
            title: '⚠️ 이탈 위험 학생 감지',
            body: `${alerts.length}명의 학생이 이탈 위험 상태입니다. 즉시 확인이 필요합니다.`,
            data: {
              type: 'risk_alert',
              count: alerts.length,
              students: alerts.map(a => a.name).join(', '),
            },
          });
        }
      }

      // 알림 로그 저장
      await supabase.from('atb_notification_logs').insert({
        type: 'risk_analysis',
        message: `이탈 위험 학생 ${alerts.length}명 감지`,
        metadata: { alerts },
        status: 'sent',
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. 분석 결과 저장
    // ═══════════════════════════════════════════════════════════════════════════

    await supabase.from('analysis_logs').insert({
      type: 'vindex_daily',
      analyzed_at: new Date().toISOString(),
      total_students: students?.length || 0,
      updated_students: analysisResults.length,
      risk_students: alerts.length,
      results: analysisResults,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          message: 'V-Index 분석 완료',
          stats: {
            totalStudents: students?.length || 0,
            updatedStudents: analysisResults.length,
            riskStudents: alerts.length,
          },
          alerts,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('[VIndexAnalyzer] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ ok: false, error: message, code: 'VINDEX_ANALYSIS_ERROR' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function calculateAttendanceRate(records: Array<{ attendance_status: string }>): number {
  if (records.length === 0) return 100;
  const present = records.filter(r => r.attendance_status === 'present' || r.attendance_status === 'late').length;
  return Math.round((present / records.length) * 100);
}

function generateRecommendedActions(riskFactors: string[], riskLevel: string): string[] {
  const actions: string[] = [];

  if (riskLevel === 'critical') {
    actions.push('🚨 즉시 학부모 상담 필요');
    actions.push('학생과 1:1 면담 권장');
  }

  if (riskFactors.some(f => f.includes('출석률'))) {
    actions.push('출석 독려 문자 발송');
    actions.push('수업 시간 조정 제안');
  }

  if (riskFactors.some(f => f.includes('지각'))) {
    actions.push('수업 전 알림 시간 조정');
    actions.push('셔틀 이용 제안');
  }

  if (riskFactors.some(f => f.includes('미납'))) {
    actions.push('결제 안내 문자 발송');
    actions.push('분납 옵션 제안');
  }

  if (riskFactors.some(f => f.includes('감사'))) {
    actions.push('특별 케어 제공');
    actions.push('성장 영상 추가 촬영');
  }

  if (actions.length === 0) {
    actions.push('지속적인 모니터링');
  }

  return actions;
}

async function sendFCMPush(token: string, notification: { title: string; body: string; data?: Record<string, unknown> }) {
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
  if (!FCM_SERVER_KEY) return { sent: false };

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: { title: notification.title, body: notification.body },
        data: notification.data,
      }),
    });
    return { sent: response.ok };
  } catch (error: unknown) {
    console.error('[VIndexAnalyzer] FCM error:', error);
    return { sent: false };
  }
}
