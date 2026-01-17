// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Physics Engine Exports
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // 타입
  type PhysicsNode,
  type ClusterCenter,
  type PhysicsConfig,
  type CollisionScenario,
  type CollisionEvent,
  
  // 설정
  DEFAULT_PHYSICS_CONFIG,
  
  // 계산 함수
  calculateZDepth,
  calculateOrbitRadius,
  calculateJitter,
  calculateScale,
  calculateEmissive,
  calculateGravitationalAcceleration,
  calculateOrbitalVelocity,
  
  // 업데이트 함수
  updateNodePhysics,
  physicsStep,
  
  // 충돌 감지
  detectCollisions,
  getCollisionReaction,
} from './autusPhysicsEngine';
