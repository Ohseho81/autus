/**
 * AUTUS CoreLayer (정본)
 * ======================
 * 
 * 중앙 코어 (구형 Mesh + 글로우 링)
 * 
 * 물리량 바인딩:
 * - density → emissive 밝기
 * - sigma → jitter 강도
 * - stability → pulse 규칙성
 * - energy → 크기
 * 
 * Version: 1.0.0
 * Status: LOCKED
 */

import * as THREE from 'three';
import type { AutusUniforms } from '../uniforms/stateToUniform.js';

// ================================================================
// SHADERS
// ================================================================

const CORE_VERTEX_SHADER = `
uniform float u_density;
uniform float u_energy;
uniform float u_sigma;
uniform float u_stability;
uniform float u_t;
uniform float u_mode; // 0=LIVE, 1=SIM

varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;

// Deterministic noise (no random)
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float noise3d(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float n = i.x + i.y * 57.0 + i.z * 113.0;
  return mix(
    mix(mix(hash(n), hash(n + 1.0), f.x),
        mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
    mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
        mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y),
    f.z
  );
}

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  
  // Jitter based on sigma (deterministic)
  float jitterStrength = u_sigma * 0.1;
  float noiseVal = noise3d(position * 3.0 + u_t * 0.5);
  vNoise = noiseVal;
  
  vec3 displaced = position + normal * noiseVal * jitterStrength;
  
  // Scale based on energy
  float scale = 0.8 + u_energy * 0.4;
  displaced *= scale;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

const CORE_FRAGMENT_SHADER = `
uniform float u_density;
uniform float u_energy;
uniform float u_sigma;
uniform float u_stability;
uniform float u_t;
uniform float u_mode;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;

void main() {
  // Base color (teal)
  vec3 baseColor = vec3(0.0, 1.0, 0.8);
  
  // High sigma → red tint
  vec3 highSigmaColor = vec3(1.0, 0.27, 0.27);
  vec3 color = mix(baseColor, highSigmaColor, smoothstep(0.5, 0.8, u_sigma));
  
  // Emissive based on density
  float emissive = u_density * 0.8 + 0.2;
  
  // Pulse based on stability (more stable = more regular pulse)
  float pulseFreq = 1.0 + u_stability * 0.5;
  float pulse = 0.9 + 0.1 * sin(u_t * pulseFreq);
  
  // Fresnel rim
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);
  
  // Final color
  vec3 finalColor = color * emissive * pulse;
  finalColor += color * fresnel * 0.5;
  
  // SIM mode → reduced alpha
  float alpha = u_mode > 0.5 ? 0.7 : 1.0;
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

const HALO_VERTEX_SHADER = `
uniform float u_density;
uniform float u_t;

varying vec2 vUv;

void main() {
  vUv = uv;
  
  // Slight scale pulse
  float scale = 1.0 + sin(u_t * 0.8) * 0.05;
  vec3 scaled = position * scale;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(scaled, 1.0);
}
`;

const HALO_FRAGMENT_SHADER = `
uniform float u_density;
uniform float u_sigma;
uniform float u_t;
uniform float u_mode;

varying vec2 vUv;

void main() {
  // Radial gradient
  vec2 center = vec2(0.5);
  float dist = length(vUv - center) * 2.0;
  
  // Glow falloff
  float glow = 1.0 - smoothstep(0.0, 1.0, dist);
  glow = pow(glow, 2.0);
  
  // Color based on sigma
  vec3 baseColor = vec3(0.0, 1.0, 0.8);
  vec3 highSigmaColor = vec3(1.0, 0.27, 0.27);
  vec3 color = mix(baseColor, highSigmaColor, smoothstep(0.5, 0.8, u_sigma));
  
  // Intensity based on density
  float intensity = glow * u_density * 0.6;
  
  // SIM mode
  float alpha = u_mode > 0.5 ? 0.4 : 0.6;
  
  gl_FragColor = vec4(color * intensity, intensity * alpha);
}
`;

// ================================================================
// CORE LAYER
// ================================================================

export class CoreLayer {
  private group: THREE.Group;
  private coreMesh: THREE.Mesh;
  private haloMesh: THREE.Mesh;
  private uniforms: AutusUniforms;
  
  constructor(uniforms: AutusUniforms) {
    this.uniforms = uniforms;
    this.group = new THREE.Group();
    
    // Core sphere
    const coreGeometry = new THREE.SphereGeometry(1, 64, 64);
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: this.createUniformsObject(),
      vertexShader: CORE_VERTEX_SHADER,
      fragmentShader: CORE_FRAGMENT_SHADER,
      transparent: true,
      side: THREE.FrontSide,
    });
    
    this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    this.group.add(this.coreMesh);
    
    // Halo ring (plane behind core)
    const haloGeometry = new THREE.PlaneGeometry(4, 4);
    const haloMaterial = new THREE.ShaderMaterial({
      uniforms: this.createUniformsObject(),
      vertexShader: HALO_VERTEX_SHADER,
      fragmentShader: HALO_FRAGMENT_SHADER,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    
    this.haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
    this.haloMesh.position.z = -0.5;
    this.group.add(this.haloMesh);
  }
  
  /**
   * Create uniforms object for shaders
   */
  private createUniformsObject(): Record<string, THREE.IUniform> {
    return {
      u_density: this.uniforms.u_density,
      u_energy: this.uniforms.u_energy,
      u_sigma: this.uniforms.u_sigma,
      u_stability: this.uniforms.u_stability,
      u_t: this.uniforms.u_t,
      u_mode: this.uniforms.u_mode,
    };
  }
  
  /**
   * Update uniforms from state
   */
  updateUniforms(uniforms: AutusUniforms): void {
    this.uniforms = uniforms;
    
    // Update shader uniforms
    const coreMat = this.coreMesh.material as THREE.ShaderMaterial;
    const haloMat = this.haloMesh.material as THREE.ShaderMaterial;
    
    coreMat.uniforms.u_density.value = uniforms.u_density.value;
    coreMat.uniforms.u_energy.value = uniforms.u_energy.value;
    coreMat.uniforms.u_sigma.value = uniforms.u_sigma.value;
    coreMat.uniforms.u_stability.value = uniforms.u_stability.value;
    coreMat.uniforms.u_mode.value = uniforms.u_mode.value;
    
    haloMat.uniforms.u_density.value = uniforms.u_density.value;
    haloMat.uniforms.u_sigma.value = uniforms.u_sigma.value;
    haloMat.uniforms.u_mode.value = uniforms.u_mode.value;
  }
  
  /**
   * Update per frame
   */
  update(deltaTime: number): void {
    // Slow rotation
    this.coreMesh.rotation.y += deltaTime * 0.1;
  }
  
  /**
   * Get Three.js object
   */
  getObject(): THREE.Object3D {
    return this.group;
  }
  
  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.coreMesh.geometry.dispose();
    (this.coreMesh.material as THREE.Material).dispose();
    
    this.haloMesh.geometry.dispose();
    (this.haloMesh.material as THREE.Material).dispose();
  }
}
