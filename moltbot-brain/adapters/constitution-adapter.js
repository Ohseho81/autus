/**
 * ⚖️ MoltBot Brain - Constitution Adapter
 *
 * AUTUS Core Kernel 헌법 (K1-K5) 연동
 * 모든 규칙 변경/승격이 헌법을 준수하는지 검증
 */

// ============================================
// 헌법 상수 (CONSTITUTION.ts 에서 가져옴)
// ============================================

// K1: 점수로만 승격
export const K1_PROMOTION_BY_SCORE_ONLY = {
  id: 'K1',
  name: 'PROMOTION_BY_SCORE_ONLY',
  rule: '어떤 앱/모듈도 Score ≥ Threshold 일 때만 승격 가능',
  thresholds: {
    EXPERIMENTAL: 0,
    STABLE: 60,
    STANDARD: 85,
  },
  enforce: (score, threshold) => score >= threshold,
};

// K2: 사용자 의견은 신호
export const K2_USER_INPUT_IS_SIGNAL = {
  id: 'K2',
  name: 'USER_INPUT_IS_SIGNAL',
  rule: '사용자 피드백 = 입력값, 판단 = 공식',
  weights: {
    userSignal: 0.25,
    failureRate: 0.25,
    reuseRate: 0.25,
    riskScore: 0.25,
  },
  enforce: (input) => {
    return (
      input.userSignal * 0.25 +
      (100 - input.failureRate) * 0.25 +
      input.reuseRate * 0.25 +
      (100 - input.riskScore) * 0.25
    );
  },
};

// K3: Proof 없는 결과는 없다
export const K3_NO_PROOF_NO_RESULT = {
  id: 'K3',
  name: 'NO_PROOF_NO_RESULT',
  rule: 'Proof Pack 5종 미완성 → 자동 탈락',
  requiredProofs: [
    'INPUT_LOG',        // 입력 기록
    'PROCESS_TRACE',    // 처리 과정
    'OUTPUT_HASH',      // 결과 해시
    'TIMESTAMP',        // 시간 증명
    'VALIDATOR_SIG',    // 검증자 서명
  ],
  enforce: (proofs) => {
    return K3_NO_PROOF_NO_RESULT.requiredProofs.every(
      proof => proofs[proof] !== undefined && proofs[proof] !== null
    );
  },
};

// K4: Core는 즉시 반응하지 않는다
export const K4_CORE_NEVER_REACTS_DIRECTLY = {
  id: 'K4',
  name: 'CORE_NEVER_REACTS_DIRECTLY',
  rule: '모든 변화는: 입력 → 대기 → 평가 → 적용',
  minWaitPeriod: 24 * 60 * 60 * 1000, // 24시간
  allowedHotfix: ['SECURITY_CRITICAL', 'LEGAL_COMPLIANCE'],
  enforce: (changeType, requestedAt, currentTime) => {
    if (K4_CORE_NEVER_REACTS_DIRECTLY.allowedHotfix.includes(changeType)) {
      return { allowed: true, reason: 'HOTFIX_ALLOWED' };
    }
    const waited = currentTime - requestedAt;
    if (waited < K4_CORE_NEVER_REACTS_DIRECTLY.minWaitPeriod) {
      const hoursRemaining = Math.ceil(
        (K4_CORE_NEVER_REACTS_DIRECTLY.minWaitPeriod - waited) / 3600000
      );
      return { allowed: false, reason: `WAIT_REQUIRED: ${hoursRemaining}h remaining` };
    }
    return { allowed: true, reason: 'WAIT_PERIOD_PASSED' };
  },
};

// K5: Standard는 극소수만
export const K5_STANDARD_IS_RARE = {
  id: 'K5',
  name: 'STANDARD_IS_RARE',
  rule: 'Standard ≤ 10% of total modules',
  maxStandardRatio: 0.10,
  enforce: (totalModules, standardModules) => {
    const currentRatio = totalModules > 0 ? standardModules / totalModules : 0;
    const maxAllowed = Math.floor(totalModules * 0.10);
    return {
      allowed: currentRatio <= 0.10,
      currentRatio,
      maxAllowed,
    };
  },
};

// ============================================
// Quality Score 공식
// ============================================
export const QUALITY_SCORE = {
  weights: {
    userSatisfaction: 0.4,
    reuseRate: 0.2,
    reliability: 0.2,  // 100 - failureRate
    outcomeImpact: 0.2,
  },
  calculate: (metrics) => {
    return (
      (metrics.userSatisfaction || 0) * 0.4 +
      (metrics.reuseRate || 0) * 0.2 +
      (100 - (metrics.failureRate || 0)) * 0.2 +
      (metrics.outcomeImpact || 0) * 0.2
    );
  },
};

// ============================================
// ConstitutionAdapter Class
// ============================================
export class ConstitutionAdapter {
  constructor() {
    this.pendingChanges = new Map();  // 대기 중인 변경사항
    this.verdicts = [];               // 판결 이력
  }

  // ----------------------------------------
  // 규칙 승격 검증 (Shadow → Auto)
  // ----------------------------------------
  validateRulePromotion(rule, currentMode, targetMode, metrics) {
    const violations = [];
    const details = {};

    // K1: 점수 기반 승격
    if (targetMode === 'auto') {
      const score = QUALITY_SCORE.calculate(metrics);
      const threshold = 70; // Auto 승격 기준: 70점

      details.k1 = {
        score,
        threshold,
        passed: score >= threshold,
      };

      if (score < threshold) {
        violations.push({
          law: 'K1',
          reason: `Score ${score.toFixed(1)} < Threshold ${threshold}`,
        });
      }
    }

    // K3: Proof 검증
    const proofs = this.generateRuleProofs(rule, metrics);
    const k3Passed = K3_NO_PROOF_NO_RESULT.enforce(proofs);

    details.k3 = {
      proofs: Object.keys(proofs).filter(k => proofs[k]),
      missing: K3_NO_PROOF_NO_RESULT.requiredProofs.filter(k => !proofs[k]),
      passed: k3Passed,
    };

    if (!k3Passed) {
      violations.push({
        law: 'K3',
        reason: `Missing proofs: ${details.k3.missing.join(', ')}`,
      });
    }

    // K4: 대기 기간 (신규 규칙인 경우)
    const pendingChange = this.pendingChanges.get(rule.id);
    if (pendingChange) {
      const k4Result = K4_CORE_NEVER_REACTS_DIRECTLY.enforce(
        'RULE_PROMOTION',
        pendingChange.requestedAt,
        Date.now()
      );

      details.k4 = {
        requestedAt: pendingChange.requestedAt,
        passed: k4Result.allowed,
        reason: k4Result.reason,
      };

      if (!k4Result.allowed) {
        violations.push({
          law: 'K4',
          reason: k4Result.reason,
        });
      }
    } else {
      // 대기열에 추가
      this.pendingChanges.set(rule.id, {
        type: 'RULE_PROMOTION',
        requestedAt: Date.now(),
        currentMode,
        targetMode,
        metrics,
      });

      violations.push({
        law: 'K4',
        reason: 'WAIT_REQUIRED: 24h remaining (just queued)',
      });

      details.k4 = {
        status: 'queued',
        passed: false,
      };
    }

    const verdict = {
      ruleId: rule.id,
      approved: violations.length === 0,
      violations,
      details,
      checkedAt: new Date().toISOString(),
    };

    this.verdicts.push(verdict);

    return verdict;
  }

  // ----------------------------------------
  // 규칙 Proof 생성
  // ----------------------------------------
  generateRuleProofs(rule, metrics) {
    return {
      INPUT_LOG: {
        rule_id: rule.id,
        rule_name: rule.name,
        current_mode: rule.mode,
        timestamp: new Date().toISOString(),
      },
      PROCESS_TRACE: {
        triggered_count: metrics.triggeredCount || 0,
        executed_count: metrics.executedCount || 0,
        success_count: metrics.successCount || 0,
      },
      OUTPUT_HASH: this.hashObject({
        rule_id: rule.id,
        metrics,
      }),
      TIMESTAMP: Date.now(),
      VALIDATOR_SIG: metrics.triggeredCount >= 10
        ? `AUTO_VALIDATED_${rule.id}`
        : null, // 10회 이상 트리거 시 자동 검증
    };
  }

  // ----------------------------------------
  // 임계값 조정 검증
  // ----------------------------------------
  validateThresholdAdjustment(rule, thresholdKey, oldValue, newValue) {
    const violations = [];

    // K2: 사용자 신호 기반 결정
    // 단순히 "좋아 보인다"로 조정 불가, 데이터 기반이어야 함
    const changeRatio = Math.abs(newValue - oldValue) / oldValue;

    if (changeRatio > 0.5) {
      violations.push({
        law: 'K2',
        reason: `변경폭 ${(changeRatio * 100).toFixed(0)}% > 50% (한 번에 큰 변경 불가)`,
      });
    }

    // K4: 대기 기간
    const pendingKey = `${rule.id}_threshold_${thresholdKey}`;
    const pendingChange = this.pendingChanges.get(pendingKey);

    if (!pendingChange) {
      this.pendingChanges.set(pendingKey, {
        type: 'THRESHOLD_ADJUSTMENT',
        requestedAt: Date.now(),
        oldValue,
        newValue,
      });

      violations.push({
        law: 'K4',
        reason: 'WAIT_REQUIRED: 24h remaining',
      });
    } else {
      const k4Result = K4_CORE_NEVER_REACTS_DIRECTLY.enforce(
        'THRESHOLD_ADJUSTMENT',
        pendingChange.requestedAt,
        Date.now()
      );

      if (!k4Result.allowed) {
        violations.push({
          law: 'K4',
          reason: k4Result.reason,
        });
      }
    }

    return {
      approved: violations.length === 0,
      violations,
      checkedAt: new Date().toISOString(),
    };
  }

  // ----------------------------------------
  // Standard 승격 검증 (제품/모듈용)
  // ----------------------------------------
  validateStandardPromotion(moduleId, allModules) {
    const standardCount = allModules.filter(m => m.tier === 'STANDARD').length;
    const totalCount = allModules.length;

    const k5Result = K5_STANDARD_IS_RARE.enforce(totalCount, standardCount);

    if (!k5Result.allowed) {
      return {
        approved: false,
        violations: [{
          law: 'K5',
          reason: `Standard 비율 ${(k5Result.currentRatio * 100).toFixed(1)}% > 10%`,
        }],
        currentRatio: k5Result.currentRatio,
        maxAllowed: k5Result.maxAllowed,
      };
    }

    return {
      approved: true,
      violations: [],
      currentRatio: k5Result.currentRatio,
      maxAllowed: k5Result.maxAllowed,
    };
  }

  // ----------------------------------------
  // 헬퍼 함수
  // ----------------------------------------
  hashObject(obj) {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `HASH_${Math.abs(hash).toString(16).toUpperCase()}`;
  }

  // ----------------------------------------
  // 상태 조회
  // ----------------------------------------
  getPendingChanges() {
    return Array.from(this.pendingChanges.entries()).map(([key, value]) => ({
      key,
      ...value,
      waitingFor: Math.max(0, Math.ceil(
        (K4_CORE_NEVER_REACTS_DIRECTLY.minWaitPeriod -
          (Date.now() - value.requestedAt)) / 3600000
      )),
    }));
  }

  getVerdicts(limit = 10) {
    return this.verdicts.slice(-limit);
  }

  clearApprovedChanges() {
    const now = Date.now();
    for (const [key, change] of this.pendingChanges.entries()) {
      const waited = now - change.requestedAt;
      if (waited >= K4_CORE_NEVER_REACTS_DIRECTLY.minWaitPeriod) {
        this.pendingChanges.delete(key);
      }
    }
  }
}

// 싱글톤 인스턴스
export const constitutionAdapter = new ConstitutionAdapter();

export default ConstitutionAdapter;
