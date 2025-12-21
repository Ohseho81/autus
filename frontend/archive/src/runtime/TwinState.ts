/**
 * AUTUS TwinState v1.0
 * 현실 상태 + 시뮬레이션 분리
 */

export type TwinState = {
  time: number;
  E: number;    // Energy (0-1)
  R: number;    // Resistance/Friction (0-1)
  T: number;    // Time/Wait (0-1)
  Q: number;    // Quality (0-1)
  mu: number;   // Coupling (0-1)
  VOL: number;  // Volatility (0-1)
  SHOCK: number; // Shock level (0-1)
};

export type Mode = "USER" | "ADMIN";

export type EntityType = "HUMAN" | "COMPANY" | "CITY" | "NATION" | "ADMIN_PROCESS";

export const DEFAULT_TWIN_STATE: TwinState = {
  time: 0,
  E: 0.5,
  R: 0.2,
  T: 0.1,
  Q: 0.8,
  mu: 0.3,
  VOL: 0.1,
  SHOCK: 0.0
};

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function computeDerivedState(state: TwinState): {
  risk: number;
  health: number;
  pressure: number;
  entropy: number;
} {
  const risk = clamp01(state.R * 0.4 + state.T * 0.3 + state.SHOCK * 0.3);
  const health = clamp01(state.Q * 0.5 + state.E * 0.3 + (1 - state.R) * 0.2);
  const pressure = clamp01(state.R * 0.5 + state.T * 0.5);
  const entropy = clamp01(state.VOL * 0.6 + state.SHOCK * 0.4);
  return { risk, health, pressure, entropy };
}
