// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Discovery Engine - 통합 발견 엔진
// ═══════════════════════════════════════════════════════════════════════════════
//
// AUTUS에서 발견할 수 있는 5가지 핵심 요소를 통합 관리:
// 1. 사용자 상수 K
// 2. 상호 상수 I, Ω, r
// 3. 사용자 타입
// 4. 업무 타입 및 솔루션
// 5. 네트워크 예측
//
// ═══════════════════════════════════════════════════════════════════════════════

import {
  UserConstantK,
  InteractionConstantI,
  EntropyConstantOmega,
  GrowthConstantR,
  UserType,
  USER_TYPE_PROFILES,
  calculateK,
  determineUserType,
} from './constants';

import {
  TaskType,
  TaskTypeProfile,
  TaskSolution,
  TASK_TYPE_PROFILES,
  getSolutionForTaskType,
  getOptimalTasksForUserType,
} from './taskTypes';

import {
  NetworkGraph,
  NetworkNode,
  NetworkEdge,
  NetworkPrediction,
  NetworkPredictionEngine,
  PredictionHorizon,
  summarizePrediction,
  getRecommendedActions,
} from './networkPrediction';

// ═══════════════════════════════════════════════════════════════════════════════
// 사용자 프로필
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 완전한 사용자 프로필
 */
export interface UserProfile {
  id: string;
  name: string;
  
  /** 1. 사용자 상수 K */
  K: UserConstantK;
  
  /** 2. 상호 상수들 */
  I: InteractionConstantI;
  Omega: EntropyConstantOmega;
  r: GrowthConstantR;
  
  /** 3. 사용자 타입 */
  type: UserType;
  typeProfile: typeof USER_TYPE_PROFILES[UserType];
  
  /** 최적 업무 목록 */
  optimalTasks: TaskType[];
  
  /** 시너지 타입 */
  synergyTypes: UserType[];
  
  /** 충돌 타입 */
  conflictTypes: UserType[];
  
  /** 성장 권장사항 */
  growthRecommendations: string[];
  
  /** 마지막 업데이트 */
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Discovery Engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AUTUS Discovery Engine
 * 
 * 모든 발견 기능을 통합하는 메인 엔진
 */
export class DiscoveryEngine {
  private users: Map<string, UserProfile>;
  private networkEngine: NetworkPredictionEngine;
  
  constructor() {
    this.users = new Map();
    this.networkEngine = new NetworkPredictionEngine();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. 사용자 상수 K 발견
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 사용자의 K 상수 계산 및 발견
   */
  discoverK(userId: string, factors: UserConstantK['factors']): UserConstantK {
    const currentK = calculateK(factors);
    
    const K: UserConstantK = {
      current: currentK,
      potential: Math.min(10, currentK + 2), // 잠재력은 현재 +2
      factors,
      growthRate: this.calculateKGrowthRate(factors),
      comfortZone: {
        min: Math.max(1, currentK - 1),
        max: Math.min(10, currentK + 1),
      },
    };
    
    return K;
  }
  
  private calculateKGrowthRate(factors: UserConstantK['factors']): number {
    // 경험이 쌓이는 속도에 따른 월간 K 변화량
    const experienceRate = Math.log10(factors.experience + 1) / 10;
    const resilienceBonus = factors.resilience * 0.01;
    
    return Math.min(0.2, experienceRate + resilienceBonus);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 2. 상호 상수 I, Ω, r 발견
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 상호작용 지수 I 계산
   */
  discoverI(
    connectionCount: number,
    frequency: number,
    depth: number,
    reciprocity: number
  ): InteractionConstantI {
    const value = 
      connectionCount * 0.3 +
      frequency * 0.3 +
      depth * 20 +
      reciprocity * 20;
    
    return {
      value: Math.min(100, value),
      components: { connectionCount, frequency, depth, reciprocity },
      trend: this.determineTrend(value),
      anomalies: [],
    };
  }
  
  /**
   * 엔트로피 Ω 계산
   */
  discoverOmega(
    decisionComplexity: number,
    irreversibilityRatio: number,
    informationLoss: number,
    stateChangeFrequency: number
  ): EntropyConstantOmega {
    const value = (
      decisionComplexity * 0.25 +
      irreversibilityRatio * 0.35 +
      informationLoss * 0.2 +
      stateChangeFrequency * 0.2
    );
    
    return {
      value: Math.min(1, value),
      components: { decisionComplexity, irreversibilityRatio, informationLoss, stateChangeFrequency },
      zone: this.getEntropyZone(value),
      warnings: this.getEntropyWarnings(value),
    };
  }
  
  /**
   * 성장률 r 계산
   */
  discoverR(
    valueGrowth: number,
    capabilityGrowth: number,
    influenceGrowth: number,
    networkExpansion: number
  ): GrowthConstantR {
    const value = (
      valueGrowth * 0.3 +
      capabilityGrowth * 0.3 +
      influenceGrowth * 0.2 +
      networkExpansion * 0.2
    );
    
    return {
      value: Math.max(-1, Math.min(1, value)),
      components: { valueGrowth, capabilityGrowth, influenceGrowth, networkExpansion },
      phase: this.getGrowthPhase(value),
      trajectory: this.projectTrajectory(value),
    };
  }
  
  private determineTrend(value: number): InteractionConstantI['trend'] {
    // 실제로는 히스토리 기반으로 판단
    return 'stable';
  }
  
  private getEntropyZone(value: number): EntropyConstantOmega['zone'] {
    if (value < 0.25) return 'low';
    if (value < 0.5) return 'optimal';
    if (value < 0.75) return 'high';
    return 'critical';
  }
  
  private getEntropyWarnings(value: number): EntropyConstantOmega['warnings'] {
    const warnings: EntropyConstantOmega['warnings'] = [];
    
    if (value > 0.6) {
      warnings.push({
        type: 'high_chaos',
        threshold: 0.6,
        currentValue: value,
        message: '시스템 혼란도가 높습니다. 프로세스 정리가 필요합니다.',
      });
    }
    
    if (value > 0.8) {
      warnings.push({
        type: 'approaching_irreversibility',
        threshold: 0.8,
        currentValue: value,
        message: '비가역적 상태에 근접하고 있습니다. 즉각적인 조치가 필요합니다.',
      });
    }
    
    return warnings;
  }
  
  private getGrowthPhase(value: number): GrowthConstantR['phase'] {
    if (value < -0.3) return 'declining';
    if (value < 0.1) return 'stagnant';
    if (value < 0.4) return 'growing';
    if (value < 0.7) return 'accelerating';
    return 'explosive';
  }
  
  private projectTrajectory(currentR: number): GrowthConstantR['trajectory'] {
    return [1, 2, 3, 4, 5, 6].map(month => ({
      month,
      projectedR: currentR * Math.pow(0.95, month), // 점진적 감소 가정
      confidence: Math.max(0.3, 1 - month * 0.1),
    }));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 3. 사용자 타입 발견
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 사용자 타입 발견 및 프로필 생성
   */
  discoverUserType(K: number, I: number, Omega: number, r: number): {
    type: UserType;
    profile: typeof USER_TYPE_PROFILES[UserType];
    matchScore: number;
  } {
    const type = determineUserType(K, I, Omega, r);
    const profile = USER_TYPE_PROFILES[type];
    
    // 매칭 점수 계산 (기준 범위와의 일치도)
    const matchScore = this.calculateTypeMatchScore(K, I, Omega, r, profile);
    
    return { type, profile, matchScore };
  }
  
  private calculateTypeMatchScore(
    K: number,
    I: number,
    Omega: number,
    r: number,
    profile: typeof USER_TYPE_PROFILES[UserType]
  ): number {
    const { criteria } = profile;
    
    const kMatch = this.rangeMatch(K, criteria.K.min, criteria.K.max, 10);
    const iMatch = this.rangeMatch(I, criteria.I.min, criteria.I.max, 100);
    const omegaMatch = this.rangeMatch(Omega, criteria.Omega.min, criteria.Omega.max, 1);
    const rMatch = this.rangeMatch(r, criteria.r.min, criteria.r.max, 2);
    
    return (kMatch + iMatch + omegaMatch + rMatch) / 4;
  }
  
  private rangeMatch(value: number, min: number, max: number, scale: number): number {
    if (value >= min && value <= max) return 1;
    
    const dist = value < min ? min - value : value - max;
    return Math.max(0, 1 - dist / scale);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 4. 업무 타입 및 솔루션 발견
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 업무 타입에 대한 솔루션 발견
   */
  discoverTaskSolution(taskType: TaskType): {
    profile: TaskTypeProfile;
    solution: TaskSolution;
    requirements: string[];
  } {
    const profile = TASK_TYPE_PROFILES[taskType];
    const solution = profile.solution;
    
    return {
      profile,
      solution,
      requirements: [
        `필요 K 범위: K${profile.requiredK.min}~K${profile.requiredK.max}`,
        `복잡도: ${profile.characteristics.complexity}`,
        `비가역성: ${profile.characteristics.irreversibility}`,
        `협업 규모: ${profile.characteristics.collaboration}`,
      ],
    };
  }
  
  /**
   * 사용자에게 적합한 업무 발견
   */
  discoverOptimalTasks(userType: UserType): TaskType[] {
    return getOptimalTasksForUserType(userType);
  }
  
  /**
   * 업무에 적합한 사용자 타입 발견
   */
  discoverOptimalUsersForTask(taskType: TaskType): UserType[] {
    return TASK_TYPE_PROFILES[taskType].optimalUserTypes;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 5. 네트워크 예측
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 네트워크에 노드 추가
   */
  addToNetwork(node: NetworkNode): void {
    this.networkEngine.addNode(node);
  }
  
  /**
   * 네트워크에 엣지 추가
   */
  addConnectionToNetwork(edge: NetworkEdge): void {
    this.networkEngine.addEdge(edge);
  }
  
  /**
   * 네트워크 예측 생성
   */
  predictNetwork(horizon: PredictionHorizon = 'quarter'): NetworkPrediction {
    return this.networkEngine.generatePrediction(horizon);
  }
  
  /**
   * 특정 노드에 대한 예측
   */
  predictForNode(nodeId: string, horizon: PredictionHorizon = 'month'): NetworkPrediction | null {
    return this.networkEngine.generateNodePrediction(nodeId, horizon);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 통합 프로필 생성
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 완전한 사용자 프로필 생성
   */
  createUserProfile(
    id: string,
    name: string,
    kFactors: UserConstantK['factors'],
    iComponents: InteractionConstantI['components'],
    omegaComponents: EntropyConstantOmega['components'],
    rComponents: GrowthConstantR['components']
  ): UserProfile {
    const K = this.discoverK(id, kFactors);
    const I = this.discoverI(
      iComponents.connectionCount,
      iComponents.frequency,
      iComponents.depth,
      iComponents.reciprocity
    );
    const Omega = this.discoverOmega(
      omegaComponents.decisionComplexity,
      omegaComponents.irreversibilityRatio,
      omegaComponents.informationLoss,
      omegaComponents.stateChangeFrequency
    );
    const r = this.discoverR(
      rComponents.valueGrowth,
      rComponents.capabilityGrowth,
      rComponents.influenceGrowth,
      rComponents.networkExpansion
    );
    
    const { type, profile: typeProfile } = this.discoverUserType(
      K.current,
      I.value,
      Omega.value,
      r.value
    );
    
    const profile: UserProfile = {
      id,
      name,
      K,
      I,
      Omega,
      r,
      type,
      typeProfile,
      optimalTasks: this.discoverOptimalTasks(type),
      synergyTypes: typeProfile.synergyTypes,
      conflictTypes: typeProfile.conflictTypes,
      growthRecommendations: this.generateGrowthRecommendations(K, I, Omega, r, type),
      updatedAt: new Date(),
    };
    
    this.users.set(id, profile);
    
    // 네트워크에도 추가
    this.addToNetwork({
      id,
      entityType: 'user',
      userType: type,
      metrics: {
        K: K.current,
        I: I.value,
        Omega: Omega.value,
        r: r.value,
      },
      mass: K.current * 10,
      velocity: { x: r.value, y: 0, z: 0 },
      metadata: { name },
      createdAt: new Date(),
      lastActiveAt: new Date(),
    });
    
    return profile;
  }
  
  private generateGrowthRecommendations(
    K: UserConstantK,
    I: InteractionConstantI,
    Omega: EntropyConstantOmega,
    r: GrowthConstantR,
    type: UserType
  ): string[] {
    const recommendations: string[] = [];
    
    // K 기반 추천
    if (K.current < K.potential) {
      recommendations.push(`K 성장 잠재력: ${K.potential}까지 성장 가능. 더 높은 책임의 업무에 도전해보세요.`);
    }
    
    // I 기반 추천
    if (I.value < 40) {
      recommendations.push('네트워크 활동을 늘려보세요. 협업과 소통이 성장의 촉매가 됩니다.');
    }
    
    // Omega 기반 추천
    if (Omega.zone === 'high' || Omega.zone === 'critical') {
      recommendations.push('⚠️ 업무 복잡도가 높습니다. 프로세스 정리와 안정화가 필요합니다.');
    }
    
    // r 기반 추천
    if (r.phase === 'declining' || r.phase === 'stagnant') {
      recommendations.push('성장이 정체되어 있습니다. 새로운 도전이나 학습 기회를 찾아보세요.');
    }
    
    return recommendations;
  }
  
  /**
   * 사용자 프로필 조회
   */
  getUserProfile(userId: string): UserProfile | undefined {
    return this.users.get(userId);
  }
  
  /**
   * 모든 사용자 프로필 조회
   */
  getAllProfiles(): UserProfile[] {
    return Array.from(this.users.values());
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 싱글톤 인스턴스 및 React Hook
// ═══════════════════════════════════════════════════════════════════════════════

let discoveryEngineInstance: DiscoveryEngine | null = null;

export function getDiscoveryEngine(): DiscoveryEngine {
  if (!discoveryEngineInstance) {
    discoveryEngineInstance = new DiscoveryEngine();
  }
  return discoveryEngineInstance;
}

// React Hook
import { useState, useCallback } from 'react';

export function useDiscovery() {
  const [engine] = useState(() => getDiscoveryEngine());
  
  const discoverK = useCallback(
    (userId: string, factors: UserConstantK['factors']) => 
      engine.discoverK(userId, factors),
    [engine]
  );
  
  const discoverUserType = useCallback(
    (K: number, I: number, Omega: number, r: number) =>
      engine.discoverUserType(K, I, Omega, r),
    [engine]
  );
  
  const discoverTaskSolution = useCallback(
    (taskType: TaskType) => engine.discoverTaskSolution(taskType),
    [engine]
  );
  
  const createProfile = useCallback(
    (
      id: string,
      name: string,
      kFactors: UserConstantK['factors'],
      iComponents: InteractionConstantI['components'],
      omegaComponents: EntropyConstantOmega['components'],
      rComponents: GrowthConstantR['components']
    ) => engine.createUserProfile(id, name, kFactors, iComponents, omegaComponents, rComponents),
    [engine]
  );
  
  const predictNetwork = useCallback(
    (horizon: PredictionHorizon = 'quarter') => engine.predictNetwork(horizon),
    [engine]
  );
  
  return {
    engine,
    discoverK,
    discoverUserType,
    discoverTaskSolution,
    createProfile,
    predictNetwork,
  };
}
