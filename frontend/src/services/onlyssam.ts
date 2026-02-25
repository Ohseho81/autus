/**
 * 온리쌤 Supabase 데이터 연동
 * kraton-v2 올댓바스켓 자료·기능 전달
 */

import { getSupabase } from './supabase';

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  avgAttendance: number;
  totalOutstanding: number;
  atRiskCount: number;
  newStudentsThisMonth: number;
  monthlyCollected: number;
  monthlyTarget: number;
  todayPresent: number;
  todayTotal: number;
  todayAttendanceRate: number;
}

export interface StudentRow {
  id: string;
  name: string;
  grade?: string;
  enrollment_status?: string;
  attendance_rate?: number;
  total_outstanding?: number;
  v_index?: number;
  risk_score?: number;
}

export interface ClassRow {
  id: string;
  name: string;
  start_time?: string;
  max_students?: number;
}

// ============================================
// statsAPI - 대시보드 KPI
// ============================================

export async function getDashboardStats(): Promise<{ data: DashboardStats | null; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: 'Supabase not connected' };

  try {
    let students: Array<Record<string, unknown>> = [];
    const { data: dashboardStudents } = await supabase
      .from('atb_student_dashboard')
      .select('*');
    if (dashboardStudents?.length) {
      students = dashboardStudents;
    } else {
      const { data: rawStudents } = await supabase
        .from('atb_students')
        .select('id, enrollment_status, attendance_rate, total_outstanding, enrollment_date, created_at');
      students = (rawStudents || []).map((s) => ({
        ...s,
        attendance_rate: Number((s as { attendance_rate?: number }).attendance_rate ?? 100),
        total_outstanding: Number((s as { total_outstanding?: number }).total_outstanding ?? 0),
      }));
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: payments } = await supabase
      .from('atb_monthly_payments')
      .select('*')
      .eq('month', currentMonth)
      .maybeSingle();

    const { data: attendance } = await supabase
      .from('atb_today_attendance')
      .select('*');

    const totalStudents = students?.length || 0;
    const totalOutstanding =
      students?.reduce((sum, s) => sum + (Number((s as { total_outstanding?: number }).total_outstanding) || 0), 0) || 0;
    const atRiskCount =
      students?.filter((s) => (Number((s as { risk_score?: number }).risk_score) || 0) > 30).length || 0;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const newStudentsThisMonth =
      students?.filter((s) => {
        const d = (s as { enrollment_date?: string }).enrollment_date || (s as { created_at?: string }).created_at;
        return d && String(d).slice(0, 10) >= startOfMonth;
      }).length || 0;

    const todayPresent = attendance?.reduce((sum, c) => sum + (Number((c as { present_count?: number }).present_count) || 0), 0) || 0;
    const todayTotal = attendance?.reduce((sum, c) => sum + (Number((c as { total_students?: number }).total_students) || 0), 0) || 0;
    const todayAttendanceRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0;

    const avgAttendance =
      totalStudents > 0
        ? Math.round(
            students.reduce((sum, s) => sum + (Number((s as { attendance_rate?: number }).attendance_rate) || 100), 0) /
              totalStudents
          )
        : 0;

    return {
      data: {
        totalStudents,
        activeStudents: students?.filter((s) => (s as { enrollment_status?: string }).enrollment_status === 'active').length || 0,
        avgAttendance,
        totalOutstanding,
        atRiskCount,
        newStudentsThisMonth,
        monthlyCollected: Number((payments as { collected_amount?: number })?.collected_amount) || 0,
        monthlyTarget: Number((payments as { total_amount?: number })?.total_amount) || 0,
        todayPresent,
        todayTotal,
        todayAttendanceRate,
      },
      error: null,
    };
  } catch (e) {
    console.error('[onlyssam.getDashboardStats]', e);
    return {
      data: {
        totalStudents: 0,
        activeStudents: 0,
        avgAttendance: 0,
        totalOutstanding: 0,
        atRiskCount: 0,
        newStudentsThisMonth: 0,
        monthlyCollected: 0,
        monthlyTarget: 0,
        todayPresent: 0,
        todayTotal: 0,
        todayAttendanceRate: 0,
      },
      error: String((e as Error)?.message || e),
    };
  }
}

// ============================================
// 학생·수업 데이터
// ============================================

export async function fetchStudents(): Promise<StudentRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data } = await supabase
      .from('atb_student_dashboard')
      .select('*')
      .order('name');
    if (data?.length) return data as StudentRow[];

    const { data: raw } = await supabase
      .from('atb_students')
      .select('id, name, grade, enrollment_status, attendance_rate, total_outstanding')
      .order('name');
    return (raw || []).map((s) => ({
      id: s.id,
      name: s.name,
      grade: s.grade,
      enrollment_status: s.enrollment_status,
      attendance_rate: Number(s.attendance_rate ?? 100),
      total_outstanding: Number(s.total_outstanding ?? 0),
    })) as StudentRow[];
  } catch (e) {
    console.error('[onlyssam.fetchStudents]', e);
    return [];
  }
}

export async function fetchClasses(): Promise<ClassRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data } = await supabase
      .from('atb_classes')
      .select('id, name, start_time, max_students')
      .eq('is_active', true)
      .order('name');
    return (data || []) as ClassRow[];
  } catch (e) {
    console.error('[onlyssam.fetchClasses]', e);
    return [];
  }
}
