/**
 * AUTUS FlowLayer (정본)
 * ======================
 * 
 * 입자 흐름 시각화
 * 
 * 물리량 바인딩:
 * - energy → 파티클 속도
 * - sigma → 난류 강도
 * - stability → 흐름 규칙성
 * - mode → alpha (SIM=0.55, LIVE=1.0)
 * 
 * Version: 1.0.0
 * Status: LOCKED
 */

import * as THREE from 'three';
import type { AutusUniforms } from '../uniforms/stateToUniform.js';

// ================================================================
// CONSTANTS
// ================================================================

const PARTICLE_COUNT = 2000; // Cap for performance
const PARTICLE_SIZE = 0.02;
const ORBIT_RADIUS_MIN = 1.2;
const ORBIT_RADIUS_MAX = 2.5;

// ================================================================
// SHADERS
// ================================================================

const FLOW_VERTEX_SHADER = `
uniform float u_energy;
uniform float u_sigma;
uniform float u_stability;
uniform float u_t;
uniform float u_mode;

attribute float aPhase;
attribute float aRadius;
attribute float aSpeed;

varying float vAlpha;
varying float vSigma;

// Deterministic noise
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  // Base orbit
  float angle = aPhase + u_t * aSpeed * (0.5 + u_energy * 0.5);
  
  // Turbulence based on sigma
  float turbulence = sin(u_t * 3.0 + aPhase * 10.0) * u_sigma * 0.3;
  
  // Position on orbit
  float r = aRadius + turbulence;
  vec3 pos = vec3(
    cos(angle) * r,
    sin(angle * 0.7) * r * 0.3 + sin(u_t + aPhase) * u_sigma * 0.2,
    sin(angle) * r
  );
  
  // Alpha based on stability and mode
  vAlpha = u_stability * (u_mode > 0.5 ? 0.55 : 0.9);
  vSigma = u_sigma;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // Size based on distance
  gl_PointSize = ${PARTICLE_SIZE.toFixed(4)} * 300.0 / -mvPosition.z;
}
`;

const FLOW_FRAGMENT_SHADER = `
uniform float u_sigma;

varying float vAlpha;
varying float vSigma;

void main() {
  // Circular point
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;
  
  // Soft edge
  float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;
  
  // Color based on sigma
  vec3 baseColor = vec3(0.0, 1.0, 0.8);
  vec3 highSigmaColor = vec3(1.0, 0.5, 0.3);
  vec3 color = mix(baseColor, highSigmaColor, vSigma);
  
  gl_FragColor = vec4(color, alpha);
}
`;

// ================================================================
// FLOW LAYER
// ================================================================

export class FlowLayer {
  private points: THREE.Points;
  private uniforms: AutusUniforms;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  
  constructor(uniforms: AutusUniforms) {
    this.uniforms = uniforms;
    
    // Create geometry with attributes
    this.geometry = new THREE.BufferGeometry();
    
    const phases = new Float32Array(PARTICLE_COUNT);
    const radii = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Deterministic initialization
      const seed = i / PARTICLE_COUNT;
      
      phases[i] = seed * Math.PI * 2;
      radii[i] = ORBIT_RADIUS_MIN + (ORBIT_RADIUS_MAX - ORBIT_RADIUS_MIN) * 
                 this.deterministicRandom(seed);
      speeds[i] = 0.2 + this.deterministicRandom(seed + 0.5) * 0.8;
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array(PARTICLE_COUNT * 3), 3
    ));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.geometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    this.geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    
    // Create material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_energy: uniforms.u_energy,
        u_sigma: uniforms.u_sigma,
        u_stability: uniforms.u_stability,
        u_t: uniforms.u_t,
        u_mode: uniforms.u_mode,
      },
      vertexShader: FLOW_VERTEX_SHADER,
      fragmentShader: FLOW_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    
    // Create points
    this.points = new THREE.Points(this.geometry, this.material);
  }
  
  /**
   * Deterministic random (no Math.random)
   */
  private deterministicRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }
  
  /**
   * Update uniforms from state
   */
  updateUniforms(uniforms: AutusUniforms): void {
    this.uniforms = uniforms;
    
    this.material.uniforms.u_energy.value = uniforms.u_energy.value;
    this.material.uniforms.u_sigma.value = uniforms.u_sigma.value;
    this.material.uniforms.u_stability.value = uniforms.u_stability.value;
    this.material.uniforms.u_mode.value = uniforms.u_mode.value;
  }
  
  /**
   * Update per frame
   */
  update(deltaTime: number): void {
    // Time is updated externally via uniforms
  }
  
  /**
   * Get Three.js object
   */
  getObject(): THREE.Object3D {
    return this.points;
  }
  
  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.points.visible = visible;
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
