/**
 * AUTUS 72³ Physics Engine
 * =========================
 * 
 * 72³ 타입 기반 물리 시뮬레이션
 * - 도메인별 물리 상수 적용
 * - 의미 있는 예측
 * - 개입 시나리오 비교
 */

import { 
  CubeInterpreter, 
  cubeInterpreter, 
  NodeID, 
  DomainPhysics,
  DOMAIN_PHYSICS 
} from './CubeInterpreter';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface Vector3 {
  x: number; // 노드 축 (Who)
  y: number; // 모션 축 (What)
  z: number; // 업무 축 (How)
}

export interface PhysicsState {
  position: Vector3;      // 현재 위치 (0-1 정규화)
  velocity: Vector3;      // 속도 벡터
  acceleration: Vector3;  // 가속도 벡터
  mass: number;           // 질량 (변화 저항)
  energy: number;         // 내부 에너지 (0-1)
  entropy: number;        // 무질서도 (0-1)
}

export type NodeState = 'NORMAL' | 'TENSION' | 'CRITICAL' | 'COLLAPSED';

export interface NodeEntity {
  id: string;
  coords: NodeID;
  interpretation: string;  // "투자자 X가 Y의 힘으로 Z를 수행"
  physics: PhysicsState;
  state: NodeState;
  
  // 72³ 메타데이터
  meta: {
    nodeId: string;       // T01, B12, L24 등
    nodeName: string;
    nodeCategory: 'T' | 'B' | 'L';
    motionId: string;     // F01-F72
    motionName: string;
    motionDomain: string; // BIO, CAPITAL 등
    workId: string;       // W01-W72
    workName: string;
    workDomain: string;
    resonance: number;    // 공명 점수
  };
  
  history: PhysicsState[];
  future: PhysicsState[];
}

export interface Intervention {
  type: 'BLOCK' | 'MITIGATE' | 'REDIRECT' | 'AMPLIFY';
  force: Vector3;
  duration: number;
  name: string;
  description: string;
}

export interface Prediction {
  timeline: PhysicsState[];
  finalState: NodeState;
  collapseStep: number | null;
  confidence: number;
  explanation: string;
}

export interface Scenario {
  name: string;
  description: string;
  intervention: Intervention | null;
  prediction: Prediction;
}

// ═══════════════════════════════════════════════════════════════════════════
// Physics Constants (기본값)
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_PHYSICS = {
  FRICTION: 0.02,
  GRAVITY_STRENGTH: 0.001,
  ELASTICITY: 0.7,
  INERTIA_DECAY: 0.98,
  CRITICAL_THRESHOLD: 0.8,
  TENSION_THRESHOLD: 0.5,
  TIME_STEPS: 20,
};

// ═══════════════════════════════════════════════════════════════════════════
// Physics Engine
// ═══════════════════════════════════════════════════════════════════════════

export class PhysicsEngine72 {
  private interpreter: CubeInterpreter;
  
  constructor() {
    this.interpreter = cubeInterpreter;
  }
  
  /**
   * 힘 적용 (F = ma → a = F/m)
   */
  applyForce(state: PhysicsState, force: Vector3): PhysicsState {
    const a = {
      x: force.x / state.mass,
      y: force.y / state.mass,
      z: force.z / state.mass,
    };
    return {
      ...state,
      acceleration: {
        x: state.acceleration.x + a.x,
        y: state.acceleration.y + a.y,
        z: state.acceleration.z + a.z,
      }
    };
  }
  
  /**
   * 중력 (임계점 방향으로 끌림)
   * - 도메인별 중력 강도 적용
   */
  applyGravity(state: PhysicsState, domainPhysics: DomainPhysics): PhysicsState {
    const gravityFactor = (1 - state.energy) * domainPhysics.gravity;
    const force = {
      x: (1 - state.position.x) * gravityFactor,
      y: (1 - state.position.y) * gravityFactor,
      z: (1 - state.position.z) * gravityFactor,
    };
    return this.applyForce(state, force);
  }
  
  /**
   * 마찰 (속도 감소)
   * - 도메인별 마찰 계수 적용
   */
  applyFriction(state: PhysicsState, domainPhysics: DomainPhysics): PhysicsState {
    const frictionFactor = 1 - domainPhysics.friction;
    return {
      ...state,
      velocity: {
        x: state.velocity.x * frictionFactor,
        y: state.velocity.y * frictionFactor,
        z: state.velocity.z * frictionFactor,
      }
    };
  }
  
  /**
   * 경계 충돌
   * - 도메인별 탄성 적용
   */
  applyBoundary(state: PhysicsState, domainPhysics: DomainPhysics): PhysicsState {
    const pos = { ...state.position };
    const vel = { ...state.velocity };
    
    ['x', 'y', 'z'].forEach(axis => {
      const key = axis as keyof Vector3;
      if (pos[key] < 0) {
        pos[key] = 0;
        vel[key] = -vel[key] * domainPhysics.elasticity;
      }
      if (pos[key] > 1) {
        pos[key] = 1;
        vel[key] = -vel[key] * domainPhysics.elasticity;
      }
    });
    
    return { ...state, position: pos, velocity: vel };
  }
  
  /**
   * 엔트로피/에너지 변화
   * - 도메인별 관성 적용
   */
  applyEntropy(state: PhysicsState, domainPhysics: DomainPhysics): PhysicsState {
    const speed = Math.sqrt(
      state.velocity.x ** 2 + 
      state.velocity.y ** 2 + 
      state.velocity.z ** 2
    );
    
    // 관성이 높을수록 엔트로피 증가가 느림
    const entropyGain = speed * 0.01 * (1 - domainPhysics.inertia * 0.5);
    const energyLoss = state.entropy * 0.005 * (1 - domainPhysics.inertia * 0.3);
    
    return {
      ...state,
      entropy: Math.min(1, state.entropy + entropyGain),
      energy: Math.max(0, state.energy - energyLoss),
    };
  }
  
  /**
   * 한 스텝 시뮬레이션
   */
  step(
    state: PhysicsState, 
    domainPhysics: DomainPhysics,
    intervention?: Intervention
  ): PhysicsState {
    let next = { ...state };
    
    // 1. 중력 적용
    next = this.applyGravity(next, domainPhysics);
    
    // 2. 개입 힘 적용
    if (intervention) {
      // 가속도 배율 적용
      const amplifiedForce = {
        x: intervention.force.x * domainPhysics.acceleration,
        y: intervention.force.y * domainPhysics.acceleration,
        z: intervention.force.z * domainPhysics.acceleration,
      };
      next = this.applyForce(next, amplifiedForce);
    }
    
    // 3. 속도 업데이트
    next.velocity = {
      x: next.velocity.x + next.acceleration.x,
      y: next.velocity.y + next.acceleration.y,
      z: next.velocity.z + next.acceleration.z,
    };
    
    // 4. 마찰 적용
    next = this.applyFriction(next, domainPhysics);
    
    // 5. 위치 업데이트
    next.position = {
      x: next.position.x + next.velocity.x,
      y: next.position.y + next.velocity.y,
      z: next.position.z + next.velocity.z,
    };
    
    // 6. 경계 충돌
    next = this.applyBoundary(next, domainPhysics);
    
    // 7. 엔트로피/에너지
    next = this.applyEntropy(next, domainPhysics);
    
    // 8. 가속도 리셋
    next.acceleration = { x: 0, y: 0, z: 0 };
    
    return next;
  }
  
  /**
   * 상태 분류
   */
  classifyState(state: PhysicsState): NodeState {
    const magnitude = Math.sqrt(
      state.position.x ** 2 + 
      state.position.y ** 2 + 
      state.position.z ** 2
    ) / Math.sqrt(3);
    
    if (state.energy < 0.1 && state.entropy > 0.9) {
      return 'COLLAPSED';
    }
    if (magnitude > DEFAULT_PHYSICS.CRITICAL_THRESHOLD || state.entropy > 0.8) {
      return 'CRITICAL';
    }
    if (magnitude > DEFAULT_PHYSICS.TENSION_THRESHOLD || state.entropy > 0.5) {
      return 'TENSION';
    }
    return 'NORMAL';
  }
  
  /**
   * 미래 예측
   */
  predict(
    state: PhysicsState,
    coords: NodeID,
    steps: number = DEFAULT_PHYSICS.TIME_STEPS,
    intervention?: Intervention
  ): Prediction {
    const domainPhysics = this.interpreter.getPhysicsConstants(coords);
    const interpreted = this.interpreter.interpret(coords);
    
    const timeline: PhysicsState[] = [state];
    let current = state;
    let collapseStep: number | null = null;
    
    for (let i = 0; i < steps; i++) {
      const activeIntervention = intervention && i < intervention.duration 
        ? intervention 
        : undefined;
      
      current = this.step(current, domainPhysics, activeIntervention);
      timeline.push(current);
      
      if (!collapseStep && this.classifyState(current) === 'COLLAPSED') {
        collapseStep = i + 1;
      }
    }
    
    const finalState = this.classifyState(current);
    const avgEntropy = timeline.reduce((s, t) => s + t.entropy, 0) / timeline.length;
    const confidence = 1 - avgEntropy;
    
    // 설명 생성
    const explanation = this.generateExplanation(interpreted, finalState, collapseStep, domainPhysics);
    
    return { timeline, finalState, collapseStep, confidence, explanation };
  }
  
  /**
   * 예측 설명 생성
   */
  private generateExplanation(
    interpreted: ReturnType<CubeInterpreter['interpret']>,
    finalState: NodeState,
    collapseStep: number | null,
    physics: DomainPhysics
  ): string {
    const domain = interpreted.motion.node;
    
    let explanation = `[${interpreted.node.id}] ${interpreted.node.name}이(가) `;
    explanation += `[${interpreted.motion.id}] ${interpreted.motion.name}으로 `;
    explanation += `[${interpreted.work.id}] ${interpreted.work.name}을 수행 중.\n\n`;
    
    // 도메인별 특성 설명
    const domainDesc: Record<string, string> = {
      BIO: '건강 영역은 변화가 느리지만 관성이 높아 한번 무너지면 회복이 어렵습니다.',
      CAPITAL: '금융 영역은 변화가 빠르고 탄성이 높아 급격한 변동 후에도 빠르게 회복됩니다.',
      NETWORK: '네트워크 영역은 클러스터링 경향이 높아 관계가 집중될 수 있습니다.',
      KNOWLEDGE: '지식 영역은 복리 효과로 인해 초기에는 느리지만 점차 가속됩니다.',
      TIME: '시간 영역은 일정하게 흐르며 되돌릴 수 없습니다.',
      EMOTION: '감정 영역은 불안정하지만 탄성이 높아 빠르게 변동합니다.',
    };
    
    explanation += `${domainDesc[domain] || ''}\n\n`;
    
    // 상태별 설명
    const stateDesc: Record<NodeState, string> = {
      NORMAL: '현재 안정적인 상태입니다.',
      TENSION: '⚠️ 긴장 상태입니다. 모니터링이 필요합니다.',
      CRITICAL: '🚨 위험 상태입니다. 즉각적인 개입이 필요합니다.',
      COLLAPSED: '💀 붕괴 상태입니다. 복구가 매우 어렵습니다.',
    };
    
    explanation += `예측 결과: ${stateDesc[finalState]}`;
    
    if (collapseStep) {
      explanation += `\n붕괴 예상 시점: t+${collapseStep}`;
    }
    
    return explanation;
  }
  
  /**
   * 시나리오 비교
   */
  compareScenarios(state: PhysicsState, coords: NodeID): Scenario[] {
    const interpreted = this.interpreter.interpret(coords);
    const domain = interpreted.motion.node;
    
    // 무개입 시나리오
    const noAction: Scenario = {
      name: '무개입',
      description: '현재 상태로 방치',
      intervention: null,
      prediction: this.predict(state, coords),
    };
    
    // 차단 시나리오
    const block: Scenario = {
      name: '차단',
      description: `${interpreted.motion.name}에 역방향 힘 적용`,
      intervention: {
        type: 'BLOCK',
        force: { x: -0.1, y: -0.1, z: -0.1 },
        duration: 5,
        name: '강제 차단',
        description: '모든 축에 역방향 힘을 적용하여 이동을 멈춤',
      },
      prediction: this.predict(state, coords, DEFAULT_PHYSICS.TIME_STEPS, {
        type: 'BLOCK',
        force: { x: -0.1, y: -0.1, z: -0.1 },
        duration: 5,
        name: '강제 차단',
        description: '',
      }),
    };
    
    // 완화 시나리오
    const mitigate: Scenario = {
      name: '완화',
      description: '점진적으로 안정화',
      intervention: {
        type: 'MITIGATE',
        force: { x: -0.03, y: -0.03, z: -0.03 },
        duration: 10,
        name: '점진적 완화',
        description: '약한 역방향 힘을 오래 적용하여 점진적으로 안정화',
      },
      prediction: this.predict(state, coords, DEFAULT_PHYSICS.TIME_STEPS, {
        type: 'MITIGATE',
        force: { x: -0.03, y: -0.03, z: -0.03 },
        duration: 10,
        name: '점진적 완화',
        description: '',
      }),
    };
    
    // 유도 시나리오 (도메인별 최적화)
    const redirectForce = this.getOptimalRedirectForce(domain);
    const redirect: Scenario = {
      name: '유도',
      description: `${domain} 도메인에 최적화된 방향으로 유도`,
      intervention: {
        type: 'REDIRECT',
        force: redirectForce,
        duration: 8,
        name: '방향 전환',
        description: `${domain} 도메인 특성에 맞게 에너지 방향 전환`,
      },
      prediction: this.predict(state, coords, DEFAULT_PHYSICS.TIME_STEPS, {
        type: 'REDIRECT',
        force: redirectForce,
        duration: 8,
        name: '방향 전환',
        description: '',
      }),
    };
    
    // 증폭 시나리오 (공명이 높을 때만 유효)
    const resonance = this.interpreter.calculateResonance(coords);
    if (resonance > 60) {
      const amplify: Scenario = {
        name: '증폭',
        description: `높은 공명(${Math.round(resonance)}%)을 활용한 가속`,
        intervention: {
          type: 'AMPLIFY',
          force: { x: 0.08, y: 0.08, z: -0.05 },
          duration: 6,
          name: '공명 증폭',
          description: `${interpreted.node.name}와 ${interpreted.motion.name}의 시너지 활용`,
        },
        prediction: this.predict(state, coords, DEFAULT_PHYSICS.TIME_STEPS, {
          type: 'AMPLIFY',
          force: { x: 0.08, y: 0.08, z: -0.05 },
          duration: 6,
          name: '공명 증폭',
          description: '',
        }),
      };
      return [noAction, block, mitigate, redirect, amplify];
    }
    
    return [noAction, block, mitigate, redirect];
  }
  
  /**
   * 도메인별 최적 유도 방향
   */
  private getOptimalRedirectForce(domain: string): Vector3 {
    const redirectMap: Record<string, Vector3> = {
      BIO: { x: -0.02, y: -0.05, z: 0.02 },       // 건강: 안정적 회복
      CAPITAL: { x: 0.05, y: -0.05, z: 0.02 },    // 금융: 수익 방향
      NETWORK: { x: 0.03, y: 0.03, z: -0.02 },    // 네트워크: 확장
      KNOWLEDGE: { x: 0.02, y: 0.02, z: 0.02 },   // 지식: 축적
      TIME: { x: 0, y: -0.05, z: 0.05 },          // 시간: 효율화
      EMOTION: { x: -0.03, y: -0.03, z: 0.05 },   // 감정: 안정화
    };
    return redirectMap[domain] || { x: 0.03, y: -0.03, z: 0 };
  }
  
  /**
   * 노드 엔티티 생성
   */
  createNodeEntity(coords: NodeID, initialState?: Partial<PhysicsState>): NodeEntity {
    const interpreted = this.interpreter.interpret(coords);
    const resonance = this.interpreter.calculateResonance(coords);
    
    const defaultPhysics: PhysicsState = {
      position: {
        x: Math.random() * 0.5 + 0.1,
        y: Math.random() * 0.5 + 0.1,
        z: Math.random() * 0.5 + 0.1,
      },
      velocity: {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02,
      },
      acceleration: { x: 0, y: 0, z: 0 },
      mass: 0.5 + Math.random() * 0.5,
      energy: 0.7 + Math.random() * 0.3,
      entropy: Math.random() * 0.3,
    };
    
    const physics = { ...defaultPhysics, ...initialState };
    
    return {
      id: coords.join('-'),
      coords,
      interpretation: interpreted.interpretation,
      physics,
      state: this.classifyState(physics),
      meta: {
        nodeId: interpreted.node.id,
        nodeName: interpreted.node.name,
        nodeCategory: interpreted.node.category,
        motionId: interpreted.motion.id,
        motionName: interpreted.motion.name,
        motionDomain: interpreted.motion.node,
        workId: interpreted.work.id,
        workName: interpreted.work.name,
        workDomain: interpreted.work.domain,
        resonance,
      },
      history: [],
      future: [],
    };
  }
  
  /**
   * 노드 진화 (시간 경과)
   */
  evolveNode(node: NodeEntity): NodeEntity {
    const domainPhysics = this.interpreter.getPhysicsConstants(node.coords);
    
    // 랜덤 외부 힘 (5% 확률 이벤트)
    const randomForce = Math.random() > 0.95 ? {
      x: (Math.random() - 0.5) * 0.05,
      y: (Math.random() - 0.5) * 0.05,
      z: (Math.random() - 0.5) * 0.05,
    } : undefined;
    
    const nextPhysics = this.step(
      node.physics,
      domainPhysics,
      randomForce ? { type: 'REDIRECT', force: randomForce, duration: 1, name: '', description: '' } : undefined
    );
    
    const prediction = this.predict(nextPhysics, node.coords);
    
    return {
      ...node,
      physics: nextPhysics,
      state: this.classifyState(nextPhysics),
      history: [...node.history.slice(-50), node.physics],
      future: prediction.timeline,
    };
  }
}

// Singleton export
export const physicsEngine72 = new PhysicsEngine72();
export default PhysicsEngine72;
