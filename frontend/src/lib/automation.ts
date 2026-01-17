/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚡ Automation Engine — 자동 실행
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 규칙 기반 자동 실행:
 * - 조건부 자동 수락/거절
 * - 스케줄링
 * - 배치 처리
 * - 실행 로그
 * 
 * 원칙:
 * - 명시적 동의 필요
 * - 되돌리기 가능
 * - 제한된 범위
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  action: 'accept' | 'reject' | 'delay' | 'delegate';
  actionParams?: Record<string, any>;
  priority: number;
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface RuleCondition {
  field: 'source' | 'delta' | 'urgency' | 'text' | 'time' | 'dayOfWeek';
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
  value: any;
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  decisionId: string;
  decisionText: string;
  action: string;
  timestamp: string;
  undone: boolean;
}

export interface ScheduledTask {
  id: string;
  type: 'collect' | 'report' | 'sync' | 'cleanup';
  cron: string;
  lastRun?: string;
  nextRun: string;
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_AUTO_ACTIONS_PER_HOUR = 20;
const UNDO_WINDOW_MS = 5 * 60 * 1000; // 5분

// ═══════════════════════════════════════════════════════════════════════════════
// Rule Engine
// ═══════════════════════════════════════════════════════════════════════════════

export class RuleEngine {
  private rules: Map<string, AutomationRule> = new Map();
  private logs: AutomationLog[] = [];
  private actionCount: Map<number, number> = new Map(); // hour -> count

  /**
   * 규칙 추가
   */
  addRule(rule: Omit<AutomationRule, 'createdAt' | 'triggerCount'>): AutomationRule {
    const fullRule: AutomationRule = {
      ...rule,
      createdAt: new Date().toISOString(),
      triggerCount: 0,
    };
    
    this.rules.set(rule.id, fullRule);
    return fullRule;
  }

  /**
   * 규칙 제거
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * 규칙 활성화/비활성화
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * 결정에 대해 규칙 평가
   */
  evaluate(decision: {
    id: string;
    text: string;
    source: string;
    delta: number;
    urgency: number;
  }): { rule: AutomationRule; action: string } | null {
    // 시간당 제한 체크
    const hour = new Date().getHours();
    const count = this.actionCount.get(hour) || 0;
    if (count >= MAX_AUTO_ACTIONS_PER_HOUR) {
      return null;
    }

    // 우선순위 순 정렬
    const sortedRules = Array.from(this.rules.values())
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.matchesConditions(decision, rule.conditions)) {
        // 실행 카운트 증가
        rule.triggerCount++;
        rule.lastTriggered = new Date().toISOString();
        this.actionCount.set(hour, count + 1);
        
        // 로그 기록
        this.logAction(rule, decision);
        
        return { rule, action: rule.action };
      }
    }

    return null;
  }

  /**
   * 조건 매칭
   */
  private matchesConditions(
    decision: { text: string; source: string; delta: number; urgency: number },
    conditions: RuleCondition[]
  ): boolean {
    return conditions.every(cond => this.matchCondition(decision, cond));
  }

  /**
   * 단일 조건 매칭
   */
  private matchCondition(
    decision: { text: string; source: string; delta: number; urgency: number },
    condition: RuleCondition
  ): boolean {
    let fieldValue: any;

    switch (condition.field) {
      case 'source':
        fieldValue = decision.source;
        break;
      case 'delta':
        fieldValue = decision.delta;
        break;
      case 'urgency':
        fieldValue = decision.urgency;
        break;
      case 'text':
        fieldValue = decision.text;
        break;
      case 'time':
        fieldValue = new Date().getHours();
        break;
      case 'dayOfWeek':
        fieldValue = new Date().getDay();
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'gt':
        return fieldValue > condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'between':
        return fieldValue >= condition.value[0] && fieldValue <= condition.value[1];
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * 액션 로그 기록
   */
  private logAction(rule: AutomationRule, decision: { id: string; text: string }): void {
    this.logs.push({
      id: `log_${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      decisionId: decision.id,
      decisionText: decision.text.slice(0, 50),
      action: rule.action,
      timestamp: new Date().toISOString(),
      undone: false,
    });

    // 최근 500개만 유지
    if (this.logs.length > 500) {
      this.logs.shift();
    }
  }

  /**
   * 되돌리기
   */
  undo(logId: string): boolean {
    const log = this.logs.find(l => l.id === logId);
    if (!log) return false;

    // 5분 이내만 되돌리기 가능
    const logTime = new Date(log.timestamp).getTime();
    if (Date.now() - logTime > UNDO_WINDOW_MS) {
      return false;
    }

    log.undone = true;
    return true;
  }

  /**
   * 로그 조회
   */
  getLogs(limit = 50): AutomationLog[] {
    return this.logs.slice(-limit).reverse();
  }

  /**
   * 규칙 조회
   */
  getRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 통계
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    totalTriggers: number;
    todayTriggers: number;
  } {
    const rules = Array.from(this.rules.values());
    const today = new Date().toISOString().split('T')[0];
    
    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      totalTriggers: rules.reduce((sum, r) => sum + r.triggerCount, 0),
      todayTriggers: this.logs.filter(l => l.timestamp.startsWith(today)).length,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scheduler
// ═══════════════════════════════════════════════════════════════════════════════

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private onTask?: (task: ScheduledTask) => void;

  /**
   * 태스크 등록
   */
  addTask(task: Omit<ScheduledTask, 'nextRun'>): ScheduledTask {
    const nextRun = this.calculateNextRun(task.cron);
    const fullTask: ScheduledTask = { ...task, nextRun };
    
    this.tasks.set(task.id, fullTask);
    this.scheduleTask(fullTask);
    
    return fullTask;
  }

  /**
   * 태스크 제거
   */
  removeTask(taskId: string): boolean {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearTimeout(interval);
      this.intervals.delete(taskId);
    }
    return this.tasks.delete(taskId);
  }

  /**
   * 태스크 스케줄링
   */
  private scheduleTask(task: ScheduledTask): void {
    if (!task.enabled) return;

    const nextRunTime = new Date(task.nextRun).getTime();
    const delay = Math.max(0, nextRunTime - Date.now());

    const timeout = setTimeout(() => {
      this.executeTask(task);
    }, delay);

    this.intervals.set(task.id, timeout);
  }

  /**
   * 태스크 실행
   */
  private executeTask(task: ScheduledTask): void {
    task.lastRun = new Date().toISOString();
    task.nextRun = this.calculateNextRun(task.cron);
    
    this.onTask?.(task);
    
    // 다음 실행 스케줄
    this.scheduleTask(task);
  }

  /**
   * 다음 실행 시간 계산 (간단한 cron 파서)
   */
  private calculateNextRun(cron: string): string {
    const parts = cron.split(' ');
    const now = new Date();
    
    // 간단한 처리: "0 9 * * *" = 매일 9시
    if (parts.length === 5) {
      const [minute, hour] = parts.map(Number);
      const next = new Date(now);
      
      next.setHours(hour, minute, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next.toISOString();
    }
    
    // 기본: 1시간 후
    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }

  /**
   * 콜백 설정
   */
  setCallback(callback: (task: ScheduledTask) => void): void {
    this.onTask = callback;
  }

  /**
   * 태스크 목록
   */
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 모든 스케줄 중지
   */
  stopAll(): void {
    for (const interval of this.intervals.values()) {
      clearTimeout(interval);
    }
    this.intervals.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Preset Rules
// ═══════════════════════════════════════════════════════════════════════════════

export const PRESET_RULES: Omit<AutomationRule, 'id' | 'createdAt' | 'triggerCount'>[] = [
  {
    name: '낮은 중요도 자동 거절',
    enabled: false,
    conditions: [
      { field: 'delta', operator: 'lt', value: 5 },
      { field: 'urgency', operator: 'lt', value: 30 },
    ],
    action: 'reject',
    priority: 10,
  },
  {
    name: '긴급 결정 자동 수락',
    enabled: false,
    conditions: [
      { field: 'urgency', operator: 'gt', value: 90 },
      { field: 'delta', operator: 'gt', value: 20 },
    ],
    action: 'accept',
    priority: 20,
  },
  {
    name: '업무시간 외 지연',
    enabled: false,
    conditions: [
      { field: 'time', operator: 'lt', value: 9 },
    ],
    action: 'delay',
    priority: 5,
  },
  {
    name: '주말 지연',
    enabled: false,
    conditions: [
      { field: 'dayOfWeek', operator: 'in', value: [0, 6] },
    ],
    action: 'delay',
    priority: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════════

export function createRuleEngine(): RuleEngine {
  return new RuleEngine();
}

export function createScheduler(): Scheduler {
  return new Scheduler();
}

export default { RuleEngine, Scheduler, PRESET_RULES };
