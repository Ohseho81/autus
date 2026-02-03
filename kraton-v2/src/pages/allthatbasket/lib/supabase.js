/**
 * 🏀 올댓바스켓 Supabase + MoltBot Brain 통합 클라이언트
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// Supabase 클라이언트
// ============================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const isSupabaseConnected = () => !!supabase;

// ============================================
// MoltBot Brain 연동
// ============================================
const MOLTBOT_BRAIN_URL = import.meta.env.VITE_MOLTBOT_BRAIN_URL || '';
const SUPABASE_FUNCTION_URL = supabaseUrl ? `${supabaseUrl}/functions/v1` : '';

export const brainAPI = {
  // Brain 헬스 체크
  async health() {
    try {
      const url = MOLTBOT_BRAIN_URL || `${SUPABASE_FUNCTION_URL}/moltbot-brain`;
      const response = await fetch(`${url}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  },

  // 대시보드 조회
  async getDashboard() {
    try {
      const url = MOLTBOT_BRAIN_URL || `${SUPABASE_FUNCTION_URL}/moltbot-brain`;
      const response = await fetch(`${url}/dashboard`);
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  },

  // 위험 학생 조회
  async getAtRiskStudents() {
    try {
      const url = MOLTBOT_BRAIN_URL || `${SUPABASE_FUNCTION_URL}/moltbot-brain`;
      const response = await fetch(`${url}/students/at-risk`);
      return await response.json();
    } catch (error) {
      return { students: [], error: error.message };
    }
  },

  // 출석 이벤트 전송
  async sendAttendanceEvent(studentId, classId, status) {
    try {
      const url = MOLTBOT_BRAIN_URL
        ? `${MOLTBOT_BRAIN_URL}/api/moltbot/attendance`
        : `${SUPABASE_FUNCTION_URL}/attendance-chain`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          class_id: classId,
          status,
          timestamp: new Date().toISOString(),
        }),
      });
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  },

  // 결제 이벤트 전송
  async sendPaymentEvent(studentId, amount, month, status = 'paid') {
    try {
      const url = MOLTBOT_BRAIN_URL
        ? `${MOLTBOT_BRAIN_URL}/api/moltbot/payment`
        : `${SUPABASE_FUNCTION_URL}/payment-webhook`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          amount,
          month,
          status,
        }),
      });
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  },
};

// ============================================
// 학생 CRUD
// ============================================
export const studentAPI = {
  async getAll() {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_student_dashboard')
      .select('*')
      .order('name');

    return { data: data || [], error };
  },

  async getById(id) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_student_dashboard')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  },

  async create(studentData) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_students')
      .insert([{
        ...studentData,
        enrollment_status: 'active',
        enrollment_date: new Date().toISOString().split('T')[0],
      }])
      .select()
      .single();

    // QR 코드 생성
    if (data?.id) {
      await supabase.rpc('fn_generate_qr_code', { p_student_id: data.id });
    }

    return { data, error };
  },

  async update(id, updates) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async delete(id) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_students')
      .update({ enrollment_status: 'withdrawn' })
      .eq('id', id);

    return { data, error };
  },

  // 위험 학생 조회 (V-Index 낮은 순)
  async getAtRisk() {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_student_dashboard')
      .select('*')
      .or('attendance_rate.lt.70,risk_score.gt.30')
      .order('risk_score', { ascending: false });

    return { data: data || [], error };
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
      .select('*, coach:atb_coaches(name)')
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time');

    return { data: data || [], error };
  },

  async getToday() {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const today = new Date().getDay(); // 0=일, 1=월, ...

    const { data, error } = await supabase
      .from('atb_classes')
      .select('*, coach:atb_coaches(name)')
      .eq('is_active', true)
      .eq('day_of_week', today)
      .order('start_time');

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

  // 수업의 등록 학생 조회
  async getStudents(classId) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_enrollments')
      .select('*, student:atb_students(*)')
      .eq('class_id', classId)
      .eq('status', 'active');

    return { data: data?.map(e => e.student) || [], error };
  },
};

// ============================================
// 출석 기록
// ============================================
export const attendanceAPI = {
  // 오늘 출석 현황 (뷰 사용)
  async getToday() {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_today_attendance')
      .select('*');

    return { data: data || [], error };
  },

  // 특정 날짜/수업의 출석 조회
  async getByDateAndClass(date, classId) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_attendance')
      .select('*, student:atb_students(name, phone)')
      .eq('date', date)
      .eq('class_id', classId);

    return { data: data || [], error };
  },

  // 학생의 출석 이력
  async getByStudent(studentId, days = 90) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('atb_attendance')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    return { data: data || [], error };
  },

  // 출석 체크 (DB 함수 + Brain 연동)
  async check(studentId, classId, status, coachId = null) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    // 1. DB 함수로 출석 체크
    const { data: checkResult, error } = await supabase
      .rpc('fn_check_attendance', {
        p_student_id: studentId,
        p_class_id: classId,
        p_status: status,
        p_coach_id: coachId,
      });

    if (error) return { data: null, error };

    // 2. MoltBot Brain에 이벤트 전송
    const brainResult = await brainAPI.sendAttendanceEvent(studentId, classId, status);

    return {
      data: {
        ...checkResult,
        brain: brainResult,
      },
      error: null,
    };
  },

  // 일괄 출석 체크
  async checkBulk(classId, date, attendanceList) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const results = [];

    for (const { studentId, status, coachId } of attendanceList) {
      const result = await this.check(studentId, classId, status, coachId);
      results.push({ studentId, ...result });
    }

    return { data: results, error: null };
  },
};

// ============================================
// 수납 기록
// ============================================
export const paymentAPI = {
  // 월별 현황 (뷰 사용)
  async getMonthly() {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_monthly_payments')
      .select('*')
      .order('month', { ascending: false })
      .limit(12);

    return { data: data || [], error };
  },

  // 미수금 학생
  async getOutstanding() {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_payments')
      .select('*, student:atb_students(name, parent_phone)')
      .neq('status', 'paid')
      .order('due_date');

    return { data: data || [], error };
  },

  // 학생 수납 이력
  async getByStudent(studentId) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_payments')
      .select('*')
      .eq('student_id', studentId)
      .order('month', { ascending: false });

    return { data: data || [], error };
  },

  // 수납 처리 (DB 함수 + Brain 연동)
  async process(studentId, amount, month, method = 'card', transactionId = null) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    // 1. DB 함수로 결제 처리
    const { data: payResult, error } = await supabase
      .rpc('fn_process_payment', {
        p_student_id: studentId,
        p_amount: amount,
        p_month: month,
        p_payment_method: method,
        p_transaction_id: transactionId,
      });

    if (error) return { data: null, error };

    // 2. MoltBot Brain에 이벤트 전송
    const brainResult = await brainAPI.sendPaymentEvent(studentId, amount, month, 'paid');

    return {
      data: {
        ...payResult,
        brain: brainResult,
      },
      error: null,
    };
  },

  // 수납 생성 (월별 청구)
  async createMonthlyBill(studentId, amount, month, dueDate) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_payments')
      .insert({
        student_id: studentId,
        amount,
        month,
        status: 'pending',
        paid_amount: 0,
        due_date: dueDate,
      })
      .select()
      .single();

    return { data, error };
  },
};

// ============================================
// 코치 CRUD
// ============================================
export const coachAPI = {
  async getAll() {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_coaches')
      .select('*')
      .eq('is_active', true)
      .order('name');

    return { data: data || [], error };
  },
};

// ============================================
// 통계 조회
// ============================================
export const statsAPI = {
  async getDashboard() {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    // 학생 통계
    const { data: students } = await supabase
      .from('atb_student_dashboard')
      .select('*');

    // 이번 달 결제 통계
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: payments } = await supabase
      .from('atb_monthly_payments')
      .select('*')
      .eq('month', currentMonth)
      .single();

    // 오늘 출석 통계
    const { data: attendance } = await supabase
      .from('atb_today_attendance')
      .select('*');

    const totalStudents = students?.length || 0;
    const activeStudents = students?.filter(s => s.enrollment_status === 'active').length || 0;
    const avgAttendance = totalStudents > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.attendance_rate || 100), 0) / totalStudents)
      : 100;
    const totalOutstanding = students?.reduce((sum, s) => sum + (s.total_outstanding || 0), 0) || 0;
    const atRiskCount = students?.filter(s => (s.risk_score || 0) > 30).length || 0;

    const todayPresent = attendance?.reduce((sum, c) => sum + (c.present_count || 0), 0) || 0;
    const todayTotal = attendance?.reduce((sum, c) => sum + (c.total_students || 0), 0) || 0;

    return {
      data: {
        totalStudents,
        activeStudents,
        avgAttendance,
        totalOutstanding,
        atRiskCount,
        monthlyCollected: payments?.collected_amount || 0,
        monthlyTarget: payments?.total_amount || 0,
        todayPresent,
        todayTotal,
      },
      error: null,
    };
  },

  // MoltBot Brain 대시보드
  async getBrainDashboard() {
    return await brainAPI.getDashboard();
  },
};

// ============================================
// QR 코드
// ============================================
export const qrAPI = {
  async getByStudent(studentId) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_qr_codes')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single();

    return { data, error };
  },

  async generate(studentId) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data: code, error } = await supabase
      .rpc('fn_generate_qr_code', { p_student_id: studentId });

    return { data: code, error };
  },

  // QR 스캔으로 출석 체크
  async scanAndCheck(qrCode, classId) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    // 1. QR 코드로 학생 찾기
    const { data: qr, error: qrError } = await supabase
      .from('atb_qr_codes')
      .select('student_id, is_active')
      .eq('code', qrCode)
      .single();

    if (qrError || !qr?.is_active) {
      return { data: null, error: 'Invalid QR code' };
    }

    // 2. 출석 체크
    const result = await attendanceAPI.check(qr.student_id, classId, 'present');

    return result;
  },
};

// ============================================
// 업무(Tasks) CRUD
// ============================================
export const taskAPI = {
  async getAll(limit = 50) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: data || [], error };
  },

  async getByStatus(status) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_tasks')
      .select('*')
      .eq('status', status)
      .order('priority', { ascending: false })
      .order('due_date');

    return { data: data || [], error };
  },

  async getByRole(role) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_tasks')
      .select('*')
      .eq('role', role)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  },

  async create(taskData) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_tasks')
      .insert([{
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority || 'medium',
        status: taskData.status || 'pending',
        assignee: taskData.assignee,
        role: taskData.role,
        process_id: taskData.processId,
        process_name: taskData.processName,
        due_date: taskData.dueDate,
      }])
      .select()
      .single();

    return { data, error };
  },

  async update(id, updates) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async updateStatus(id, status) {
    return this.update(id, { status });
  },

  async delete(id) {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_tasks')
      .delete()
      .eq('id', id);

    return { data, error };
  },

  // 우선순위별 통계
  async getStats() {
    if (!supabase) return { data: null, error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_tasks')
      .select('status, priority, role');

    if (error) return { data: null, error };

    const stats = {
      total: data.length,
      byStatus: {},
      byPriority: {},
      byRole: {},
    };

    data.forEach(task => {
      stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
      if (task.role) {
        stats.byRole[task.role] = (stats.byRole[task.role] || 0) + 1;
      }
    });

    return { data: stats, error: null };
  },
};

// ============================================
// 개입 로그
// ============================================
export const interventionAPI = {
  async getByStudent(studentId) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_interventions')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20);

    return { data: data || [], error };
  },

  async getRecent(limit = 50) {
    if (!supabase) return { data: [], error: 'Supabase not connected' };

    const { data, error } = await supabase
      .from('atb_interventions')
      .select('*, student:atb_students(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: data || [], error };
  },
};

export default supabase;
