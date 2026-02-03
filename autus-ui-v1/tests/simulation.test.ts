/**
 * AUTUS Simulation Tests
 * 5 scenarios as specified:
 * 1) payment.failed -> decision -> approve path
 * 2) 2 consecutive absences -> escalation -> auto jump P2
 * 3) refund request -> decision -> approve/deny
 * 4) running rule -> kill -> cooldown enforced
 * 5) defer -> TTL expiry -> auto kill
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAutusStore } from '../src/ui/store';
import { processATBEvents, type ATBEvent } from '../src/adapters/allthatbasket.adapter';
import { EVENT_TYPES } from '../src/core/events';
import type { DecisionCard, Rule } from '../src/core/schema';
import { v4 as uuidv4 } from 'uuid';
import { calculateDeadline } from '../src/core/rules';

// Helper to reset store between tests
function resetStore() {
  useAutusStore.setState({
    navigation: {
      currentPage: 'P1',
      previousPage: null,
      approveFlow: { active: false, longTermDone: false, budgetDone: false, decisionId: null },
      riskJump: { active: false, returnTo: null },
    },
    facts: [],
    decisionQueue: [],
    currentDecision: null,
    rules: [],
    frictionDelta: { questions: 0, interventions: 0, exceptions: 0, escalations: 0, computed_at: new Date().toISOString() },
    weeklyBudget: { high_decisions_used: 0, high_decisions_cap: 1, week_start: '', week_end: '' },
    eligibilities: [],
    pendingLongTermDirection: null,
    inputSchema: { version: '1.0', allowed_events: Object.values(EVENT_TYPES), required_fields: ['event_type', 'subject_id', 'value', 'source'] },
    ignoredInputs: [],
  });
}

describe('AUTUS Simulation Tests', () => {
  beforeEach(() => {
    resetStore();
  });

  // ========================================================================
  // Scenario 1: payment.failed -> decision -> approve path
  // ========================================================================
  it('Scenario 1: payment.failed -> decision -> approve path P7->P8', () => {
    const store = useAutusStore.getState();
    
    // 1. Create payment failed event
    const paymentEvent: ATBEvent = {
      type: 'payment',
      payment_id: 'pay_001',
      student_id: 'stu_001',
      amount: 100000,
      status: 'failed',
    };
    
    // 2. Process through adapter
    const result = processATBEvents([paymentEvent]);
    expect(result.facts.length).toBe(1);
    expect(result.facts[0].event_type).toBe(EVENT_TYPES.PAYMENT_FAILED);
    expect(result.decisions.length).toBe(1);
    
    // 3. Add decision to queue
    const decision = result.decisions[0];
    useAutusStore.setState({
      decisionQueue: [decision],
      currentDecision: decision,
    });
    
    // 4. Append fact to store
    store.appendFact(
      EVENT_TYPES.PAYMENT_FAILED,
      'pay_001',
      { amount: 100000 },
      'allthatbasket'
    );
    
    // 5. Start approve flow
    expect(useAutusStore.getState().navigation.currentPage).toBe('P1');
    useAutusStore.getState().approve();
    
    // 6. Should be on P7 (Long-Term Check)
    expect(useAutusStore.getState().navigation.currentPage).toBe('P7');
    expect(useAutusStore.getState().navigation.approveFlow.active).toBe(true);
    
    // 7. Select long-term direction
    useAutusStore.getState().setLongTermDirection('UP');
    expect(useAutusStore.getState().pendingLongTermDirection).toBe('UP');
    
    // 8. Confirm long-term -> move to P8
    useAutusStore.getState().confirmLongTerm();
    expect(useAutusStore.getState().navigation.currentPage).toBe('P8');
    
    // 9. Confirm budget -> complete
    useAutusStore.getState().confirmBudget();
    expect(useAutusStore.getState().navigation.currentPage).toBe('P1');
    expect(useAutusStore.getState().navigation.approveFlow.active).toBe(false);
    
    // 10. Check Fact ledger has approval event
    const facts = useAutusStore.getState().facts;
    const approvalFact = facts.find(f => f.event_type === EVENT_TYPES.DECISION_APPROVED);
    expect(approvalFact).toBeDefined();
  });

  // ========================================================================
  // Scenario 2: 2 consecutive absences -> escalation -> auto jump P2
  // ========================================================================
  it('Scenario 2: 2 consecutive absences -> escalation -> auto jump P2', () => {
    // 1. Create attendance event with 2 consecutive absences
    const attendanceEvent: ATBEvent = {
      type: 'attendance',
      student_id: 'stu_002',
      class_id: 'class_001',
      date: '2024-01-15',
      present: false,
      consecutive_absences: 2,
    };
    
    // 2. Process through adapter
    const result = processATBEvents([attendanceEvent]);
    expect(result.facts.length).toBe(1);
    expect(result.facts[0].event_type).toBe(EVENT_TYPES.ATTENDANCE_ABSENT);
    expect(result.escalations.length).toBe(1);
    expect(result.escalations[0].event_type).toBe(EVENT_TYPES.ESCALATION_RAISED);
    expect(result.decisions.length).toBe(1);
    
    // 3. Simulate escalation event being processed
    // This should trigger auto-jump to P2
    const store = useAutusStore.getState();
    
    // Append escalation fact
    store.appendFact(
      EVENT_TYPES.ESCALATION_RAISED,
      'stu_002',
      { reason: '2 consecutive absences', severity: 'medium' },
      'allthatbasket'
    );
    
    // 4. Check friction delta increased
    const frictionDelta = useAutusStore.getState().frictionDelta;
    expect(frictionDelta.escalations).toBe(1);
    
    // 5. Should auto-jump to P2 (since escalation threshold is 1)
    expect(useAutusStore.getState().navigation.currentPage).toBe('P2');
    expect(useAutusStore.getState().navigation.riskJump.active).toBe(true);
    
    // 6. Check Fact ledger
    const facts = useAutusStore.getState().facts;
    expect(facts.some(f => f.event_type === EVENT_TYPES.ESCALATION_RAISED)).toBe(true);
  });

  // ========================================================================
  // Scenario 3: refund request -> decision -> approve/deny
  // ========================================================================
  it('Scenario 3: refund request -> decision -> approve/deny', () => {
    // 1. Create refund exception event
    const refundEvent: ATBEvent = {
      type: 'exception',
      student_id: 'stu_003',
      exception_type: 'refund',
      amount: 50000,
      reason: 'Student moving to different area',
      requested_by: 'parent',
    };
    
    // 2. Process through adapter
    const result = processATBEvents([refundEvent]);
    expect(result.facts.length).toBe(1);
    expect(result.facts[0].event_type).toBe(EVENT_TYPES.EXCEPTION_REQUESTED);
    expect(result.decisions.length).toBe(1);
    expect(result.decisions[0].decision_cost).toBe('HIGH'); // Refunds are HIGH cost
    
    // 3. Add decision to queue
    const decision = result.decisions[0];
    useAutusStore.setState({
      decisionQueue: [decision],
      currentDecision: decision,
    });
    
    // 4. Deny the decision (since refunds are risky)
    useAutusStore.getState().deny();
    
    // 5. Check Fact ledger has denial
    const facts = useAutusStore.getState().facts;
    const denialFact = facts.find(f => f.event_type === EVENT_TYPES.DECISION_DENIED);
    expect(denialFact).toBeDefined();
    
    // 6. Decision should be removed from queue
    expect(useAutusStore.getState().currentDecision).toBeNull();
  });

  // ========================================================================
  // Scenario 4: running rule -> kill -> cooldown enforced
  // ========================================================================
  it('Scenario 4: running rule -> kill -> cooldown enforced', () => {
    // 1. Start a rule
    useAutusStore.getState().startRule('Auto attendance alert');
    
    // 2. Check rule is running
    let rules = useAutusStore.getState().rules;
    expect(rules.length).toBe(1);
    expect(rules[0].status).toBe('running');
    
    // 3. Check Fact ledger has rule.started
    let facts = useAutusStore.getState().facts;
    expect(facts.some(f => f.event_type === EVENT_TYPES.RULE_STARTED)).toBe(true);
    
    // 4. Kill the rule
    const ruleId = rules[0].id;
    useAutusStore.getState().killRule(ruleId);
    
    // 5. Check rule is killed with cooldown
    rules = useAutusStore.getState().rules;
    expect(rules[0].status).toBe('killed');
    expect(rules[0].cooldown_until).toBeDefined();
    
    // 6. Check Fact ledger has rule.killed
    facts = useAutusStore.getState().facts;
    expect(facts.some(f => f.event_type === EVENT_TYPES.RULE_KILLED)).toBe(true);
    
    // 7. Verify cooldown is in the future (30 minutes)
    const cooldownTime = new Date(rules[0].cooldown_until!).getTime();
    const now = Date.now();
    expect(cooldownTime).toBeGreaterThan(now);
    expect(cooldownTime).toBeLessThanOrEqual(now + 31 * 60 * 1000); // Within 31 minutes
  });

  // ========================================================================
  // Scenario 5: defer -> TTL expiry -> auto kill
  // ========================================================================
  it('Scenario 5: defer -> TTL expiry -> auto kill', () => {
    // 1. Create a decision
    const decision: DecisionCard = {
      id: uuidv4(),
      subject_id: 'stu_005',
      subject_type: 'exception',
      action_type: 'approve',
      decision_cost: 'LOW',
      reversibility: 'easy',
      blast_radius: 'local',
      deadline: calculateDeadline(24),
      created_at: new Date().toISOString(),
      summary: 'Test decision for defer',
    };
    
    // 2. Add to queue
    useAutusStore.setState({
      decisionQueue: [decision],
      currentDecision: decision,
    });
    
    // 3. Defer the decision
    useAutusStore.getState().defer();
    
    // 4. Check Fact ledger has deferred event
    let facts = useAutusStore.getState().facts;
    expect(facts.some(f => f.event_type === EVENT_TYPES.DECISION_DEFERRED)).toBe(true);
    
    // 5. Simulate TTL expiry by setting past deadline
    const expiredDecision = useAutusStore.getState().decisionQueue[0];
    const pastDeadline = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    
    useAutusStore.setState({
      decisionQueue: [{ ...expiredDecision, deadline: pastDeadline }],
      currentDecision: { ...expiredDecision, deadline: pastDeadline },
    });
    
    // 6. Run TTL check
    useAutusStore.getState().checkExpiredDecisions();
    
    // 7. Check Fact ledger has TTL expired event
    facts = useAutusStore.getState().facts;
    expect(facts.some(f => f.event_type === EVENT_TYPES.TTL_EXPIRED)).toBe(true);
    
    // 8. Decision should be removed from queue
    expect(useAutusStore.getState().decisionQueue.length).toBe(0);
    
    // 9. Should navigate to P3 (Kill Board)
    expect(useAutusStore.getState().navigation.currentPage).toBe('P3');
  });

  // ========================================================================
  // Additional: Adapter processes all 20 event types correctly
  // ========================================================================
  it('Adapter maps all event types within 20 limit', () => {
    const allEventTypes = Object.values(EVENT_TYPES);
    expect(allEventTypes.length).toBeLessThanOrEqual(20);
    
    // Verify adapter produces valid event types
    const events: ATBEvent[] = [
      { type: 'attendance', student_id: 's1', class_id: 'c1', date: '2024-01-01', present: true },
      { type: 'attendance', student_id: 's1', class_id: 'c1', date: '2024-01-02', present: false },
      { type: 'payment', payment_id: 'p1', student_id: 's1', amount: 100000, status: 'paid' },
      { type: 'payment', payment_id: 'p2', student_id: 's1', amount: 100000, status: 'failed' },
      { type: 'payment', payment_id: 'p3', student_id: 's1', amount: 100000, status: 'overdue' },
      { type: 'exception', student_id: 's1', exception_type: 'refund', amount: 50000, reason: 'test', requested_by: 'parent' },
      { type: 'exception', student_id: 's1', exception_type: 'discount', amount: 10000, reason: 'test', requested_by: 'staff' },
      { type: 'exception', student_id: 's1', exception_type: 'makeup', reason: 'missed class', requested_by: 'parent' },
      { type: 'exception', student_id: 's1', exception_type: 'teacher_change', reason: 'request', requested_by: 'parent' },
    ];
    
    const result = processATBEvents(events);
    
    // All facts should have valid event types
    for (const fact of result.facts) {
      expect(allEventTypes).toContain(fact.event_type);
    }
  });

  // ========================================================================
  // Additional: HIGH cost budget exceeded blocks approval
  // ========================================================================
  it('HIGH cost budget exceeded triggers auto kill', () => {
    // 1. Use up the weekly HIGH budget
    useAutusStore.setState({
      weeklyBudget: {
        high_decisions_used: 1,
        high_decisions_cap: 1,
        week_start: new Date().toISOString(),
        week_end: new Date().toISOString(),
      },
    });
    
    // 2. Create HIGH cost decision
    const decision: DecisionCard = {
      id: uuidv4(),
      subject_id: 'stu_006',
      subject_type: 'exception',
      action_type: 'approve',
      decision_cost: 'HIGH',
      reversibility: 'hard',
      blast_radius: 'global',
      deadline: calculateDeadline(24),
      created_at: new Date().toISOString(),
      summary: 'HIGH cost decision',
    };
    
    useAutusStore.setState({
      decisionQueue: [decision],
      currentDecision: decision,
    });
    
    // 3. Try to approve (should go through P7 first)
    useAutusStore.getState().approve();
    useAutusStore.getState().setLongTermDirection('UP');
    useAutusStore.getState().confirmLongTerm();
    
    // 4. At P8, confirm should trigger auto kill due to budget
    useAutusStore.getState().confirmBudget();
    
    // 5. Check budget exceeded fact was recorded
    const facts = useAutusStore.getState().facts;
    expect(facts.some(f => f.event_type === EVENT_TYPES.BUDGET_EXCEEDED)).toBe(true);
    
    // 6. Decision should be denied, not approved
    expect(facts.some(f => f.event_type === EVENT_TYPES.DECISION_DENIED)).toBe(true);
    expect(facts.some(f => f.event_type === EVENT_TYPES.DECISION_APPROVED)).toBe(false);
  });
});
