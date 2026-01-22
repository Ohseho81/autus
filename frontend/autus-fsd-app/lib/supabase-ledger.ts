// lib/supabase-ledger.ts
// Ledger 기록 함수들 - Supabase RPC 호출

import { supabase } from './supabase';

/**
 * Supabase 클라이언트 null 체크
 */
function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check environment variables.');
  }
  return supabase;
}

/**
 * 1. Owner 결정 기록
 */
export async function recordOwnerDecision(
  academyId: string,
  decisionTitle: string,
  decisionType: string,
  expectedVImpact: number
) {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('인증 필요');

  const { data, error } = await sb.rpc('record_owner_decision', {
    p_owner_id: user.id,
    p_academy_id: academyId,
    p_decision_title: decisionTitle,
    p_decision_type: decisionType,
    p_decision_data: { title: decisionTitle, type: decisionType },
    p_expected_v_impact: expectedVImpact,
  });

  if (error) throw error;
  return data;
}

/**
 * 2. Principal 개입 기록
 */
export async function recordPrincipalIntervention(
  academyId: string,
  studentId: string,
  interventionType: string,
  targetIssue: string,
  actionDescription: string
) {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('인증 필요');

  const { data, error } = await sb.rpc('record_principal_intervention', {
    p_principal_id: user.id,
    p_academy_id: academyId,
    p_student_id: studentId,
    p_intervention_type: interventionType,
    p_target_issue: targetIssue,
    p_action_description: actionDescription,
  });

  if (error) throw error;
  return data;
}

/**
 * 3. Teacher 피드백 기록
 */
export async function recordTeacherAction(
  academyId: string,
  studentId: string,
  actionType: string,
  attendanceStatus: string,
  feedbackText: string,
  feedbackSentiment: 'positive' | 'constructive' | 'neutral'
) {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('인증 필요');

  const { data, error } = await sb.rpc('record_teacher_action', {
    p_teacher_id: user.id,
    p_academy_id: academyId,
    p_student_id: studentId,
    p_action_type: actionType,
    p_attendance_status: attendanceStatus,
    p_feedback_text: feedbackText,
    p_feedback_sentiment: feedbackSentiment,
  });

  if (error) throw error;
  return data;
}

/**
 * 4. Admin 운영 기록
 */
export async function recordAdminOperation(
  academyId: string,
  operationType: string,
  operationDetails: Record<string, unknown>
) {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('인증 필요');

  const { data, error } = await sb.rpc('record_admin_operation', {
    p_admin_id: user.id,
    p_academy_id: academyId,
    p_operation_type: operationType,
    p_operation_details: operationDetails,
  });

  if (error) throw error;
  return data;
}

/**
 * 5. Student 성과 기록
 */
export async function recordStudentAchievement(
  academyId: string,
  studentId: string,
  achievementType: string,
  description: string,
  scoreImpact: number
) {
  const sb = getSupabase();
  
  const { data, error } = await sb.rpc('record_student_achievement', {
    p_student_id: studentId,
    p_academy_id: academyId,
    p_achievement_type: achievementType,
    p_description: description,
    p_score_impact: scoreImpact,
  });

  if (error) throw error;
  return data;
}

/**
 * 6. Parent 관여 기록
 */
export async function recordParentEngagement(
  academyId: string,
  studentId: string,
  engagementType: string,
  details: Record<string, unknown>
) {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('인증 필요');

  const { data, error } = await sb.rpc('record_parent_engagement', {
    p_parent_id: user.id,
    p_academy_id: academyId,
    p_student_id: studentId,
    p_engagement_type: engagementType,
    p_details: details,
  });

  if (error) throw error;
  return data;
}

/**
 * V Score History 조회
 */
export async function getVScoreHistory(academyId: string) {
  const sb = getSupabase();
  
  const { data, error } = await sb
    .from('v_score_history')
    .select('*')
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return data;
}

/**
 * 최근 Ledger 항목 조회
 */
export async function getRecentLedgerEntries(academyId: string, limit: number = 50) {
  const sb = getSupabase();
  
  const { data, error } = await sb
    .from('outcome_ledger')
    .select('*')
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
