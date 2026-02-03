/**
 * AUTUS Demo Data
 * For testing UI without backend
 */

import { v4 as uuidv4 } from 'uuid';
import type { DecisionCard, Rule, Eligibility } from './core/schema';
import { calculateDeadline } from './core/rules';

export const DEMO_DECISIONS: DecisionCard[] = [
  {
    id: uuidv4(),
    subject_id: 'stu_001',
    subject_type: 'exception',
    action_type: 'approve',
    decision_cost: 'HIGH',
    reversibility: 'hard',
    blast_radius: 'local',
    deadline: calculateDeadline(12),
    created_at: new Date().toISOString(),
    summary: 'REFUND: 학생 이사로 인한 환불 요청 ₩150,000',
  },
  {
    id: uuidv4(),
    subject_id: 'stu_002',
    subject_type: 'attendance',
    action_type: 'approve',
    decision_cost: 'MED',
    reversibility: 'easy',
    blast_radius: 'local',
    deadline: calculateDeadline(24),
    created_at: new Date().toISOString(),
    summary: '3회 연속 결석 - 에스컬레이션 필요',
  },
  {
    id: uuidv4(),
    subject_id: 'pay_003',
    subject_type: 'payment',
    action_type: 'approve',
    decision_cost: 'LOW',
    reversibility: 'easy',
    blast_radius: 'local',
    deadline: calculateDeadline(48),
    created_at: new Date().toISOString(),
    summary: 'Payment failed: ₩200,000 재시도 필요',
  },
  {
    id: uuidv4(),
    subject_id: 'stu_004',
    subject_type: 'exception',
    action_type: 'approve',
    decision_cost: 'MED',
    reversibility: 'hard',
    blast_radius: 'segment',
    deadline: calculateDeadline(24),
    created_at: new Date().toISOString(),
    summary: 'TEACHER_CHANGE: 강사 변경 요청',
  },
];

export const DEMO_RULES: Rule[] = [
  {
    id: uuidv4(),
    name: '자동 결석 알림 (2회 이상)',
    status: 'running',
    started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    killed_at: null,
    cooldown_until: null,
  },
  {
    id: uuidv4(),
    name: '수납 연체 자동 리마인더',
    status: 'running',
    started_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    killed_at: null,
    cooldown_until: null,
  },
  {
    id: uuidv4(),
    name: '생일 축하 메시지 자동화',
    status: 'killed',
    started_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    killed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    cooldown_until: null,
  },
];

export const DEMO_ELIGIBILITIES: Eligibility[] = [
  {
    subject_type: 'student',
    action_type: 'approve',
    eligible: true,
    evaluated_at: new Date().toISOString(),
  },
  {
    subject_type: 'payment',
    action_type: 'approve',
    eligible: true,
    evaluated_at: new Date().toISOString(),
  },
  {
    subject_type: 'exception',
    action_type: 'approve',
    eligible: false,
    evaluated_at: new Date().toISOString(),
  },
];

export function initializeDemoData(store: {
  setState: (partial: Record<string, unknown>) => void;
}) {
  store.setState({
    decisionQueue: DEMO_DECISIONS,
    currentDecision: DEMO_DECISIONS[0],
    rules: DEMO_RULES,
    eligibilities: DEMO_ELIGIBILITIES,
    frictionDelta: {
      questions: 3,
      interventions: 1,
      exceptions: 2,
      escalations: 0,
      computed_at: new Date().toISOString(),
    },
  });
}
