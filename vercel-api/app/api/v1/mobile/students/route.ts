/**
 * 모바일 학생 목록 — Supabase students 연동
 * GET /api/v1/mobile/students?org_id=xxx&search=&page=0&limit=50
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const DEFAULT_ORG = '0219d7f2-5875-4bab-b921-f8593df126b8';

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id') || process.env.DEFAULT_ORG_ID || DEFAULT_ORG;
    const search = request.nextUrl.searchParams.get('search') || '';
    const page = Math.max(0, parseInt(request.nextUrl.searchParams.get('page') || '0', 10));
    const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)));
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('students')
      .select('id, name, grade, school, churn_risk')
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const from = page * limit;
    const to = from + limit - 1;
    const { data, error } = await query.range(from, to);

    if (error) throw error;

    const students = (data || []).map((s: { id: string; name: string; grade?: string; school?: string; churn_risk?: number }) => ({
      id: s.id,
      name: s.name,
      grade: s.grade || '',
      school: s.school || '',
      risk_score: Number(s.churn_risk) || 0,
      attendance_rate: 100,
    }));

    return NextResponse.json({
      success: true,
      data: { students },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
