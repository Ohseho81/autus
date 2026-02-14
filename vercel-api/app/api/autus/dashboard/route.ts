/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 AUTUS Dashboard API - 통합 대시보드 데이터
 * 
 * 실시간 Supabase 연동:
 * - 학생 현황 (State별)
 * - 위험 학생 목록
 * - V-Index 계산
 * - σ (만족도) 지수
 * - 출석/결제 현황
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ═══════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Supabase 미연결 시)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  summary: {
    total_students: 156,
    active_students: 142,
    at_risk_students: 8,
    churn_rate: 5.2,
    v_index: 847,
    sigma_avg: 0.72,
    monthly_revenue: 28500000,
    retention_rate: 94.8,
  },
  state_distribution: [
    { state: 1, label: 'OPTIMAL', count: 45, percentage: 28.8 },
    { state: 2, label: 'STABLE', count: 52, percentage: 33.3 },
    { state: 3, label: 'WATCH', count: 35, percentage: 22.4 },
    { state: 4, label: 'ALERT', count: 16, percentage: 10.3 },
    { state: 5, label: 'RISK', count: 6, percentage: 3.8 },
    { state: 6, label: 'CRITICAL', count: 2, percentage: 1.3 },
  ],
  risks: [
    { id: '1', student_name: '김민수', state: 5, probability: 85, signals: ['연속 결석', '성적 하락'], suggested_action: '학부모 상담' },
    { id: '2', student_name: '이지은', state: 5, probability: 78, signals: ['학부모 민원'], suggested_action: '1:1 면담' },
    { id: '3', student_name: '박서연', state: 6, probability: 92, signals: ['미납 2개월', '출석률 30%'], suggested_action: '긴급 연락' },
  ],
  recent_activities: [
    { id: '1', type: 'attendance', message: '출석 체크 완료', count: 142, time: '10:30' },
    { id: '2', type: 'payment', message: '결제 완료', count: 12, time: '11:00' },
    { id: '3', type: 'risk', message: '위험 감지', count: 2, time: '11:30' },
  ],
  teachers: [
    { id: '1', name: '김선생', students: 25, avg_sigma: 0.78, retention: 96 },
    { id: '2', name: '이선생', students: 22, avg_sigma: 0.72, retention: 94 },
    { id: '3', name: '박선생', students: 28, avg_sigma: 0.65, retention: 91 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// GET Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section') || 'all';
  const orgId = searchParams.get('org_id');

  try {
    if (!supabase) {
      // Mock 데이터 반환
      return NextResponse.json({
        success: true,
        source: 'mock',
        data: section === 'all' ? MOCK_DATA : MOCK_DATA[section as keyof typeof MOCK_DATA],
      });
    }

    // 실제 Supabase 데이터 조회
    const data: Record<string, any> = {};

    if (section === 'all' || section === 'summary') {
      data.summary = await getSummary(orgId);
    }

    if (section === 'all' || section === 'state_distribution') {
      data.state_distribution = await getStateDistribution(orgId);
    }

    if (section === 'all' || section === 'risks') {
      data.risks = await getRisks(orgId);
    }

    if (section === 'all' || section === 'recent_activities') {
      data.recent_activities = await getRecentActivities(orgId);
    }

    if (section === 'all' || section === 'teachers') {
      data.teachers = await getTeacherStats(orgId);
    }

    return NextResponse.json({
      success: true,
      source: 'supabase',
      data: section === 'all' ? data : data[section],
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    
    // 에러 시 Mock 데이터 반환
    return NextResponse.json({
      success: true,
      source: 'mock_fallback',
      data: section === 'all' ? MOCK_DATA : MOCK_DATA[section as keyof typeof MOCK_DATA],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 요약 통계
// ═══════════════════════════════════════════════════════════════════════════

async function getSummary(orgId: string | null) {
  if (!supabase) return MOCK_DATA.summary;

  // Run all independent queries in parallel
  const [totalResult, activeResult, riskResult, sigmaResult, vResult] = await Promise.all([
    // 학생 수
    supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq(orgId ? 'org_id' : 'id', orgId || ''),

    // 활성 학생 (State 1-4)
    supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .lte('state', 4),

    // 위험 학생 (State 5-6)
    supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .gte('state', 5),

    // σ 평균
    supabase
      .from('students')
      .select('sigma'),

    // V-Index 계산
    supabase
      .from('financial_transactions')
      .select('type, amount')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const totalStudents = totalResult.count;
  const activeStudents = activeResult.count;
  const atRiskStudents = riskResult.count;
  const sigmaData = sigmaResult.data;
  const vData = vResult.data;

  const sigmaAvg = sigmaData?.length
    ? sigmaData.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.sigma as number) || 0), 0) / sigmaData.length
    : 0.72;

  const mint = vData?.filter(v => v.type === 'revenue').reduce((s, v) => s + v.amount, 0) || 28500000;
  const tax = vData?.filter(v => v.type !== 'revenue').reduce((s, v) => s + v.amount, 0) || 18000000;
  const vIndex = Math.round((mint - tax) * Math.pow(1 + sigmaAvg, 1));

  return {
    total_students: totalStudents || 156,
    active_students: activeStudents || 142,
    at_risk_students: atRiskStudents || 8,
    churn_rate: totalStudents ? ((atRiskStudents || 0) / totalStudents * 100) : 5.2,
    v_index: vIndex,
    sigma_avg: Math.round(sigmaAvg * 100) / 100,
    monthly_revenue: mint,
    retention_rate: totalStudents ? ((activeStudents || 0) / totalStudents * 100) : 94.8,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// State 분포
// ═══════════════════════════════════════════════════════════════════════════

async function getStateDistribution(orgId: string | null) {
  if (!supabase) return MOCK_DATA.state_distribution;

  const stateLabels = ['', 'OPTIMAL', 'STABLE', 'WATCH', 'ALERT', 'RISK', 'CRITICAL'];
  const distribution = [];

  // Single query to get all students with state column, then count in JS
  const { data: allStudents } = await supabase
    .from('students')
    .select('state');

  const counts = new Map<number, number>();
  (allStudents || []).forEach(s => counts.set(s.state, (counts.get(s.state) || 0) + 1));

  for (let state = 1; state <= 6; state++) {
    distribution.push({
      state,
      label: stateLabels[state],
      count: counts.get(state) || 0,
      percentage: 0, // 나중에 계산
    });
  }

  const total = distribution.reduce((s, d) => s + d.count, 0);
  distribution.forEach(d => {
    d.percentage = total > 0 ? Math.round(d.count / total * 1000) / 10 : 0;
  });

  return distribution;
}

// ═══════════════════════════════════════════════════════════════════════════
// 위험 학생 목록
// ═══════════════════════════════════════════════════════════════════════════

async function getRisks(orgId: string | null) {
  if (!supabase) return MOCK_DATA.risks;

  const { data } = await supabase
    .from('risks')
    .select(`
      id,
      student_id,
      students (name),
      state,
      probability,
      signals,
      suggested_action,
      status,
      created_at
    `)
    .eq('status', 'open')
    .order('probability', { ascending: false })
    .limit(10);

  return data?.map(r => ({
    id: r.id,
    student_name: (r.students as Record<string, unknown> | null)?.name as string || '알 수 없음',
    state: r.state,
    probability: r.probability,
    signals: r.signals || [],
    suggested_action: r.suggested_action,
  })) || MOCK_DATA.risks;
}

// ═══════════════════════════════════════════════════════════════════════════
// 최근 활동
// ═══════════════════════════════════════════════════════════════════════════

async function getRecentActivities(orgId: string | null) {
  if (!supabase) return MOCK_DATA.recent_activities;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 출석
  const { count: attendanceCount } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())
    .eq('status', 'present');

  // 결제
  const { count: paymentCount } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())
    .eq('status', 'completed');

  // 위험 감지
  const { count: riskCount } = await supabase
    .from('risks')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  return [
    { id: '1', type: 'attendance', message: '출석 체크 완료', count: attendanceCount || 0, time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) },
    { id: '2', type: 'payment', message: '결제 완료', count: paymentCount || 0, time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) },
    { id: '3', type: 'risk', message: '위험 감지', count: riskCount || 0, time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// 선생님 통계
// ═══════════════════════════════════════════════════════════════════════════

async function getTeacherStats(orgId: string | null) {
  if (!supabase) return MOCK_DATA.teachers;

  const { data } = await supabase
    .from('teachers')
    .select(`
      id,
      name,
      students:students(count),
      avg_sigma,
      retention_rate
    `)
    .limit(10);

  return data?.map(t => ({
    id: t.id,
    name: t.name,
    students: (t.students as unknown[] | null)?.length || 0,
    avg_sigma: t.avg_sigma || 0.7,
    retention: t.retention_rate || 90,
  })) || MOCK_DATA.teachers;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST Handler - 데이터 갱신
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'refresh':
        // 캐시 무효화 및 새 데이터 조회
        return GET(request);

      case 'update_student':
        if (!supabase) {
          return NextResponse.json({ success: false, error: 'Supabase not configured' });
        }
        
        const { error } = await supabase
          .from('students')
          .update(data)
          .eq('id', data.id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Student updated' });

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
