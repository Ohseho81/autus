/**
 * AUTUS Determinism Sampler (정본)
 * =================================
 * 
 * 결정론적 시간/노이즈 샘플링
 * 
 * 핵심 규칙:
 * - 같은 state_hash → 같은 jitter 패턴
 * - FPS 변화해도 결과 불변
 * - Math.random() 사용 금지
 * 
 * Version: 1.0.0
 * Status: LOCKED
 */

// ================================================================
// CONSTANTS
// ================================================================

const BUCKET_MS = 33; // ~30fps bucket (결정론)
const HASH_PRIME_1 = 12.9898;
const HASH_PRIME_2 = 78.233;
const HASH_SCALE = 43758.5453;

// ================================================================
// DETERMINISM SAMPLER
// ================================================================

export class DeterminismSampler {
  private sessionId: string = '';
  private sessionHash: number = 0;
  
  /**
   * Set current session for deterministic seeding
   */
  setSession(sessionId: string): void {
    this.sessionId = sessionId;
    this.sessionHash = this.hashString(sessionId);
  }
  
  /**
   * Get time bucket (floor to BUCKET_MS)
   * 
   * 동일 t_ms 범위 → 동일 bucket
   */
  getBucket(t_ms: number): number {
    return Math.floor(t_ms / BUCKET_MS);
  }
  
  /**
   * Get deterministic noise for node at time
   * 
   * @param nodeId - Node identifier
   * @param t_bucket - Time bucket from getBucket()
   * @returns Noise value [0, 1]
   */
  getNodeNoise(nodeId: string, t_bucket: number): number {
    const nodeHash = this.hashString(nodeId);
    const seed = this.sessionHash + nodeHash + t_bucket;
    return this.hashFloat(seed);
  }
  
  /**
   * Get deterministic 3D noise vector
   */
  getNodeNoise3D(nodeId: string, t_bucket: number): { x: number; y: number; z: number } {
    const baseNoise = this.getNodeNoise(nodeId, t_bucket);
    
    return {
      x: this.hashFloat(baseNoise * 1000) * 2 - 1,
      y: this.hashFloat(baseNoise * 2000) * 2 - 1,
      z: this.hashFloat(baseNoise * 3000) * 2 - 1,
    };
  }
  
  /**
   * Get deterministic jitter amplitude
   * 
   * @param sigma - Entropy value [0, 1]
   * @param nodeId - Node identifier
   * @param t_bucket - Time bucket
   */
  getJitter(sigma: number, nodeId: string, t_bucket: number): number {
    const noise = this.getNodeNoise(nodeId, t_bucket);
    return noise * sigma * 0.1; // Max 10% jitter at sigma=1
  }
  
  /**
   * Hash string to number (deterministic)
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Hash float to [0, 1] (deterministic)
   * 
   * sin-based hash (GLSL compatible)
   */
  private hashFloat(n: number): number {
    const x = Math.sin(n * HASH_PRIME_1 + n * HASH_PRIME_2) * HASH_SCALE;
    return x - Math.floor(x);
  }
  
  /**
   * Verify determinism (for testing)
   */
  verify(nodeId: string, t_bucket: number): boolean {
    const noise1 = this.getNodeNoise(nodeId, t_bucket);
    const noise2 = this.getNodeNoise(nodeId, t_bucket);
    return noise1 === noise2;
  }
}

// ================================================================
// SINGLETON INSTANCE
// ================================================================

export const deterministicSampler = new DeterminismSampler();

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

/**
 * Deterministic lerp (no random)
 */
export function deterministicLerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Deterministic smoothstep
 */
export function deterministicSmoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Deterministic pulse (sin-based)
 */
export function deterministicPulse(t_bucket: number, frequency: number, phase: number = 0): number {
  return Math.sin((t_bucket * frequency + phase) * Math.PI * 2) * 0.5 + 0.5;
}
