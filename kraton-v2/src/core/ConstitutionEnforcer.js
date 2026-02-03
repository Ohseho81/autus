/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Constitution Enforcer
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * K1-K5 헌법을 실제로 강제하는 엔진
 * 모든 행동은 이 검사를 통과해야 함
 */

import { EventBus, EventTypes } from './EventBus.js';
import { Persistence } from './Persistence.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constitution (불변)
// ═══════════════════════════════════════════════════════════════════════════════

export const CONSTITUTION = Object.freeze({
  K1: {
    id: 'K1',
    name: 'Score-based promotion only',
    description: '점수 기반 승격만 허용',
    check: (action) => {
      if (action.type === 'PROMOTION' || action.type === 'ROLE_CHANGE') {
        // 점수가 있어야 함
        if (!action.payload.score && action.payload.score !== 0) {
          return { passed: false, reason: 'K1 위반: 승격에는 점수가 필요합니다' };
        }
        // 점수가 임계값 이상이어야 함
        const threshold = action.payload.threshold || 80;
        if (action.payload.score < threshold) {
          return { passed: false, reason: `K1 위반: 점수(${action.payload.score})가 임계값(${threshold}) 미만입니다` };
        }
      }
      return { passed: true };
    },
  },

  K2: {
    id: 'K2',
    name: 'User input is signal, not command',
    description: '사용자 입력은 신호지, 명령이 아님',
    check: (action) => {
      // USER:INPUT 이벤트는 분류 "전" 이벤트이므로 통과 (분류 과정의 시작점)
      if (action.type === 'USER:INPUT') {
        // 직접 실행만 차단
        if (action.payload?.executeDirectly === true) {
          return { passed: false, reason: 'K2 위반: 사용자 입력은 직접 실행할 수 없습니다' };
        }
        return { passed: true };
      }

      // USER_ACTION은 분류된 후의 행동이므로 classified 체크
      if (action.type === 'USER:ACTION' || action.source === 'user') {
        // 사용자 입력은 직접 실행되면 안 됨
        if (action.payload?.executeDirectly === true) {
          return { passed: false, reason: 'K2 위반: 사용자 입력은 직접 실행할 수 없습니다' };
        }
        // 반드시 분류 단계를 거쳐야 함
        if (!action.payload?.classified && action.payload?.requiresClassification !== false) {
          return { passed: false, reason: 'K2 위반: 사용자 입력은 분류 과정을 거쳐야 합니다' };
        }
      }
      return { passed: true };
    },
  },

  K3: {
    id: 'K3',
    name: 'No action without proof',
    description: '증거 없이 행동 금지',
    check: (action) => {
      // 중요한 행동은 증거가 필요
      const criticalActions = [
        'PAYMENT', 'REFUND', 'SUSPENSION', 'TERMINATION',
        'PROMOTION', 'DEMOTION', 'DELETE', 'APPROVAL',
      ];

      if (criticalActions.some(ca => action.type.includes(ca))) {
        if (!action.payload.proof && !action.payload.evidence) {
          return { passed: false, reason: `K3 위반: ${action.type}에는 증거가 필요합니다` };
        }
      }
      return { passed: true };
    },
  },

  K4: {
    id: 'K4',
    name: '24h waiting period',
    description: '주요 결정에 24시간 대기',
    check: async (action) => {
      const majorDecisions = [
        'TERMINATION', 'LARGE_REFUND', 'CONTRACT_CANCEL',
        'MASS_DELETE', 'POLICY_CHANGE',
      ];

      if (majorDecisions.some(md => action.type.includes(md))) {
        // 요청 시간 확인
        const requestedAt = action.payload.requestedAt;
        if (!requestedAt) {
          return { passed: false, reason: 'K4 위반: 주요 결정은 요청 시간이 필요합니다' };
        }

        const now = Date.now();
        const waitTime = 24 * 60 * 60 * 1000; // 24시간
        const elapsed = now - requestedAt;

        if (elapsed < waitTime) {
          const remaining = Math.ceil((waitTime - elapsed) / (60 * 60 * 1000));
          return {
            passed: false,
            reason: `K4 위반: ${remaining}시간 더 대기해야 합니다`,
            retryAfter: requestedAt + waitTime,
          };
        }
      }
      return { passed: true };
    },
  },

  K5: {
    id: 'K5',
    name: 'Standard ≤ 10%',
    description: '표준 10% 이하 유지',
    check: (action) => {
      // 표준/정책 변경 시 영향 범위 확인
      if (action.type === 'STANDARD_CHANGE' || action.type === 'POLICY_UPDATE') {
        const affectedRatio = action.payload.affectedRatio || action.payload.impactRatio;
        if (affectedRatio && affectedRatio > 0.1) {
          return {
            passed: false,
            reason: `K5 위반: 영향 범위(${(affectedRatio * 100).toFixed(1)}%)가 10%를 초과합니다`,
          };
        }
      }
      return { passed: true };
    },
  },

  // Pain Signal 정의 (헌법의 일부)
  PAIN_SIGNAL: {
    id: 'PAIN_SIGNAL',
    name: 'Pain Signal Definition',
    description: '해결하면 V가 창출되는 사용자 입력',
    FILTER_TARGET: 0.90,
    check: (signal) => {
      // Pain Signal 분류 검증
      if (signal.type === 'PAIN_CLASSIFICATION') {
        const { classification, score } = signal.payload;

        // 분류가 있어야 함
        if (!classification) {
          return { passed: false, reason: 'Pain Signal은 분류가 필요합니다' };
        }

        // 점수가 있어야 함
        if (score === undefined || score === null) {
          return { passed: false, reason: 'Pain Signal은 점수가 필요합니다' };
        }

        // 점수 범위 확인
        if (score < 0 || score > 1) {
          return { passed: false, reason: 'Pain Signal 점수는 0~1 범위여야 합니다' };
        }
      }
      return { passed: true };
    },
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// Enforcer Class
// ═══════════════════════════════════════════════════════════════════════════════

class ConstitutionEnforcerClass {
  constructor() {
    this.violations = [];
    this.checkCount = 0;
    this.passCount = 0;
    this.initialized = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────────────────────

  async init() {
    if (this.initialized) return this;

    // EventBus 미들웨어로 등록 - 모든 이벤트가 헌법 검사를 거침
    EventBus.use(async (event) => {
      const result = await this.check(event);

      if (!result.passed) {
        // 위반 시 이벤트 차단
        EventBus.emit(EventTypes.CONSTITUTION_VIOLATION, {
          originalEvent: event,
          violation: result,
        });
        return null; // 이벤트 차단
      }

      return event;
    });

    this.initialized = true;
    console.log('[Constitution] Enforcer initialized');
    return this;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Core Check
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 헌법 전체 검사
   */
  async check(action) {
    this.checkCount++;

    const results = {
      passed: true,
      violations: [],
      action: action.type,
      timestamp: Date.now(),
    };

    // 모든 헌법 조항 검사
    for (const [key, clause] of Object.entries(CONSTITUTION)) {
      try {
        const checkResult = await clause.check(action);

        if (!checkResult.passed) {
          results.passed = false;
          results.violations.push({
            clause: key,
            name: clause.name,
            reason: checkResult.reason,
            retryAfter: checkResult.retryAfter,
          });
        }
      } catch (error) {
        console.error(`[Constitution] Error checking ${key}:`, error);
      }
    }

    if (results.passed) {
      this.passCount++;
    } else {
      this._recordViolation(results);
    }

    return results;
  }

  /**
   * 특정 조항만 검사
   */
  async checkClause(clauseId, action) {
    const clause = CONSTITUTION[clauseId];
    if (!clause) {
      return { passed: false, reason: `Unknown clause: ${clauseId}` };
    }
    return clause.check(action);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Violation Management
  // ─────────────────────────────────────────────────────────────────────────────

  _recordViolation(result) {
    const violation = {
      id: `vio_${Date.now()}`,
      ...result,
    };

    this.violations.push(violation);

    // 영속성 저장
    Persistence.appendLog('constitution_violations', violation);
  }

  getViolations(filter = {}) {
    let result = [...this.violations];

    if (filter.clause) {
      result = result.filter(v => v.violations.some(vv => vv.clause === filter.clause));
    }
    if (filter.since) {
      result = result.filter(v => v.timestamp >= filter.since);
    }
    if (filter.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // K4 대기열 관리
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * K4 대기 요청 생성
   */
  async requestMajorDecision(action) {
    const request = {
      id: `k4_${Date.now()}`,
      action,
      requestedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000),
      status: 'waiting',
    };

    await Persistence.save('k4_waiting_queue', request);

    return {
      queued: true,
      request,
      executeAfter: new Date(request.expiresAt).toISOString(),
    };
  }

  /**
   * K4 대기열 확인
   */
  async getK4Queue() {
    const queue = await Persistence.load('k4_waiting_queue');
    const now = Date.now();

    return queue.map(item => ({
      ...item,
      canExecute: now >= item.expiresAt,
      remainingHours: Math.max(0, Math.ceil((item.expiresAt - now) / (60 * 60 * 1000))),
    }));
  }

  /**
   * K4 대기 완료 항목 실행
   */
  async executeReadyK4Actions() {
    const queue = await this.getK4Queue();
    const ready = queue.filter(q => q.canExecute && q.status === 'waiting');

    const results = [];
    for (const item of ready) {
      // 상태 업데이트
      item.status = 'executing';
      await Persistence.save('k4_waiting_queue', item);

      // 원래 액션 실행
      try {
        const result = await EventBus.emit(item.action.type, {
          ...item.action.payload,
          requestedAt: item.requestedAt, // K4 검사 통과용
        });

        item.status = 'completed';
        item.result = result;
      } catch (error) {
        item.status = 'failed';
        item.error = error.message;
      }

      await Persistence.save('k4_waiting_queue', item);
      results.push(item);
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────────────────────────────────────

  getStats() {
    const violationsByClause = {};
    this.violations.forEach(v => {
      v.violations.forEach(vv => {
        violationsByClause[vv.clause] = (violationsByClause[vv.clause] || 0) + 1;
      });
    });

    return {
      totalChecks: this.checkCount,
      passed: this.passCount,
      violations: this.violations.length,
      passRate: this.checkCount > 0
        ? ((this.passCount / this.checkCount) * 100).toFixed(1) + '%'
        : 'N/A',
      violationsByClause,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper: Action Builder (헌법 준수 액션 생성)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 헌법을 준수하는 액션 빌더
   */
  buildAction(type, payload = {}) {
    const action = {
      type,
      payload: {
        ...payload,
        _constitutionAware: true,
      },
      timestamp: Date.now(),
    };

    // K2: 사용자 입력이면 분류 플래그 추가
    if (type === 'USER_INPUT') {
      action.classified = false;
      action.executeDirectly = false;
    }

    // K3: 중요 행동이면 증거 필드 필수화
    const criticalActions = ['PAYMENT', 'REFUND', 'SUSPENSION', 'TERMINATION'];
    if (criticalActions.some(ca => type.includes(ca))) {
      if (!action.payload.proof) {
        action.payload.proof = {
          required: true,
          provided: false,
        };
      }
    }

    return action;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════════

export const ConstitutionEnforcer = new ConstitutionEnforcerClass();
export default ConstitutionEnforcer;
