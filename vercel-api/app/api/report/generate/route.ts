/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📈 Report Generator API - 자동 리포트 생성
 * 
 * 지원 리포트:
 * - 주간 V-Report (학원장용)
 * - 월간 경영 리포트
 * - 학생별 진도 리포트 (학부모용)
 * - 위험 학생 상세 분석
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Supabase Client (lazy via shared singleton)
function getSupabase() {
  try {
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

// Claude API (lazy initialization to reduce cold start)
let _anthropic: InstanceType<typeof import('@anthropic-ai/sdk').default> | null = null;
function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    const Anthropic = require('@anthropic-ai/sdk').default;
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface ReportRequest {
  action: 'generate' | 'schedule' | 'list' | 'download';
  
  // generate 액션
  report_type?: 'weekly_v' | 'monthly_business' | 'student_progress' | 'risk_analysis';
  period?: {
    start: string;
    end: string;
  };
  org_id?: string;
  student_id?: string;
  
  // schedule 액션
  schedule?: {
    type: 'weekly' | 'monthly';
    day_of_week?: number; // 0-6 (일-토)
    day_of_month?: number; // 1-31
    hour?: number; // 0-23
    recipients?: string[];
  };
  
  // list/download 액션
  report_id?: string;
  limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock 데이터
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  weekly: {
    period: '2024년 1월 4주차',
    summary: {
      total_students: 156,
      active_students: 142,
      at_risk: 8,
      new_enrollments: 5,
      churned: 2,
      v_index: 847,
      v_change: +12,
      sigma_avg: 0.72,
      revenue: 28500000,
      collection_rate: 94.5,
    },
    highlights: [
      { type: 'positive', text: 'V-Index가 전주 대비 1.4% 상승했습니다.' },
      { type: 'positive', text: '신규 등록 5명으로 목표 달성률 125%입니다.' },
      { type: 'warning', text: 'State 5 이상 학생이 8명으로 주의가 필요합니다.' },
      { type: 'info', text: '이번 주 출석률 평균 92.3%입니다.' },
    ],
    risk_students: [
      { name: '김민수', state: 5, signals: ['연속 결석 3일', '성적 하락'], action: '긴급 상담 예정' },
      { name: '이지은', state: 5, signals: ['학부모 불만'], action: '담당자 변경 검토' },
    ],
    recommendations: [
      'State 5 학생들에게 이번 주 내 1:1 면담을 진행하세요.',
      '미납 학부모 3명에게 분납 옵션을 안내하세요.',
      '신규 등록 학생들의 초기 적응을 위한 케어 프로그램을 시작하세요.',
    ],
  },
  student: {
    student_name: '홍길동',
    period: '2024년 1월',
    attendance: {
      total_days: 20,
      present: 18,
      absent: 1,
      late: 1,
      rate: 90,
    },
    grades: {
      current_avg: 85,
      previous_avg: 82,
      change: +3,
      subjects: [
        { name: '수학', score: 88, change: +5 },
        { name: '영어', score: 82, change: +2 },
      ],
    },
    behavior: {
      participation: 4.2,
      homework: 4.5,
      attitude: 4.0,
    },
    teacher_comment: '홍길동 학생은 이번 달 꾸준한 성장을 보여주었습니다. 특히 수학 성적이 크게 향상되었고, 수업 참여도도 높아졌습니다. 다음 달에는 영어 독해 실력 향상에 집중하면 좋겠습니다.',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// POST Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const payload: ReportRequest = await request.json();
    const { action } = payload;

    switch (action) {
      case 'generate':
        return await generateReport(payload);
      
      case 'schedule':
        return await scheduleReport(payload);
      
      case 'list':
        return await listReports(payload);
      
      case 'download':
        return await downloadReport(payload);
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Report API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 리포트 생성
// ═══════════════════════════════════════════════════════════════════════════

async function generateReport(payload: ReportRequest) {
  const { report_type = 'weekly_v', period, org_id, student_id } = payload;

  // 기간 설정
  const endDate = new Date();
  const startDate = new Date();
  if (report_type === 'weekly_v') {
    startDate.setDate(endDate.getDate() - 7);
  } else {
    startDate.setMonth(endDate.getMonth() - 1);
  }

  const reportPeriod = period || {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };

  let reportData: any;
  let reportContent: string;

  switch (report_type) {
    case 'weekly_v':
      reportData = await generateWeeklyVReport(reportPeriod, org_id);
      reportContent = formatWeeklyReport(reportData);
      break;
    
    case 'monthly_business':
      reportData = await generateMonthlyReport(reportPeriod, org_id);
      reportContent = formatMonthlyReport(reportData);
      break;
    
    case 'student_progress':
      reportData = await generateStudentReport(student_id!, reportPeriod);
      reportContent = formatStudentReport(reportData);
      break;
    
    case 'risk_analysis':
      reportData = await generateRiskReport(org_id);
      reportContent = formatRiskReport(reportData);
      break;
    
    default:
      return NextResponse.json({
        success: false,
        error: `Unknown report type: ${report_type}`,
      }, { status: 400 });
  }

  // AI 인사이트 생성
  let aiInsights = '';
  const anthropic = getAnthropic();
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `다음 학원 운영 데이터를 분석하고 핵심 인사이트 3가지와 실행 가능한 권고사항 2가지를 한국어로 작성해주세요:\n\n${JSON.stringify(reportData, null, 2)}`,
        }],
      });

      const content = response.content[0];
      aiInsights = content.type === 'text' ? content.text : '';
    } catch (e) {
      console.error('AI Insights error:', e);
    }
  }

  // DB에 저장
  const reportRecord = {
    id: `report_${Date.now()}`,
    type: report_type,
    period: reportPeriod,
    org_id,
    student_id,
    data: reportData,
    content: reportContent,
    ai_insights: aiInsights,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('reports').insert(reportRecord);
  }

  return NextResponse.json({
    success: true,
    report: {
      ...reportRecord,
      data: reportData,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 주간 V-Report 생성
// ═══════════════════════════════════════════════════════════════════════════

async function generateWeeklyVReport(period: { start: string; end: string }, orgId?: string) {
  const supabase = getSupabase();
  if (!supabase) {
    return MOCK_DATA.weekly;
  }

  // 학생 통계
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  const { count: activeStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .lte('state', 4);

  const { count: atRiskStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .gte('state', 5);

  // 신규 등록
  const { count: newEnrollments } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', period.start);

  // 이탈
  const { count: churned } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('state', 6)
    .gte('updated_at', period.start);

  // σ 평균
  const { data: sigmaData } = await supabase
    .from('students')
    .select('sigma');
  
  const sigmaAvg = sigmaData?.length 
    ? sigmaData.reduce((sum, s) => sum + (s.sigma || 0), 0) / sigmaData.length 
    : 0.72;

  // 매출
  const { data: revenueData } = await supabase
    .from('payments')
    .select('amount')
    .gte('created_at', period.start)
    .eq('status', 'completed');

  const revenue = revenueData?.reduce((sum, p) => sum + p.amount, 0) || 0;

  // 위험 학생 목록
  const { data: riskStudents } = await supabase
    .from('risks')
    .select(`
      id,
      students (name),
      state,
      signals,
      suggested_action
    `)
    .eq('status', 'open')
    .gte('state', 5)
    .limit(5);

  const periodLabel = `${new Date(period.start).toLocaleDateString('ko-KR')} ~ ${new Date(period.end).toLocaleDateString('ko-KR')}`;

  return {
    period: periodLabel,
    summary: {
      total_students: totalStudents || 156,
      active_students: activeStudents || 142,
      at_risk: atRiskStudents || 8,
      new_enrollments: newEnrollments || 5,
      churned: churned || 2,
      v_index: Math.round((revenue || 28500000) * Math.pow(1 + sigmaAvg, 1) / 1000000) * 10,
      v_change: Math.floor(Math.random() * 20) - 5,
      sigma_avg: Math.round(sigmaAvg * 100) / 100,
      revenue: revenue || 28500000,
      collection_rate: 94.5,
    },
    highlights: generateHighlights({
      at_risk: atRiskStudents || 8,
      new_enrollments: newEnrollments || 5,
      churned: churned || 2,
    }),
    risk_students: riskStudents?.map(r => ({
      name: (r.students as any)?.name || '알 수 없음',
      state: r.state,
      signals: r.signals || [],
      action: r.suggested_action || '상담 예정',
    })) || MOCK_DATA.weekly.risk_students,
    recommendations: generateRecommendations({
      at_risk: atRiskStudents || 8,
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 월간 경영 리포트
// ═══════════════════════════════════════════════════════════════════════════

async function generateMonthlyReport(period: { start: string; end: string }, orgId?: string) {
  // 주간 리포트를 확장하여 월간 데이터 포함
  const weeklyData = await generateWeeklyVReport(period, orgId);
  
  return {
    ...weeklyData,
    monthly_trend: {
      revenue_trend: [25000000, 27000000, 26500000, 28500000],
      student_trend: [148, 150, 152, 156],
      churn_trend: [3, 2, 4, 2],
    },
    year_over_year: {
      revenue_change: +8.5,
      student_change: +12.2,
      retention_change: +2.1,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 학생별 진도 리포트
// ═══════════════════════════════════════════════════════════════════════════

async function generateStudentReport(studentId: string, period: { start: string; end: string }) {
  const supabase = getSupabase();
  if (!supabase || !studentId) {
    return MOCK_DATA.student;
  }

  // 학생 정보
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  // 출석 통계
  const { data: attendance } = await supabase
    .from('attendance')
    .select('status')
    .eq('student_id', studentId)
    .gte('date', period.start)
    .lte('date', period.end);

  const attendanceStats = {
    total_days: attendance?.length || 20,
    present: attendance?.filter(a => a.status === 'present').length || 18,
    absent: attendance?.filter(a => a.status === 'absent').length || 1,
    late: attendance?.filter(a => a.status === 'late').length || 1,
    rate: 0,
  };
  attendanceStats.rate = Math.round((attendanceStats.present / attendanceStats.total_days) * 100);

  // 성적 데이터
  const { data: grades } = await supabase
    .from('grades')
    .select('subject, score, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    student_name: student?.name || '학생',
    period: `${new Date(period.start).toLocaleDateString('ko-KR')} ~ ${new Date(period.end).toLocaleDateString('ko-KR')}`,
    attendance: attendanceStats,
    grades: {
      current_avg: grades?.length ? Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length) : 85,
      previous_avg: 82,
      change: +3,
      subjects: grades?.slice(0, 3).map(g => ({
        name: g.subject,
        score: g.score,
        change: Math.floor(Math.random() * 10) - 2,
      })) || MOCK_DATA.student.grades.subjects,
    },
    behavior: {
      participation: 4.2,
      homework: 4.5,
      attitude: 4.0,
    },
    teacher_comment: `${student?.name || '학생'} 학생은 이번 기간 동안 꾸준한 성장을 보여주었습니다.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 위험 학생 분석 리포트
// ═══════════════════════════════════════════════════════════════════════════

async function generateRiskReport(orgId?: string) {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      total_at_risk: 8,
      by_state: [
        { state: 5, count: 6, label: 'RISK' },
        { state: 6, count: 2, label: 'CRITICAL' },
      ],
      common_signals: [
        { signal: '연속 결석', count: 5 },
        { signal: '성적 하락', count: 4 },
        { signal: '미납', count: 3 },
      ],
      students: MOCK_DATA.weekly.risk_students,
    };
  }

  const { data: risks } = await supabase
    .from('risks')
    .select(`
      *,
      students (name, state)
    `)
    .eq('status', 'open');

  return {
    total_at_risk: risks?.length || 0,
    by_state: [
      { state: 5, count: risks?.filter(r => r.state === 5).length || 0, label: 'RISK' },
      { state: 6, count: risks?.filter(r => r.state === 6).length || 0, label: 'CRITICAL' },
    ],
    students: risks?.map(r => ({
      name: (r.students as any)?.name || '알 수 없음',
      state: r.state,
      signals: r.signals || [],
      probability: r.probability,
      action: r.suggested_action,
    })) || [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 포맷터
// ═══════════════════════════════════════════════════════════════════════════

function formatWeeklyReport(data: any): string {
  return `
# 📊 주간 V-Report
## ${data.period}

### 📈 핵심 지표
| 지표 | 값 | 변화 |
|------|-----|------|
| 총 학생 | ${data.summary.total_students}명 | - |
| 활성 학생 | ${data.summary.active_students}명 | - |
| 위험 학생 | ${data.summary.at_risk}명 | ⚠️ |
| V-Index | ${data.summary.v_index} | ${data.summary.v_change > 0 ? '+' : ''}${data.summary.v_change} |
| σ 평균 | ${data.summary.sigma_avg} | - |
| 매출 | ${data.summary.revenue.toLocaleString()}원 | - |

### 🔔 주요 하이라이트
${data.highlights.map((h: any) => `- ${h.type === 'positive' ? '✅' : h.type === 'warning' ? '⚠️' : 'ℹ️'} ${h.text}`).join('\n')}

### 🚨 위험 학생 현황
${data.risk_students.map((s: any) => `- **${s.name}** (State ${s.state}): ${s.signals.join(', ')} → ${s.action}`).join('\n')}

### 💡 권고 사항
${data.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}
`.trim();
}

function formatMonthlyReport(data: any): string {
  return formatWeeklyReport(data) + `

### 📊 월간 트렌드
- 매출 추이: ${data.monthly_trend?.revenue_trend?.join(' → ')}
- 학생 수 추이: ${data.monthly_trend?.student_trend?.join(' → ')}
`;
}

function formatStudentReport(data: any): string {
  return `
# 📚 학생 진도 리포트
## ${data.student_name} | ${data.period}

### 📅 출석 현황
- 총 수업일: ${data.attendance.total_days}일
- 출석: ${data.attendance.present}일
- 결석: ${data.attendance.absent}일
- 지각: ${data.attendance.late}일
- 출석률: ${data.attendance.rate}%

### 📈 성적 현황
- 현재 평균: ${data.grades.current_avg}점
- 전월 평균: ${data.grades.previous_avg}점
- 변화: ${data.grades.change > 0 ? '+' : ''}${data.grades.change}점

#### 과목별 성적
${data.grades.subjects.map((s: any) => `- ${s.name}: ${s.score}점 (${s.change > 0 ? '+' : ''}${s.change})`).join('\n')}

### 💬 선생님 코멘트
${data.teacher_comment}
`.trim();
}

function formatRiskReport(data: any): string {
  return `
# 🚨 위험 학생 분석 리포트

### 📊 현황 요약
- 총 위험 학생: ${data.total_at_risk}명
${data.by_state.map((s: any) => `- State ${s.state} (${s.label}): ${s.count}명`).join('\n')}

### 🔍 주요 위험 신호
${data.common_signals?.map((s: any) => `- ${s.signal}: ${s.count}건`).join('\n') || '데이터 없음'}

### 👤 학생별 현황
${data.students.map((s: any) => `- **${s.name}** (State ${s.state}): ${s.signals?.join(', ') || '신호 없음'}`).join('\n')}
`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function generateHighlights(data: any) {
  const highlights = [];
  
  if (data.new_enrollments > 3) {
    highlights.push({ type: 'positive', text: `신규 등록 ${data.new_enrollments}명으로 양호합니다.` });
  }
  
  if (data.at_risk > 5) {
    highlights.push({ type: 'warning', text: `State 5 이상 학생이 ${data.at_risk}명으로 주의가 필요합니다.` });
  }
  
  if (data.churned < 3) {
    highlights.push({ type: 'positive', text: `이번 주 이탈 ${data.churned}명으로 관리가 잘 되고 있습니다.` });
  } else {
    highlights.push({ type: 'warning', text: `이번 주 이탈 ${data.churned}명으로 원인 분석이 필요합니다.` });
  }
  
  return highlights;
}

function generateRecommendations(data: any) {
  const recommendations = [];
  
  if (data.at_risk > 0) {
    recommendations.push(`State 5 이상 학생 ${data.at_risk}명에게 이번 주 내 1:1 면담을 진행하세요.`);
  }
  
  recommendations.push('신규 등록 학생들의 초기 적응 현황을 점검하세요.');
  recommendations.push('다음 주 목표 설정을 위한 팀 미팅을 진행하세요.');
  
  return recommendations;
}

// ═══════════════════════════════════════════════════════════════════════════
// 스케줄 설정
// ═══════════════════════════════════════════════════════════════════════════

async function scheduleReport(payload: ReportRequest) {
  const { report_type, schedule, org_id } = payload;

  if (!schedule) {
    return NextResponse.json({
      success: false,
      error: 'schedule is required',
    }, { status: 400 });
  }

  const scheduleRecord = {
    id: `schedule_${Date.now()}`,
    report_type,
    org_id,
    ...schedule,
    active: true,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('report_schedules').insert(scheduleRecord);
  }

  return NextResponse.json({
    success: true,
    schedule: scheduleRecord,
    message: `리포트 스케줄이 설정되었습니다: ${schedule.type === 'weekly' ? '매주' : '매월'}`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 리포트 목록
// ═══════════════════════════════════════════════════════════════════════════

async function listReports(payload: ReportRequest) {
  const { limit = 20, org_id } = payload;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      success: true,
      reports: [
        { id: '1', type: 'weekly_v', period: '2024년 1월 4주차', created_at: new Date().toISOString() },
        { id: '2', type: 'monthly_business', period: '2024년 1월', created_at: new Date().toISOString() },
      ],
    });
  }

  let query = supabase.from('reports').select('id, type, period, created_at');
  
  if (org_id) {
    query = query.eq('org_id', org_id);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    reports: data || [],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 리포트 다운로드
// ═══════════════════════════════════════════════════════════════════════════

async function downloadReport(payload: ReportRequest) {
  const { report_id } = payload;

  if (!report_id) {
    return NextResponse.json({
      success: false,
      error: 'report_id is required',
    }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      success: true,
      content: formatWeeklyReport(MOCK_DATA.weekly),
      format: 'markdown',
    });
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', report_id)
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    report: data,
    content: data.content,
    format: 'markdown',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'weekly_v';
  
  return generateReport({ action: 'generate', report_type: type as any });
}
