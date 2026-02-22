/**
 * 온리쌤 통합 관리 Hook
 * 수납/출석 일체화 + AUTUS V-Index/Risk Engine
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { calculateVIndex, calculateSatisfactionIndex } from '../../../lib/physics/v-index';
import { calculateRiskScore } from '../../../lib/physics/risk-engine';

// ============================================
// V-Index 계산 (선수용)
// ============================================
export function calculatePlayerVIndex(student) {
  const mint =
    (student.attendance_rate || 0) * 1000 +
    (student.skill_score || 0) * 500 +
    (student.game_performance || 0) * 300 +
    (student.months_enrolled || 1) * 100;

  const tax =
    ((100 - (student.attendance_rate || 100)) / 100) * 200 +
    (student.total_outstanding || 0) / 10000 * 50; // 미수금 패널티

  const satisfaction = calculateSatisfactionIndex({
    nps_score: student.parent_nps || 8,
    retention_rate: student.attendance_rate || 85,
    engagement_rate: student.engagement_score || 80,
    payment_punctuality: student.payment_status === 'paid' ? 100 : 70,
  });

  const time = student.months_enrolled || 1;
  const result = calculateVIndex({ M: mint, T: tax, s: satisfaction, t: time });

  return {
    ...result,
    player_metrics: {
      mint,
      tax,
      satisfaction: Math.round(satisfaction * 100),
      months: time,
    },
  };
}

// ============================================
// Risk 계산 (선수용)
// ============================================
export function calculatePlayerRisk(student) {
  const performanceChanges = [
    {
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      category: 'attendance',
      delta_m: student.attendance_rate >= 80 ? 5 : -10,
    },
    {
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      category: 'payment',
      delta_m: student.total_outstanding > 0 ? -15 : 5,
    },
    {
      timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      category: 'engagement',
      delta_m: (student.engagement_score || 70) >= 70 ? 3 : -8,
    },
  ];

  const satisfaction = (student.parent_nps || 8) / 10;

  return calculateRiskScore({
    student_id: student.id,
    performance_changes: performanceChanges,
    current_satisfaction: satisfaction,
    alpha: 1.5,
  });
}

// ============================================
// 메인 Hook
// ============================================
export default function useAllThatBasket() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ----------------------------------------
  // 학생 데이터 로드 (통합 뷰 사용)
  // ----------------------------------------
  const fetchStudents = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.log('[AllThatBasket] Supabase not configured, using mock data');
      setStudents(enrichWithAutus(MOCK_STUDENTS));
      setLoading(false);
      return;
    }

    try {
      // 통합 대시보드 뷰에서 데이터 가져오기
      const { data, error } = await supabase
        .from('atb_student_dashboard')
        .select('*')
        .order('name');

      if (error) throw error;

      setStudents(enrichWithAutus(data || []));
    } catch (err) {
      console.error('[AllThatBasket] Failed to fetch students:', err);
      setError(err.message);
      setStudents(enrichWithAutus(MOCK_STUDENTS));
    } finally {
      setLoading(false);
    }
  }, []);

  // ----------------------------------------
  // 수업 데이터 로드
  // ----------------------------------------
  const fetchClasses = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setClasses(MOCK_CLASSES);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('atb_classes')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      console.error('[AllThatBasket] Failed to fetch classes:', err);
      setClasses(MOCK_CLASSES);
    }
  }, []);

  // ----------------------------------------
  // 학생 추가
  // ----------------------------------------
  const addStudent = useCallback(async (studentData) => {
    if (!isSupabaseConfigured()) {
      console.log('[Mock] Add student:', studentData);
      return { success: true, data: { id: crypto.randomUUID(), ...studentData } };
    }

    try {
      const { data, error } = await supabase
        .from('atb_students')
        .insert(studentData)
        .select()
        .single();

      if (error) throw error;
      await fetchStudents(); // 리프레시
      return { success: true, data };
    } catch (err) {
      console.error('[AllThatBasket] Failed to add student:', err);
      return { success: false, error: err.message };
    }
  }, [fetchStudents]);

  // ----------------------------------------
  // 학생 수정
  // ----------------------------------------
  const updateStudent = useCallback(async (id, updates) => {
    if (!isSupabaseConfigured()) {
      console.log('[Mock] Update student:', id, updates);
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('atb_students')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchStudents();
      return { success: true };
    } catch (err) {
      console.error('[AllThatBasket] Failed to update student:', err);
      return { success: false, error: err.message };
    }
  }, [fetchStudents]);

  // ----------------------------------------
  // 출석 기록
  // ----------------------------------------
  const recordAttendance = useCallback(async (studentId, classId, status, dailyRevenue = 0) => {
    const record = {
      student_id: studentId,
      class_id: classId,
      attendance_date: new Date().toISOString().split('T')[0],
      status,
      daily_revenue: dailyRevenue,
      check_in_time: status === 'present' ? new Date().toISOString() : null,
      recorded_by: 'coach',
    };

    if (!isSupabaseConfigured()) {
      console.log('[Ledger] Attendance recorded (mock):', record);
      return { success: true, data: record };
    }

    try {
      const { data, error } = await supabase
        .from('atb_attendance')
        .upsert(record, { onConflict: 'student_id,class_id,attendance_date' })
        .select()
        .single();

      if (error) throw error;
      console.log('[Ledger] Attendance recorded:', data);
      return { success: true, data };
    } catch (err) {
      console.error('[AllThatBasket] Attendance record failed:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // ----------------------------------------
  // 수납 기록
  // ----------------------------------------
  const recordPayment = useCallback(async (studentId, amount, paymentMonth, method = 'card') => {
    const record = {
      student_id: studentId,
      amount,
      payment_month: paymentMonth,
      status: 'paid',
      paid_amount: amount,
      outstanding: 0,
      payment_method: method,
      paid_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      console.log('[Ledger] Payment recorded (mock):', record);
      return { success: true, data: record };
    }

    try {
      const { data, error } = await supabase
        .from('atb_payments')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      console.log('[Ledger] Payment recorded:', data);
      await fetchStudents(); // 수납 현황 갱신
      return { success: true, data };
    } catch (err) {
      console.error('[AllThatBasket] Payment record failed:', err);
      return { success: false, error: err.message };
    }
  }, [fetchStudents]);

  // ----------------------------------------
  // 미수금 등록
  // ----------------------------------------
  const createOutstanding = useCallback(async (studentId, amount, paymentMonth, dueDate) => {
    const record = {
      student_id: studentId,
      amount,
      payment_month: paymentMonth,
      status: 'pending',
      paid_amount: 0,
      outstanding: amount,
      due_date: dueDate,
    };

    if (!isSupabaseConfigured()) {
      console.log('[Ledger] Outstanding created (mock):', record);
      return { success: true, data: record };
    }

    try {
      const { data, error } = await supabase
        .from('atb_payments')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      await fetchStudents();
      return { success: true, data };
    } catch (err) {
      console.error('[AllThatBasket] Outstanding creation failed:', err);
      return { success: false, error: err.message };
    }
  }, [fetchStudents]);

  // ----------------------------------------
  // 출석 통계 조회
  // ----------------------------------------
  const getAttendanceStats = useCallback(async (studentId, startDate, endDate) => {
    if (!isSupabaseConfigured()) {
      return {
        total_sessions: 20,
        present: 18,
        absent: 1,
        late: 1,
        attendance_rate: 90,
      };
    }

    try {
      const { data, error } = await supabase
        .from('atb_attendance')
        .select('status')
        .eq('student_id', studentId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      if (error) throw error;

      const stats = {
        total_sessions: data.length,
        present: data.filter(a => a.status === 'present').length,
        absent: data.filter(a => a.status === 'absent').length,
        late: data.filter(a => a.status === 'late').length,
      };
      stats.attendance_rate = stats.total_sessions > 0
        ? Math.round((stats.present / stats.total_sessions) * 100)
        : 0;

      return stats;
    } catch (err) {
      console.error('[AllThatBasket] Failed to get attendance stats:', err);
      return null;
    }
  }, []);

  // ----------------------------------------
  // 헬퍼 함수들
  // ----------------------------------------
  const getAtRiskStudents = useCallback(() => {
    return students
      .filter(s => s.riskResult?.risk_level === 'HIGH' || s.riskResult?.risk_level === 'CRITICAL')
      .sort((a, b) => (b.riskResult?.risk_score || 0) - (a.riskResult?.risk_score || 0));
  }, [students]);

  const getAverageVIndex = useCallback(() => {
    if (students.length === 0) return 0;
    const sum = students.reduce((acc, s) => acc + (s.vIndexResult?.v_index || 0), 0);
    return Math.round(sum / students.length);
  }, [students]);

  const getStudentsWithOutstanding = useCallback(() => {
    return students.filter(s => (s.total_outstanding || 0) > 0);
  }, [students]);

  const getTotalOutstanding = useCallback(() => {
    return students.reduce((sum, s) => sum + (s.total_outstanding || 0), 0);
  }, [students]);

  // ----------------------------------------
  // 초기화
  // ----------------------------------------
  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [fetchStudents, fetchClasses]);

  return {
    // 데이터
    students,
    classes,
    loading,
    error,

    // CRUD
    fetchStudents,
    fetchClasses,
    addStudent,
    updateStudent,

    // 수납/출석
    recordAttendance,
    recordPayment,
    createOutstanding,
    getAttendanceStats,

    // 분석
    getAtRiskStudents,
    getAverageVIndex,
    getStudentsWithOutstanding,
    getTotalOutstanding,

    // AUTUS
    calculatePlayerVIndex,
    calculatePlayerRisk,
  };
}

// ============================================
// AUTUS 메트릭스 추가
// ============================================
function enrichWithAutus(students) {
  return students.map(student => ({
    ...student,
    vIndexResult: calculatePlayerVIndex(student),
    riskResult: calculatePlayerRisk(student),
  }));
}

// ============================================
// Mock 데이터
// ============================================
const MOCK_STUDENTS = [
  {
    id: '1',
    name: '김민준',
    phone: '010-1234-5678',
    parent_name: '김영희',
    parent_phone: '010-9876-5432',
    school: '대치초등학교',
    birth_year: 2015,
    grade: '초4',
    shuttle_required: true,
    uniform_number: 7,
    position: 'PG',
    class_name: 'A반 (주니어)',
    schedule_days: '월,수,금',
    schedule_time: '16:00',
    sessions_per_week: 3,
    monthly_fee: 450000,
    months_enrolled: 8,
    attendance_rate: 95,
    quarterly_attendance_rate: 92,
    payment_status: 'paid',
    total_outstanding: 0,
    total_daily_revenue: 1350000,
    skill_score: 85,
    game_performance: 80,
    parent_nps: 9,
    engagement_score: 90,
  },
  {
    id: '2',
    name: '이서연',
    phone: '010-2345-6789',
    parent_name: '이철수',
    parent_phone: '010-8765-4321',
    school: '역삼중학교',
    birth_year: 2012,
    grade: '중1',
    shuttle_required: false,
    uniform_number: 23,
    position: 'SG',
    class_name: 'A반 (주니어)',
    schedule_days: '월,수,금',
    schedule_time: '16:00',
    sessions_per_week: 3,
    monthly_fee: 450000,
    months_enrolled: 6,
    attendance_rate: 88,
    quarterly_attendance_rate: 85,
    payment_status: 'paid',
    total_outstanding: 0,
    total_daily_revenue: 810000,
    skill_score: 78,
    game_performance: 75,
    parent_nps: 8,
    engagement_score: 85,
  },
  {
    id: '3',
    name: '박지훈',
    phone: '010-3456-7890',
    parent_name: '박미영',
    parent_phone: '010-7654-3210',
    school: '개포초등학교',
    birth_year: 2016,
    grade: '초3',
    shuttle_required: true,
    uniform_number: 11,
    position: 'SF',
    class_name: 'B반 (키즈)',
    schedule_days: '화,목',
    schedule_time: '16:00',
    sessions_per_week: 2,
    monthly_fee: 350000,
    months_enrolled: 4,
    attendance_rate: 72,
    quarterly_attendance_rate: 68,
    payment_status: 'overdue',
    total_outstanding: 350000,
    total_daily_revenue: 420000,
    skill_score: 65,
    game_performance: 60,
    parent_nps: 6,
    engagement_score: 55,
  },
  {
    id: '4',
    name: '최예린',
    phone: '010-4567-8901',
    parent_name: '최정민',
    parent_phone: '010-6543-2109',
    school: '도곡중학교',
    birth_year: 2011,
    grade: '중2',
    shuttle_required: false,
    uniform_number: 5,
    position: 'PF',
    class_name: '엘리트반',
    schedule_days: '월,수,금,토',
    schedule_time: '18:00',
    sessions_per_week: 4,
    monthly_fee: 600000,
    months_enrolled: 12,
    attendance_rate: 98,
    quarterly_attendance_rate: 100,
    payment_status: 'paid',
    total_outstanding: 0,
    total_daily_revenue: 2160000,
    skill_score: 92,
    game_performance: 88,
    parent_nps: 10,
    engagement_score: 95,
  },
  {
    id: '5',
    name: '정우성',
    phone: '010-5678-9012',
    parent_name: '정수진',
    parent_phone: '010-5432-1098',
    school: '대치초등학교',
    birth_year: 2017,
    grade: '초2',
    shuttle_required: true,
    uniform_number: 33,
    position: 'C',
    class_name: 'B반 (키즈)',
    schedule_days: '화,목',
    schedule_time: '16:00',
    sessions_per_week: 2,
    monthly_fee: 350000,
    months_enrolled: 2,
    attendance_rate: 65,
    quarterly_attendance_rate: 60,
    payment_status: 'partial',
    total_outstanding: 175000,
    total_daily_revenue: 175000,
    skill_score: 50,
    game_performance: 45,
    parent_nps: 5,
    engagement_score: 45,
  },
];

const MOCK_CLASSES = [
  {
    id: 'a',
    name: 'A반 (주니어)',
    schedule_days: '월,수,금',
    schedule_time: '16:00',
    sessions_per_week: 3,
    monthly_fee: 450000,
    max_students: 15,
    status: 'active',
  },
  {
    id: 'b',
    name: 'B반 (키즈)',
    schedule_days: '화,목',
    schedule_time: '16:00',
    sessions_per_week: 2,
    monthly_fee: 350000,
    max_students: 12,
    status: 'active',
  },
  {
    id: 'elite',
    name: '엘리트반',
    schedule_days: '월,수,금,토',
    schedule_time: '18:00',
    sessions_per_week: 4,
    monthly_fee: 600000,
    max_students: 10,
    status: 'active',
  },
];
