/**
 * AUTUS Events (≤20 total)
 * LOCKED: All events must write Fact
 * UI must read only Fact-derived view models
 */

import type { Fact } from './schema';

// ============================================================================
// Event Types (≤20)
// ============================================================================

export const EVENT_TYPES = {
  // Access
  ACCESS_LOGGED: 'access.logged',
  
  // Attendance
  ATTENDANCE_PRESENT: 'attendance.present',
  ATTENDANCE_ABSENT: 'attendance.absent',
  
  // Payment
  PAYMENT_PAID: 'payment.paid',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_OVERDUE: 'payment.overdue',
  
  // Exception
  EXCEPTION_REQUESTED: 'exception.requested',
  
  // Intervention
  INTERVENTION_LOGGED: 'intervention.logged',
  
  // Escalation
  ESCALATION_RAISED: 'escalation.raised',
  
  // Rule
  RULE_STARTED: 'rule.started',
  RULE_KILLED: 'rule.killed',
  
  // Decision
  DECISION_CREATED: 'decision.created',
  DECISION_DEFERRED: 'decision.deferred',
  DECISION_APPROVED: 'decision.approved',
  DECISION_DENIED: 'decision.denied',
  
  // Input
  INPUT_IGNORED: 'input.ignored',
  
  // TTL
  TTL_EXPIRED: 'ttl.expired',
  
  // Budget
  BUDGET_EXCEEDED: 'budget.exceeded',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// Total: 18 events (within ≤20 limit)

// ============================================================================
// Event Payloads
// ============================================================================

export interface AccessLoggedPayload {
  user_id: string;
  action: string;
}

export interface AttendancePayload {
  student_id: string;
  class_id: string;
  date: string;
  consecutive_absences?: number;
}

export interface PaymentPayload {
  payment_id: string;
  student_id: string;
  amount: number;
  currency: string;
  due_date?: string;
}

export interface ExceptionPayload {
  student_id: string;
  exception_type: 'refund' | 'discount' | 'makeup' | 'teacher_change';
  description: string;
}

export interface InterventionPayload {
  subject_id: string;
  intervention_type: string;
  note: string;
}

export interface EscalationPayload {
  subject_id: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RulePayload {
  rule_id: string;
  rule_name: string;
}

export interface DecisionPayload {
  decision_id: string;
  subject_id: string;
  action_type: string;
  decision_cost: string;
}

export interface InputIgnoredPayload {
  raw_input: string;
  reason: string;
}

export interface TTLExpiredPayload {
  decision_id: string;
  original_deadline: string;
}

export interface BudgetExceededPayload {
  decision_id: string;
  budget_type: 'HIGH';
  current_count: number;
  cap: number;
}

// ============================================================================
// Event Creator
// ============================================================================

let factIdCounter = 0;

export function createFact(
  event_type: EventType,
  subject_id: string,
  value: Record<string, unknown>,
  source: string
): Fact {
  factIdCounter++;
  return {
    event_type,
    subject_id,
    value,
    timestamp: new Date().toISOString(),
    source,
  };
}

// ============================================================================
// Event Helpers
// ============================================================================

export function isEscalationEvent(fact: Fact): boolean {
  return fact.event_type === EVENT_TYPES.ESCALATION_RAISED;
}

export function isDecisionEvent(fact: Fact): boolean {
  return fact.event_type.startsWith('decision.');
}

export function isPaymentEvent(fact: Fact): boolean {
  return fact.event_type.startsWith('payment.');
}

export function isAttendanceEvent(fact: Fact): boolean {
  return fact.event_type.startsWith('attendance.');
}

// ============================================================================
// Validation
// ============================================================================

const ALL_EVENT_TYPES = Object.values(EVENT_TYPES);

export function isValidEventType(type: string): type is EventType {
  return ALL_EVENT_TYPES.includes(type as EventType);
}

export function validateEvent(event_type: string): { valid: boolean; reason?: string } {
  if (!isValidEventType(event_type)) {
    return { valid: false, reason: `Unknown event type: ${event_type}` };
  }
  return { valid: true };
}
