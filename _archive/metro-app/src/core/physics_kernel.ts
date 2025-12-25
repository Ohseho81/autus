// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS METRO OS — Physics Kernel (LOCK SPEC)
// All movement = numbers. No cosmetic animations.
// ═══════════════════════════════════════════════════════════════════════════════

import { EntityState, PhysicsDelta, PNR_THRESHOLD } from './types';

// Physics constants
const FRICTION_BASE = 0.02;
const TRANSFER_LOSS = 0.08;
const COMPLEXITY_FACTOR = 0.05;
const UNCERTAINTY_FACTOR = 0.03;
const VELOCITY_BASE = 1.0;

/**
 * Calculate time step for movement between stations
 * dt_step = (distance / velocity) * (1 + S)
 */
export function calcTimeStep(
  distance: number,
  velocity: number = VELOCITY_BASE,
  entropy: number
): number {
  return (distance / velocity) * (1 + entropy);
}

/**
 * Calculate energy after a step
 * E(t+1) = E(t) - friction - transfer_loss
 */
export function calcEnergy(
  currentE: number,
  friction: number = FRICTION_BASE,
  isTransfer: boolean = false
): number {
  const loss = friction + (isTransfer ? TRANSFER_LOSS : 0);
  return Math.max(0, Math.min(1, currentE - loss));
}

/**
 * Calculate entropy after a step
 * S(t+1) = S(t) + complexity * uncertainty
 */
export function calcEntropy(
  currentS: number,
  complexity: number = COMPLEXITY_FACTOR,
  uncertainty: number = UNCERTAINTY_FACTOR
): number {
  const increase = complexity * uncertainty;
  return Math.max(0, Math.min(1, currentS + increase));
}

/**
 * Calculate risk from accumulated shocks
 * R = 1 - exp(-sum(shock_i))
 */
export function calcRisk(shocks: number[]): number {
  const sumShocks = shocks.reduce((a, b) => a + b, 0);
  return 1 - Math.exp(-sumShocks);
}

/**
 * Update risk incrementally
 */
export function updateRisk(currentR: number, shockDelta: number): number {
  // Convert back to shock sum, add delta, recalculate
  const currentShockSum = -Math.log(1 - Math.min(currentR, 0.999));
  const newShockSum = currentShockSum + shockDelta;
  return 1 - Math.exp(-newShockSum);
}

/**
 * Calculate PNR (Point of No Return)
 * Deterministic formula based on E, S, R, dt
 */
export function calcPNR(E: number, S: number, R: number, dt: number): number {
  // PNR increases when:
  // - Energy is low (1-E contributes)
  // - Entropy is high (S contributes)
  // - Risk is high (R contributes)
  // - Time is running out (dt contributes inversely)
  
  const energyFactor = (1 - E) * 0.3;
  const entropyFactor = S * 0.25;
  const riskFactor = R * 0.35;
  const timeFactor = Math.min(1, dt / 100) * 0.1;
  
  return Math.min(1, energyFactor + entropyFactor + riskFactor + timeFactor);
}

/**
 * Check if entity is in critical state
 */
export function isCritical(pnr: number, threshold: number = PNR_THRESHOLD): boolean {
  return pnr > threshold;
}

/**
 * Apply physics delta to entity state
 */
export function applyDelta(state: EntityState, delta: PhysicsDelta): EntityState {
  return {
    ...state,
    t: state.t + delta.dt,
    E: Math.max(0, Math.min(1, state.E + delta.dE)),
    S: Math.max(0, Math.min(1, state.S + delta.dS)),
    R: Math.max(0, Math.min(1, state.R + delta.dR)),
    is_critical: isCritical(calcPNR(
      state.E + delta.dE,
      state.S + delta.dS,
      state.R + delta.dR,
      state.t + delta.dt
    )),
  };
}

/**
 * Calculate movement delta between stations
 */
export function calcMovementDelta(
  distance: number,
  isTransfer: boolean,
  currentEntropy: number
): PhysicsDelta {
  const dt = calcTimeStep(distance, VELOCITY_BASE, currentEntropy);
  const dE = -(FRICTION_BASE + (isTransfer ? TRANSFER_LOSS : 0));
  const dS = COMPLEXITY_FACTOR * UNCERTAINTY_FACTOR * (isTransfer ? 2 : 1);
  const dR = isTransfer ? 0.02 : 0.01;
  
  return { dt, dE, dS, dR };
}

/**
 * Calculate transfer switch cost
 */
export function calcTransferCost(
  fromLine: string,
  toLine: string,
  congestion: number = 0.5
): PhysicsDelta {
  return {
    dt: 3 + congestion * 5,
    dE: -TRANSFER_LOSS * (1 + congestion),
    dS: COMPLEXITY_FACTOR * 2,
    dR: 0.03 * congestion,
  };
}

/**
 * Calculate abort penalty
 */
export function calcAbortPenalty(currentState: EntityState): PhysicsDelta {
  return {
    dt: 10,
    dE: -0.3,
    dS: 0.2,
    dR: 0.15,
  };
}

/**
 * Forecast state after N steps
 */
export function forecastState(
  state: EntityState,
  deltas: PhysicsDelta[]
): EntityState {
  return deltas.reduce((s, d) => applyDelta(s, d), state);
}

/**
 * Calculate color intensity from delta magnitude
 */
export function calcColorIntensity(delta: number, maxDelta: number = 0.5): number {
  return Math.min(1, Math.abs(delta) / maxDelta);
}

/**
 * Calculate pulse speed from risk derivative
 */
export function calcPulseSpeed(dR: number): number {
  return 0.5 + Math.abs(dR) * 5;
}

/**
 * Calculate line thickness from energy delta
 */
export function calcLineThickness(dE: number, baseThickness: number = 4): number {
  return baseThickness * (1 + Math.abs(dE) * 3);
}

/**
 * Distance calculation between two points
 */
export function calcDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Collision detection between two entities
 */
export function detectCollision(
  entity1: EntityState,
  entity2: EntityState
): boolean {
  return entity1.current_station_id === entity2.current_station_id &&
         entity1.entity_id !== entity2.entity_id;
}

/**
 * Calculate collision penalty for both entities
 */
export function calcCollisionPenalty(): PhysicsDelta {
  return {
    dt: 5,
    dE: -0.1,
    dS: 0.15,
    dR: 0.08,
  };
}
