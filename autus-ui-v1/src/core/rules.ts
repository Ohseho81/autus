/**
 * AUTUS Rules Engine
 * LOCKED: Configurable in code only
 * 
 * - HIGH decision weekly cap = 1
 * - Defer TTL = 24h
 * - Kill cooldown = 30min
 */

import type { Approval, Rule, WeeklyBudget, DecisionCost } from './schema';
import { CONSTANTS } from './schema';

// ============================================================================
// TTL Rules
// ============================================================================

export function calculateDeadline(hoursFromNow: number = CONSTANTS.TTL_DEFAULT_HOURS): string {
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hoursFromNow);
  return deadline.toISOString();
}

export function isExpired(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

export function getTimeRemaining(deadline: string): { hours: number; minutes: number; expired: boolean } {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) {
    return { hours: 0, minutes: 0, expired: true };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, expired: false };
}

// ============================================================================
// Kill Cooldown Rules
// ============================================================================

export function calculateCooldownEnd(): string {
  const cooldownEnd = new Date();
  cooldownEnd.setMinutes(cooldownEnd.getMinutes() + CONSTANTS.KILL_COOLDOWN_MINUTES);
  return cooldownEnd.toISOString();
}

export function isInCooldown(rule: Rule): boolean {
  if (!rule.cooldown_until) return false;
  return new Date(rule.cooldown_until) > new Date();
}

export function canKillRule(rule: Rule): { allowed: boolean; reason?: string } {
  if (rule.status === 'killed') {
    return { allowed: false, reason: 'Rule is already killed' };
  }
  if (isInCooldown(rule)) {
    const remaining = getTimeRemaining(rule.cooldown_until!);
    return { 
      allowed: false, 
      reason: `Cooldown active: ${remaining.minutes}min remaining` 
    };
  }
  return { allowed: true };
}

// ============================================================================
// Budget Rules
// ============================================================================

export function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: monday.toISOString(),
    end: sunday.toISOString(),
  };
}

export function createWeeklyBudget(highDecisionsUsed: number = 0): WeeklyBudget {
  const bounds = getWeekBounds();
  return {
    high_decisions_used: highDecisionsUsed,
    high_decisions_cap: CONSTANTS.HIGH_DECISION_WEEKLY_CAP,
    week_start: bounds.start,
    week_end: bounds.end,
  };
}

export function canApproveHighCost(budget: WeeklyBudget): { allowed: boolean; reason?: string } {
  if (budget.high_decisions_used >= budget.high_decisions_cap) {
    return { 
      allowed: false, 
      reason: `Weekly HIGH decision cap exceeded (${budget.high_decisions_used}/${budget.high_decisions_cap})` 
    };
  }
  return { allowed: true };
}

export function checkBudget(
  budget: WeeklyBudget, 
  decisionCost: DecisionCost
): { allowed: boolean; reason?: string; autoKill: boolean } {
  if (decisionCost !== 'HIGH') {
    return { allowed: true, autoKill: false };
  }
  
  const result = canApproveHighCost(budget);
  return {
    ...result,
    autoKill: !result.allowed,
  };
}

// ============================================================================
// Approval Rules
// ============================================================================

export type ApprovalCategory = 'money' | 'relation' | 'liability';

export function getApprovalCategory(approval: Approval): ApprovalCategory | null {
  // Money: payment, refund, discount
  if (['refund', 'payment', 'discount'].some(k => 
    approval.subject_id.includes(k) || approval.action_type.includes(k)
  )) {
    return 'money';
  }
  
  // Relation: teacher change, communication
  if (['teacher', 'instructor', 'relation'].some(k =>
    approval.subject_id.includes(k) || approval.action_type.includes(k)
  )) {
    return 'relation';
  }
  
  // Liability: claims, legal
  if (['claim', 'liability', 'legal', 'safety'].some(k =>
    approval.subject_id.includes(k) || approval.action_type.includes(k)
  )) {
    return 'liability';
  }
  
  return null;
}

export function requiresManualApproval(approval: Approval): boolean {
  const category = getApprovalCategory(approval);
  return category !== null;
}

// ============================================================================
// Friction Delta Thresholds
// ============================================================================

export const FRICTION_THRESHOLDS = {
  questions: 5,
  interventions: 3,
  exceptions: 5,
  escalations: 1, // Any escalation triggers jump
} as const;

export function shouldAutoJumpToFriction(delta: {
  questions: number;
  interventions: number;
  exceptions: number;
  escalations: number;
}): boolean {
  return (
    delta.questions > FRICTION_THRESHOLDS.questions ||
    delta.interventions > FRICTION_THRESHOLDS.interventions ||
    delta.exceptions > FRICTION_THRESHOLDS.exceptions ||
    delta.escalations >= FRICTION_THRESHOLDS.escalations
  );
}
