/**
 * 온리쌤 Mobile API Service — Supabase Direct
 * 실제 DB 스키마 칼럼명 반영 (organization_id / org_id 혼재)
 *
 * organization_id: students, consultations, notifications, payments, lesson_slots
 * org_id: contracts, customer_temperatures, invoices, ops_action_queue_v02,
 *         org_settings, retention_events, attendance
 */
import { supabase, DEFAULT_ORG_ID } from '../lib/supabase';

class ApiService {
  private get orgId() {
    return DEFAULT_ORG_ID;
  }

  // ==========================================
  // Dashboard
  // ==========================================

  async getDashboardSummary() {
    const useAtb = process.env.EXPO_PUBLIC_USE_ATB_SCHEMA === 'true';

    // atb_* 스키마 (올댓바스켓/온리쌤) - 우선 사용
    if (useAtb) return this.getDashboardSummaryAtb();

    try {
      const today = new Date().toISOString().split('T')[0];

      // 기존 스키마: students (organization_id)
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', this.orgId);

      // 기존 스키마가 비어있으면 atb_* 시도
      if ((totalStudents || 0) === 0) {
        const atbResult = await this.getDashboardSummaryAtb();
        if (atbResult.data.total_students > 0) return atbResult;
      }

      // 오늘 출결 (attendance 테이블, org_id)
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('org_id', this.orgId)
        .eq('session_date', today);

      const presentCount = todayAttendance?.filter(a => a.status === 'present').length || 0;

      // 미수금 (invoices, org_id)
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('amount_due')
        .eq('org_id', this.orgId)
        .eq('status', 'overdue');

      const overdueTotal = overdueInvoices?.reduce((sum, inv) => sum + (inv.amount_due || 0), 0) || 0;

      // 위험 학생 (customer_temperatures, org_id)
      const { data: riskStudents } = await supabase
        .from('customer_temperatures')
        .select('id')
        .eq('org_id', this.orgId)
        .in('zone', ['hot', 'critical']);

      // 긴급 알림 (notifications, organization_id)
      const { data: urgentAlerts } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', this.orgId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        data: {
          total_students: totalStudents || 0,
          today_present: presentCount,
          today_attendance_total: todayAttendance?.length || 0,
          overdue_amount: overdueTotal,
          at_risk_count: riskStudents?.length || 0,
          v_index: 0,
          urgent_alerts: urgentAlerts || [],
        },
      };
    } catch (e) {
      console.warn('[API] getDashboardSummary default schema failed, trying atb:', e);
      return this.getDashboardSummaryAtb();
    }
  }

  private async getDashboardSummaryAtb() {
    try {
      let students: Array<{ enrollment_status?: string; attendance_rate?: number; total_outstanding?: number; risk_score?: number }> = [];
      const { data: dash } = await supabase.from('atb_student_dashboard').select('*');
      if (dash?.length) students = dash;
      else {
        const { data: raw } = await supabase.from('atb_students').select('enrollment_status, attendance_rate, total_outstanding');
        students = raw || [];
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: payments } = await supabase
        .from('atb_monthly_payments')
        .select('*')
        .eq('month', currentMonth)
        .maybeSingle();

      const { data: attendance } = await supabase.from('atb_today_attendance').select('*');

      const todayPresent = attendance?.reduce((s: number, c: { present_count?: number }) => s + (c.present_count || 0), 0) || 0;
      const todayTotal = attendance?.reduce((s: number, c: { total_students?: number }) => s + (c.total_students || 0), 0) || 0;
      const totalOutstanding = students.reduce((s, st) => s + (Number(st.total_outstanding) || 0), 0);
      const atRisk = students.filter((s) => (Number(s.risk_score) || 0) > 30).length;

      return {
        data: {
          total_students: students.length,
          today_present: todayPresent,
          today_attendance_total: todayTotal,
          overdue_amount: totalOutstanding,
          at_risk_count: atRisk,
          v_index: 0,
          urgent_alerts: [],
          monthly_collected: Number((payments as { collected_amount?: number })?.collected_amount) || 0,
        },
      };
    } catch (e) {
      console.warn('[API] getDashboardSummaryAtb failed:', e);
      return {
        data: {
          total_students: 0,
          today_present: 0,
          today_attendance_total: 0,
          overdue_amount: 0,
          at_risk_count: 0,
          v_index: 0,
          urgent_alerts: [],
        },
      };
    }
  }

  async getVIndex(_period: 'day' | 'week' | 'month' | 'year' = 'month') {
    // autus_nodes에 org 칼럼이 없으므로 전체 조회
    const { data } = await supabase
      .from('autus_nodes')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(30);

    return { data: { nodes: data || [] } };
  }

  // ==========================================
  // Students (organization_id)
  // ==========================================

  async getStudents(params?: {
    filter?: 'all' | 'at_risk' | 'warning' | 'normal';
    sort?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const useAtb = process.env.EXPO_PUBLIC_USE_ATB_SCHEMA === 'true';
    if (useAtb) return this.getStudentsAtb(params);

    let query = supabase
      .from('students')
      .select('*')
      .eq('organization_id', this.orgId)
      .order('name');

    if (params?.search) {
      query = query.ilike('name', `%${params.search}%`);
    }

    const pageSize = params?.limit || 50;
    const page = params?.page || 0;
    query = query.range(page * pageSize, (page + 1) * pageSize - 1);

    const { data } = await query;
    let students = data || [];

    // 기존 스키마 비어있으면 atb 시도
    if (students.length === 0) {
      const atbResult = await this.getStudentsAtb(params);
      if (atbResult.data?.students?.length) return atbResult;
    }

    // churn_risk 기반 필터
    if (params?.filter && params.filter !== 'all') {
      students = students.filter((s: any) => {
        const risk = s.churn_risk || 0;
        if (params.filter === 'at_risk') return risk >= 70;
        if (params.filter === 'warning') return risk >= 40 && risk < 70;
        return risk < 40;
      });
    }

    return {
      data: {
        students: students.map((s: any) => ({
          id: s.id,
          name: s.name,
          grade: s.grade || '',
          school: s.school || '',
          risk_score: s.churn_risk || 0,
          attendance_rate: 0,
          last_consultation: null,
          ...s,
        })),
      },
    };
  }

  private async getStudentsAtb(params?: {
    filter?: string;
    search?: string;
    limit?: number;
    page?: number;
  }) {
    try {
      const { data: dash } = await supabase.from('atb_student_dashboard').select('*').order('name');
      let rows = dash || [];
      if (rows.length === 0) {
        const { data: raw } = await supabase.from('atb_students').select('*').order('name');
        rows = (raw || []).map((s: any) => ({
          ...s,
          risk_score: s.risk_score ?? 0,
          attendance_rate: s.attendance_rate ?? 0,
        }));
      }
      return { data: { students: this.mapAtbStudents(rows, params) } };
    } catch (e) {
      console.warn('[API] getStudentsAtb failed:', e);
      return { data: { students: [] } };
    }
  }

  private mapAtbStudents(rows: any[], params?: { filter?: string; search?: string }) {
    let list = rows.map((s: any) => ({
      id: s.id,
      name: s.name,
      grade: s.grade || '',
      school: s.school || '',
      risk_score: Number(s.risk_score ?? 0),
      attendance_rate: Number(s.attendance_rate ?? 0),
    }));
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((s) => s.name?.toLowerCase().includes(q) || s.grade?.includes(q));
    }
    if (params?.filter && params.filter !== 'all') {
      list = list.filter((s) => {
        const r = s.risk_score;
        if (params.filter === 'at_risk') return r >= 70;
        if (params.filter === 'warning') return r >= 40 && r < 70;
        return r < 40;
      });
    }
    return list;
  }

  async getStudent(studentId: string) {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    // 최근 출결 (attendance 테이블)
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status, session_date')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .limit(30);

    // 상담 (consultations, organization_id — student_id로 필터)
    const { data: consults } = await supabase
      .from('consultations')
      .select('id, type, content, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10);

    const presentDays = attendance?.filter(a => a.status === 'present').length || 0;
    const attendanceRate = attendance?.length ? Math.round((presentDays / attendance.length) * 100) : 0;

    return {
      data: {
        ...data,
        attendance_rate: attendanceRate,
        recent_attendance: attendance || [],
        consultations: consults || [],
      },
    };
  }

  async createStudent(studentData: {
    name: string;
    grade?: string;
    school?: string;
    parent_name?: string;
    parent_phone?: string;
    parent_email?: string;
    tuition?: number;
    memo?: string;
  }) {
    const { data, error } = await supabase
      .from('students')
      .insert({ ...studentData, organization_id: this.orgId })
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  async updateStudent(studentId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  async deleteStudent(studentId: string) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) throw error;
    return { success: true };
  }

  async getStudentRiskHistory(studentId: string, period: string = 'month') {
    const { data } = await supabase
      .from('customer_temperatures')
      .select('temperature, risk_score, zone, measured_at')
      .eq('customer_id', studentId)
      .order('measured_at', { ascending: false })
      .limit(period === 'week' ? 7 : period === 'quarter' ? 90 : 30);

    return { data: { history: data || [] } };
  }

  // ==========================================
  // Attendance (attendance 테이블, org_id)
  // ==========================================

  async getAttendance(params?: { date?: string; student_id?: string }) {
    let query = supabase
      .from('attendance')
      .select('*, students!inner(name)')
      .eq('org_id', this.orgId)
      .order('session_date', { ascending: false });

    if (params?.date) {
      query = query.eq('session_date', params.date);
    }
    if (params?.student_id) {
      query = query.eq('student_id', params.student_id);
    }

    const { data } = await query.limit(100);
    return { data: { records: data || [] } };
  }

  async recordAttendance(record: {
    student_id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    note?: string;
  }) {
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        student_id: record.student_id,
        org_id: this.orgId,
        status: record.status,
        session_date: record.date,
        check_in_method: 'manual',
        notes: record.note,
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  // ==========================================
  // Payments / Invoices (invoices: org_id)
  // ==========================================

  async getPaymentsSummary(month?: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('org_id', this.orgId)
      .gte('due_date', `${targetMonth}-01`)
      .lt('due_date', `${targetMonth}-32`);

    const paid = invoices?.filter(i => i.status === 'paid') || [];
    const overdue = invoices?.filter(i => i.status === 'overdue') || [];
    const pending = invoices?.filter(i => i.status === 'pending' || i.status === 'sent') || [];

    return {
      data: {
        month: targetMonth,
        total: invoices?.length || 0,
        paid: paid.length,
        paid_amount: paid.reduce((s, i) => s + (i.amount_due || 0), 0),
        overdue: overdue.length,
        overdue_amount: overdue.reduce((s, i) => s + (i.amount_due || 0), 0),
        pending: pending.length,
        pending_amount: pending.reduce((s, i) => s + (i.amount_due || 0), 0),
        invoices: invoices || [],
      },
    };
  }

  async getOverduePayments() {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('org_id', this.orgId)
      .eq('status', 'overdue')
      .order('due_date');

    return { data: { overdue: data || [] } };
  }

  async sendPaymentReminder(paymentId: string, channel?: string, customMessage?: string) {
    const { data, error } = await supabase
      .from('message_outbox')
      .insert({
        type: 'payment_reminder',
        channel: channel || 'kakao',
        payload: { payment_id: paymentId, custom_message: customMessage },
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  // ==========================================
  // Consultations (organization_id)
  // ==========================================

  async getConsultations(params?: { student_id?: string; type?: string }) {
    let query = supabase
      .from('consultations')
      .select('*')
      .eq('organization_id', this.orgId)
      .order('created_at', { ascending: false });

    if (params?.student_id) query = query.eq('student_id', params.student_id);
    if (params?.type) query = query.eq('type', params.type);

    const { data } = await query.limit(50);
    return { data: { consultations: data || [] } };
  }

  async createConsultation(record: {
    student_id: string;
    type: 'regular' | 'risk' | 'complaint';
    content: string;
    result?: string;
    follow_up?: string[];
  }) {
    const { data, error } = await supabase
      .from('consultations')
      .insert({ ...record, organization_id: this.orgId })
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  // ==========================================
  // Risk / Churn (customer_temperatures: org_id)
  // ==========================================

  async getAtRiskStudents(riskLevel: 'all' | 'high' | 'medium' = 'all') {
    // 학생 테이블에서 churn_risk 기반 조회
    let query = supabase
      .from('students')
      .select('id, name, grade, school, churn_risk, retention_stage, engagement_score, consecutive_absence_days')
      .eq('organization_id', this.orgId)
      .not('churn_risk', 'is', null)
      .order('churn_risk', { ascending: false });

    if (riskLevel === 'high') {
      query = query.gte('churn_risk', 70);
    } else if (riskLevel === 'medium') {
      query = query.gte('churn_risk', 40).lt('churn_risk', 70);
    }

    const { data } = await query.limit(50);
    return { data: { students: data || [] } };
  }

  async generateConsultationScript(studentId: string, scenario?: string) {
    const { data, error } = await supabase.functions.invoke('chat-ai', {
      body: {
        action: 'consultation_script',
        student_id: studentId,
        scenario: scenario || 'risk_prevention',
      },
    });

    if (error) throw error;
    return { data };
  }

  async recordChurnOutcome(record: {
    student_id: string;
    consultation_id: string;
    outcome: 'prevented' | 'churned' | 'pending';
    monthly_fee?: number;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('retention_events')
      .insert({
        ...record,
        org_id: this.orgId,
        event_type: record.outcome,
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  // ==========================================
  // Actions (ops_action_queue_v02: org_id)
  // ==========================================

  async getActions(status: 'pending' | 'done' | 'all' = 'pending') {
    let query = supabase
      .from('ops_action_queue_v02')
      .select('*')
      .eq('org_id', this.orgId)
      .order('priority', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data } = await query.limit(50);
    return { data: { actions: data || [] } };
  }

  async completeAction(actionId: string, result?: string) {
    const { data, error } = await supabase
      .from('ops_action_queue_v02')
      .update({ status: 'done', result, completed_at: new Date().toISOString() })
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  // ==========================================
  // Timeline (canonical_events)
  // ==========================================

  async getTimeline(limit: number = 30) {
    const { data } = await supabase
      .from('canonical_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: { events: data || [] } };
  }

  // ==========================================
  // Forecast
  // ==========================================

  async getForecast() {
    // students의 churn_risk 기반 예측
    const { data: students } = await supabase
      .from('students')
      .select('churn_risk, retention_stage')
      .eq('organization_id', this.orgId)
      .not('churn_risk', 'is', null);

    const zones = { critical: 0, high: 0, medium: 0, low: 0, safe: 0 };
    students?.forEach((s: any) => {
      const risk = s.churn_risk || 0;
      if (risk >= 80) zones.critical++;
      else if (risk >= 60) zones.high++;
      else if (risk >= 40) zones.medium++;
      else if (risk >= 20) zones.low++;
      else zones.safe++;
    });

    const avgRisk = students?.length
      ? Math.round(students.reduce((s, t) => s + (t.churn_risk || 0), 0) / students.length)
      : 0;

    return { data: { zones, avg_risk: avgRisk, total: students?.length || 0 } };
  }

  // ==========================================
  // Lessons (lesson_slots: organization_id)
  // ==========================================

  async getLessonSlots(date?: string) {
    let query = supabase
      .from('lesson_slots')
      .select('*')
      .eq('organization_id', this.orgId)
      .order('start_time');

    if (date) {
      query = query.eq('date', date);
    }

    const { data } = await query;
    return { data: { lessons: data || [] } };
  }

  // ==========================================
  // Settings
  // ==========================================

  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return { data: data || { email: user.email, name: user.user_metadata?.name } };
  }

  async updateProfile(updates: { name?: string; phone?: string; email?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  async getAcademy() {
    const { data } = await supabase
      .from('academies')
      .select('*')
      .limit(1)
      .single();

    return { data: data || {} };
  }

  async updateAcademy(updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('academies')
      .update(updates)
      .eq('id', (await this.getAcademy()).data?.id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  async getOrgSettings() {
    const { data } = await supabase
      .from('org_settings')
      .select('*')
      .eq('org_id', this.orgId)
      .single();

    return { data: data || {} };
  }

  async getRiskSettings() {
    const settings = await this.getOrgSettings();
    return { data: (settings.data as any)?.risk_settings || {} };
  }

  async updateRiskSettings(updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('org_settings')
      .update({ risk_settings: updates })
      .eq('org_id', this.orgId)
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  async getNotificationSettings() {
    const settings = await this.getOrgSettings();
    return { data: (settings.data as any)?.notification_settings || {} };
  }

  async updateNotificationSettings(updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('org_settings')
      .update({ notification_settings: updates })
      .eq('org_id', this.orgId)
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  // ==========================================
  // Notifications (organization_id)
  // ==========================================

  async getNotifications(unreadOnly = false) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', this.orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data } = await query;
    return { data: { notifications: data || [] } };
  }

  async markNotificationRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  }

  // ==========================================
  // Score / Pay7 (org_id)
  // ==========================================

  async getScorePay7() {
    const { data } = await supabase
      .from('score_pay7_v02')
      .select('*')
      .eq('org_id', this.orgId)
      .order('score', { ascending: false })
      .limit(50);

    return { data: { scores: data || [] } };
  }
}

export const api = new ApiService();
