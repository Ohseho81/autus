/**
 * 온리쌤 Adapter v1
 * Maps academy events to 온리쌤 Fact/Decision
 * 
 * Mappings:
 * - attendance 체크 → Fact(attendance.present/absent)
 * - 수납 상태 → Fact(payment.*)
 * - 보강/할인/환불/강사변경 → Fact(exception.requested) + Decision
 */

import { v4 as uuidv4 } from 'uuid';
import type { DecisionCard, Fact, SubjectType, DecisionCost, Reversibility, BlastRadius } from '../core/schema';
import { EVENT_TYPES, createFact, type EventType } from '../core/events';
import { calculateDeadline } from '../core/rules';

// ============================================================================
// AllThatBasket Event Types
// ============================================================================

export interface ATBAttendanceEvent {
  type: 'attendance';
  student_id: string;
  class_id: string;
  date: string;
  present: boolean;
  consecutive_absences?: number;
}

export interface ATBPaymentEvent {
  type: 'payment';
  payment_id: string;
  student_id: string;
  amount: number;
  status: 'paid' | 'failed' | 'overdue';
  due_date?: string;
}

export interface ATBExceptionEvent {
  type: 'exception';
  student_id: string;
  exception_type: 'refund' | 'discount' | 'makeup' | 'teacher_change';
  amount?: number;
  reason: string;
  requested_by: string;
}

export type ATBEvent = ATBAttendanceEvent | ATBPaymentEvent | ATBExceptionEvent;

// ============================================================================
// Adapter Functions
// ============================================================================

const SOURCE = 'allthatbasket';

/**
 * Convert ATB event to 온리쌤 Fact
 */
export function eventToFact(event: ATBEvent): Fact {
  switch (event.type) {
    case 'attendance':
      return createFact(
        event.present ? EVENT_TYPES.ATTENDANCE_PRESENT : EVENT_TYPES.ATTENDANCE_ABSENT,
        event.student_id,
        {
          class_id: event.class_id,
          date: event.date,
          consecutive_absences: event.consecutive_absences,
        },
        SOURCE
      );

    case 'payment':
      const paymentEventType = {
        paid: EVENT_TYPES.PAYMENT_PAID,
        failed: EVENT_TYPES.PAYMENT_FAILED,
        overdue: EVENT_TYPES.PAYMENT_OVERDUE,
      }[event.status];
      
      return createFact(
        paymentEventType,
        event.payment_id,
        {
          student_id: event.student_id,
          amount: event.amount,
          due_date: event.due_date,
        },
        SOURCE
      );

    case 'exception':
      return createFact(
        EVENT_TYPES.EXCEPTION_REQUESTED,
        event.student_id,
        {
          exception_type: event.exception_type,
          amount: event.amount,
          reason: event.reason,
          requested_by: event.requested_by,
        },
        SOURCE
      );
  }
}

/**
 * Determine if event requires Approval decision
 */
export function requiresDecision(event: ATBEvent): boolean {
  if (event.type === 'exception') {
    // All exceptions require approval: money, relation, or liability
    return true;
  }
  
  if (event.type === 'payment' && event.status === 'failed') {
    // Payment failures may require decision (e.g., retry, contact, etc.)
    return true;
  }
  
  if (event.type === 'attendance' && event.consecutive_absences && event.consecutive_absences >= 2) {
    // 2+ consecutive absences trigger escalation decision
    return true;
  }
  
  return false;
}

/**
 * Create Decision Card from ATB event
 */
export function eventToDecision(event: ATBEvent): DecisionCard | null {
  if (!requiresDecision(event)) {
    return null;
  }

  const id = uuidv4();
  const created_at = new Date().toISOString();
  const deadline = calculateDeadline(24);

  if (event.type === 'exception') {
    const costMap: Record<string, DecisionCost> = {
      refund: 'HIGH',
      discount: 'MED',
      makeup: 'LOW',
      teacher_change: 'MED',
    };
    
    const reversibilityMap: Record<string, Reversibility> = {
      refund: 'hard',
      discount: 'easy',
      makeup: 'easy',
      teacher_change: 'hard',
    };
    
    const blastMap: Record<string, BlastRadius> = {
      refund: 'local',
      discount: 'local',
      makeup: 'local',
      teacher_change: 'segment',
    };

    return {
      id,
      subject_id: event.student_id,
      subject_type: 'exception' as SubjectType,
      action_type: 'approve',
      decision_cost: costMap[event.exception_type] || 'MED',
      reversibility: reversibilityMap[event.exception_type] || 'easy',
      blast_radius: blastMap[event.exception_type] || 'local',
      deadline,
      created_at,
      summary: `${event.exception_type.toUpperCase()}: ${event.reason}`,
    };
  }

  if (event.type === 'payment' && event.status === 'failed') {
    return {
      id,
      subject_id: event.payment_id,
      subject_type: 'payment' as SubjectType,
      action_type: 'approve',
      decision_cost: 'LOW',
      reversibility: 'easy',
      blast_radius: 'local',
      deadline,
      created_at,
      summary: `Payment failed: ₩${event.amount.toLocaleString()}`,
    };
  }

  if (event.type === 'attendance' && event.consecutive_absences && event.consecutive_absences >= 2) {
    return {
      id,
      subject_id: event.student_id,
      subject_type: 'attendance' as SubjectType,
      action_type: 'approve',
      decision_cost: event.consecutive_absences >= 3 ? 'MED' : 'LOW',
      reversibility: 'easy',
      blast_radius: 'local',
      deadline,
      created_at,
      summary: `${event.consecutive_absences} consecutive absences - escalation required`,
    };
  }

  return null;
}

/**
 * Check if event triggers escalation
 */
export function shouldEscalate(event: ATBEvent): boolean {
  if (event.type === 'attendance' && event.consecutive_absences && event.consecutive_absences >= 2) {
    return true;
  }
  
  if (event.type === 'payment' && event.status === 'overdue') {
    return true;
  }
  
  if (event.type === 'exception' && event.exception_type === 'refund') {
    return true;
  }
  
  return false;
}

/**
 * Create escalation Fact if needed
 */
export function createEscalationFact(event: ATBEvent): Fact | null {
  if (!shouldEscalate(event)) {
    return null;
  }

  let reason = '';
  let severity: 'low' | 'medium' | 'high' = 'low';

  if (event.type === 'attendance') {
    reason = `${event.consecutive_absences} consecutive absences`;
    severity = event.consecutive_absences! >= 3 ? 'high' : 'medium';
  } else if (event.type === 'payment' && event.status === 'overdue') {
    reason = 'Payment overdue';
    severity = 'medium';
  } else if (event.type === 'exception' && event.exception_type === 'refund') {
    reason = 'Refund requested';
    severity = 'high';
  }

  return createFact(
    EVENT_TYPES.ESCALATION_RAISED,
    event.type === 'payment' ? (event as ATBPaymentEvent).payment_id : (event as ATBAttendanceEvent | ATBExceptionEvent).student_id,
    { reason, severity },
    SOURCE
  );
}

// ============================================================================
// Batch Processing
// ============================================================================

export interface ProcessResult {
  facts: Fact[];
  decisions: DecisionCard[];
  escalations: Fact[];
}

export function processATBEvents(events: ATBEvent[]): ProcessResult {
  const result: ProcessResult = {
    facts: [],
    decisions: [],
    escalations: [],
  };

  for (const event of events) {
    // Always create a fact
    result.facts.push(eventToFact(event));
    
    // Create decision if needed
    const decision = eventToDecision(event);
    if (decision) {
      result.decisions.push(decision);
    }
    
    // Create escalation if needed
    const escalation = createEscalationFact(event);
    if (escalation) {
      result.escalations.push(escalation);
    }
  }

  return result;
}
