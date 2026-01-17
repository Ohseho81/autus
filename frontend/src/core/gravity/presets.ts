/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS GRAVITY PRESETS
 * 불변 환경 상수 - 런타임 수정 불가
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 규칙:
 * - 런타임에 수정 불가
 * - "apply" 함수 없음
 * - 지역과 Gate 상태에 따라 자동 해결
 * - 출력은 비용 배수만 수정
 * - 권한 로직 없음
 */

import { GateState, GATE_STATES } from '../physics/constants';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GravityPreset {
  readonly id: string;
  readonly name: string;
  readonly alpha: number;      // 거리 감쇠
  readonly beta: number;       // 경계 감쇠
  readonly gamma: number;      // 밀집 증폭
  readonly theta: number;      // Gate 임계
  readonly costMultiplier: number;
  readonly description: string;
}

export interface GravityContext {
  regionId: string;
  gateState: GateState;
}

export interface ResolvedGravity {
  readonly preset: GravityPreset;
  readonly effectiveCostMultiplier: number;
  readonly effectiveTheta: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGION PRESETS (불변)
// ─────────────────────────────────────────────────────────────────────────────

export const REGION_PRESETS: readonly GravityPreset[] = Object.freeze([
  Object.freeze({
    id: 'startup_core',
    name: 'Startup Core',
    alpha: 0.0005,
    beta: 0.7,
    gamma: 0.4,
    theta: 0.9,
    costMultiplier: 0.8,
    description: 'High velocity, low friction'
  }),
  Object.freeze({
    id: 'regulated_zone',
    name: 'Regulated Zone',
    alpha: 0.0008,
    beta: 0.3,
    gamma: 0.2,
    theta: 0.5,
    costMultiplier: 1.5,
    description: 'High compliance cost'
  }),
  Object.freeze({
    id: 'crisis_mode',
    name: 'Crisis Mode',
    alpha: 0.001,
    beta: 0.2,
    gamma: 0.1,
    theta: 0.3,
    costMultiplier: 2.0,
    description: 'Emergency constraints'
  }),
  Object.freeze({
    id: 'exploration',
    name: 'Exploration',
    alpha: 0.0003,
    beta: 0.8,
    gamma: 0.5,
    theta: 0.95,
    costMultiplier: 0.6,
    description: 'Low risk tolerance'
  }),
  Object.freeze({
    id: 'sovereign_lock',
    name: 'Sovereign Lock',
    alpha: 0.0001,
    beta: 0.1,
    gamma: 0.05,
    theta: 0.2,
    costMultiplier: 5.0,
    description: 'Maximum control'
  }),
  Object.freeze({
    id: 'default',
    name: 'Default',
    alpha: 0.0006,
    beta: 0.5,
    gamma: 0.3,
    theta: 0.7,
    costMultiplier: 1.0,
    description: 'Standard environment'
  })
]);

// ─────────────────────────────────────────────────────────────────────────────
// GATE MODIFIERS (불변)
// ─────────────────────────────────────────────────────────────────────────────

const GATE_COST_MODIFIERS: Readonly<Record<GateState, number>> = Object.freeze({
  [GATE_STATES.OBSERVE]: 1.0,
  [GATE_STATES.RING]: 1.3,
  [GATE_STATES.LOCK]: 2.0,
  [GATE_STATES.AFTERIMAGE]: Infinity
});

const GATE_THETA_MODIFIERS: Readonly<Record<GateState, number>> = Object.freeze({
  [GATE_STATES.OBSERVE]: 1.0,
  [GATE_STATES.RING]: 0.9,
  [GATE_STATES.LOCK]: 0.7,
  [GATE_STATES.AFTERIMAGE]: 0
});

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVER (Apply 함수 없음 - 자동 해결만)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 지역 ID로 프리셋 조회
 */
export function getPreset(regionId: string): GravityPreset {
  const preset = REGION_PRESETS.find(p => p.id === regionId);
  return preset ?? REGION_PRESETS.find(p => p.id === 'default')!;
}

/**
 * 중력 해결 (순수 함수)
 * Apply 버튼 없음 - 컨텍스트에 따라 자동 해결
 */
export function resolveGravity(context: GravityContext): ResolvedGravity {
  const preset = getPreset(context.regionId);
  
  const gateModifier = GATE_COST_MODIFIERS[context.gateState];
  const thetaModifier = GATE_THETA_MODIFIERS[context.gateState];
  
  return Object.freeze({
    preset,
    effectiveCostMultiplier: preset.costMultiplier * gateModifier,
    effectiveTheta: preset.theta * thetaModifier
  });
}

/**
 * 비용 계산 (순수 함수)
 */
export function calculateCost(
  baseCost: number,
  context: GravityContext
): number {
  const resolved = resolveGravity(context);
  return baseCost * resolved.effectiveCostMultiplier;
}

/**
 * Gate 통과 가능 여부 (순수 함수)
 */
export function canPassGate(
  entropyAcceleration: number,
  context: GravityContext
): boolean {
  const resolved = resolveGravity(context);
  return entropyAcceleration <= resolved.effectiveTheta;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function getAllPresets(): readonly GravityPreset[] {
  return REGION_PRESETS;
}

export function getPresetIds(): readonly string[] {
  return Object.freeze(REGION_PRESETS.map(p => p.id));
}
