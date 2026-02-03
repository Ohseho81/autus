/**
 * 📒 AUTUS Fact Ledger
 *
 * Append-only 원장. OutcomeFact 기록 전용.
 * 삭제/수정 불가. 조회만 가능.
 */

import outcomeRules from '../rules/outcome_rules.json';
import thresholds from '../rules/thresholds.json';

// ============================================
// Types
// ============================================

export interface OutcomeFact {
  id: string;
  type: keyof typeof outcomeRules.outcomes;
  tier: 'S' | 'A' | 'TERMINAL';
  timestamp: string;
  consumer_id: string;      // 학부모 ID
  subject_id: string;       // 학생 ID
  data: Record<string, any>;
  weight: number;
  processed: boolean;
}

export interface LedgerEntry {
  fact: OutcomeFact;
  created_at: string;
  sequence: number;
}

// ============================================
// Ledger State (In-memory, would be DB in prod)
// ============================================

let ledger: LedgerEntry[] = [];
let sequence = 0;

// ============================================
// Core Functions
// ============================================

/**
 * OutcomeFact 생성 및 원장에 기록
 */
export function appendFact(
  type: string,
  consumer_id: string,
  subject_id: string,
  data: Record<string, any> = {}
): OutcomeFact | null {
  const outcomeConfig = outcomeRules.outcomes[type as keyof typeof outcomeRules.outcomes];

  if (!outcomeConfig) {
    console.error(`[FactLedger] Unknown outcome type: ${type}`);
    return null;
  }

  const fact: OutcomeFact = {
    id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: type as keyof typeof outcomeRules.outcomes,
    tier: outcomeConfig.tier as 'S' | 'A' | 'TERMINAL',
    timestamp: new Date().toISOString(),
    consumer_id,
    subject_id,
    data,
    weight: outcomeConfig.weight,
    processed: false,
  };

  const entry: LedgerEntry = {
    fact,
    created_at: new Date().toISOString(),
    sequence: ++sequence,
  };

  // Append-only
  ledger.push(entry);

  console.log(`[FactLedger] Appended: ${type} (Tier: ${fact.tier}, Weight: ${fact.weight})`);

  return fact;
}

/**
 * 처리되지 않은 S-Tier Fact 조회
 */
export function getUnprocessedTriggers(): OutcomeFact[] {
  return ledger
    .filter(entry => entry.fact.tier === 'S' && !entry.fact.processed)
    .map(entry => entry.fact);
}

/**
 * Fact를 처리됨으로 표시
 */
export function markProcessed(factId: string): boolean {
  const entry = ledger.find(e => e.fact.id === factId);
  if (entry) {
    entry.fact.processed = true;
    return true;
  }
  return false;
}

/**
 * 특정 기간의 Fact 조회
 */
export function getFactsInPeriod(
  startDate: Date,
  endDate: Date,
  type?: string
): OutcomeFact[] {
  return ledger
    .filter(entry => {
      const factDate = new Date(entry.fact.timestamp);
      const inRange = factDate >= startDate && factDate <= endDate;
      const matchType = type ? entry.fact.type === type : true;
      return inRange && matchType;
    })
    .map(entry => entry.fact);
}

/**
 * 특정 Subject(학생)의 Fact 조회
 */
export function getFactsBySubject(subject_id: string): OutcomeFact[] {
  return ledger
    .filter(entry => entry.fact.subject_id === subject_id)
    .map(entry => entry.fact);
}

/**
 * 특정 Consumer(학부모)의 Fact 조회
 */
export function getFactsByConsumer(consumer_id: string): OutcomeFact[] {
  return ledger
    .filter(entry => entry.fact.consumer_id === consumer_id)
    .map(entry => entry.fact);
}

/**
 * 전체 Ledger 조회 (읽기 전용)
 */
export function getLedger(): ReadonlyArray<LedgerEntry> {
  return [...ledger];
}

/**
 * Ledger 통계
 */
export function getLedgerStats() {
  const byTier = {
    S: ledger.filter(e => e.fact.tier === 'S').length,
    A: ledger.filter(e => e.fact.tier === 'A').length,
    TERMINAL: ledger.filter(e => e.fact.tier === 'TERMINAL').length,
  };

  const byType: Record<string, number> = {};
  ledger.forEach(entry => {
    byType[entry.fact.type] = (byType[entry.fact.type] || 0) + 1;
  });

  return {
    total: ledger.length,
    byTier,
    byType,
    unprocessed: ledger.filter(e => !e.fact.processed).length,
  };
}

/**
 * 임계치 체크 유틸리티
 */
export function checkThreshold(
  subject_id: string,
  type: 'consecutive_absence' | 'notification_ignore_days'
): boolean {
  const threshold = thresholds.outcome_thresholds[type].value;

  if (type === 'consecutive_absence') {
    // 최근 연속 결석 횟수 체크
    const recentFacts = getFactsBySubject(subject_id)
      .filter(f => f.type === 'attendance.normal' || f.data.absent)
      .slice(-threshold - 1);

    let consecutive = 0;
    for (let i = recentFacts.length - 1; i >= 0; i--) {
      if (recentFacts[i].data.absent) consecutive++;
      else break;
    }

    return consecutive >= threshold;
  }

  if (type === 'notification_ignore_days') {
    // 마지막 notification.read 이후 일수 체크
    const lastRead = getFactsBySubject(subject_id)
      .filter(f => f.type === 'notification.read')
      .pop();

    if (!lastRead) return true; // 한번도 읽은 적 없으면 트리거

    const daysSinceRead = Math.floor(
      (Date.now() - new Date(lastRead.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceRead >= threshold;
  }

  return false;
}

// ============================================
// Export
// ============================================

export const FactLedger = {
  append: appendFact,
  getUnprocessedTriggers,
  markProcessed,
  getFactsInPeriod,
  getFactsBySubject,
  getFactsByConsumer,
  getLedger,
  getStats: getLedgerStats,
  checkThreshold,
};

export default FactLedger;
