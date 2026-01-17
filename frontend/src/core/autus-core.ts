// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS CORE v3.0
// 핵심 가치: 미래예측 + 자동화
// "의사결정이 닫히는 조건을 현실 위에 드러내는 시스템"
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 핵심 개념 정의
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AUTUS 핵심 기능 (2가지만)
 * 
 * 1. 미래예측 (Prediction): 현재 상태에서 미래 상태를 계산
 * 2. 자동화 (Automation): 조건 충족 시 자동 실행/잠금
 */
export interface AutusCore {
  /** 미래예측 엔진 */
  prediction: PredictionEngine;
  
  /** 자동화 엔진 */
  automation: AutomationEngine;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 미래예측 엔진 (Prediction Engine)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 예측 대상
 */
export interface PredictionTarget {
  /** 업무 ID */
  taskId: number;
  
  /** 현재 상태 */
  currentState: TaskState;
  
  /** 예측 시점 (시간 후) */
  horizonHours: number;
}

/**
 * 업무 상태
 */
export interface TaskState {
  /** 물리 상수 */
  mass: number;           // 질량 (중요도)
  psi: number;            // 비가역성
  omega: number;          // 엔트로피
  velocity: number;       // 속도
  
  /** 시간 */
  createdAt: number;
  deadline?: number;
  
  /** 관계 */
  dependencies: number[]; // 의존 업무
  dependents: number[];   // 피의존 업무
  
  /** 좌표 (필수) */
  lat: number;
  lng: number;
}

/**
 * 예측 결과
 */
export interface PredictionResult {
  /** 예측 시점의 상태 */
  futureState: TaskState;
  
  /** 발생 확률 */
  probability: number;
  
  /** 트리거될 Gate */
  triggeredGates: GateType[];
  
  /** 연쇄 영향 */
  cascadeEffects: CascadeEffect[];
  
  /** 권장 행동 */
  recommendedActions: AutoAction[];
  
  /** 신뢰도 */
  confidence: number;
}

/**
 * 연쇄 효과
 */
export interface CascadeEffect {
  targetTaskId: number;
  impactType: 'delay' | 'accelerate' | 'block' | 'unlock';
  magnitude: number;
  probability: number;
}

/**
 * 미래예측 엔진
 */
export class PredictionEngine {
  /**
   * 단일 업무 예측
   */
  predict(target: PredictionTarget): PredictionResult {
    const { currentState, horizonHours } = target;
    
    // 엔트로피 증가 계산 (ΔS = Ω × t)
    const entropyGrowth = currentState.omega * (horizonHours / 24);
    const futureOmega = Math.min(1, currentState.omega + entropyGrowth);
    
    // 속도 감소 (마찰)
    const friction = 0.1;
    const futureVelocity = Math.max(0, currentState.velocity * (1 - friction * horizonHours / 24));
    
    // 비가역성 증가 (시간에 따라)
    const psiGrowth = currentState.psi >= 8 ? 0.1 * (horizonHours / 24) : 0;
    const futurePsi = Math.min(10, currentState.psi + psiGrowth);
    
    // 미래 상태 구성
    const futureState: TaskState = {
      ...currentState,
      omega: futureOmega,
      velocity: futureVelocity,
      psi: futurePsi,
    };
    
    // Gate 체크
    const triggeredGates = this.checkGates(futureState);
    
    // 연쇄 효과 계산
    const cascadeEffects = this.calculateCascade(target.taskId, futureState);
    
    // 권장 행동 생성
    const recommendedActions = this.generateActions(futureState, triggeredGates);
    
    return {
      futureState,
      probability: this.calculateProbability(horizonHours),
      triggeredGates,
      cascadeEffects,
      recommendedActions,
      confidence: Math.max(0.5, 1 - horizonHours / 720), // 30일 후 50%
    };
  }
  
  /**
   * 다중 시나리오 예측
   */
  predictScenarios(target: PredictionTarget): PredictionResult[] {
    const scenarios = [
      { ...target, horizonHours: 24 },   // 1일 후
      { ...target, horizonHours: 168 },  // 1주 후
      { ...target, horizonHours: 720 },  // 30일 후
    ];
    
    return scenarios.map(s => this.predict(s));
  }
  
  /**
   * 전체 시스템 예측
   */
  predictSystem(tasks: TaskState[], horizonHours: number): SystemPrediction {
    const predictions = tasks.map((task, i) => 
      this.predict({ taskId: i, currentState: task, horizonHours })
    );
    
    return {
      criticalTasks: predictions.filter(p => p.triggeredGates.length > 0),
      totalCascadeEffects: predictions.flatMap(p => p.cascadeEffects),
      systemHealth: this.calculateSystemHealth(predictions),
      recommendedPriority: this.prioritizeActions(predictions),
    };
  }
  
  private checkGates(state: TaskState): GateType[] {
    const gates: GateType[] = [];
    
    // G1: 엔트로피 임계
    if (state.omega > 0.8) gates.push('ENTROPY_CRITICAL');
    
    // G2: 비가역성 임계
    if (state.psi > 9) gates.push('IRREVERSIBLE');
    
    // G3: 속도 0 (정체)
    if (state.velocity < 0.5) gates.push('STALLED');
    
    // G4: 마감 임박
    if (state.deadline && state.deadline - Date.now() < 24 * 60 * 60 * 1000) {
      gates.push('DEADLINE_IMMINENT');
    }
    
    return gates;
  }
  
  private calculateCascade(taskId: number, state: TaskState): CascadeEffect[] {
    return state.dependents.map(depId => ({
      targetTaskId: depId,
      impactType: state.velocity < 1 ? 'delay' : 'accelerate',
      magnitude: state.mass / 10,
      probability: 0.7 + state.psi * 0.03,
    }));
  }
  
  private generateActions(state: TaskState, gates: GateType[]): AutoAction[] {
    const actions: AutoAction[] = [];
    
    if (gates.includes('ENTROPY_CRITICAL')) {
      actions.push({ type: 'ALERT', priority: 'HIGH', message: '엔트로피 임계 - 즉시 처리 필요' });
    }
    
    if (gates.includes('IRREVERSIBLE')) {
      actions.push({ type: 'LOCK', priority: 'CRITICAL', message: '비가역적 결정 - 자동 잠금' });
    }
    
    if (gates.includes('STALLED')) {
      actions.push({ type: 'NOTIFY', priority: 'MEDIUM', message: '진행 정체 - 확인 필요' });
    }
    
    if (gates.includes('DEADLINE_IMMINENT')) {
      actions.push({ type: 'ESCALATE', priority: 'HIGH', message: '마감 임박 - 상위 보고' });
    }
    
    return actions;
  }
  
  private calculateProbability(horizonHours: number): number {
    // 시간이 길수록 확률 감소
    return Math.max(0.3, 1 - Math.log(horizonHours + 1) / 10);
  }
  
  private calculateSystemHealth(predictions: PredictionResult[]): number {
    const criticalCount = predictions.filter(p => p.triggeredGates.length > 0).length;
    return Math.max(0, 1 - criticalCount / predictions.length);
  }
  
  private prioritizeActions(predictions: PredictionResult[]): AutoAction[] {
    return predictions
      .flatMap(p => p.recommendedActions)
      .sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 자동화 엔진 (Automation Engine)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 자동화 규칙
 */
export interface AutomationRule {
  id: string;
  name: string;
  
  /** 트리거 조건 */
  trigger: AutoTrigger;
  
  /** 실행 액션 */
  action: AutoAction;
  
  /** 활성화 여부 */
  enabled: boolean;
  
  /** 실행 횟수 */
  executionCount: number;
}

/**
 * 트리거 조건
 */
export interface AutoTrigger {
  type: 'GATE' | 'TIME' | 'STATE' | 'CASCADE';
  condition: GateType | TimeCondition | StateCondition | CascadeCondition;
}

export type GateType = 
  | 'ENTROPY_CRITICAL'    // Ω > 0.8
  | 'IRREVERSIBLE'        // ψ > 9
  | 'STALLED'             // v < 0.5
  | 'DEADLINE_IMMINENT'   // < 24h
  | 'OVERLOAD'            // 책임 초과
  | 'ENERGY_DEPLETED';    // 에너지 고갈

export interface TimeCondition {
  type: 'BEFORE_DEADLINE' | 'PERIODIC' | 'SPECIFIC';
  value: number; // hours or timestamp
}

export interface StateCondition {
  field: keyof TaskState;
  operator: '>' | '<' | '==' | '!=';
  value: number;
}

export interface CascadeCondition {
  sourceTaskId: number;
  impactType: 'delay' | 'block';
}

/**
 * 자동 실행 액션
 */
export interface AutoAction {
  type: 'LOCK' | 'ALERT' | 'NOTIFY' | 'ESCALATE' | 'EXECUTE' | 'DEFER';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  targetTaskId?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 자동화 실행 로그
 */
export interface AutomationLog {
  ruleId: string;
  taskId: number;
  triggeredAt: number;
  action: AutoAction;
  result: 'SUCCESS' | 'FAILED' | 'PENDING';
  afterimageId?: string;
}

/**
 * 자동화 엔진
 */
export class AutomationEngine {
  private rules: AutomationRule[] = [];
  private logs: AutomationLog[] = [];
  
  /**
   * 규칙 등록
   */
  registerRule(rule: Omit<AutomationRule, 'executionCount'>): void {
    this.rules.push({ ...rule, executionCount: 0 });
  }
  
  /**
   * 기본 규칙 초기화
   */
  initializeDefaultRules(): void {
    // G1: 엔트로피 임계 → 알림
    this.registerRule({
      id: 'DEFAULT_ENTROPY',
      name: '엔트로피 임계 알림',
      trigger: { type: 'GATE', condition: 'ENTROPY_CRITICAL' },
      action: { type: 'ALERT', priority: 'HIGH', message: '엔트로피 임계 도달' },
      enabled: true,
    });
    
    // G2: 비가역성 → 자동 잠금
    this.registerRule({
      id: 'DEFAULT_LOCK',
      name: '비가역적 결정 자동 잠금',
      trigger: { type: 'GATE', condition: 'IRREVERSIBLE' },
      action: { type: 'LOCK', priority: 'CRITICAL', message: '비가역적 결정 - 자동 잠금' },
      enabled: true,
    });
    
    // G3: 마감 임박 → 상위 보고
    this.registerRule({
      id: 'DEFAULT_ESCALATE',
      name: '마감 임박 상위 보고',
      trigger: { type: 'GATE', condition: 'DEADLINE_IMMINENT' },
      action: { type: 'ESCALATE', priority: 'HIGH', message: '마감 24시간 이내' },
      enabled: true,
    });
    
    // G4: 정체 → 알림
    this.registerRule({
      id: 'DEFAULT_STALL',
      name: '진행 정체 알림',
      trigger: { type: 'GATE', condition: 'STALLED' },
      action: { type: 'NOTIFY', priority: 'MEDIUM', message: '진행 정체 감지' },
      enabled: true,
    });
  }
  
  /**
   * 업무 상태 평가 및 자동 실행
   */
  evaluate(taskId: number, state: TaskState): AutomationLog[] {
    const executedLogs: AutomationLog[] = [];
    
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      if (this.checkTrigger(rule.trigger, state)) {
        const log = this.executeAction(rule, taskId);
        executedLogs.push(log);
        rule.executionCount++;
      }
    }
    
    this.logs.push(...executedLogs);
    return executedLogs;
  }
  
  /**
   * 배치 평가 (전체 시스템)
   */
  evaluateAll(tasks: Map<number, TaskState>): AutomationLog[] {
    const allLogs: AutomationLog[] = [];
    
    tasks.forEach((state, taskId) => {
      const logs = this.evaluate(taskId, state);
      allLogs.push(...logs);
    });
    
    return allLogs;
  }
  
  private checkTrigger(trigger: AutoTrigger, state: TaskState): boolean {
    switch (trigger.type) {
      case 'GATE':
        return this.checkGateTrigger(trigger.condition as GateType, state);
      case 'TIME':
        return this.checkTimeTrigger(trigger.condition as TimeCondition, state);
      case 'STATE':
        return this.checkStateTrigger(trigger.condition as StateCondition, state);
      default:
        return false;
    }
  }
  
  private checkGateTrigger(gate: GateType, state: TaskState): boolean {
    switch (gate) {
      case 'ENTROPY_CRITICAL': return state.omega > 0.8;
      case 'IRREVERSIBLE': return state.psi > 9;
      case 'STALLED': return state.velocity < 0.5;
      case 'DEADLINE_IMMINENT': 
        return state.deadline ? state.deadline - Date.now() < 24 * 60 * 60 * 1000 : false;
      default: return false;
    }
  }
  
  private checkTimeTrigger(condition: TimeCondition, state: TaskState): boolean {
    if (condition.type === 'BEFORE_DEADLINE' && state.deadline) {
      return state.deadline - Date.now() < condition.value * 60 * 60 * 1000;
    }
    return false;
  }
  
  private checkStateTrigger(condition: StateCondition, state: TaskState): boolean {
    const value = state[condition.field] as number;
    switch (condition.operator) {
      case '>': return value > condition.value;
      case '<': return value < condition.value;
      case '==': return value === condition.value;
      case '!=': return value !== condition.value;
      default: return false;
    }
  }
  
  private executeAction(rule: AutomationRule, taskId: number): AutomationLog {
    // 실제 실행 로직은 외부 시스템과 연동
    console.log(`[AUTUS] 자동 실행: ${rule.name} → Task ${taskId}`);
    
    return {
      ruleId: rule.id,
      taskId,
      triggeredAt: Date.now(),
      action: rule.action,
      result: 'SUCCESS',
      afterimageId: `AFT-${Date.now()}`,
    };
  }
  
  /**
   * 로그 조회
   */
  getLogs(filter?: { taskId?: number; ruleId?: string }): AutomationLog[] {
    if (!filter) return this.logs;
    
    return this.logs.filter(log => {
      if (filter.taskId && log.taskId !== filter.taskId) return false;
      if (filter.ruleId && log.ruleId !== filter.ruleId) return false;
      return true;
    });
  }
  
  /**
   * 규칙 통계
   */
  getStatistics(): { ruleId: string; name: string; count: number }[] {
    return this.rules.map(rule => ({
      ruleId: rule.id,
      name: rule.name,
      count: rule.executionCount,
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. 시스템 통합
// ═══════════════════════════════════════════════════════════════════════════════

export interface SystemPrediction {
  criticalTasks: PredictionResult[];
  totalCascadeEffects: CascadeEffect[];
  systemHealth: number;
  recommendedPriority: AutoAction[];
}

/**
 * AUTUS 코어 인스턴스 생성
 */
export function createAutusCore(): AutusCore {
  const prediction = new PredictionEngine();
  const automation = new AutomationEngine();
  
  // 기본 자동화 규칙 초기화
  automation.initializeDefaultRules();
  
  return { prediction, automation };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. React Hook
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from 'react';

let coreInstance: AutusCore | null = null;

export function useAutusCore() {
  const [core] = useState(() => {
    if (!coreInstance) {
      coreInstance = createAutusCore();
    }
    return coreInstance;
  });
  
  const predict = useCallback(
    (target: PredictionTarget) => core.prediction.predict(target),
    [core]
  );
  
  const predictSystem = useCallback(
    (tasks: TaskState[], hours: number) => core.prediction.predictSystem(tasks, hours),
    [core]
  );
  
  const evaluate = useCallback(
    (taskId: number, state: TaskState) => core.automation.evaluate(taskId, state),
    [core]
  );
  
  const registerRule = useCallback(
    (rule: Omit<AutomationRule, 'executionCount'>) => core.automation.registerRule(rule),
    [core]
  );
  
  return useMemo(() => ({
    core,
    predict,
    predictSystem,
    evaluate,
    registerRule,
    getLogs: () => core.automation.getLogs(),
    getStats: () => core.automation.getStatistics(),
  }), [core, predict, predictSystem, evaluate, registerRule]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. 내보내기
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  PredictionEngine,
  AutomationEngine,
  createAutusCore,
  useAutusCore,
};
