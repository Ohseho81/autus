/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS PHYSICS MODULE
 * Universal Physics API
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Constants
export * from './constants';

// Gate
export {
  determineGate,
  checkGate,
  isG1Triggered,
  isG2Triggered,
  isG3Triggered,
  isAnyGateTriggered,
  canTransition,
  getNextPossibleStates,
  type GateInput,
  type GateOutput
} from './gate';

// System Info
export const SYSTEM_INFO = {
  name: 'AUTUS Physics Engine',
  version: '2.0.0',
  description: 'Universal Physics System for Business Automation',
};

// System Factory
export function createAUTUSv2System() {
  return {
    inertiaEngine: null,
    scaleLock: null,
    info: SYSTEM_INFO,
  };
}
