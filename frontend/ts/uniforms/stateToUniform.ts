/**
 * AUTUS State to Uniform Mapper (정본)
 * ====================================
 * 
 * State JSON → Shader Uniforms 변환
 * 
 * 핵심 규칙:
 * - 모든 머티리얼은 이 mapper만 사용
 * - 추가 유니폼 사용 금지
 * - 값은 [0, 1] 클램프
 * 
 * Version: 1.0.0
 * Status: LOCKED
 */

import * as THREE from 'three';

// ================================================================
// TYPES
// ================================================================

export interface AutusState {
  session_id: string;
  t_ms: number;
  
  measure: {
    M: number;
    E: number;
    sigma: number;
    density: number;
    stability: number;
    pressure: number;
    leak: number;
    volume: number;
  };
  
  ui: {
    mode: 'SIM' | 'LIVE';
    page: number;
  };
  
  graph: {
    anchor_node_id: string;
    nodes: Array<{
      id: string;
      mass: number;
      sigma: number;
      density: number;
      type: string;
      layer: number;
    }>;
    edges: Array<{
      a: string;
      b: string;
      flow: number;
      sigma: number;
    }>;
  };
}

export interface AutusUniforms {
  u_density: THREE.IUniform<number>;
  u_energy: THREE.IUniform<number>;
  u_sigma: THREE.IUniform<number>;
  u_stability: THREE.IUniform<number>;
  u_t: THREE.IUniform<number>;
  u_mode: THREE.IUniform<number>;
}

// ================================================================
// HELPERS
// ================================================================

/**
 * Clamp value to [0, 1]
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Round to 4 decimal places (determinism)
 */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

// ================================================================
// MAPPER
// ================================================================

/**
 * Convert AutusState to shader uniforms
 * 
 * @param state - AutusState or null for defaults
 * @returns AutusUniforms object
 */
export function stateToUniforms(state: AutusState | null): AutusUniforms {
  // Default values
  const defaults = {
    density: 0.5,
    energy: 0.5,
    sigma: 0.3,
    stability: 0.7,
    t: 0,
    mode: 0, // 0 = LIVE
  };
  
  if (!state) {
    return {
      u_density: { value: defaults.density },
      u_energy: { value: defaults.energy },
      u_sigma: { value: defaults.sigma },
      u_stability: { value: defaults.stability },
      u_t: { value: defaults.t },
      u_mode: { value: defaults.mode },
    };
  }
  
  // Map from state
  const { measure, ui } = state;
  
  return {
    u_density: { value: round4(clamp01(measure.density)) },
    u_energy: { value: round4(clamp01(measure.E)) },
    u_sigma: { value: round4(clamp01(measure.sigma)) },
    u_stability: { value: round4(clamp01(measure.stability)) },
    u_t: { value: round4(state.t_ms / 1000) }, // Convert to seconds
    u_mode: { value: ui.mode === 'SIM' ? 1 : 0 },
  };
}

/**
 * Update existing uniforms from state
 * 
 * @param uniforms - Existing uniforms to update
 * @param state - New state
 */
export function updateUniforms(uniforms: AutusUniforms, state: AutusState): void {
  const { measure, ui } = state;
  
  uniforms.u_density.value = round4(clamp01(measure.density));
  uniforms.u_energy.value = round4(clamp01(measure.E));
  uniforms.u_sigma.value = round4(clamp01(measure.sigma));
  uniforms.u_stability.value = round4(clamp01(measure.stability));
  uniforms.u_mode.value = ui.mode === 'SIM' ? 1 : 0;
  // u_t is updated by animation loop, not from state
}

/**
 * Create uniform clone (for multiple materials)
 */
export function cloneUniforms(uniforms: AutusUniforms): AutusUniforms {
  return {
    u_density: { value: uniforms.u_density.value },
    u_energy: { value: uniforms.u_energy.value },
    u_sigma: { value: uniforms.u_sigma.value },
    u_stability: { value: uniforms.u_stability.value },
    u_t: uniforms.u_t, // Share time uniform
    u_mode: { value: uniforms.u_mode.value },
  };
}

// ================================================================
// VALIDATION
// ================================================================

/**
 * Validate state structure
 */
export function validateState(state: unknown): state is AutusState {
  if (!state || typeof state !== 'object') return false;
  
  const s = state as Record<string, unknown>;
  
  if (typeof s.session_id !== 'string') return false;
  if (typeof s.t_ms !== 'number') return false;
  
  if (!s.measure || typeof s.measure !== 'object') return false;
  if (!s.ui || typeof s.ui !== 'object') return false;
  
  const m = s.measure as Record<string, unknown>;
  const requiredMeasures = ['M', 'E', 'sigma', 'density', 'stability'];
  for (const key of requiredMeasures) {
    if (typeof m[key] !== 'number') return false;
  }
  
  return true;
}
