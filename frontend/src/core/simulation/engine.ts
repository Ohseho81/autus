/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS SIMULATION ENGINE
 * 관측 전용 시뮬레이션 - 행동 제안 없음
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 규칙:
 * - 현재 세계 상태 수용
 * - 인과 전파 계산
 * - 렌더링 전용 프레임 출력
 * - 성공/실패 예측 없음
 * - 행동 제안 없음
 * 
 * 엔진은 관측 전용
 */

import { GateState, GATE_STATES, DELTA_T_DEFAULT, SIMULATION_MAX_STEPS } from '../physics/constants';
import { determineGate, GateInput } from '../physics/gate';
import { GeoNode, Boundary, propagateToAll, PropagationResult } from '../geo';
import { resolveGravity, GravityContext } from '../gravity';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface WorldState {
  readonly nodes: readonly SimNode[];
  readonly boundaries: readonly Boundary[];
  readonly regionId: string;
  readonly timestamp: number;
}

export interface SimNode extends GeoNode {
  readonly entropyAcceleration: number;
  readonly responsibilityLoad: number;
  readonly responsibilityCap: number;
  readonly energy: number;
  readonly inertiaDelta: number;
  readonly gateState: GateState;
}

export interface SimFrame {
  readonly nodeId: string;
  readonly gateState: GateState;
  readonly waveRadius: number;
  readonly colorTemp: number;      // 0 = cold, 1 = hot
  readonly inertiaHalo: number;    // 0-1
  readonly impactValue: number;
}

export interface SimResult {
  readonly frames: readonly SimFrame[];
  readonly totalEntropy: number;
  readonly gateTriggered: boolean;
  readonly lockedNodes: readonly string[];
  readonly timestamp: number;
  readonly step: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION ENGINE (Observational Only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 단일 노드의 Gate 상태 계산
 */
function computeNodeGate(
  node: SimNode,
  regionId: string
): GateState {
  const context: GravityContext = {
    regionId,
    gateState: node.gateState
  };
  
  const resolved = resolveGravity(context);
  
  const gateInput: GateInput = {
    entropyAcceleration: node.entropyAcceleration,
    responsibilityLoad: node.responsibilityLoad,
    responsibilityCap: node.responsibilityCap,
    energy: node.energy,
    threshold: resolved.effectiveTheta
  };
  
  return determineGate(gateInput) as GateState;
}

/**
 * 시뮬레이션 프레임 생성 (순수 함수)
 */
function createFrame(
  node: SimNode,
  propagationResult: PropagationResult | null,
  theta: number
): SimFrame {
  const impact = propagationResult?.impact ?? 0;
  
  return Object.freeze({
    nodeId: node.id,
    gateState: node.gateState,
    waveRadius: propagationResult?.distance ?? 0,
    colorTemp: Math.min(1, node.entropyAcceleration / theta),
    inertiaHalo: Math.min(1, node.inertiaDelta / (theta * 1.5)),
    impactValue: impact
  });
}

/**
 * 시뮬레이션 실행 (순수 함수)
 * 
 * 관측 전용 - 행동 제안 없음
 */
export function simulate(
  state: WorldState,
  focusNodeId: string,
  t: number = 0.5
): SimResult {
  const focusNode = state.nodes.find(n => n.id === focusNodeId);
  
  if (!focusNode) {
    throw new Error(`Node ${focusNodeId} not found`);
  }
  
  const context: GravityContext = {
    regionId: state.regionId,
    gateState: focusNode.gateState
  };
  const resolved = resolveGravity(context);
  
  // 전파 계산
  const propagationResults = propagateToAll(
    focusNode,
    state.nodes as unknown as GeoNode[],
    state.boundaries as Boundary[]
  );
  
  const resultMap = new Map(propagationResults.map(r => [r.nodeId, r]));
  
  // 프레임 생성
  const frames: SimFrame[] = [];
  const lockedNodes: string[] = [];
  let totalEntropy = 0;
  let gateTriggered = false;
  
  for (const node of state.nodes) {
    const propagationResult = resultMap.get(node.id) ?? null;
    const newGateState = computeNodeGate(node, state.regionId);
    
    // Gate 트리거 감지
    if (newGateState === GATE_STATES.LOCK && node.gateState !== GATE_STATES.LOCK) {
      gateTriggered = true;
      lockedNodes.push(node.id);
    }
    
    totalEntropy += node.entropyAcceleration * DELTA_T_DEFAULT;
    
    frames.push(createFrame(
      { ...node, gateState: newGateState },
      propagationResult,
      resolved.effectiveTheta
    ));
  }
  
  return Object.freeze({
    frames: Object.freeze(frames),
    totalEntropy,
    gateTriggered,
    lockedNodes: Object.freeze(lockedNodes),
    timestamp: Date.now(),
    step: Math.round(t * SIMULATION_MAX_STEPS)
  });
}

/**
 * 다중 스텝 시뮬레이션
 */
export function simulateSteps(
  state: WorldState,
  focusNodeId: string,
  steps: number = 10
): readonly SimResult[] {
  const results: SimResult[] = [];
  
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    results.push(simulate(state, focusNodeId, t));
  }
  
  return Object.freeze(results);
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SimNode 생성
 */
export function createSimNode(
  id: string,
  lat: number,
  lng: number,
  mass: number,
  entropyAcceleration: number = 0,
  responsibilityLoad: number = 0
): SimNode {
  return Object.freeze({
    id,
    lat,
    lng,
    mass,
    entropyAcceleration,
    responsibilityLoad,
    responsibilityCap: 1.0,
    energy: 100,
    inertiaDelta: 0,
    gateState: GATE_STATES.OBSERVE
  });
}

/**
 * WorldState 생성
 */
export function createWorldState(
  nodes: SimNode[],
  boundaries: Boundary[] = [],
  regionId: string = 'default'
): WorldState {
  return Object.freeze({
    nodes: Object.freeze([...nodes]),
    boundaries: Object.freeze([...boundaries]),
    regionId,
    timestamp: Date.now()
  });
}
