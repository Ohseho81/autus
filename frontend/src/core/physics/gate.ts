/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS GATE DETERMINATION
 * 순수 함수 - 부작용 없음, 결정론적
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Gate 트리거 조건 (OR 논리):
 * - G1: ΔṠ > θ (엔트로피 가속 초과)
 * - G2: Load > UC (책임 부하 초과)
 * - G3: E < 0 (에너지 고갈)
 * 
 * 결과: OBSERVE | RING | LOCK
 * 설명/숫자/승인 없음
 */

import { 
  GateState, 
  GATE_STATES,
  THETA_DEFAULT,
  THETA_RING,
  UC_OVERLOAD_MULTIPLIER 
} from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GateInput {
  entropyAcceleration: number;  // ΔṠ
  responsibilityLoad: number;   // 현재 부하
  responsibilityCap: number;    // UC (수용 한계)
  energy: number;               // E
  threshold: number;            // θ
}

export type GateOutput = 'OBSERVE' | 'RING' | 'LOCK';

// ─────────────────────────────────────────────────────────────────────────────
// PURE GATE DETERMINATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gate 상태 결정 - 순수 함수
 * 
 * @param input - Gate 판정 입력값
 * @returns 'OBSERVE' | 'RING' | 'LOCK'
 * 
 * 부작용 없음
 * 결정론적 (동일 입력 = 동일 출력)
 */
export function determineGate(input: GateInput): GateOutput {
  const { 
    entropyAcceleration, 
    responsibilityLoad, 
    responsibilityCap, 
    energy, 
    threshold 
  } = input;

  // G3: 에너지 고갈 → 즉시 LOCK
  if (energy < 0) {
    return GATE_STATES.LOCK;
  }

  // G2: 책임 부하 초과 → LOCK
  if (responsibilityLoad > responsibilityCap * UC_OVERLOAD_MULTIPLIER) {
    return GATE_STATES.LOCK;
  }

  // G1: 엔트로피 가속 초과 → LOCK
  if (entropyAcceleration > threshold) {
    return GATE_STATES.LOCK;
  }

  // 경고 구간 (RING)
  if (entropyAcceleration > threshold * THETA_RING) {
    return GATE_STATES.RING;
  }

  if (responsibilityLoad > responsibilityCap) {
    return GATE_STATES.RING;
  }

  // 정상 상태
  return GATE_STATES.OBSERVE;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLIFIED GATE CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 간단한 Gate 체크 (기본값 사용)
 */
export function checkGate(
  entropyAcceleration: number,
  responsibilityLoad: number,
  energy: number
): GateOutput {
  return determineGate({
    entropyAcceleration,
    responsibilityLoad,
    responsibilityCap: 1.0,
    energy,
    threshold: THETA_DEFAULT
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GATE TRIGGER CHECKS (개별)
// ─────────────────────────────────────────────────────────────────────────────

export function isG1Triggered(entropyAcceleration: number, threshold: number = THETA_DEFAULT): boolean {
  return entropyAcceleration > threshold;
}

export function isG2Triggered(load: number, cap: number): boolean {
  return load > cap * UC_OVERLOAD_MULTIPLIER;
}

export function isG3Triggered(energy: number): boolean {
  return energy < 0;
}

export function isAnyGateTriggered(input: GateInput): boolean {
  return isG1Triggered(input.entropyAcceleration, input.threshold) ||
         isG2Triggered(input.responsibilityLoad, input.responsibilityCap) ||
         isG3Triggered(input.energy);
}

// ─────────────────────────────────────────────────────────────────────────────
// GATE STATE TRANSITION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gate 상태 전이 규칙
 * OBSERVE → RING → LOCK → AFTERIMAGE
 * 역전이 불가
 */
export function canTransition(from: GateState, to: GateState): boolean {
  const order: GateState[] = [
    GATE_STATES.OBSERVE,
    GATE_STATES.RING,
    GATE_STATES.LOCK,
    GATE_STATES.AFTERIMAGE
  ];
  
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  
  // 순방향 전이만 허용
  return toIdx > fromIdx;
}

/**
 * 현재 상태에서 가능한 다음 상태들
 */
export function getNextPossibleStates(current: GateState): GateState[] {
  switch (current) {
    case GATE_STATES.OBSERVE:
      return [GATE_STATES.RING, GATE_STATES.LOCK];
    case GATE_STATES.RING:
      return [GATE_STATES.LOCK];
    case GATE_STATES.LOCK:
      return [GATE_STATES.AFTERIMAGE];
    case GATE_STATES.AFTERIMAGE:
      return []; // 종점
    default:
      return [];
  }
}
