/**
 * 🏀 올댓바스켓 AUTUS 통합 Hook
 * V-Index, Risk Engine, Ledger 통합
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { calculateVIndex, calculateSatisfactionIndex } from '../../../lib/physics/v-index';
import { calculateRiskScore, batchRiskAnalysis } from '../../../lib/physics/risk-engine';

// ============================================
// 올댓바스켓 V-Index 계산
// V = (M - T) × (1 + s)^t
// ============================================

/**
 * 선수 V-Index 계산
 * @param {Object} student - 선수 데이터
 * @returns {Object} V-Index 결과
 */
export function calculatePlayerVIndex(student) {
  // M (Mint): 가치 생성
  const mint =
    (student.attendance_rate || 0) * 1000 +      // 출석률 × 1000
    (student.skill_score || 0) * 500 +           // 스킬 점수 × 500
    (student.game_performance || 0) * 300 +      // 경기 성과 × 300
    (student.months_enrolled || 1) * 100;        // 등록 기간 × 100

  // T (Tax): 가치 소모
  const tax =
    ((100 - (student.attendance_rate || 100)) / 100) * 200 +  // 결석 패널티
    (student.injuries || 0) * 100 +                            // 부상
    (student.warnings || 0) * 50;                              // 경고

  // s (Satisfaction): 학부모 만족도 (0-1)
  const satisfaction = calculateSatisfactionIndex({
    nps_score: student.parent_nps || 8,
    retention_rate: student.retention_likelihood || 85,
    engagement_rate: student.engagement_score || 80,
    payment_punctuality: student.payment_on_time || 90,
  });

  // t (Time): 등록 기간 (월)
  const time = student.months_enrolled || 1;

  // V-Index 계산
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

/**
 * 선수 위험도 계산
 * @param {Object} student - 선수 데이터
 * @param {Array} history - 성과 변화 히스토리
 * @returns {Object} 위험도 결과
 */
export function calculatePlayerRisk(student, history = []) {
  // 성과 변화 데이터 생성
  const performanceChanges = history.length > 0 ? history : [
    {
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      category: 'attendance',
      delta_m: (student.attendance_trend || 0) * 10,
    },
    {
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      category: 'grade',
      delta_m: (student.skill_trend || 0) * 10,
    },
    {
      timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      category: 'engagement',
      delta_m: (student.engagement_trend || 0) * 10,
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
// Supabase 데이터 Hook
// ============================================

export function useAllThatBasket() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 학생 데이터 로드
  const fetchStudents = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      // Mock 데이터 사용
      setStudents(MOCK_STUDENTS_WITH_VINDEX);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('atb_students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // V-Index 및 Risk 계산 추가
      const enrichedData = data.map(student => ({
        ...student,
        vIndexResult: calculatePlayerVIndex(student),
        riskResult: calculatePlayerRisk(student),
      }));

      setStudents(enrichedData);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setError(err.message);
      // 에러 시 Mock 데이터 사용
      setStudents(MOCK_STUDENTS_WITH_VINDEX);
    } finally {
      setLoading(false);
    }
  }, []);

  // 수업 데이터 로드
  const fetchClasses = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setClasses(MOCK_CLASSES);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('atb_classes')
        .select('*')
        .order('schedule_time', { ascending: true });

      if (error) throw error;
      setClasses(data);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
      setClasses(MOCK_CLASSES);
    }
  }, []);

  // 출석 기록 저장 (Ledger)
  const recordAttendance = useCallback(async (studentId, classId, status) => {
    const record = {
      student_id: studentId,
      class_id: classId,
      status, // 'present' | 'absent' | 'late'
      recorded_at: new Date().toISOString(),
      recorded_by: 'coach',
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('atb_attendance').insert(record);
      if (error) console.error('Attendance record failed:', error);
    }

    console.log('[Ledger] Attendance recorded:', record);
    return record;
  }, []);

  // 결제 기록 저장 (Ledger)
  const recordPayment = useCallback(async (studentId, amount, month) => {
    const record = {
      student_id: studentId,
      amount,
      month,
      status: 'completed',
      paid_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('atb_payments').insert(record);
      if (error) console.error('Payment record failed:', error);
    }

    console.log('[Ledger] Payment recorded:', record);
    return record;
  }, []);

  // 위험 학생 목록
  const getAtRiskStudents = useCallback(() => {
    return students
      .filter(s => s.riskResult?.risk_level === 'HIGH' || s.riskResult?.risk_level === 'CRITICAL')
      .sort((a, b) => (b.riskResult?.risk_score || 0) - (a.riskResult?.risk_score || 0));
  }, [students]);

  // 전체 V-Index 평균
  const getAverageVIndex = useCallback(() => {
    if (students.length === 0) return 0;
    const sum = students.reduce((acc, s) => acc + (s.vIndexResult?.v_index || 0), 0);
    return Math.round(sum / students.length);
  }, [students]);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [fetchStudents, fetchClasses]);

  return {
    students,
    classes,
    loading,
    error,
    fetchStudents,
    fetchClasses,
    recordAttendance,
    recordPayment,
    getAtRiskStudents,
    getAverageVIndex,
    calculatePlayerVIndex,
    calculatePlayerRisk,
  };
}

// ============================================
// Mock 데이터 (Supabase 연결 전)
// ============================================

const MOCK_STUDENTS_WITH_VINDEX = [
  {
    id: '1', name: '김민준', class: 'A반', position: 'PG',
    attendance_rate: 95, skill_score: 85, game_performance: 80,
    months_enrolled: 8, parent_nps: 9, engagement_score: 90,
    attendance_trend: 0.5, skill_trend: 0.3, engagement_trend: 0.2,
  },
  {
    id: '2', name: '이서연', class: 'A반', position: 'SG',
    attendance_rate: 90, skill_score: 78, game_performance: 75,
    months_enrolled: 6, parent_nps: 8, engagement_score: 85,
    attendance_trend: 0, skill_trend: 0.1, engagement_trend: 0,
  },
  {
    id: '3', name: '박지훈', class: 'B반', position: 'SF',
    attendance_rate: 75, skill_score: 72, game_performance: 60,
    months_enrolled: 4, parent_nps: 6, engagement_score: 65,
    attendance_trend: -0.3, skill_trend: -0.2, engagement_trend: -0.4,
  },
  {
    id: '4', name: '최예린', class: 'B반', position: 'PF',
    attendance_rate: 100, skill_score: 88, game_performance: 85,
    months_enrolled: 12, parent_nps: 10, engagement_score: 95,
    attendance_trend: 0.2, skill_trend: 0.5, engagement_trend: 0.3,
  },
  {
    id: '5', name: '정우성', class: 'A반', position: 'C',
    attendance_rate: 70, skill_score: 65, game_performance: 55,
    months_enrolled: 3, parent_nps: 5, engagement_score: 50,
    attendance_trend: -0.5, skill_trend: -0.3, engagement_trend: -0.6,
  },
].map(student => ({
  ...student,
  vIndexResult: calculatePlayerVIndex(student),
  riskResult: calculatePlayerRisk(student),
}));

const MOCK_CLASSES = [
  { id: 'a', name: 'A반 (주니어)', students: 3, schedule: '월/수/금 16:00' },
  { id: 'b', name: 'B반 (키즈)', students: 2, schedule: '화/목 16:00' },
  { id: 'elite', name: '엘리트반', students: 0, schedule: '토/일 10:00' },
];

export default useAllThatBasket;
