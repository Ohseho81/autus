/**
 * 온리쌤 통합 서비스
 *
 * - 출석 체크 CRUD
 * - 결제 관리
 * - 알림 발송
 */

import { supabase, isSupabaseConnected } from '../pages/allthatbasket/lib/supabase.js';

// ============================================
// 📅 출석 관리 API
// ============================================
export const attendanceAPI = {
  // 오늘 출석 체크
  async checkIn(studentId, classId = null) {
    if (!isSupabaseConnected()) {
      console.log('[Attendance] 로컬 모드 - checkIn:', studentId);
      return { data: { id: Date.now(), student_id: studentId, status: 'present' }, error: null };
    }

    const today = new Date().toISOString().split('T')[0];
    const nowTimestamp = new Date().toISOString(); // Full ISO timestamp

    // 기존 출석 확인
    const { data: existing } = await supabase
      .from('atb_attendance')
      .select('id')
      .eq('student_id', studentId)
      .eq('attendance_date', today)
      .single();

    if (existing) {
      // 이미 출석 - 업데이트
      return supabase
        .from('atb_attendance')
        .update({ check_in_time: nowTimestamp, status: 'present' })
        .eq('id', existing.id)
        .select()
        .single();
    }

    // 새 출석 생성
    return supabase
      .from('atb_attendance')
      .insert({
        student_id: studentId,
        class_id: classId,
        attendance_date: today,
        check_in_time: nowTimestamp,
        status: 'present',
      })
      .select()
      .single();
  },

  // 체크아웃
  async checkOut(studentId) {
    if (!isSupabaseConnected()) {
      return { data: { status: 'checked_out' }, error: null };
    }

    const today = new Date().toISOString().split('T')[0];
    const nowTimestamp = new Date().toISOString(); // Full ISO timestamp

    return supabase
      .from('atb_attendance')
      .update({ check_out_time: nowTimestamp })
      .eq('student_id', studentId)
      .eq('attendance_date', today)
      .select()
      .single();
  },

  // 오늘 출석 현황
  async getTodayAttendance(classId = null) {
    if (!isSupabaseConnected()) {
      return { data: [], error: null };
    }

    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('atb_attendance')
      .select(`
        *,
        student:student_id(id, name, grade, position)
      `)
      .eq('attendance_date', today);

    if (classId) {
      query = query.eq('class_id', classId);
    }

    return query.order('check_in_time', { ascending: false });
  },

  // 학생별 출석 이력
  async getStudentHistory(studentId, days = 30) {
    if (!isSupabaseConnected()) {
      return { data: [], error: null };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return supabase
      .from('atb_attendance')
      .select('*')
      .eq('student_id', studentId)
      .gte('attendance_date', startDate.toISOString().split('T')[0])
      .order('attendance_date', { ascending: false });
  },

  // 출석률 계산
  async calculateAttendanceRate(studentId, days = 30) {
    const { data: records, error } = await this.getStudentHistory(studentId, days);
    if (error || !records) return 0;

    const presentCount = records.filter(r => r.status === 'present').length;
    // 주 3회 수업 기준
    const expectedCount = Math.floor(days / 7) * 3;
    return expectedCount > 0 ? Math.round((presentCount / expectedCount) * 100) : 100;
  },

  // 결석 처리
  async markAbsent(studentId, date, reason = null) {
    if (!isSupabaseConnected()) {
      return { data: { status: 'absent' }, error: null };
    }

    return supabase
      .from('atb_attendance')
      .upsert({
        student_id: studentId,
        attendance_date: date,
        status: 'absent',
        memo: reason,
      }, { onConflict: 'student_id,attendance_date' })
      .select()
      .single();
  },
};

// ============================================
// 💳 결제 관리 API
// ============================================
export const paymentAPI = {
  // 결제 생성
  async create(studentId, amount, month, description = '월 수강료') {
    if (!isSupabaseConnected()) {
      return { data: { id: Date.now(), status: 'pending' }, error: null };
    }

    return supabase
      .from('atb_payments')
      .insert({
        student_id: studentId,
        amount,
        payment_month: month, // '2026-02'
        description,
        status: 'pending',
        due_date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
      })
      .select()
      .single();
  },

  // 결제 완료 처리
  async complete(paymentId, method = 'card') {
    if (!isSupabaseConnected()) {
      return { data: { status: 'completed' }, error: null };
    }

    return supabase
      .from('atb_payments')
      .update({
        status: 'completed',
        payment_method: method,
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();
  },

  // 환불 처리
  async refund(paymentId, reason = null) {
    if (!isSupabaseConnected()) {
      return { data: { status: 'refunded' }, error: null };
    }

    return supabase
      .from('atb_payments')
      .update({
        status: 'refunded',
        memo: reason,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();
  },

  // 미결제 목록
  async getOutstanding() {
    if (!isSupabaseConnected()) {
      return { data: [], error: null };
    }

    return supabase
      .from('atb_payments')
      .select(`
        *,
        student:student_id(id, name, parent_phone, parent_name)
      `)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true });
  },

  // 학생별 결제 이력
  async getStudentPayments(studentId) {
    if (!isSupabaseConnected()) {
      return { data: [], error: null };
    }

    return supabase
      .from('atb_payments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
  },

  // 이번 달 매출
  async getMonthlyRevenue(month = null) {
    if (!isSupabaseConnected()) {
      return { total: 0, count: 0 };
    }

    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const { data, error } = await supabase
      .from('atb_payments')
      .select('amount')
      .eq('status', 'completed')
      .eq('payment_month', targetMonth);

    if (error || !data) return { total: 0, count: 0 };

    return {
      total: data.reduce((sum, p) => sum + (p.amount || 0), 0),
      count: data.length,
    };
  },

  // 연체 체크 및 상태 업데이트
  async checkOverdue() {
    if (!isSupabaseConnected()) {
      return { updated: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('atb_payments')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', today)
      .select();

    return { updated: data?.length || 0 };
  },
};

// ============================================
// 🔔 알림 서비스
// ============================================
export const notificationAPI = {
  // 알림 발송 (카카오톡/SMS 시뮬레이션)
  async send(type, recipient, data) {
    console.log(`[Notification] 발송: ${type} → ${recipient}`, data);

    // 실제 구현 시: 카카오 알림톡 API 또는 SMS API 연동
    // 현재는 로그만 남기고 성공 반환

    const notification = {
      id: Date.now(),
      type,
      recipient,
      data,
      status: 'sent',
      sent_at: new Date().toISOString(),
    };

    // Supabase에 발송 기록 저장 (테이블 있을 경우)
    if (isSupabaseConnected()) {
      try {
        await supabase.from('atb_notifications').insert(notification);
      } catch (e) {
        console.log('[Notification] 기록 저장 실패 (테이블 없음)');
      }
    }

    return { success: true, notification };
  },

  // 출석 알림
  async sendAttendanceAlert(studentName, parentPhone, status) {
    const messages = {
      present: `[온리쌤] ${studentName} 학생이 출석했습니다. 🏀`,
      absent: `[온리쌤] ${studentName} 학생이 오늘 결석입니다. 확인 부탁드립니다.`,
      late: `[온리쌤] ${studentName} 학생이 지각했습니다.`,
    };

    return this.send('attendance', parentPhone, {
      studentName,
      status,
      message: messages[status] || messages.present,
    });
  },

  // 결제 알림
  async sendPaymentAlert(studentName, parentPhone, amount, dueDate) {
    return this.send('payment', parentPhone, {
      studentName,
      amount,
      dueDate,
      message: `[온리쌤] ${studentName} 학생 수강료 ${amount.toLocaleString()}원 납부 안내입니다. 마감: ${dueDate}`,
    });
  },

  // 연체 알림
  async sendOverdueAlert(studentName, parentPhone, amount) {
    return this.send('overdue', parentPhone, {
      studentName,
      amount,
      message: `[온리쌤] ${studentName} 학생 수강료 ${amount.toLocaleString()}원이 연체되었습니다. 빠른 납부 부탁드립니다.`,
    });
  },

  // 일반 공지
  async sendAnnouncement(recipients, title, content) {
    const results = [];
    for (const phone of recipients) {
      const result = await this.send('announcement', phone, {
        title,
        content,
        message: `[온리쌤] ${title}\n${content}`,
      });
      results.push(result);
    }
    return results;
  },
};

// ============================================
// 📊 통합 서비스
// ============================================
export const allthatbasketService = {
  attendance: attendanceAPI,
  payment: paymentAPI,
  notification: notificationAPI,

  // 일일 리포트 생성
  async generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];

    const [attendance, outstanding, revenue] = await Promise.all([
      attendanceAPI.getTodayAttendance(),
      paymentAPI.getOutstanding(),
      paymentAPI.getMonthlyRevenue(),
    ]);

    const presentCount = (attendance.data || []).filter(a => a.status === 'present').length;
    const absentCount = (attendance.data || []).filter(a => a.status === 'absent').length;

    return {
      date: today,
      attendance: {
        present: presentCount,
        absent: absentCount,
        rate: presentCount + absentCount > 0
          ? Math.round((presentCount / (presentCount + absentCount)) * 100)
          : 100,
      },
      payment: {
        outstanding: (outstanding.data || []).length,
        outstandingAmount: (outstanding.data || []).reduce((sum, p) => sum + (p.amount || 0), 0),
      },
      revenue: revenue,
    };
  },

  // 학생 종합 현황
  async getStudentSummary(studentId) {
    const [attendanceRate, payments] = await Promise.all([
      attendanceAPI.calculateAttendanceRate(studentId),
      paymentAPI.getStudentPayments(studentId),
    ]);

    const pendingPayments = (payments.data || []).filter(p => p.status === 'pending' || p.status === 'overdue');

    return {
      studentId,
      attendanceRate,
      totalPayments: payments.data?.length || 0,
      pendingPayments: pendingPayments.length,
      pendingAmount: pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    };
  },
};

export default allthatbasketService;
