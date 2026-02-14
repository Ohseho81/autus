// ============================================
// AUTUS Churn Risk Detection API
// ============================================
// 
// "퇴원 막으면 돈 벌고, 못 막으면 무료"
// 퇴원 위험 학생 감지 및 상담 스크립트 생성
//

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Supabase credentials check for demo mode fallback
const supabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

// 위험 레벨별 권장 조치
const RISK_ACTIONS = {
  critical: {
    urgency: '즉시',
    actions: ['오늘 중 학부모 전화 상담', '원장 직접 면담 요청', '특별 관리 프로그램 제안'],
    template: 'AUTUS_CHURN_CRITICAL'
  },
  high: {
    urgency: '1주 내',
    actions: ['학부모 상담 일정 잡기', '학생 면담 진행', '수업 만족도 체크'],
    template: 'AUTUS_CHURN_HIGH'
  },
  medium: {
    urgency: '2주 내',
    actions: ['학부모 근황 확인 연락', '숙제/출석 관리 강화', '보충 수업 제안'],
    template: 'AUTUS_CHURN_MEDIUM'
  },
  low: {
    urgency: '정기',
    actions: ['월간 성적 리포트 발송', '칭찬 문자 발송'],
    template: 'AUTUS_CHURN_LOW'
  }
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET: 퇴원 위험 학생 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');
    const riskLevel = searchParams.get('riskLevel'); // critical, high, medium, low
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!supabaseConfigured) {
      // Demo 모드
      return NextResponse.json({
        success: true,
        demo_mode: true,
        data: getDemoChurnData()
      }, { status: 200, headers: corsHeaders });
    }

    const supabase = getSupabaseAdmin();

    let query = getSupabaseAdmin()
      .from('students')
      .select('*')
      .eq('status', 'active')
      .order('churn_risk_score', { ascending: false })
      .limit(limit);

    if (academyId) {
      query = query.eq('academy_id', academyId);
    }

    if (riskLevel) {
      query = query.eq('churn_risk_level', riskLevel);
    }

    const { data: students, error } = await query;

    if (error) throw error;

    // 위험 레벨별 집계
    const summary = {
      critical: students?.filter(s => s.churn_risk_level === 'critical').length || 0,
      high: students?.filter(s => s.churn_risk_level === 'high').length || 0,
      medium: students?.filter(s => s.churn_risk_level === 'medium').length || 0,
      low: students?.filter(s => s.churn_risk_level === 'low').length || 0,
      total: students?.length || 0
    };

    // 예상 퇴원 손실 계산
    const potentialLoss = students?.reduce((sum, s) => {
      if (s.churn_risk_level === 'critical' || s.churn_risk_level === 'high') {
        return sum + (parseFloat(s.monthly_fee) * 6); // 6개월 LTV
      }
      return sum;
    }, 0) || 0;

    // 각 학생에 권장 조치 추가
    const enrichedStudents = students?.map(student => ({
      ...student,
      recommended_actions: RISK_ACTIONS[student.churn_risk_level as keyof typeof RISK_ACTIONS],
      potential_loss: student.churn_risk_level === 'critical' || student.churn_risk_level === 'high'
        ? parseFloat(student.monthly_fee) * 6
        : 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary,
        potential_loss: potentialLoss,
        students: enrichedStudents
      }
    }, { status: 200, headers: corsHeaders });

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Churn API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: 퇴원 위험 분석 & 상담 스크립트 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, action } = body;

    if (!supabaseConfigured) {
      // Demo 모드
      return NextResponse.json({
        success: true,
        demo_mode: true,
        data: {
          script: generateDemoScript(),
          actions: RISK_ACTIONS.high.actions
        }
      }, { status: 200, headers: corsHeaders });
    }

    const supabase = getSupabaseAdmin();

    if (action === 'generate_script') {
      // 학생 정보 조회
      const { data: student, error } = await getSupabaseAdmin()
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (error) throw error;

      // AI 상담 스크립트 생성
      const script = await generateConsultationScript(student);

      return NextResponse.json({
        success: true,
        data: {
          student,
          script,
          recommended_actions: RISK_ACTIONS[student.churn_risk_level as keyof typeof RISK_ACTIONS]
        }
      }, { status: 200, headers: corsHeaders });
    }

    if (action === 'record_consultation') {
      // 상담 결과 기록
      const { outcome, notes, duration } = body;

      const { data: consultation, error } = await getSupabaseAdmin()
        .from('consultations')
        .insert({
          student_id: studentId,
          type: 'risk_triggered',
          trigger_reason: 'AUTUS 퇴원 위험 감지',
          conducted_at: new Date().toISOString(),
          duration_minutes: duration,
          notes,
          outcome
        })
        .select()
        .single();

      if (error) throw error;

      // 퇴원 방지 성공 시 Outcome Ledger에 기록
      if (outcome === 'retained') {
        const { data: student } = await getSupabaseAdmin()
          .from('students')
          .select('monthly_fee, academy_id')
          .eq('id', studentId)
          .single();

        if (student) {
          await getSupabaseAdmin()
            .from('outcome_ledger')
            .insert({
              academy_id: student.academy_id,
              outcome_type: 'retention',
              outcome_date: new Date().toISOString().split('T')[0],
              student_id: studentId,
              consultation_id: consultation.id,
              base_value: student.monthly_fee,
              multiplier: 6, // 6개월 LTV
              contribution_rate: 0.10,
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
              description: `퇴원 위험 학생 상담 후 유지 성공`
            });

          // 학생 상태 업데이트
          await getSupabaseAdmin()
            .from('students')
            .update({ 
              status: 'active',
              last_consultation_at: new Date().toISOString()
            })
            .eq('id', studentId);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          consultation,
          message: outcome === 'retained' 
            ? '🎉 퇴원 방지 성공! Outcome Ledger에 기록됨' 
            : '상담 기록 완료'
        }
      }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400, headers: corsHeaders }
    );

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Churn API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// AI 상담 스크립트 생성
async function generateConsultationScript(student: any): Promise<string> {
  const riskFactors = [];
  
  if (student.attendance_rate < 80) {
    riskFactors.push(`출석률이 ${student.attendance_rate}%로 낮습니다`);
  }
  if (student.homework_rate < 70) {
    riskFactors.push(`숙제 제출률이 ${student.homework_rate}%입니다`);
  }
  if (student.grade_trend < -10) {
    riskFactors.push(`최근 성적이 하락 추세입니다`);
  }
  if (student.payment_status !== 'paid') {
    riskFactors.push(`수강료 납부가 지연되고 있습니다`);
  }

  const script = `
📞 ${student.name} 학생 학부모님 상담 스크립트

[인사]
"안녕하세요, ${student.name} 학생 담당 선생님입니다.
요즘 ${student.name} 학생 학습 상황에 대해 말씀드리고 싶어서 연락드렸습니다."

[현황 공유]
${riskFactors.map(f => `• ${f}`).join('\n')}

[공감 표현]
"혹시 요즘 ${student.name} 학생이 학원 수업에 어려움을 느끼거나,
다른 고민이 있는지 여쭤봐도 될까요?"

[해결책 제안]
• 보충 수업 제안: "부족한 부분은 추가 보충 수업으로 도와드릴 수 있습니다"
• 상담 제안: "학생과 1:1 면담을 통해 학습 동기를 높여보겠습니다"
• 유연한 일정: "시간대 조정이 필요하시면 말씀해주세요"

[마무리]
"저희 학원에서 ${student.name} 학생이 좋은 성과를 거둘 수 있도록
최선을 다하겠습니다. 궁금하신 점 있으시면 언제든 연락주세요."

---
💡 AUTUS 팁: 학부모의 고민을 먼저 경청하세요.
위험 수준: ${student.churn_risk_level.toUpperCase()} (점수: ${student.churn_risk_score})
  `.trim();

  return script;
}

// 데모 데이터
function getDemoChurnData() {
  return {
    summary: {
      critical: 2,
      high: 2,
      medium: 2,
      low: 2,
      total: 8
    },
    potential_loss: 4200000, // 420만원
    students: [
      {
        id: 'demo-1',
        name: '윤지우',
        grade: '고3',
        churn_risk_score: 202,
        churn_risk_level: 'critical',
        attendance_rate: 60,
        homework_rate: 30,
        payment_status: 'delinquent',
        monthly_fee: 350000,
        potential_loss: 2100000,
        recommended_actions: RISK_ACTIONS.critical
      },
      {
        id: 'demo-2',
        name: '강민서',
        grade: '중1',
        churn_risk_score: 201,
        churn_risk_level: 'critical',
        attendance_rate: 55,
        homework_rate: 40,
        payment_status: 'delinquent',
        monthly_fee: 350000,
        potential_loss: 2100000,
        recommended_actions: RISK_ACTIONS.critical
      }
    ]
  };
}

function generateDemoScript() {
  return `
📞 학부모님 상담 스크립트

[인사]
"안녕하세요, 담당 선생님입니다."

[현황 공유]
• 최근 출석률이 낮아지고 있습니다
• 숙제 제출이 지연되고 있습니다

[해결책 제안]
• 보충 수업 제안
• 1:1 면담 진행
• 시간대 조정

💡 AUTUS 데모 모드
  `.trim();
}
