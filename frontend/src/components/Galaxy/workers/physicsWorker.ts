// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Web Worker 물리 연산 (오프스크린 연산)
// ═══════════════════════════════════════════════════════════════════════════════
//
// 메인 스레드 부하 분리를 위한 Web Worker
// - 570개 노드의 궤도 계산
// - 충돌 감지
// - K·I·Ω 기반 물리 시뮬레이션
//
// ═══════════════════════════════════════════════════════════════════════════════

// Worker 메시지 타입
export interface WorkerMessage {
  type: 'init' | 'update' | 'collision' | 'config';
  payload: unknown;
}

export interface WorkerResponse {
  type: 'positions' | 'collisions' | 'ready' | 'error';
  payload: unknown;
}

// 간소화된 노드 데이터 (Worker용)
export interface WorkerNode {
  id: string;
  clusterId: string;
  mass_k: number;
  interaction_i: number;
  entropy_omega: number;
  urgency: number;
  orbitPhase: number;
  orbitRadius: number;
}

export interface WorkerCluster {
  id: string;
  centerX: number;
  centerY: number;
  centerZ: number;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  emissive: number;
  zDepth: number;
}

// 물리 설정
const config = {
  zNear: -5,
  zFar: -25,
  minOrbitRadius: 3,
  maxOrbitRadius: 15,
  orbitSpeedFactor: 0.001,
  jitterAmplitude: 0.3,
  jitterThreshold: 0.3,
};

let nodes: WorkerNode[] = [];
let clusters: WorkerCluster[] = [];
let time = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// 물리 계산 함수들
// ═══════════════════════════════════════════════════════════════════════════════

function calculateZDepth(k: number, omega: number): number {
  const kFactor = Math.min(1, k / 3.0);
  const omegaPenalty = omega * 0.3;
  return config.zNear + (config.zFar - config.zNear) * (1 - kFactor + omegaPenalty);
}

function calculateOrbitRadius(urgency: number, k: number): number {
  const urgencyFactor = 1 - Math.min(1, urgency);
  const kBonus = (k / 3.0) * 2;
  return config.minOrbitRadius + 
    (config.maxOrbitRadius - config.minOrbitRadius) * urgencyFactor + kBonus;
}

function calculateJitter(i: number, omega: number, t: number): [number, number, number] {
  const instability = Math.max(0, config.jitterThreshold - i) + omega * 0.5;
  if (instability <= 0) return [0, 0, 0];
  
  const jitterX = Math.sin(t * 7.3) * instability * config.jitterAmplitude;
  const jitterY = Math.cos(t * 5.7) * instability * config.jitterAmplitude;
  const jitterZ = Math.sin(t * 3.1) * instability * config.jitterAmplitude * 0.5;
  
  return [jitterX, jitterY, jitterZ];
}

function calculateScale(k: number, urgency: number): number {
  const baseScale = 0.1;
  const maxScale = 0.5;
  const kFactor = k / 3.0;
  const urgencyBonus = urgency * 0.2;
  return baseScale + (maxScale - baseScale) * (kFactor + urgencyBonus);
}

function calculateEmissive(k: number, i: number): number {
  const baseEmissive = 3;
  const maxEmissive = 20;
  const kFactor = k / 3.0;
  const iFactor = Math.max(0, (i + 1) / 2);
  return baseEmissive + (maxEmissive - baseEmissive) * (kFactor * 0.7 + iFactor * 0.3);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 업데이트 함수
// ═══════════════════════════════════════════════════════════════════════════════

function updatePhysics(deltaTime: number): NodePosition[] {
  time += deltaTime;
  
  const clusterMap = new Map(clusters.map(c => [c.id, c]));
  const positions: NodePosition[] = [];
  
  for (const node of nodes) {
    const cluster = clusterMap.get(node.clusterId);
    if (!cluster) continue;
    
    // 궤도 업데이트
    const orbitRadius = calculateOrbitRadius(node.urgency, node.mass_k);
    const orbitSpeed = config.orbitSpeedFactor / Math.sqrt(orbitRadius);
    node.orbitPhase += orbitSpeed;
    node.orbitRadius = orbitRadius;
    
    // 기본 궤도 위치
    const x = cluster.centerX + Math.cos(node.orbitPhase) * orbitRadius;
    const z = cluster.centerZ + Math.sin(node.orbitPhase) * orbitRadius;
    let y = cluster.centerY + Math.sin(node.orbitPhase * 0.5) * 0.5;
    
    // 떨림 추가
    const [jx, jy, jz] = calculateJitter(node.interaction_i, node.entropy_omega, time);
    
    // Z-축 심도
    const zDepth = calculateZDepth(node.mass_k, node.entropy_omega);
    
    positions.push({
      id: node.id,
      x: x + jx,
      y: y + jy,
      z: z + jz,
      scale: calculateScale(node.mass_k, node.urgency),
      emissive: calculateEmissive(node.mass_k, node.interaction_i),
      zDepth,
    });
  }
  
  return positions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 충돌 감지
// ═══════════════════════════════════════════════════════════════════════════════

function detectCollisions(): { type: string; nodeIds: string[] }[] {
  const events: { type: string; nodeIds: string[] }[] = [];
  
  // 긴급 노드 충돌
  const urgentNodes = nodes.filter(n => n.urgency > 0.8);
  if (urgentNodes.length > 3) {
    events.push({
      type: 'gravity_collision',
      nodeIds: urgentNodes.map(n => n.id),
    });
  }
  
  // 갈등 감지
  const conflictNodes = nodes.filter(n => n.interaction_i < -0.3);
  if (conflictNodes.length > 0) {
    events.push({
      type: 'conflict_alert',
      nodeIds: conflictNodes.map(n => n.id),
    });
  }
  
  return events;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Worker 메시지 핸들러
// ═══════════════════════════════════════════════════════════════════════════════

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'init': {
      const data = payload as { nodes: WorkerNode[]; clusters: WorkerCluster[] };
      nodes = data.nodes;
      clusters = data.clusters;
      time = 0;
      
      self.postMessage({ type: 'ready', payload: { nodeCount: nodes.length } });
      break;
    }
    
    case 'update': {
      const deltaTime = (payload as { deltaTime: number }).deltaTime || 1/60;
      const positions = updatePhysics(deltaTime);
      
      self.postMessage({ type: 'positions', payload: positions });
      break;
    }
    
    case 'collision': {
      const collisions = detectCollisions();
      self.postMessage({ type: 'collisions', payload: collisions });
      break;
    }
    
    case 'config': {
      Object.assign(config, payload);
      break;
    }
    
    default:
      self.postMessage({ type: 'error', payload: `Unknown message type: ${type}` });
  }
};

// TypeScript Worker export type
export type PhysicsWorkerType = typeof self;
