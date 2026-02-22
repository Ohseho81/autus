/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔌 Supabase Direct API Service
 * 온리쌤 - 외부 API 서버 없이 Supabase 직접 연동
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '../lib/supabase';
import { captureError } from '../lib/sentry';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Student {
  id: string;
  name: string;
  phone?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  school?: string;
  grade?: string;
  uniform_number?: string;
  shuttle_required?: boolean;
  v_index?: number;
  risk_level?: 'high' | 'medium' | 'low' | 'safe';
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardSummary {
  total_students: number;
  v_index: number;
  v_change: number;
  attendance_rate: number;
  payment_rate: number;
  high_risk_count: number;
  overdue_count: number;
  urgent_alerts: UrgentAlert[];
  today_attendance: number;
  today_lessons: number;
}

export interface UrgentAlert {
  id: string;
  student_id: string;
  name: string;
  v_index: number;
  risk_level: string;
  message: string;
  type: string;
}

export interface VIndexDetail {
  v_index: number;
  risk_level: string;
  attendance_rate: number;
  payment_rate: number;
  engagement_score: number;
  loyalty_score: number;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  time?: string;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  status: string;
}

export interface Consultation {
  id: string;
  student_id: string;
  type: string;
  content: string;
  result?: string;
  follow_up?: string[];
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Supabase API Service
// ═══════════════════════════════════════════════════════════════════════════════

class SupabaseApiService {
  // ═══════════════════════════════════════════════════════════════════════════════
  // Dashboard
  // ═══════════════════════════════════════════════════════════════════════════════

  async getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_summary');

      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'getDashboardSummary' });
      
      // 함수가 없으면 수동 계산
      return this.calculateDashboardManually();
    }
  }

  private async calculateDashboardManually(): Promise<ApiResponse<DashboardSummary>> {
    try {
      // 총 학생 수 (atb_students 테이블 사용)
      const { count: totalStudents } = await supabase
        .from('atb_students')
        .select('id', { count: 'exact' })
        .eq('status', 'active');

      // 평균 V-Index
      const { data: students } = await supabase
        .from('atb_students')
        .select('v_index, risk_level')
        .eq('status', 'active');

      const avgVIndex = students?.length 
        ? students.reduce((sum, s) => sum + (s.v_index || 50), 0) / students.length 
        : 50;

      const highRiskCount = students?.filter(s => s.risk_level === 'high').length || 0;

      // 오늘 출석
      const today = new Date().toISOString().split('T')[0];
      const { count: todayAttendance } = await supabase
        .from('events')
        .select('id', { count: 'exact' })
        .eq('event_type', 'attendance')
        .eq('status', 'completed')
        .gte('event_at', `${today}T00:00:00`)
        .lte('event_at', `${today}T23:59:59`);

      // 긴급 알림 (고위험 학생)
      const { data: urgentStudents } = await supabase
        .from('atb_students')
        .select('id, name, v_index, risk_level')
        .eq('status', 'active')
        .eq('risk_level', 'high')
        .limit(5);

      const urgentAlerts: UrgentAlert[] = (urgentStudents || []).map(s => ({
        id: s.id,
        student_id: s.id,
        name: s.name,
        v_index: s.v_index || 0,
        risk_level: s.risk_level || 'high',
        message: `${s.name} 학생의 이탈 위험이 높습니다.`,
        type: 'risk',
      }));

      return {
        success: true,
        data: {
          total_students: totalStudents || 0,
          v_index: Math.round(avgVIndex * 10) / 10,
          v_change: -2.3,
          attendance_rate: 85,
          payment_rate: 92,
          high_risk_count: highRiskCount,
          overdue_count: highRiskCount,
          urgent_alerts: urgentAlerts,
          today_attendance: todayAttendance || 0,
          today_lessons: 3,
        },
      };
    } catch (error: unknown) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'calculateDashboardManually' });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getVIndex(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse> {
    try {
      const { data: students } = await supabase
        .from('atb_students')
        .select('v_index')
        .eq('status', 'active');

      const avgVIndex = students?.length 
        ? students.reduce((sum, s) => sum + (s.v_index || 50), 0) / students.length 
        : 50;

      return {
        success: true,
        data: {
          current: Math.round(avgVIndex * 10) / 10,
          previous: avgVIndex + 2.3,
          change: -2.3,
          period,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Students
  // ═══════════════════════════════════════════════════════════════════════════════

  async getStudents(params?: {
    filter?: 'all' | 'at_risk' | 'warning' | 'normal';
    sort?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Student[]>> {
    try {
      let query = supabase
        .from('atb_students')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });

      // 필터 적용
      if (params?.filter === 'at_risk') {
        query = query.eq('risk_level', 'high');
      } else if (params?.filter === 'warning') {
        query = query.in('risk_level', ['medium', 'low']);
      }

      // 검색
      if (params?.search) {
        query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%,parent_phone.ilike.%${params.search}%`);
      }

      // 페이지네이션
      const limit = params?.limit || 50;
      const page = params?.page || 1;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: unknown) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'getStudents' });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getStudent(studentId: string): Promise<ApiResponse<Student & VIndexDetail>> {
    try {
      // RPC 함수 사용 시도
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_student_detail', {
        p_student_id: studentId,
      });

      if (!rpcError && rpcData) {
        return { success: true, data: rpcData };
      }

      // 직접 조회
      const { data, error } = await supabase
        .from('atb_students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (error) throw error;

      // V-Index 계산
      const { data: vIndexData } = await supabase.rpc('calculate_v_index', {
        p_student_id: studentId,
      });

      return {
        success: true,
        data: {
          ...data,
          ...vIndexData?.[0],
        },
      };
    } catch (error: unknown) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'getStudent' });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async createStudent(data: Partial<Student>): Promise<ApiResponse<Student>> {
    try {
      const { data: newStudent, error } = await supabase
        .from('atb_students')
        .insert({
          name: data.name,
          phone: data.phone,
          parent_name: data.parent_name,
          parent_phone: data.parent_phone,
          parent_email: data.parent_email,
          school: data.school,
          grade: data.grade,
          uniform_number: data.uniform_number,
          shuttle_required: data.shuttle_required || false,
          status: 'active',
          v_index: 50,
          risk_level: 'safe',
        })
        .select()
        .single();

      if (error) throw error;

      // entities 테이블에도 추가 (Universal Schema)
      await supabase.from('entities').insert({
        id: newStudent.id,
        org_id: '00000000-0000-0000-0000-000000000001',
        type: 'student',
        name: data.name,
        phone: data.phone,
        status: 'active',
        v_index: 50,
        tier: 'T4',
      });

      return { success: true, data: newStudent };
    } catch (error: unknown) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'createStudent' });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async updateStudent(studentId: string, data: Partial<Student>): Promise<ApiResponse<Student>> {
    try {
      const { data: updatedStudent, error } = await supabase
        .from('atb_students')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)
        .select()
        .single();

      if (error) throw error;

      // entities 동기화
      await supabase
        .from('entities')
        .update({
          name: data.name,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId);

      return { success: true, data: updatedStudent };
    } catch (error: unknown) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'updateStudent' });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async deleteStudent(studentId: string): Promise<ApiResponse> {
    try {
      // Soft delete
      const { error } = await supabase
        .from('atb_students')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', studentId);

      if (error) throw error;

      await supabase
        .from('entities')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', studentId);

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // At Risk Students
  // ═══════════════════════════════════════════════════════════════════════════════

  async getAtRiskStudents(riskLevel: 'all' | 'high' | 'medium' = 'all'): Promise<ApiResponse<Student[]>> {
    try {
      // RPC 함수 시도
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_at_risk_students', {
        p_risk_level: riskLevel,
        p_limit: 50,
      });

      if (!rpcError && rpcData) {
        return { success: true, data: rpcData };
      }

      // 직접 조회
      let query = supabase
        .from('atb_students')
        .select('*')
        .eq('status', 'active')
        .order('v_index', { ascending: true });

      if (riskLevel !== 'all') {
        query = query.eq('risk_level', riskLevel);
      } else {
        query = query.in('risk_level', ['high', 'medium', 'low']);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Attendance
  // ═══════════════════════════════════════════════════════════════════════════════

  async getAttendance(params?: { date?: string; student_id?: string }): Promise<ApiResponse> {
    try {
      let query = supabase
        .from('events')
        .select(`
          id,
          entity_id,
          event_at,
          status,
          students (name)
        `)
        .eq('event_type', 'attendance')
        .order('event_at', { ascending: false });

      if (params?.date) {
        query = query
          .gte('event_at', `${params.date}T00:00:00`)
          .lte('event_at', `${params.date}T23:59:59`);
      }

      if (params?.student_id) {
        query = query.eq('entity_id', params.student_id);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async recordAttendance(data: {
    student_id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    note?: string;
  }): Promise<ApiResponse> {
    try {
      const { error } = await supabase.from('events').insert({
        org_id: '00000000-0000-0000-0000-000000000001',
        event_type: 'attendance',
        entity_id: data.student_id,
        value: data.status === 'present' || data.status === 'late' ? 1 : 0,
        status: data.status === 'present' || data.status === 'late' ? 'completed' : 'cancelled',
        source: 'manual',
        event_at: `${data.date}T09:00:00`,
      });

      if (error) throw error;

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Payments
  // ═══════════════════════════════════════════════════════════════════════════════

  async getPaymentsSummary(month?: string): Promise<ApiResponse> {
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const startDate = `${targetMonth}-01T00:00:00`;
      const endDate = `${targetMonth}-31T23:59:59`;

      const { data, error } = await supabase
        .from('events')
        .select('id, value, status')
        .eq('event_type', 'payment')
        .gte('event_at', startDate)
        .lte('event_at', endDate);

      if (error) throw error;

      const completed = data?.filter(p => p.status === 'completed') || [];
      const totalAmount = completed.reduce((sum, p) => sum + (p.value || 0), 0);

      return {
        success: true,
        data: {
          month: targetMonth,
          total_amount: totalAmount,
          payment_count: completed.length,
          success_rate: data?.length ? (completed.length / data.length) * 100 : 100,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getOverduePayments(): Promise<ApiResponse> {
    try {
      // 수업권 만료된 학생
      const { data, error } = await supabase
        .from('student_lesson_credits')
        .select(`
          id,
          student_id,
          remaining_lessons,
          expires_at,
          students (name, parent_phone)
        `)
        .eq('status', 'active')
        .or(`remaining_lessons.lte.0,expires_at.lt.${new Date().toISOString()}`);

      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Consultations
  // ═══════════════════════════════════════════════════════════════════════════════

  async getConsultationEvents(params?: { student_id?: string; type?: string }): Promise<ApiResponse<Consultation[]>> {
    try {
      let query = supabase
        .from('events')
        .select(`
          id,
          entity_id,
          event_at,
          status,
          students (name)
        `)
        .eq('event_type', 'consultation')
        .order('event_at', { ascending: false });

      if (params?.student_id) {
        query = query.eq('entity_id', params.student_id);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // 메타데이터에서 상세 정보 가져오기
      const consultations = await Promise.all(
        (data || []).map(async (c) => {
          const { data: meta } = await supabase
            .from('metadata')
            .select('key, value')
            .eq('target_type', 'event')
            .eq('target_id', c.id);

          const metaObj = (meta || []).reduce((acc, m) => {
            acc[m.key] = m.value;
            return acc;
          }, {} as Record<string, unknown>);

          return {
            id: c.id,
            student_id: c.entity_id,
            type: metaObj.consultation_type || 'regular',
            content: metaObj.content || '',
            result: metaObj.result,
            follow_up: metaObj.follow_up,
            created_at: c.event_at,
          };
        })
      );

      return { success: true, data: consultations };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async createConsultation(data: {
    student_id: string;
    type: 'regular' | 'risk' | 'complaint';
    content: string;
    result?: 'positive' | 'pending' | 'negative';
    follow_up?: string[];
  }): Promise<ApiResponse> {
    try {
      // 상담 이벤트 생성
      const { data: event, error } = await supabase
        .from('events')
        .insert({
          org_id: '00000000-0000-0000-0000-000000000001',
          event_type: 'consultation',
          entity_id: data.student_id,
          value: 1,
          status: 'completed',
          source: 'manual',
          event_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // 메타데이터 저장
      await supabase.rpc('set_metadata', {
        p_target_type: 'event',
        p_target_id: event.id,
        p_key: 'consultation_type',
        p_value: JSON.stringify(data.type),
        p_source: 'manual',
      });

      await supabase.rpc('set_metadata', {
        p_target_type: 'event',
        p_target_id: event.id,
        p_key: 'content',
        p_value: JSON.stringify(data.content),
        p_source: 'manual',
      });

      if (data.result) {
        await supabase.rpc('set_metadata', {
          p_target_type: 'event',
          p_target_id: event.id,
          p_key: 'result',
          p_value: JSON.stringify(data.result),
          p_source: 'manual',
        });
      }

      if (data.follow_up) {
        await supabase.rpc('set_metadata', {
          p_target_type: 'event',
          p_target_id: event.id,
          p_key: 'follow_up',
          p_value: JSON.stringify(data.follow_up),
          p_source: 'manual',
        });
      }

      return { success: true, data: event };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Settings
  // ═══════════════════════════════════════════════════════════════════════════════

  async getRiskSettings(): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase
        .from('v_index_weights')
        .select('*')
        .eq('org_id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        success: true,
        data: data || {
          high_risk_threshold: 40,
          medium_risk_threshold: 60,
          low_risk_threshold: 80,
          trust_weight: 0.25,
          satisfaction_weight: 0.30,
          engagement_weight: 0.25,
          loyalty_weight: 0.20,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async updateRiskSettings(data: {
    high_risk_threshold?: number;
    medium_risk_threshold?: number;
    weights?: {
      attendance?: number;
      payment?: number;
      engagement?: number;
      loyalty?: number;
    };
  }): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('v_index_weights')
        .upsert({
          org_id: '00000000-0000-0000-0000-000000000001',
          high_risk_threshold: data.high_risk_threshold || 40,
          medium_risk_threshold: data.medium_risk_threshold || 60,
          trust_weight: data.weights?.payment || 0.25,
          satisfaction_weight: data.weights?.attendance || 0.30,
          engagement_weight: data.weights?.engagement || 0.25,
          loyalty_weight: data.weights?.loyalty || 0.20,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Coach App (코치앱용)
  // ═══════════════════════════════════════════════════════════════════════════════

  async getTodaySessions(coachId?: string): Promise<ApiResponse> {
    try {
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('atb_lesson_sessions')
        .select('*')
        .eq('session_date', today)
        .order('start_time', { ascending: true });

      if (coachId) {
        query = query.eq('coach_id', coachId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async recordSessionEvent(data: {
    session_id: string;
    event_type: 'SESSION_START' | 'SESSION_END' | 'INCIDENT_FLAG';
    coach_id: string;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse> {
    try {
      const idempotencyKey = `${data.event_type}-${data.session_id}-${Date.now()}`;

      const { error } = await supabase.from('atb_session_events').insert({
        event_type: data.event_type,
        session_id: data.session_id,
        coach_id: data.coach_id,
        idempotency_key: idempotencyKey,
        metadata: data.metadata,
        occurred_at: new Date().toISOString(),
      });

      if (error) throw error;

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  // ═══════════════════════════════════════════════════════════════════════════════
  // 결제선생(PaySSAM) Invoices
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 결제선생 청구서 목록 조회
   */
  async getPaySSAMInvoices(params?: {
    studentId?: string;
    status?: string;
    limit?: number;
  }): Promise<ApiResponse> {
    try {
      let query = supabase
        .from('payment_invoices')
        .select(`
          id,
          student_id,
          parent_phone,
          amount,
          description,
          due_date,
          payssam_invoice_id,
          status,
          sent_at,
          paid_at,
          point_cost,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (params?.studentId) {
        query = query.eq('student_id', params.studentId);
      }
      if (params?.status) {
        query = query.eq('status', params.status);
      }

      const { data, error } = await query.limit(params?.limit || 50);

      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 미납 청구서 조회 (overdue + sent 중 기한 초과)
   */
  async getOverdueInvoices(orgId?: string): Promise<ApiResponse> {
    try {
      let query = supabase
        .from('payment_invoices')
        .select(`
          id,
          student_id,
          parent_phone,
          amount,
          description,
          due_date,
          status,
          sent_at,
          created_at
        `)
        .in('status', ['sent', 'overdue'])
        .lt('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 결제선생 월별 통계 조회
   */
  async getPaySSAMMonthlyStats(orgId?: string): Promise<ApiResponse> {
    try {
      let query = supabase
        .from('payssam_monthly_stats')
        .select('*')
        .order('month', { ascending: false })
        .limit(12);

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  // ═══════════════════════════════════════════════════════════════════════════
  // 💬 상담선생 (Consultation Teacher) 조회
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 상담 세션 조회 (학생별 또는 전체)
   */
  async getConsultations(params?: {
    studentId?: string;
    status?: string;
    limit?: number;
  }): Promise<ApiResponse> {
    try {
      let query = supabase
        .from('consultation_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(params?.limit || 50);

      if (params?.studentId) {
        query = query.eq('student_id', params.studentId);
      }
      if (params?.status) {
        query = query.eq('status', params.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 대기 중 상담 조회 (scheduled/reminded)
   */
  async getPendingConsultations(orgId?: string): Promise<ApiResponse> {
    try {
      let query = supabase
        .from('pending_consultations')
        .select('*');

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 상담 월별 통계
   */
  async getConsultationStats(orgId?: string): Promise<ApiResponse> {
    try {
      let query = supabase
        .from('consultation_monthly_stats')
        .select('*')
        .order('month', { ascending: false })
        .limit(12);

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 기록선생 (Record Teacher) 조회
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 학생별 수업 기록 조회
   */
  async getLessonRecords(params?: {
    studentId?: string;
    orgId?: string;
    logType?: string;
    limit?: number;
  }): Promise<ApiResponse> {
    try {
      let query = supabase
        .from('lesson_records')
        .select('*')
        .order('lesson_date', { ascending: false })
        .limit(params?.limit || 50);

      if (params?.studentId) {
        query = query.eq('student_id', params.studentId);
      }
      if (params?.orgId) {
        query = query.eq('org_id', params.orgId);
      }
      if (params?.logType) {
        query = query.eq('log_type', params.logType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 학생 포트폴리오 통계 뷰 조회 (크로스 org)
   */
  async getStudentPortfolioView(studentId: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase
        .from('student_portfolio_stats')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 최근 7일 수업 기록 조회
   */
  async getRecentRecords(orgId?: string): Promise<ApiResponse> {
    try {
      let query = supabase
        .from('recent_lesson_records')
        .select('*');

      if (orgId) {
        query = query.eq('org_id', orgId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

export const supabaseApi = new SupabaseApiService();
export default supabaseApi;
