/**
 * 🧠 MoltBot Brain - Rule Engine
 *
 * "여기서 실제 '결정'이 일어난다"
 * IF-THEN 규칙 실행, 임계값 비교, 승인 필요 여부 결정
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ACTION_CODES } from './intervention-log.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.join(__dirname, '../rules');

// ============================================
// Rule 스키마
// ============================================
/**
 * @typedef {Object} Rule
 * @property {string} id - 규칙 ID
 * @property {string} name - 규칙 이름
 * @property {string} description - 설명
 * @property {boolean} enabled - 활성화 여부
 * @property {string} mode - 'shadow' | 'auto' | 'manual'
 * @property {number} priority - 우선순위 (높을수록 먼저)
 * @property {Object} condition - 조건 (IF)
 * @property {Array} actions - 실행할 액션들 (THEN)
 * @property {Object} thresholds - 임계값들
 * @property {Object} stats - 실행 통계
 */

// ============================================
// 기본 규칙 세트 (올댓바스켓)
// ============================================
export const DEFAULT_RULES = [
  // 출석 규칙
  {
    id: 'ATT_001',
    name: '연속 결석 2회 알림',
    description: '연속 2회 결석 시 학부모에게 리마인더',
    enabled: true,
    mode: 'auto',
    priority: 90,
    condition: {
      type: 'consecutive_absent',
      operator: '>=',
      value: 2,
    },
    actions: [ACTION_CODES.ATT_REMIND],
    thresholds: { consecutive: 2 },
  },
  {
    id: 'ATT_002',
    name: '연속 결석 3회 보호모드',
    description: '연속 3회 결석 시 보호 모드 진입',
    enabled: true,
    mode: 'shadow', // 먼저 shadow로 관찰
    priority: 95,
    condition: {
      type: 'consecutive_absent',
      operator: '>=',
      value: 3,
    },
    actions: [ACTION_CODES.ATT_PROTECT, ACTION_CODES.ATT_CONTACT],
    thresholds: { consecutive: 3 },
  },
  {
    id: 'ATT_003',
    name: '출석률 70% 미만 경고',
    description: '분기 출석률 70% 미만 시 코치에게 알림',
    enabled: true,
    mode: 'auto',
    priority: 80,
    condition: {
      type: 'attendance_rate',
      operator: '<',
      value: 70,
    },
    actions: [ACTION_CODES.RISK_FLAG],
    thresholds: { rate: 70 },
  },

  // 결제 규칙
  {
    id: 'PAY_001',
    name: '납부 마감 3일 전 리마인더',
    description: '마감 3일 전 자동 리마인더',
    enabled: true,
    mode: 'auto',
    priority: 70,
    condition: {
      type: 'days_until_due',
      operator: '<=',
      value: 3,
    },
    actions: [ACTION_CODES.PAY_REMIND],
    thresholds: { days: 3 },
  },
  {
    id: 'PAY_002',
    name: '미납 7일 경과 연락',
    description: '마감 후 7일 경과 시 직접 연락',
    enabled: true,
    mode: 'shadow',
    priority: 85,
    condition: {
      type: 'days_overdue',
      operator: '>=',
      value: 7,
    },
    actions: [ACTION_CODES.PAY_CONTACT, ACTION_CODES.RISK_FLAG],
    thresholds: { days: 7 },
  },

  // 이탈 위험 규칙
  {
    id: 'RISK_001',
    name: '이탈 위험 감지',
    description: '출석률↓ + 참여도↓ = 이탈 위험',
    enabled: true,
    mode: 'auto',
    priority: 100,
    condition: {
      type: 'compound',
      operator: 'AND',
      conditions: [
        { type: 'attendance_rate', operator: '<', value: 75 },
        { type: 'engagement_score', operator: '<', value: 60 },
      ],
    },
    actions: [ACTION_CODES.RISK_FLAG, ACTION_CODES.COM_FEEDBACK],
    thresholds: { attendance: 75, engagement: 60 },
  },
];

// ============================================
// Rule Engine
// ============================================
export class RuleEngine {
  constructor() {
    this.rules = [...DEFAULT_RULES];
    this.stats = new Map();
    this.loadCustomRules();
  }

  /**
   * 커스텀 규칙 로드
   */
  loadCustomRules() {
    const customPath = path.join(RULES_DIR, 'custom-rules.json');
    if (fs.existsSync(customPath)) {
      try {
        const custom = JSON.parse(fs.readFileSync(customPath, 'utf-8'));
        this.rules = [...this.rules, ...custom];
        console.log(`[RULE ENGINE] Loaded ${custom.length} custom rules`);
      } catch (e) {
        console.error('[RULE ENGINE] Failed to load custom rules:', e.message);
      }
    }
  }

  /**
   * 규칙 저장
   */
  saveRules() {
    const customPath = path.join(RULES_DIR, 'custom-rules.json');
    const custom = this.rules.filter(r => !DEFAULT_RULES.find(d => d.id === r.id));
    if (!fs.existsSync(RULES_DIR)) {
      fs.mkdirSync(RULES_DIR, { recursive: true });
    }
    fs.writeFileSync(customPath, JSON.stringify(custom, null, 2));
  }

  /**
   * 조건 평가
   */
  evaluateCondition(condition, context) {
    const { type, operator, value, conditions } = condition;

    // 복합 조건
    if (type === 'compound') {
      if (operator === 'AND') {
        return conditions.every(c => this.evaluateCondition(c, context));
      }
      if (operator === 'OR') {
        return conditions.some(c => this.evaluateCondition(c, context));
      }
    }

    // 단순 조건
    const contextValue = context[type];
    if (contextValue === undefined) return false;

    switch (operator) {
      case '>=': return contextValue >= value;
      case '>': return contextValue > value;
      case '<=': return contextValue <= value;
      case '<': return contextValue < value;
      case '==': return contextValue === value;
      case '!=': return contextValue !== value;
      default: return false;
    }
  }

  /**
   * 규칙 실행 (핵심!)
   */
  evaluate(context) {
    const results = [];

    // 우선순위로 정렬
    const sortedRules = [...this.rules]
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      const matched = this.evaluateCondition(rule.condition, context);

      if (matched) {
        const result = {
          rule_id: rule.id,
          rule_name: rule.name,
          mode: rule.mode,
          actions: rule.actions,
          should_execute: rule.mode === 'auto',
          needs_approval: rule.mode === 'shadow' || rule.mode === 'manual',
          context_snapshot: { ...context },
          evaluated_at: new Date().toISOString(),
        };

        results.push(result);

        // 통계 업데이트
        this.updateStats(rule.id, 'triggered');

        console.log(`[RULE] ${rule.mode.toUpperCase()}: ${rule.name} → ${rule.actions.join(', ')}`);
      }
    }

    return results;
  }

  /**
   * 통계 업데이트
   */
  updateStats(ruleId, event) {
    if (!this.stats.has(ruleId)) {
      this.stats.set(ruleId, { triggered: 0, executed: 0, success: 0 });
    }
    const stat = this.stats.get(ruleId);
    stat[event]++;
  }

  /**
   * 규칙 모드 변경 (Shadow → Auto)
   */
  setRuleMode(ruleId, mode) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.mode = mode;
      console.log(`[RULE] ${ruleId} mode changed to: ${mode}`);
      this.saveRules();
    }
  }

  /**
   * 규칙 활성화/비활성화
   */
  setRuleEnabled(ruleId, enabled) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.saveRules();
    }
  }

  /**
   * 임계값 조정
   */
  adjustThreshold(ruleId, thresholdKey, newValue) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule && rule.thresholds) {
      rule.thresholds[thresholdKey] = newValue;

      // condition 값도 업데이트
      if (rule.condition.value !== undefined) {
        rule.condition.value = newValue;
      }

      console.log(`[RULE] ${ruleId} threshold ${thresholdKey} → ${newValue}`);
      this.saveRules();
    }
  }

  /**
   * 규칙 통계 조회
   */
  getStats() {
    const result = {};
    for (const [ruleId, stats] of this.stats) {
      result[ruleId] = {
        ...stats,
        execution_rate: stats.triggered > 0
          ? Math.round((stats.executed / stats.triggered) * 100)
          : 0,
        success_rate: stats.executed > 0
          ? Math.round((stats.success / stats.executed) * 100)
          : 0,
      };
    }
    return result;
  }

  /**
   * 규칙 목록 조회
   */
  listRules() {
    return this.rules.map(r => ({
      id: r.id,
      name: r.name,
      mode: r.mode,
      enabled: r.enabled,
      priority: r.priority,
    }));
  }
}

// 싱글톤 인스턴스
export const ruleEngine = new RuleEngine();
export default RuleEngine;
