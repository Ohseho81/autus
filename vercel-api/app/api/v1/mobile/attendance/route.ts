/**
 * 모바일 출석 — Supabase attendance 연동
 * GET /api/v1/mobile/attendance?org_id=xxx&date=2026-02-25
 * POST /api/v1/mobile/attendance { org_id, student_id, date, status }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const DEFAULT_ORG = '0219d7f2-5875-4bab-b921-f8593df126b8';

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id') || process.env.DEFAULT_ORG_ID || DEFAULT_ORG;
    const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const supabase = getSupabaseAdmin();

    const { data: students } = await supabase
      .from('students')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name');

    const studentIds = (students || []).map((s: { id: string }) => s.id);
    const studentMap = new Map((students || []).map((s: { id: string; name: string }) => [s.id, s.name]));

    if (studentIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { records: [], summary: { present: 0, absent: 0, late: 0, excused: 0, total: 0 } },
      });
    }

    const { data: attendance } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('org_id', orgId)
      .eq('session_date', date);

    const statusByStudent = new Map<string, string>();
    for (const a of attendance || []) {
      const sid = (a as { student_id: string }).student_id;
      const st = (['present', 'absent', 'late', 'excused'].includes((a as { status: string }).status) ? (a as { status: string }).status : 'absent') as string;
      const prev = statusByStudent.get(sid);
      const order = ['present', 'late', 'excused', 'absent'];
      if (!prev || order.indexOf(st) < order.indexOf(prev)) statusByStudent.set(sid, st);
    }

    const records = studentIds.map((studentId: string) => ({
      student_id: studentId,
      student_name: studentMap.get(studentId) || '알 수 없음',
      status: statusByStudent.get(studentId) || 'absent',
    }));

    const summary = {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      late: records.filter((r) => r.status === 'late').length,
      excused: records.filter((r) => r.status === 'excused').length,
      total: records.length,
    };

    return NextResponse.json({
      success: true,
      data: { records, summary },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { org_id, student_id, date, status } = body;
    const orgId = org_id || process.env.DEFAULT_ORG_ID || DEFAULT_ORG;

    if (!student_id || !date || !status) {
      return NextResponse.json(
        { success: false, error: 'student_id, date, status 필수' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('attendance')
      .upsert(
        {
          org_id: orgId,
          student_id,
          session_date: date,
          status,
          check_in_time: status === 'present' ? new Date().toISOString() : null,
          check_in_method: 'manual',
        },
        { onConflict: 'student_id,session_date' }
      );

    if (error) throw error;
    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
