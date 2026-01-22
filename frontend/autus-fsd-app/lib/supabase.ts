/**
 * AUTUS FSD v2.0 — Supabase Real-time Integration
 */

import { createClient } from '@supabase/supabase-js';
import { useEffect, useCallback } from 'react';

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==================== 타입 정의 ====================

export interface StudentRecord {
  id: string;
  name: string;
  risk_score: number;
  signals: string[];
  status: 'critical' | 'warning' | 'normal';
  last_updated: string;
}

export interface RiskStudent {
  id: string;
  name: string;
  riskScore: number;
  reason: string;
  status: 'critical' | 'warning' | 'normal';
}

// ==================== 실시간 훅: 학생 위험도 스트림 ====================

export function useStudentRisksStream(
  onUpdate: (risks: RiskStudent[]) => void
) {
  const loadData = useCallback(async () => {
    if (!supabase) {
      // Supabase 없으면 더미 데이터 사용
      onUpdate([
        { id: '1', name: '김철수', riskScore: 82, reason: '출석률 저하', status: 'critical' },
        { id: '2', name: '박영희', riskScore: 45, reason: '안정권', status: 'warning' },
        { id: '3', name: '이민수', riskScore: 12, reason: '정상', status: 'normal' },
      ]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('risk_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      if (data) {
        const risks: RiskStudent[] = data.map((student: any) => ({
          id: student.id,
          name: student.name,
          riskScore: student.risk_score || student.churn_risk_score || 0,
          reason: student.signals?.[0] || student.memo || 'No signals',
          status:
            (student.risk_score || student.churn_risk_score || 0) > 200
              ? 'critical'
              : (student.risk_score || student.churn_risk_score || 0) > 100
              ? 'warning'
              : 'normal',
        }));
        onUpdate(risks);
      }
    } catch (err) {
      console.error('Failed to load student risks:', err);
      // 에러 시 더미 데이터
      onUpdate([
        { id: '1', name: '김철수', riskScore: 82, reason: '출석률 저하', status: 'critical' },
        { id: '2', name: '박영희', riskScore: 45, reason: '안정권', status: 'warning' },
      ]);
    }
  }, [onUpdate]);

  useEffect(() => {
    loadData();

    if (!supabase) return;

    // 실시간 구독 설정
    const subscription = supabase
      .channel('students-risk')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
        },
        (payload) => {
          console.log('📡 Real-time update:', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadData]);
}

// ==================== 카드 발송 액션 기록 ====================

export async function recordInterventionAction(
  studentId: string,
  actionType: 'card_sent' | 'consultation' | 'follow_up',
  details: Record<string, any>
) {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('card_dispatches').insert({
      student_id: studentId,
      card_type: actionType,
      content: JSON.stringify(details),
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to record intervention:', err);
    return false;
  }
}

// ==================== STATE 기계 전환 트리거 ====================

export async function updateAcademyState(
  academyId: string,
  newState: string
) {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('academy_settings')
      .upsert({
        academy_id: academyId,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to update academy state:', err);
    return false;
  }
}
