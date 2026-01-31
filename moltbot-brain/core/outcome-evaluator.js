/**
 * 🧠 MoltBot Brain - Outcome Evaluator
 *
 * "정답 데이터는 설문이 아니라 결과"
 * 출석 ↑ / 재등록 ↑ / 개입 ↓ 만 본다.
 */

import { InterventionLogger } from './intervention-log.js';
import { ruleEngine } from './rule-engine.js';
import { stateGraph, STATE_LEVELS } from './state-graph.js';

// ============================================
// KPI 정의
// ============================================
export const KPI = {
  ATTENDANCE_IMPROVEMENT: 'attendance_improvement', // 출석률 개선
  PAYMENT_RECOVERY: 'payment_recovery',             // 미수금 회수
  RETENTION_RATE: 'retention_rate',                 // 재등록률
  INTERVENTION_REDUCTION: 'intervention_reduction', // 개입 횟수 감소
  STATE_IMPROVEMENT: 'state_improvement',           // 상태 개선 (ALERT → STABLE)
  RESPONSE_TIME: 'response_time',                   // 개입 후 반응 시간
};

// ============================================
// Outcome Evaluator
// ============================================
export class OutcomeEvaluator {
  constructor() {
    this.logger = new InterventionLogger();
    this.learnings = new Map(); // 규칙별 학습 결과
  }

  // ============================================
  // 개입 결과 평가
  // ============================================

  /**
   * 개입 결과 평가 (핵심!)
   */
  evaluateIntervention(interventionId, currentState) {
    const logs = this.logger.readAll();
    const intervention = logs.find(l => l.id === interventionId);

    if (!intervention) return null;

    const { before_state, target_id } = intervention;
    if (!before_state) return null;

    // 결과 계산
    const outcome = {
      success: false,
      metrics: {},
      score: 0,
    };

    // 출석률 개선
    if (before_state.attendance_rate !== undefined) {
      const delta = (currentState.attendance_rate || 0) - (before_state.attendance_rate || 0);
      outcome.metrics[KPI.ATTENDANCE_IMPROVEMENT] = delta;
      if (delta > 0) outcome.score += 30;
    }

    // 미수금 감소
    if (before_state.total_outstanding !== undefined) {
      const delta = (before_state.total_outstanding || 0) - (currentState.total_outstanding || 0);
      outcome.metrics[KPI.PAYMENT_RECOVERY] = delta;
      if (delta > 0) outcome.score += 30;
    }

    // 상태 개선
    if (before_state.state && currentState.state) {
      const stateOrder = {
        [STATE_LEVELS.CRITICAL]: 0,
        [STATE_LEVELS.ALERT]: 1,
        [STATE_LEVELS.PROTECTED]: 2,
        [STATE_LEVELS.WATCH]: 3,
        [STATE_LEVELS.STABLE]: 4,
        [STATE_LEVELS.OPTIMAL]: 5,
      };
      const improvement = stateOrder[currentState.state] - stateOrder[before_state.state];
      outcome.metrics[KPI.STATE_IMPROVEMENT] = improvement;
      if (improvement > 0) outcome.score += 40;
    }

    // 성공 판정 (50점 이상)
    outcome.success = outcome.score >= 50;

    // 로그 업데이트
    this.logger.updateOutcome(
      interventionId,
      outcome.success ? 'success' : 'failed',
      currentState,
      outcome.metrics
    );

    // 학습 반영
    this.learn(intervention.action, outcome);

    return outcome;
  }

  // ============================================
  // 학습 (규칙 자동 조정)
  // ============================================

  /**
   * 결과에서 학습
   */
  learn(actionCode, outcome) {
    if (!this.learnings.has(actionCode)) {
      this.learnings.set(actionCode, {
        total: 0,
        success: 0,
        total_score: 0,
        adjustments: [],
      });
    }

    const learning = this.learnings.get(actionCode);
    learning.total++;
    if (outcome.success) learning.success++;
    learning.total_score += outcome.score;

    // 성공률 계산
    const successRate = learning.success / learning.total;

    console.log(`[LEARN] ${actionCode}: ${Math.round(successRate * 100)}% success (${learning.total} trials)`);

    // 자동 조정 로직
    if (learning.total >= 10) {
      this.autoAdjust(actionCode, successRate);
    }
  }

  /**
   * 규칙 자동 조정
   */
  autoAdjust(actionCode, successRate) {
    // 관련 규칙 찾기
    const relatedRules = ruleEngine.rules.filter(r => r.actions.includes(actionCode));

    for (const rule of relatedRules) {
      if (successRate >= 0.7) {
        // 성공률 70% 이상: Shadow → Auto 전환 고려
        if (rule.mode === 'shadow') {
          console.log(`[AUTO-ADJUST] ${rule.id}: Consider promoting to AUTO (${Math.round(successRate * 100)}% success)`);

          // 실제 전환은 수동 승인 필요 (로그만 남김)
          this.learnings.get(actionCode).adjustments.push({
            type: 'promote_to_auto',
            rule_id: rule.id,
            success_rate: successRate,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (successRate < 0.3) {
        // 성공률 30% 미만: 임계값 조정 필요
        console.log(`[AUTO-ADJUST] ${rule.id}: Low success rate, consider threshold adjustment`);

        this.learnings.get(actionCode).adjustments.push({
          type: 'adjust_threshold',
          rule_id: rule.id,
          success_rate: successRate,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // ============================================
  // A/B 테스트
  // ============================================

  /**
   * 규칙 간 성과 비교
   */
  compareRules(ruleIdA, ruleIdB) {
    const patterns = this.logger.analyzePatterns();

    // 각 규칙의 관련 패턴 찾기
    const ruleA = ruleEngine.rules.find(r => r.id === ruleIdA);
    const ruleB = ruleEngine.rules.find(r => r.id === ruleIdB);

    if (!ruleA || !ruleB) return null;

    const getPatternStats = (rule) => {
      const actionPatterns = patterns.filter(p =>
        rule.actions.some(a => p.pattern.includes(a))
      );
      return {
        total: actionPatterns.reduce((s, p) => s + p.total, 0),
        success: actionPatterns.reduce((s, p) => s + p.success, 0),
      };
    };

    const statsA = getPatternStats(ruleA);
    const statsB = getPatternStats(ruleB);

    return {
      ruleA: {
        id: ruleIdA,
        ...statsA,
        rate: statsA.total > 0 ? Math.round((statsA.success / statsA.total) * 100) : 0,
      },
      ruleB: {
        id: ruleIdB,
        ...statsB,
        rate: statsB.total > 0 ? Math.round((statsB.success / statsB.total) * 100) : 0,
      },
      winner: statsA.total > 0 && statsB.total > 0
        ? (statsA.success / statsA.total > statsB.success / statsB.total ? ruleIdA : ruleIdB)
        : null,
    };
  }

  // ============================================
  // 리포트
  // ============================================

  /**
   * 전체 성과 리포트
   */
  generateReport() {
    const patterns = this.logger.analyzePatterns();
    const atRisk = stateGraph.getAtRiskStudents();
    const graphStats = stateGraph.getStats();

    return {
      summary: {
        total_interventions: patterns.reduce((s, p) => s + p.total, 0),
        overall_success_rate: patterns.length > 0
          ? Math.round(patterns.reduce((s, p) => s + p.rate, 0) / patterns.length)
          : 0,
        at_risk_students: atRisk.length,
        graph_nodes: graphStats.total_nodes,
      },
      top_patterns: patterns.slice(0, 5),
      student_states: graphStats.student_states,
      learnings: Object.fromEntries(this.learnings),
      recommendations: this.generateRecommendations(patterns),
    };
  }

  /**
   * 개선 권고사항 생성
   */
  generateRecommendations(patterns) {
    const recommendations = [];

    // 낮은 성공률 패턴 개선 제안
    const lowSuccess = patterns.filter(p => p.rate < 50 && p.total >= 5);
    for (const pattern of lowSuccess) {
      recommendations.push({
        type: 'improve_pattern',
        pattern: pattern.pattern,
        current_rate: pattern.rate,
        suggestion: `이 패턴의 성공률이 ${pattern.rate}%입니다. 임계값이나 타이밍 조정을 고려하세요.`,
      });
    }

    // Shadow → Auto 승격 제안
    for (const [action, learning] of this.learnings) {
      if (learning.total >= 10) {
        const rate = learning.success / learning.total;
        if (rate >= 0.7) {
          const shadowRules = ruleEngine.rules.filter(
            r => r.mode === 'shadow' && r.actions.includes(action)
          );
          for (const rule of shadowRules) {
            recommendations.push({
              type: 'promote_rule',
              rule_id: rule.id,
              action,
              success_rate: Math.round(rate * 100),
              suggestion: `${rule.name} 규칙을 Auto 모드로 전환할 수 있습니다. (성공률 ${Math.round(rate * 100)}%)`,
            });
          }
        }
      }
    }

    return recommendations;
  }
}

// 싱글톤
export const outcomeEvaluator = new OutcomeEvaluator();
export default OutcomeEvaluator;
