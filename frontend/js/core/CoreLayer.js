/**
 * AUTUS CoreLayer — A-1
 * 중앙 구형 Mesh + 글로우 렌더링
 * 
 * 물리량 매핑:
 * - Density → 밝기 (opacity, emissive)
 * - Stability → 맥동 주기 (pulse frequency)
 * - Entropy(σ) → 표면 노이즈 (jitter amplitude)
 */

export class CoreLayer {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            baseRadius: options.baseRadius || 1.3,
            baseColor: options.baseColor || 0x00f0ff,
            glowColor: options.glowColor || 0x88ffff,
            segments: options.segments || 64,
            ...options
        };
        
        this.meshes = {};
        this.uniforms = {
            density: 0.5,
            stability: 0.5,
            sigma: 0.3,
            time: 0
        };
        
        this._createCore();
        this._createGlow();
        this._createRim();
    }
    
    /**
     * 내부 코어 구체 생성
     */
    _createCore() {
        const { baseRadius, baseColor, segments } = this.options;
        
        // 외부 코어 (반투명)
        const coreGeometry = new THREE.SphereGeometry(baseRadius, segments, segments);
        const coreMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(baseColor) },
                uDensity: { value: this.uniforms.density },
                uTime: { value: 0 },
                uSigma: { value: this.uniforms.sigma }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uSigma;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                // 결정론적 노이즈 함수
                float hash(vec3 p) {
                    p = fract(p * 0.3183099 + 0.1);
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }
                
                float noise(vec3 p) {
                    vec3 i = floor(p);
                    vec3 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(
                        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
                    );
                }
                
                void main() {
                    vNormal = normal;
                    vPosition = position;
                    
                    // Entropy(σ)에 따른 표면 노이즈
                    float noiseVal = noise(position * 3.0 + uTime * 0.5) * uSigma * 0.1;
                    vec3 displaced = position + normal * noiseVal;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uDensity;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    // Fresnel 효과
                    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
                    
                    // Density에 따른 밝기
                    float brightness = 0.15 + uDensity * 0.35;
                    
                    vec3 color = uColor * brightness;
                    color += uColor * fresnel * 0.3;
                    
                    gl_FragColor = vec4(color, 0.25 + uDensity * 0.2);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.meshes.core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.scene.add(this.meshes.core);
        
        // 내부 코어 (더 밝음)
        const innerGeometry = new THREE.SphereGeometry(baseRadius * 0.85, segments, segments);
        const innerMaterial = new THREE.MeshBasicMaterial({
            color: this.options.glowColor,
            transparent: true,
            opacity: 0.4
        });
        
        this.meshes.inner = new THREE.Mesh(innerGeometry, innerMaterial);
        this.scene.add(this.meshes.inner);
    }
    
    /**
     * 글로우 효과 생성
     */
    _createGlow() {
        const { baseRadius, baseColor } = this.options;
        
        // 외부 글로우 (스프라이트)
        const glowGeometry = new THREE.SphereGeometry(baseRadius * 1.5, 32, 32);
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(baseColor) },
                uDensity: { value: this.uniforms.density }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uDensity;
                varying vec3 vNormal;
                
                void main() {
                    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    float alpha = intensity * (0.1 + uDensity * 0.15);
                    gl_FragColor = vec4(uColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.meshes.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.scene.add(this.meshes.glow);
    }
    
    /**
     * 테두리 링 생성
     */
    _createRim() {
        const { baseRadius, baseColor } = this.options;
        
        const rimGeometry = new THREE.RingGeometry(baseRadius - 0.02, baseRadius + 0.02, 128);
        const rimMaterial = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        this.meshes.rim = new THREE.Mesh(rimGeometry, rimMaterial);
        this.scene.add(this.meshes.rim);
    }
    
    /**
     * 물리량 업데이트
     * @param {Object} measure - { density, stability, sigma }
     */
    updateMeasure(measure) {
        if (measure.density !== undefined) {
            this.uniforms.density = measure.density;
        }
        if (measure.stability !== undefined) {
            this.uniforms.stability = measure.stability;
        }
        if (measure.sigma !== undefined) {
            this.uniforms.sigma = measure.sigma;
        }
        
        // Shader uniform 업데이트
        if (this.meshes.core?.material?.uniforms) {
            this.meshes.core.material.uniforms.uDensity.value = this.uniforms.density;
            this.meshes.core.material.uniforms.uSigma.value = this.uniforms.sigma;
        }
        if (this.meshes.glow?.material?.uniforms) {
            this.meshes.glow.material.uniforms.uDensity.value = this.uniforms.density;
        }
        
        // Inner core 밝기 조정
        if (this.meshes.inner) {
            this.meshes.inner.material.opacity = 0.3 + this.uniforms.density * 0.3;
        }
    }
    
    /**
     * 애니메이션 프레임 업데이트
     * @param {number} deltaTime - 프레임 간 시간 (초)
     */
    update(deltaTime) {
        this.uniforms.time += deltaTime;
        
        // Shader time uniform 업데이트
        if (this.meshes.core?.material?.uniforms) {
            this.meshes.core.material.uniforms.uTime.value = this.uniforms.time;
        }
        
        // Stability에 따른 맥동 주기
        // 높은 Stability = 느리고 안정적인 맥동
        // 낮은 Stability = 빠르고 불안정한 맥동
        const pulseFreq = 0.6 + (1 - this.uniforms.stability) * 1.0; // 0.6 ~ 1.6 Hz
        const pulse = 1 + Math.sin(this.uniforms.time * pulseFreq * Math.PI * 2) * 0.015;
        
        // 스케일 적용
        this.meshes.core?.scale.set(pulse, pulse, pulse);
        this.meshes.inner?.scale.set(pulse * 0.98, pulse * 0.98, pulse * 0.98);
        this.meshes.glow?.scale.set(pulse * 1.02, pulse * 1.02, pulse * 1.02);
        
        // 느린 회전
        if (this.meshes.core) this.meshes.core.rotation.y += deltaTime * 0.1;
        if (this.meshes.inner) this.meshes.inner.rotation.y += deltaTime * 0.15;
    }
    
    /**
     * 모드 전환 (SIM/LIVE)
     * @param {string} mode - 'SIM' 또는 'LIVE'
     */
    setMode(mode) {
        const isSim = mode === 'SIM';
        
        // SIM 모드: 점선 테두리, 낮은 불투명도
        if (this.meshes.rim) {
            this.meshes.rim.material.opacity = isSim ? 0.5 : 0.9;
            // 점선 효과는 별도 처리 필요
        }
    }
    
    /**
     * 리소스 정리
     */
    dispose() {
        Object.values(this.meshes).forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (mesh.material.uniforms) {
                    // Shader material
                }
                mesh.material.dispose();
            }
            this.scene.remove(mesh);
        });
        this.meshes = {};
    }
}

export default CoreLayer;





