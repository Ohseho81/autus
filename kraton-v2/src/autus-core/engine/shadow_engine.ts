/**
 * 👤 AUTUS Shadow Engine
 *
 * 요청은 즉시 반영 금지.
 * Shadow에 적재 → 조건부 승격.
 */

import shadowPolicy from '../rules/shadow_policy.json';
import thresholds from '../rules/thresholds.json';

// ============================================
// Types
// ============================================

export type ShadowCategory = keyof typeof shadowPolicy.categories;

export type ShadowStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface ShadowRequest {
  id: string;
  category: ShadowCategory;
  consumer_id: string;
  subject_id: string;
  data: Record<string, any>;
  status: ShadowStatus;
  created_at: string;
  updated_at: string;
  decided_by?: string;
  decision_reason?: string;
  auto_decision?: boolean;
}

export interface ShadowDecision {
  requestId: string;
  status: 'approved' | 'rejected';
  decidedBy: string;
  reason?: string;
}

// ============================================
// Shadow Store (In-memory, would be DB in prod)
// ============================================

let shadowStore: ShadowRequest[] = [];

// ============================================
// Core Functions
// ============================================

/**
 * Shadow에 요청 적재
 */
export function addToShadow(
  category: ShadowCategory,
  consumer_id: string,
  subject_id: string,
  data: Record<string, any> = {}
): ShadowRequest {
  const now = new Date().toISOString();

  const request: ShadowRequest = {
    id: `shadow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    category,
    consumer_id,
    subject_id,
    data,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };

  shadowStore.push(request);

  console.log(`[Shadow] Added: ${category} from ${consumer_id}`);

  // 자동 처리 시도
  const autoResult = tryAutoDecision(request);
  if (autoResult) {
    console.log(`[Shadow] Auto-${autoResult.status}: ${request.id}`);
  }

  return request;
}

/**
 * 자동 승인/거절 시도
 */
function tryAutoDecision(request: ShadowRequest): ShadowRequest | null {
  const policy = shadowPolicy.categories[request.category];
  if (!policy) return null;

  // 자동 승인 조건 체크
  if (policy.auto_approve_condition) {
    const shouldAutoApprove = checkAutoCondition(
      policy.auto_approve_condition,
      request
    );
    if (shouldAutoApprove) {
      request.status = 'approved';
      request.auto_decision = true;
      request.decision_reason = `Auto-approved: ${policy.auto_approve_condition}`;
      request.updated_at = new Date().toISOString();
      return request;
    }
  }

  // 자동 거절 조건 체크
  if (policy.auto_reject_condition) {
    const shouldAutoReject = checkAutoCondition(
      policy.auto_reject_condition,
      request
    );
    if (shouldAutoReject) {
      request.status = 'rejected';
      request.auto_decision = true;
      request.decision_reason = `Auto-rejected: ${policy.auto_reject_condition}`;
      request.updated_at = new Date().toISOString();
      return request;
    }
  }

  return null;
}

/**
 * 자동 조건 체크 (실제 구현에서는 DB/상태 조회)
 */
function checkAutoCondition(condition: string, request: ShadowRequest): boolean {
  // 간단한 조건 매칭 (실제로는 더 복잡한 로직)
  switch (condition) {
    case 'available_slot_exists':
      // 보강 가능 시간대 체크 (데모: 항상 true)
      return request.data.preferred_slots?.length > 0;

    case 'target_slot_available':
      // 목표 시간대 가용 체크
      return !!request.data.target_slot_available;

    case 'target_slot_full':
      // 목표 시간대 만석 체크
      return !!request.data.target_slot_full;

    case 'first_time_request':
      // 첫 요청인지 체크
      const previousRequests = shadowStore.filter(
        r => r.consumer_id === request.consumer_id &&
             r.category === request.category &&
             r.id !== request.id
      );
      return previousRequests.length === 0;

    case 'already_discounted':
      // 이미 할인 적용 중인지 체크
      return !!request.data.current_discount;

    default:
      return false;
  }
}

/**
 * 수동 결정 (admin/owner)
 */
export function decideShadow(decision: ShadowDecision): ShadowRequest | null {
  const request = shadowStore.find(r => r.id === decision.requestId);
  if (!request || request.status !== 'pending') {
    return null;
  }

  request.status = decision.status;
  request.decided_by = decision.decidedBy;
  request.decision_reason = decision.reason;
  request.auto_decision = false;
  request.updated_at = new Date().toISOString();

  console.log(`[Shadow] Decided: ${request.id} → ${decision.status} by ${decision.decidedBy}`);

  return request;
}

/**
 * Pending 요청 조회 (역할별)
 */
export function getPendingByAuthority(authority: 'admin' | 'owner'): ShadowRequest[] {
  return shadowStore.filter(request => {
    if (request.status !== 'pending') return false;

    const policy = shadowPolicy.categories[request.category];
    return policy?.approval_authority === authority;
  });
}

/**
 * 카테고리별 통계
 */
export function getShadowStats() {
  const byCategory: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};

  shadowStore.forEach(request => {
    if (!byCategory[request.category]) {
      byCategory[request.category] = { total: 0, approved: 0, rejected: 0, pending: 0 };
    }
    byCategory[request.category].total++;
    byCategory[request.category][request.status === 'archived' ? 'rejected' : request.status]++;
  });

  const totalApproved = shadowStore.filter(r => r.status === 'approved').length;
  const total = shadowStore.length;
  const actualApprovalRate = total > 0 ? (totalApproved / total) * 100 : 0;

  return {
    total,
    byStatus: {
      pending: shadowStore.filter(r => r.status === 'pending').length,
      approved: totalApproved,
      rejected: shadowStore.filter(r => r.status === 'rejected').length,
      archived: shadowStore.filter(r => r.status === 'archived').length,
    },
    byCategory,
    actualApprovalRate: Math.round(actualApprovalRate * 10) / 10,
  };
}

/**
 * 에스컬레이션 체크
 * admin이 n건 이상 보류 시 owner에게 일괄 전달
 */
export function checkEscalation(): ShadowRequest[] {
  const threshold = thresholds.shadow_limits.escalation_threshold;
  const adminPending = getPendingByAuthority('admin');

  if (adminPending.length >= threshold) {
    console.log(`[Shadow] Escalation triggered: ${adminPending.length} pending requests`);
    // 실제로는 owner에게 알림 발송
    return adminPending;
  }

  return [];
}

/**
 * 오래된 요청 아카이브
 */
export function archiveOldRequests(): number {
  const archiveDays = thresholds.shadow_limits.auto_archive_days;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - archiveDays);

  let archivedCount = 0;

  shadowStore.forEach(request => {
    if (request.status === 'pending' && new Date(request.created_at) < cutoffDate) {
      request.status = 'archived';
      request.decision_reason = 'Auto-archived: exceeded time limit';
      request.updated_at = new Date().toISOString();
      archivedCount++;
    }
  });

  if (archivedCount > 0) {
    console.log(`[Shadow] Archived ${archivedCount} old requests`);
  }

  return archivedCount;
}

/**
 * 승격률 정보 조회
 */
export function getApprovalRates(): Record<string, { expected: number; actual: number }> {
  const rates: Record<string, { expected: number; actual: number }> = {};

  Object.entries(shadowPolicy.categories).forEach(([category, policy]) => {
    const categoryRequests = shadowStore.filter(r => r.category === category);
    const approved = categoryRequests.filter(r => r.status === 'approved').length;
    const total = categoryRequests.length;

    rates[category] = {
      expected: policy.approval_rate,
      actual: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  });

  return rates;
}

// ============================================
// Export
// ============================================

export const ShadowEngine = {
  add: addToShadow,
  decide: decideShadow,
  getPendingByAuthority,
  getStats: getShadowStats,
  checkEscalation,
  archiveOld: archiveOldRequests,
  getApprovalRates,
};

export default ShadowEngine;
