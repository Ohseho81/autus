/**
 * AUTUS DeterminismSampler — A-5
 * 결정론적 샘플링 (t_bucket + hash seed)
 * 
 * 동일 입력 → 동일 출력을 보장하는 결정론적 난수/샘플링 시스템
 */

/**
 * 시간 버킷 크기 (밀리초)
 * 같은 버킷 내에서는 동일한 시드가 생성됨
 */
export const TIME_BUCKET_MS = 16; // ~60fps

/**
 * SHA256 해시 (간소화 버전)
 * 브라우저 환경에서 결정론적 해시 생성
 */
export async function sha256(message) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback: 간단한 해시
    return simpleHash(message);
}

/**
 * 동기식 간단한 해시 (fallback)
 */
export function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * 시간 버킷 계산
 * @param {number} t_ms - 타임스탬프 (밀리초)
 * @returns {number} 버킷 인덱스
 */
export function getTimeBucket(t_ms) {
    return Math.floor(t_ms / TIME_BUCKET_MS);
}

/**
 * 결정론적 시드 생성
 * @param {string} sessionId - 세션 ID
 * @param {number} t_ms - 타임스탬프
 * @param {string} context - 추가 컨텍스트 (예: 'particle', 'noise')
 * @returns {number} 결정론적 시드 값
 */
export function generateSeed(sessionId, t_ms, context = '') {
    const bucket = getTimeBucket(t_ms);
    const seedString = `${sessionId}:${bucket}:${context}`;
    const hash = simpleHash(seedString);
    return parseInt(hash, 16);
}

/**
 * 결정론적 난수 생성기 클래스
 */
export class DeterministicRandom {
    constructor(seed) {
        this.seed = seed;
        this.state = seed;
    }
    
    /**
     * 다음 난수 생성 (0~1)
     * Mulberry32 알고리즘
     */
    next() {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    
    /**
     * 범위 내 난수
     */
    range(min, max) {
        return min + this.next() * (max - min);
    }
    
    /**
     * 정수 난수
     */
    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }
    
    /**
     * 배열에서 랜덤 선택
     */
    pick(array) {
        return array[this.int(0, array.length - 1)];
    }
    
    /**
     * 배열 셔플 (Fisher-Yates)
     */
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.int(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
    
    /**
     * 가우시안 분포
     */
    gaussian(mean = 0, stddev = 1) {
        const u1 = this.next();
        const u2 = this.next();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z * stddev;
    }
}

/**
 * 결정론적 노이즈 생성기
 */
export class DeterministicNoise {
    constructor(seed) {
        this.rng = new DeterministicRandom(seed);
        this.permutation = this._generatePermutation();
    }
    
    _generatePermutation() {
        const p = [];
        for (let i = 0; i < 256; i++) p[i] = i;
        
        // Fisher-Yates shuffle with deterministic RNG
        for (let i = 255; i > 0; i--) {
            const j = this.rng.int(0, i);
            [p[i], p[j]] = [p[j], p[i]];
        }
        
        // 복제하여 512 길이로
        return [...p, ...p];
    }
    
    _fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    _grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    /**
     * 3D Perlin 노이즈
     */
    noise3D(x, y, z) {
        const p = this.permutation;
        
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        const u = this._fade(x);
        const v = this._fade(y);
        const w = this._fade(z);
        
        const A = p[X] + Y;
        const AA = p[A] + Z;
        const AB = p[A + 1] + Z;
        const B = p[X + 1] + Y;
        const BA = p[B] + Z;
        const BB = p[B + 1] + Z;
        
        return this._lerp(w,
            this._lerp(v,
                this._lerp(u, this._grad(p[AA], x, y, z), this._grad(p[BA], x - 1, y, z)),
                this._lerp(u, this._grad(p[AB], x, y - 1, z), this._grad(p[BB], x - 1, y - 1, z))
            ),
            this._lerp(v,
                this._lerp(u, this._grad(p[AA + 1], x, y, z - 1), this._grad(p[BA + 1], x - 1, y, z - 1)),
                this._lerp(u, this._grad(p[AB + 1], x, y - 1, z - 1), this._grad(p[BB + 1], x - 1, y - 1, z - 1))
            )
        );
    }
    
    _lerp(t, a, b) {
        return a + t * (b - a);
    }
    
    /**
     * Fractal Brownian Motion (FBM)
     */
    fbm(x, y, z, octaves = 4, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            total += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return total / maxValue;
    }
}

/**
 * 파티클 샘플러 - 결정론적 파티클 위치/속도 생성
 */
export class ParticleSampler {
    constructor(sessionId, particleCount) {
        this.sessionId = sessionId;
        this.particleCount = particleCount;
        this.rng = null;
        this.noise = null;
    }
    
    /**
     * 시간 버킷에 맞춰 샘플러 초기화
     */
    initForTime(t_ms) {
        const seed = generateSeed(this.sessionId, t_ms, 'particle');
        this.rng = new DeterministicRandom(seed);
        this.noise = new DeterministicNoise(seed);
    }
    
    /**
     * 파티클 초기 위치 생성
     */
    generatePositions(fieldSize) {
        const positions = new Float32Array(this.particleCount * 3);
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = this.rng.range(-fieldSize.x / 2, fieldSize.x / 2);
            positions[i3 + 1] = this.rng.range(-fieldSize.y / 2, fieldSize.y / 2);
            positions[i3 + 2] = this.rng.range(-fieldSize.z / 2, fieldSize.z / 2);
        }
        
        return positions;
    }
    
    /**
     * 파티클 초기 속도 생성
     */
    generateVelocities(maxSpeed = 0.02) {
        const velocities = new Float32Array(this.particleCount * 3);
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            velocities[i3] = this.rng.range(-maxSpeed, maxSpeed);
            velocities[i3 + 1] = this.rng.range(-maxSpeed, maxSpeed);
            velocities[i3 + 2] = this.rng.range(-maxSpeed / 2, maxSpeed / 2);
        }
        
        return velocities;
    }
    
    /**
     * 노이즈 기반 변위 계산
     */
    getNoiseDisplacement(x, y, z, time, amplitude) {
        return this.noise.fbm(x * 0.5, y * 0.5, z * 0.5 + time * 0.1) * amplitude;
    }
}

/**
 * 리플레이 검증기 - 상태 해시 비교
 */
export class ReplayVerifier {
    constructor() {
        this.hashCache = new Map();
    }
    
    /**
     * 상태의 결정론적 해시 계산
     */
    async computeStateHash(state) {
        // 결정론적 JSON 직렬화
        const canonical = this._canonicalJson(state);
        return await sha256(canonical);
    }
    
    /**
     * 캐노니컬 JSON (정렬된 키)
     */
    _canonicalJson(obj) {
        if (obj === null || typeof obj !== 'object') {
            return JSON.stringify(obj);
        }
        
        if (Array.isArray(obj)) {
            return '[' + obj.map(v => this._canonicalJson(v)).join(',') + ']';
        }
        
        const keys = Object.keys(obj).sort();
        const pairs = keys.map(k => `"${k}":${this._canonicalJson(obj[k])}`);
        return '{' + pairs.join(',') + '}';
    }
    
    /**
     * 해시 비교
     */
    async verify(state1, state2) {
        const hash1 = await this.computeStateHash(state1);
        const hash2 = await this.computeStateHash(state2);
        return hash1 === hash2;
    }
}

export default {
    TIME_BUCKET_MS,
    sha256,
    simpleHash,
    getTimeBucket,
    generateSeed,
    DeterministicRandom,
    DeterministicNoise,
    ParticleSampler,
    ReplayVerifier
};





