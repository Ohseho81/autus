/**
 * 모바일 대시보드 — Supabase atb_* 연동
 * GET /api/v1/mobile/dashboard?org_id=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const DEFAULT_ORG = '0219d7f2-5875-4bab-b921-f8593df126b8';

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id') || process.env.DEFAULT_ORG_ID || DEFAULT_ORG;
    const supabase = getSupabaseAdmin();

    // students (organization_id) 또는 atb_students 뷰
    const { data: students } = await supabase
      .from('students')
      .select('id, churn_risk, organization_id')
      .eq('organization_id', orgId);

    const totalStudents = students?.length ?? 0;
    const today = new Date().toISOString().slice(0, 10);

    const { data: attendance } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('org_id', orgId)
      .eq('session_date', today);

    const presentCount = attendance?.filter((a: { status: string }) => a.status === 'present').length ?? 0;
    const todayTotal = attendance?.length ?? 0;

    let overdueAmount = 0;
    let overdueCount = 0;
    try {
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'overdue');
      overdueCount = count ?? 0;
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('amount_due')
        .eq('org_id', orgId)
        .eq('status', 'overdue');
      overdueAmount = overdueInvoices?.reduce((s: number, i: { amount_due?: number }) => s + (Number(i?.amount_due) || 0), 0) ?? 0;
    } catch {
      // invoices 테이블 없을 수 있음
    }

    const atRisk = students?.filter((s: { churn_risk?: number }) => (Number(s.churn_risk) || 0) > 50).length ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        total_students: totalStudents,
        today_present: presentCount,
        today_attendance_total: todayTotal,
        overdue_amount: overdueAmount,
        overdue_count: overdueCount ?? 0,
        at_risk_count: atRisk,
        v_index: 0,
        urgent_alerts: [],
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
