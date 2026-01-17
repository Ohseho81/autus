// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Decision Gate - 수학적 정의 구현
// ═══════════════════════════════════════════════════════════════════════════════
//
// "AUTUS는 판단을 잘하게 만드는 시스템이 아니다.
//  판단이 필요 없게 만드는 시스템이다."
//
// 핵심 수식:
//   Close(d) = Approve(d) ∧ Lock(d)=1 ∧ ∀r∈R, r(d)=true
//
// ═══════════════════════════════════════════════════════════════════════════════

import { KScale } from '../schema';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 상태 공간 정의
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Decision Vector: d = ⟨K, I, Ct, Cm, A, R⟩
 */
export interface DecisionVector {
  /** K ∈ {1,...,10}: Scale (책임 반경) */
  K: KScale;
  
  /** I ∈ [0,100]: 비가역성 점수 */
  I: number;
  
  /** Ct ≥ 0: 시간 손실 (hours) */
  Ct: number;
  
  /** Cm ≥ 0: 금전 손실 (KRW) */
  Cm: number;
  
  /** A ∈ 𝒜: 승인 주체 (역할/권한) */
  A: AuthorityLevel;
  
  /** R ∈ ℛ: 규제/법 제약 집합 */
  R: RegulationConstraint[];
}

/**
 * 승인 주체 레벨 (권한 등급)
 */
export type AuthorityLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * 규제 제약 함수
 * r(d) = true if d satisfies constraint, false otherwise
 */
export interface RegulationConstraint {
  id: string;
  name: string;
  nameKo: string;
  category: 'payment' | 'approval' | 'regional' | 'reporting' | 'compliance';
  
  /** 판정 함수: 결정이 제약을 만족하는지 */
  evaluate: (d: DecisionVector) => boolean;
  
  /** 위반 시 메시지 */
  violationMessage: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Scale별 비가역성 임계치 (θK)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * θK: Scale별 Lock 발생 임계치
 * I ≥ θK → Lock(d) = 1
 */
export const IRREVERSIBILITY_THRESHOLDS: Record<KScale, number> = {
  1: 90,   // K1: 거의 모든 것이 되돌릴 수 있음
  2: 85,
  3: 80,
  4: 70,
  5: 60,   // K5: θ=60, 이사회 결정
  6: 50,
  7: 40,   // K7: θ=40, 다자 합의
  8: 30,
  9: 20,
  10: 10,  // K10: 거의 모든 것이 비가역
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 핵심 함수 구현
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lock(d) = 1 if I ≥ θK, 0 otherwise
 * 
 * 결정은 Undo 가능성이 아니라 Lock 발생 여부로 판단한다.
 */
export function Lock(d: DecisionVector): 0 | 1 {
  const threshold = IRREVERSIBILITY_THRESHOLDS[d.K];
  return d.I >= threshold ? 1 : 0;
}

/**
 * Approve(d) = 1 if A ≥ K, 0 otherwise
 * 
 * 승인 주체의 권한 레벨이 K 이상이어야 승인 가능
 */
export function Approve(d: DecisionVector): 0 | 1 {
  return d.A >= d.K ? 1 : 0;
}

/**
 * RegulationCheck(d) = ∀r∈R, r(d)=true
 * 
 * 모든 규제 제약을 만족해야 함
 */
export function RegulationCheck(d: DecisionVector): {
  passed: boolean;
  violations: RegulationConstraint[];
} {
  const violations = d.R.filter(r => !r.evaluate(d));
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Close(d) = Approve(d) ∧ Lock(d)=1 ∧ ∀r∈R, r(d)=true
 * 
 * ⚠️ 핵심 함수: Close가 참이면 세계는 닫힌다.
 * 이후 모든 파생은 함수적 자동 전개.
 */
export function Close(d: DecisionVector): {
  closed: boolean;
  reason: string;
  details: {
    approved: boolean;
    locked: boolean;
    regulationsPassed: boolean;
    violations: RegulationConstraint[];
  };
} {
  const approved = Approve(d) === 1;
  const locked = Lock(d) === 1;
  const regCheck = RegulationCheck(d);
  
  const closed = approved && locked && regCheck.passed;
  
  let reason: string;
  if (closed) {
    reason = '결정 종결됨 (세계 봉인)';
  } else if (!approved) {
    reason = `승인 권한 부족 (필요: K${d.K}, 현재: K${d.A})`;
  } else if (!locked) {
    reason = `비가역성 미달 (필요: ${IRREVERSIBILITY_THRESHOLDS[d.K]}, 현재: ${d.I})`;
  } else {
    reason = `규제 위반: ${regCheck.violations.map(v => v.nameKo).join(', ')}`;
  }
  
  return {
    closed,
    reason,
    details: {
      approved,
      locked,
      regulationsPassed: regCheck.passed,
      violations: regCheck.violations,
    },
  };
}

/**
 * Liability(d) = A
 * 
 * 승인 주체 = 자동 책임자
 * 분산 책임/전가 불가
 * 사후 "몰랐다" 불가
 */
export function Liability(d: DecisionVector): AuthorityLevel {
  return d.A;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Decision Gate 클래스
// ═══════════════════════════════════════════════════════════════════════════════

export interface GateResult {
  vector: DecisionVector;
  timestamp: Date;
  closed: boolean;
  reason: string;
  liability: AuthorityLevel;
  hash: string;  // 봉인 증명
}

export class DecisionGate {
  private closedDecisions: Map<string, GateResult> = new Map();
  private regulations: RegulationConstraint[] = [];
  
  constructor(regulations?: RegulationConstraint[]) {
    this.regulations = regulations || DEFAULT_REGULATIONS;
  }
  
  /**
   * 결정 제안 → Gate 통과 시도
   */
  propose(
    proposal: Omit<DecisionVector, 'R'>,
    proposerId: string
  ): GateResult {
    // 규제 바인딩
    const vector: DecisionVector = {
      ...proposal,
      R: this.regulations,
    };
    
    // Close 판정
    const closeResult = Close(vector);
    
    // 결과 생성
    const result: GateResult = {
      vector,
      timestamp: new Date(),
      closed: closeResult.closed,
      reason: closeResult.reason,
      liability: Liability(vector),
      hash: this.generateHash(vector),
    };
    
    // 봉인된 결정은 저장
    if (result.closed) {
      this.closedDecisions.set(result.hash, result);
      this.propagateConsequences(result);
    }
    
    return result;
  }
  
  /**
   * 규제 함수 등록 (사전 컴파일, 이후 해석 개입 불가)
   */
  registerRegulation(regulation: RegulationConstraint): void {
    // 한 번 등록된 규제는 수정 불가
    if (this.regulations.some(r => r.id === regulation.id)) {
      throw new Error(`규제 ${regulation.id}는 이미 등록됨 (수정 불가)`);
    }
    this.regulations.push(regulation);
  }
  
  /**
   * 봉인된 결정 조회
   */
  getClosedDecision(hash: string): GateResult | undefined {
    return this.closedDecisions.get(hash);
  }
  
  /**
   * Undo 시도 (구조적으로 불가능)
   */
  attemptUndo(hash: string): { success: false; reason: string } {
    const decision = this.closedDecisions.get(hash);
    
    if (!decision) {
      return { success: false, reason: '결정을 찾을 수 없음' };
    }
    
    // AUTUS의 핵심: Undo는 구조적으로 불가능
    return {
      success: false,
      reason: `결정 ${hash}는 ${decision.timestamp.toISOString()}에 봉인됨. 되돌릴 수 없음.`,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 내부 메서드
  // ═══════════════════════════════════════════════════════════════════════════
  
  private generateHash(vector: DecisionVector): string {
    const data = JSON.stringify({
      K: vector.K,
      I: vector.I,
      Ct: vector.Ct,
      Cm: vector.Cm,
      A: vector.A,
      timestamp: Date.now(),
    });
    
    // 간단한 해시 (실제로는 SHA-256 등 사용)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `AUTUS-${Math.abs(hash).toString(16).toUpperCase().padStart(16, '0')}`;
  }
  
  /**
   * Automatic Consequence Propagation
   * 봉인된 결정의 결과는 자동으로 전파됨
   */
  private propagateConsequences(result: GateResult): void {
    // 이 함수는 외부 시스템과 연동
    // - 회계 시스템에 비용 기록
    // - 승인자에게 책임 바인딩
    // - 감사 로그 영구 저장
    console.log(`[AUTUS] Decision sealed: ${result.hash}`);
    console.log(`[AUTUS] Liability bound to: K${result.liability}`);
    console.log(`[AUTUS] Consequence propagation initiated`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 기본 규제 함수 (예시)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_REGULATIONS: RegulationConstraint[] = [
  {
    id: 'reg-payment-limit',
    name: 'Payment Limit',
    nameKo: '결제 한도',
    category: 'payment',
    evaluate: (d) => {
      // K5 이하는 10억 한도
      if (d.K <= 5 && d.Cm > 1_000_000_000) return false;
      // K7 이하는 100억 한도
      if (d.K <= 7 && d.Cm > 10_000_000_000) return false;
      return true;
    },
    violationMessage: '결제 금액이 권한 한도를 초과함',
  },
  {
    id: 'reg-dual-approval',
    name: 'Dual Approval Requirement',
    nameKo: '이중 승인 요건',
    category: 'approval',
    evaluate: (d) => {
      // K6 이상 + 비가역성 70 이상 → 이중 승인 필요
      // (이 예시에서는 단일 승인만 체크)
      return true;
    },
    violationMessage: '이중 승인이 필요한 결정',
  },
  {
    id: 'reg-time-buffer',
    name: 'Time Buffer Requirement',
    nameKo: '시간 버퍼 요건',
    category: 'compliance',
    evaluate: (d) => {
      // K8 이상은 최소 24시간 검토 시간 필요
      // (실제로는 제안 시간과 현재 시간 비교)
      return true;
    },
    violationMessage: '고도 결정에 필요한 검토 시간 미충족',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 6. 헬퍼 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 결정 벡터 생성 헬퍼
 */
export function createDecisionVector(
  partial: Partial<DecisionVector> & { K: KScale }
): DecisionVector {
  return {
    K: partial.K,
    I: partial.I ?? 0,
    Ct: partial.Ct ?? 0,
    Cm: partial.Cm ?? 0,
    A: partial.A ?? 1,
    R: partial.R ?? [],
  };
}

/**
 * 비가역성 점수 계산
 * I = f(K, Ct, Cm)
 */
export function calculateIrreversibilityScore(
  K: KScale,
  Ct: number,
  Cm: number
): number {
  // 기본 점수 (K 기반)
  const baseScore = K * 8;
  
  // 시간 손실 가중치
  const timeWeight = Math.min(20, Math.log10(Ct + 1) * 10);
  
  // 금전 손실 가중치
  const moneyWeight = Math.min(30, Math.log10(Cm / 1_000_000 + 1) * 10);
  
  return Math.min(100, baseScore + timeWeight + moneyWeight);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default DecisionGate;
