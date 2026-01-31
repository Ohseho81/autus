/**
 * 🏀 올댓바스켓 Supabase 클라이언트
 * 실제 DB 연결 설정
 */

import { createClient } from '@supabase/supabase-js';

// 환경변수에서 Supabase 설정 로드
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase 클라이언트 생성
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// 연결 상태 확인
export const isSupabaseConnected = () => !!supabase;

// ============================================
// 학생 CRUD
// ============================================
export const studentAPI = {
  // 전체 조회 (대시보드 뷰 사용)
  async getAll() {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_student_dashboard')
      .select('*')
      .eq('status', 'active')
      .order('name');

    return { data: data || [], error };
  },

  // 단일 조회
  async getById(id) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_student_dashboard')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  },

  // 생성
  async create(studentData) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_students')
      .insert([{
        ...studentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    return { data, error };
  },

  // 수정
  async update(id, updates) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_students')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // 삭제 (soft delete)
  async delete(id) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_students')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id);

    return { data, error };
  },
};

// ============================================
// 수업 CRUD
// ============================================
export const classAPI = {
  async getAll() {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_classes')
      .select('*')
      .eq('status', 'active')
      .order('name');

    return { data: data || [], error };
  },

  async create(classData) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_classes')
      .insert([classData])
      .select()
      .single();

    return { data, error };
  },

  async update(id, updates) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_classes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },
};

// ============================================
// 출석 기록
// ============================================
export const attendanceAPI = {
  // 특정 날짜의 출석 조회
  async getByDate(date) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_attendance')
      .select('*, student:atb_students(name, class_name)')
      .eq('attendance_date', date);

    return { data: data || [], error };
  },

  // 학생의 출석 기록 조회
  async getByStudent(studentId, startDate, endDate) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    let query = supabase
      .from('atb_attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false });

    if (startDate) query = query.gte('attendance_date', startDate);
    if (endDate) query = query.lte('attendance_date', endDate);

    const { data, error } = await query;
    return { data: data || [], error };
  },

  // 출석 기록 (upsert)
  async record(studentId, classId, status, date = new Date().toISOString().split('T')[0]) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_attendance')
      .upsert({
        student_id: studentId,
        class_id: classId,
        attendance_date: date,
        status,
        check_in_time: status === 'present' || status === 'late' ? new Date().toISOString() : null,
        daily_revenue: status === 'present' ? 15000 : 0, // 일일 매출 계산
      }, {
        onConflict: 'student_id,class_id,attendance_date',
      })
      .select()
      .single();

    return { data, error };
  },
};

// ============================================
// 수납 기록
// ============================================
export const paymentAPI = {
  // 학생의 수납 기록 조회
  async getByStudent(studentId) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_payments')
      .select('*')
      .eq('student_id', studentId)
      .order('payment_month', { ascending: false });

    return { data: data || [], error };
  },

  // 미수금 학생 조회
  async getWithOutstanding() {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_payments')
      .select('*, student:atb_students(name, parent_phone)')
      .gt('outstanding', 0)
      .order('outstanding', { ascending: false });

    return { data: data || [], error };
  },

  // 수납 기록
  async record(studentId, amount, month, method = 'card') {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    // 기존 기록 확인
    const { data: existing } = await supabase
      .from('atb_payments')
      .select('*')
      .eq('student_id', studentId)
      .eq('payment_month', month)
      .single();

    if (existing) {
      // 기존 기록 업데이트
      const newPaidAmount = (existing.paid_amount || 0) + amount;
      const newOutstanding = Math.max(0, existing.amount - newPaidAmount);
      const newStatus = newOutstanding === 0 ? 'paid' : 'partial';

      const { data, error } = await supabase
        .from('atb_payments')
        .update({
          paid_amount: newPaidAmount,
          outstanding: newOutstanding,
          status: newStatus,
          payment_method: method,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      return { data, error };
    } else {
      // 새 기록 생성
      const { data: student } = await supabase
        .from('atb_students')
        .select('monthly_fee')
        .eq('id', studentId)
        .single();

      const monthlyFee = student?.monthly_fee || 350000;
      const outstanding = Math.max(0, monthlyFee - amount);
      const status = outstanding === 0 ? 'paid' : 'partial';

      const { data, error } = await supabase
        .from('atb_payments')
        .insert({
          student_id: studentId,
          amount: monthlyFee,
          payment_month: month,
          status,
          paid_amount: amount,
          outstanding,
          payment_method: method,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    }
  },
};

// ============================================
// 통계 조회
// ============================================
export const statsAPI = {
  // 전체 통계
  async getDashboardStats() {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data: students } = await supabase
      .from('atb_student_dashboard')
      .select('*')
      .eq('status', 'active');

    if (!students) return { data: null, error: 'Failed to fetch stats' };

    const totalStudents = students.length;
    const totalOutstanding = students.reduce((sum, s) => sum + (s.total_outstanding || 0), 0);
    const avgAttendance = totalStudents > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.attendance_rate || 0), 0) / totalStudents)
      : 0;
    const monthlyRevenue = students.reduce((sum, s) => sum + (s.monthly_fee || 0), 0);

    return {
      data: {
        totalStudents,
        totalOutstanding,
        avgAttendance,
        monthlyRevenue,
      },
      error: null,
    };
  },
};

export default supabase;
