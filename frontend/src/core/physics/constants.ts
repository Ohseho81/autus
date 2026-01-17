/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS UNIVERSAL PHYSICS CONSTANTS
 * 불변 상수 정의 - 수정 금지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CORE PHYSICS SYMBOLS
// ─────────────────────────────────────────────────────────────────────────────

/** ψ (Psi) - 비가역성: 결정이 되돌릴 수 없는 정도 (0-1) */
export const PSI_MIN = 0;
export const PSI_MAX = 1;
export const PSI_CRITICAL = 0.8;

/** ΔṠ (Delta S dot) - 엔트로피 가속: 시스템 무질서도 증가율 */
export const ENTROPY_ACCELERATION_THRESHOLD = 0.7;
export const ENTROPY_CRITICAL = 0.9;

/** UC (Responsibility Capacity) - 책임 수용 한계 */
export const UC_DEFAULT = 1.0;
export const UC_OVERLOAD_MULTIPLIER = 1.5;

/** E (Energy Budget) - 에너지 예산 */
export const ENERGY_INITIAL = 100;
export const ENERGY_CRITICAL = 0;

/** θ (Theta) - Gate 임계치 */
export const THETA_DEFAULT = 0.7;
export const THETA_RING = 0.8;
export const THETA_LOCK = 1.0;

// ─────────────────────────────────────────────────────────────────────────────
// GATE STATES (불변)
// ─────────────────────────────────────────────────────────────────────────────

export const GATE_STATES = {
  OBSERVE: 'OBSERVE',
  RING: 'RING',
  LOCK: 'LOCK',
  AFTERIMAGE: 'AFTERIMAGE'
} as const;

export type GateState = typeof GATE_STATES[keyof typeof GATE_STATES];

// ─────────────────────────────────────────────────────────────────────────────
// SCALE LEVELS (K-Scale)
// ─────────────────────────────────────────────────────────────────────────────

export const SCALE_LEVELS = {
  K1: 1,   // 개인 (Individual)
  K2: 2,   // 책상 (Desk) - 체감만
  K3: 3,   // 팀 (Team)
  K4: 4,   // 사무실 (Office)
  K5: 5,   // 건물/도시 (Building/City)
  K6: 6,   // 지역 (Region) - 그래프 접근 시작
  K7: 7,   // 국가 (Country)
  K8: 8,   // 대륙 (Continent)
  K9: 9,   // 글로벌 (Global)
  K10: 10  // 우주 (Universe) - 관측만
} as const;

export type ScaleLevel = 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6' | 'K7' | 'K8' | 'K9' | 'K10';

// ─────────────────────────────────────────────────────────────────────────────
// SPATIAL CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const EARTH_RADIUS_METERS = 6371000;
export const CITY_RADIUS_METERS = 3000;
export const BUILDING_RADIUS_METERS = 100;

// ─────────────────────────────────────────────────────────────────────────────
// DECAY COEFFICIENTS
// ─────────────────────────────────────────────────────────────────────────────

/** α (Alpha) - 거리 감쇠 계수 */
export const ALPHA_URBAN = 0.0008;
export const ALPHA_RURAL = 0.0003;
export const ALPHA_GLOBAL = 0.0001;

/** β (Beta) - 경계 감쇠 계수 */
export const BETA_DEFAULT = 0.5;

/** γ (Gamma) - 밀집 증폭 계수 */
export const GAMMA_DEFAULT = 0.3;

/** λ (Lambda) - 자연 감쇠율 */
export const LAMBDA_DEFAULT = 0.1;

// ─────────────────────────────────────────────────────────────────────────────
// TIME CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const DELTA_T_DEFAULT = 0.1;
export const SIMULATION_MAX_STEPS = 100;
export const GATE_TRANSITION_MS = 1300;

// ─────────────────────────────────────────────────════════════════════════════
// IMMUTABLE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const PHYSICS_CONSTANTS = Object.freeze({
  psi: { min: PSI_MIN, max: PSI_MAX, critical: PSI_CRITICAL },
  entropy: { threshold: ENTROPY_ACCELERATION_THRESHOLD, critical: ENTROPY_CRITICAL },
  uc: { default: UC_DEFAULT, overloadMultiplier: UC_OVERLOAD_MULTIPLIER },
  energy: { initial: ENERGY_INITIAL, critical: ENERGY_CRITICAL },
  theta: { default: THETA_DEFAULT, ring: THETA_RING, lock: THETA_LOCK },
  spatial: { earth: EARTH_RADIUS_METERS, city: CITY_RADIUS_METERS, building: BUILDING_RADIUS_METERS },
  decay: { alpha: { urban: ALPHA_URBAN, rural: ALPHA_RURAL, global: ALPHA_GLOBAL }, beta: BETA_DEFAULT, gamma: GAMMA_DEFAULT, lambda: LAMBDA_DEFAULT },
  time: { deltaT: DELTA_T_DEFAULT, maxSteps: SIMULATION_MAX_STEPS, transitionMs: GATE_TRANSITION_MS }
});
