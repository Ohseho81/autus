// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - 2027년형 물리 엔진 (K·I·Ω 기반 공간 배치)
// ═══════════════════════════════════════════════════════════════════════════════
// 
// 핵심 알고리즘:
// 1. Z-축 심도: K(중요도)가 높을수록 사용자에게 가깝게
// 2. 궤도 반지름: Urgency(긴급도)가 높을수록 중심에 가깝게
// 3. 엔트로피 떨림: I(상호작용)가 낮으면 궤도 이탈 확률 증가
// 4. 중력 흡수: K < 0.5인 노드는 상위 노드에 흡수
//
// ═══════════════════════════════════════════════════════════════════════════════

import { Vector3 } from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhysicsNode {
  id: string;
  mass_k: number;           // K: 효율성/중요도 (0.1 ~ 3.0)
  interaction_i: number;    // I: 상호작용 지수 (-1.0 ~ +1.0)
  entropy_omega: number;    // Ω: 엔트로피 (0.0 ~ 1.0)
  growth_r: number;         // r: 성장률
  urgency: number;          // 긴급도 (0.0 ~ 1.0)
  clusterId: string;        // 소속 클러스터
  
  // 계산된 물리 속성
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  zDepth: number;           // Z-축 심도
  orbitRadius: number;      // 궤도 반지름
  orbitPhase: number;       // 궤도 위상
  scale: number;            // 노드 크기
  emissive: number;         // 발광 강도
}

export interface ClusterCenter {
  id: string;
  position: Vector3;
  mass: number;             // 클러스터 총 질량
  avgK: number;
  avgI: number;
}

export interface PhysicsConfig {
  // 중력 상수
  gravitationalConstant: number;
  centralMass: number;      // User Node 질량
  
  // Z-축 설정
  zNear: number;            // 가장 가까운 Z
  zFar: number;             // 가장 먼 Z
  
  // 궤도 설정
  minOrbitRadius: number;
  maxOrbitRadius: number;
  orbitSpeedFactor: number;
  
  // 엔트로피 설정
  jitterAmplitude: number;  // 떨림 진폭
  jitterThreshold: number;  // I 지수 임계값
  
  // 흡수 설정
  absorptionThreshold: number; // K 흡수 임계값
  
  // 시간
  deltaTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 기본 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravitationalConstant: 0.5,
  centralMass: 10,
  
  zNear: -5,
  zFar: -25,
  
  minOrbitRadius: 3,
  maxOrbitRadius: 15,
  orbitSpeedFactor: 0.001,
  
  jitterAmplitude: 0.3,
  jitterThreshold: 0.3,
  
  absorptionThreshold: 0.3,
  
  deltaTime: 1 / 60,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 핵심 물리 계산 함수들
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * K 값 기반 Z-축 심도 계산
 * K가 높을수록(중요할수록) 사용자에게 가깝게 (zNear 방향)
 */
export function calculateZDepth(
  k: number, 
  omega: number, 
  config: PhysicsConfig
): number {
  // K가 높을수록 가깝게, Ω(엔트로피)가 높으면 멀리
  const kFactor = Math.min(1, k / 3.0);
  const omegaPenalty = omega * 0.3;
  
  const depth = config.zNear + 
    (config.zFar - config.zNear) * (1 - kFactor + omegaPenalty);
  
  return Math.max(config.zFar, Math.min(config.zNear, depth));
}

/**
 * 긴급도 기반 궤도 반지름 계산
 * 긴급할수록 중심에 가깝게
 */
export function calculateOrbitRadius(
  urgency: number,
  k: number,
  config: PhysicsConfig
): number {
  // 긴급도가 높으면 중심에 가깝게
  const urgencyFactor = 1 - Math.min(1, urgency);
  // K가 높으면 약간 더 바깥 (중요한 것은 눈에 잘 보이게)
  const kBonus = (k / 3.0) * 2;
  
  const radius = config.minOrbitRadius + 
    (config.maxOrbitRadius - config.minOrbitRadius) * urgencyFactor + kBonus;
  
  return Math.max(config.minOrbitRadius, Math.min(config.maxOrbitRadius, radius));
}

/**
 * I-지수 기반 엔트로피 떨림 (Jitter) 계산
 * I가 낮으면(갈등) 불안정한 궤도
 */
export function calculateJitter(
  i: number,
  omega: number,
  time: number,
  config: PhysicsConfig
): Vector3 {
  // I가 낮거나 Ω가 높으면 떨림 발생
  const instability = Math.max(0, config.jitterThreshold - i) + omega * 0.5;
  
  if (instability <= 0) {
    return new Vector3(0, 0, 0);
  }
  
  // 노이즈 기반 떨림
  const jitterX = Math.sin(time * 7.3) * instability * config.jitterAmplitude;
  const jitterY = Math.cos(time * 5.7) * instability * config.jitterAmplitude;
  const jitterZ = Math.sin(time * 3.1) * instability * config.jitterAmplitude * 0.5;
  
  return new Vector3(jitterX, jitterY, jitterZ);
}

/**
 * 노드 크기 계산 (K 기반)
 */
export function calculateScale(k: number, urgency: number): number {
  const baseScale = 0.1;
  const maxScale = 0.5;
  
  // K가 높거나 긴급하면 크게
  const kFactor = k / 3.0;
  const urgencyBonus = urgency * 0.2;
  
  return baseScale + (maxScale - baseScale) * (kFactor + urgencyBonus);
}

/**
 * 발광 강도 계산 (K + I 기반)
 */
export function calculateEmissive(k: number, i: number): number {
  const baseEmissive = 3;
  const maxEmissive = 20;
  
  // K가 높고 I가 양수(시너지)면 밝게
  const kFactor = k / 3.0;
  const iFactor = Math.max(0, (i + 1) / 2);
  
  return baseEmissive + (maxEmissive - baseEmissive) * (kFactor * 0.7 + iFactor * 0.3);
}

/**
 * 중력 가속도 계산 (뉴턴 만유인력)
 */
export function calculateGravitationalAcceleration(
  nodePosition: Vector3,
  centerPosition: Vector3,
  centerMass: number,
  config: PhysicsConfig
): Vector3 {
  const direction = centerPosition.clone().sub(nodePosition);
  const distance = Math.max(1, direction.length());
  
  // F = G * M * m / r^2, a = F / m = G * M / r^2
  const forceMagnitude = config.gravitationalConstant * centerMass / (distance * distance);
  
  return direction.normalize().multiplyScalar(forceMagnitude);
}

/**
 * 궤도 속도 계산 (원형 궤도)
 */
export function calculateOrbitalVelocity(
  orbitRadius: number,
  orbitPhase: number,
  centerPosition: Vector3,
  config: PhysicsConfig
): { position: Vector3; velocity: Vector3 } {
  // 궤도상의 위치
  const x = centerPosition.x + Math.cos(orbitPhase) * orbitRadius;
  const z = centerPosition.z + Math.sin(orbitPhase) * orbitRadius;
  const y = centerPosition.y;
  
  // 접선 속도 (궤도 속도)
  const speed = config.orbitSpeedFactor * Math.sqrt(orbitRadius);
  const vx = -Math.sin(orbitPhase) * speed;
  const vz = Math.cos(orbitPhase) * speed;
  
  return {
    position: new Vector3(x, y, z),
    velocity: new Vector3(vx, 0, vz),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 노드 상태 업데이트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 단일 노드의 물리 상태 업데이트
 */
export function updateNodePhysics(
  node: PhysicsNode,
  clusterCenter: ClusterCenter,
  time: number,
  config: PhysicsConfig = DEFAULT_PHYSICS_CONFIG
): PhysicsNode {
  // 1. Z-축 심도 업데이트
  const zDepth = calculateZDepth(node.mass_k, node.entropy_omega, config);
  
  // 2. 궤도 반지름 업데이트
  const orbitRadius = calculateOrbitRadius(node.urgency, node.mass_k, config);
  
  // 3. 궤도 위상 업데이트 (회전)
  const orbitSpeed = config.orbitSpeedFactor / Math.sqrt(orbitRadius);
  const newOrbitPhase = node.orbitPhase + orbitSpeed;
  
  // 4. 기본 궤도 위치 계산
  const { position: orbitalPosition } = calculateOrbitalVelocity(
    orbitRadius,
    newOrbitPhase,
    clusterCenter.position,
    config
  );
  
  // 5. Z-축 적용
  orbitalPosition.y = clusterCenter.position.y + Math.sin(newOrbitPhase * 0.5) * 0.5;
  
  // 6. 엔트로피 떨림 추가
  const jitter = calculateJitter(node.interaction_i, node.entropy_omega, time, config);
  orbitalPosition.add(jitter);
  
  // 7. 크기 및 발광 계산
  const scale = calculateScale(node.mass_k, node.urgency);
  const emissive = calculateEmissive(node.mass_k, node.interaction_i);
  
  return {
    ...node,
    position: orbitalPosition,
    zDepth,
    orbitRadius,
    orbitPhase: newOrbitPhase,
    scale,
    emissive,
  };
}

/**
 * 전체 물리 시뮬레이션 스텝
 */
export function physicsStep(
  nodes: PhysicsNode[],
  clusters: ClusterCenter[],
  time: number,
  config: PhysicsConfig = DEFAULT_PHYSICS_CONFIG
): PhysicsNode[] {
  const clusterMap = new Map(clusters.map(c => [c.id, c]));
  
  return nodes.map(node => {
    const cluster = clusterMap.get(node.clusterId);
    if (!cluster) return node;
    
    return updateNodePhysics(node, cluster, time, config);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 충돌 시나리오 처리
// ═══════════════════════════════════════════════════════════════════════════════

export type CollisionScenario = 
  | 'gravity_collision'    // 중력 충돌: 마감 겹침
  | 'energy_depletion'     // 에너지 고갈: 144슬롯 포화
  | 'state_transition'     // 상태 전이: 프로젝트 완수
  | 'conflict_alert';      // 갈등 경고: I < -0.3

export interface CollisionEvent {
  type: CollisionScenario;
  affectedNodes: string[];
  timestamp: number;
  metadata: Record<string, unknown>;
}

/**
 * 충돌 시나리오 감지
 */
export function detectCollisions(
  nodes: PhysicsNode[],
  clusters: ClusterCenter[]
): CollisionEvent[] {
  const events: CollisionEvent[] = [];
  const now = Date.now();
  
  // 1. 중력 충돌 감지 (같은 urgency 높은 노드들)
  const urgentNodes = nodes.filter(n => n.urgency > 0.8);
  if (urgentNodes.length > 3) {
    events.push({
      type: 'gravity_collision',
      affectedNodes: urgentNodes.map(n => n.id),
      timestamp: now,
      metadata: { count: urgentNodes.length },
    });
  }
  
  // 2. 에너지 고갈 감지 (K < 0.3인 노드 비율)
  const depletedNodes = nodes.filter(n => n.mass_k < 0.3);
  if (depletedNodes.length / nodes.length > 0.2) {
    events.push({
      type: 'energy_depletion',
      affectedNodes: depletedNodes.map(n => n.id),
      timestamp: now,
      metadata: { ratio: depletedNodes.length / nodes.length },
    });
  }
  
  // 3. 갈등 경고 감지 (I < -0.3)
  const conflictNodes = nodes.filter(n => n.interaction_i < -0.3);
  if (conflictNodes.length > 0) {
    events.push({
      type: 'conflict_alert',
      affectedNodes: conflictNodes.map(n => n.id),
      timestamp: now,
      metadata: { avgI: conflictNodes.reduce((s, n) => s + n.interaction_i, 0) / conflictNodes.length },
    });
  }
  
  return events;
}

/**
 * 충돌 시나리오에 따른 UI 반응 정의
 */
export function getCollisionReaction(event: CollisionEvent): {
  layoutChange: 'merge' | 'fade' | 'explode' | 'alert';
  effectIntensity: number;
  message: string;
} {
  switch (event.type) {
    case 'gravity_collision':
      return {
        layoutChange: 'merge',
        effectIntensity: 0.8,
        message: `${event.affectedNodes.length}개 프로젝트 마감 충돌 - 라그랑주 점으로 합병`,
      };
    
    case 'energy_depletion':
      return {
        layoutChange: 'fade',
        effectIntensity: 0.6,
        message: '에너지 고갈 감지 - 비핵심 노드 암흑 물질화',
      };
    
    case 'state_transition':
      return {
        layoutChange: 'explode',
        effectIntensity: 1.0,
        message: '프로젝트 완수! 초신성 폭발 후 아카이브 궤도로 이동',
      };
    
    case 'conflict_alert':
      return {
        layoutChange: 'alert',
        effectIntensity: 0.9,
        message: `갈등 감지 - ${event.affectedNodes.length}개 연결선 경고`,
      };
  }
}
