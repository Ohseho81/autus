/**
 * AUTUS FlowLayer — A-3
 * Points 파티클 시스템
 * 
 * 물리량 매핑:
 * - Energy → 파티클 밝기/속도
 * - Flow → 파티클 방향성
 * - Leak → 파티클 소멸률
 */

export class FlowLayer {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            particleCount: options.particleCount || 1500,
            fieldSize: options.fieldSize || { x: 15, y: 12, z: 8 },
            baseColor: options.baseColor || 0x00f0ff,
            baseSize: options.baseSize || 0.025,
            ...options
        };
        
        this.uniforms = {
            energy: 0.5,
            flow: 0.5,
            leak: 0.1,
            time: 0
        };
        
        this.particles = null;
        this.velocities = null;
        
        this._createParticles();
    }
    
    /**
     * 파티클 시스템 생성
     */
    _createParticles() {
        const { particleCount, fieldSize, baseColor, baseSize } = this.options;
        
        // 위치 배열
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        this.velocities = new Float32Array(particleCount * 3);
        
        const color = new THREE.Color(baseColor);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // 초기 위치 (결정론적 분포)
            positions[i3] = (this._deterministicRandom(i * 3) - 0.5) * fieldSize.x;
            positions[i3 + 1] = (this._deterministicRandom(i * 3 + 1) - 0.5) * fieldSize.y;
            positions[i3 + 2] = (this._deterministicRandom(i * 3 + 2) - 0.5) * fieldSize.z;
            
            // 색상
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            // 크기 (약간의 변화)
            sizes[i] = baseSize * (0.5 + this._deterministicRandom(i) * 1.0);
            
            // 초기 속도
            this.velocities[i3] = (this._deterministicRandom(i * 7) - 0.5) * 0.02;
            this.velocities[i3 + 1] = (this._deterministicRandom(i * 7 + 1) - 0.5) * 0.02;
            this.velocities[i3 + 2] = (this._deterministicRandom(i * 7 + 2) - 0.5) * 0.01;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uEnergy: { value: this.uniforms.energy },
                uBaseSize: { value: baseSize }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                
                uniform float uTime;
                uniform float uEnergy;
                uniform float uBaseSize;
                
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    vColor = color;
                    
                    // Energy에 따른 밝기
                    vAlpha = 0.3 + uEnergy * 0.4;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // 거리에 따른 크기 조정
                    gl_PointSize = size * (300.0 / -mvPosition.z) * (0.8 + uEnergy * 0.4);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    // 원형 파티클
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    float alpha = vAlpha * (1.0 - dist * 2.0);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }
    
    /**
     * 결정론적 난수 생성 (seed 기반)
     */
    _deterministicRandom(seed) {
        const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
        return x - Math.floor(x);
    }
    
    /**
     * 물리량 업데이트
     * @param {Object} measure - { energy, flow, leak }
     */
    updateMeasure(measure) {
        if (measure.energy !== undefined || measure.E !== undefined) {
            this.uniforms.energy = measure.energy ?? measure.E;
        }
        if (measure.flow !== undefined) {
            this.uniforms.flow = measure.flow;
        }
        if (measure.leak !== undefined) {
            this.uniforms.leak = measure.leak;
        }
        
        // Shader uniform 업데이트
        if (this.particles?.material?.uniforms) {
            this.particles.material.uniforms.uEnergy.value = this.uniforms.energy;
        }
    }
    
    /**
     * 애니메이션 프레임 업데이트
     */
    update(deltaTime) {
        this.uniforms.time += deltaTime;
        
        if (!this.particles) return;
        
        const positions = this.particles.geometry.attributes.position.array;
        const { fieldSize } = this.options;
        const { energy, flow, leak } = this.uniforms;
        
        // 파티클 이동
        for (let i = 0; i < positions.length; i += 3) {
            const idx = i / 3;
            
            // 속도 적용 (Energy에 따른 속도 변화)
            const speedMult = 0.5 + energy * 1.0;
            positions[i] += this.velocities[i] * speedMult;
            positions[i + 1] += this.velocities[i + 1] * speedMult;
            positions[i + 2] += this.velocities[i + 2] * speedMult;
            
            // 중심으로의 인력 (Flow에 따른 방향성)
            const dx = -positions[i] * 0.001 * flow;
            const dy = -positions[i + 1] * 0.001 * flow;
            const dz = -positions[i + 2] * 0.001 * flow;
            
            this.velocities[i] += dx;
            this.velocities[i + 1] += dy;
            this.velocities[i + 2] += dz;
            
            // 속도 감쇠
            this.velocities[i] *= 0.99;
            this.velocities[i + 1] *= 0.99;
            this.velocities[i + 2] *= 0.99;
            
            // 경계 체크 및 재배치 (Leak에 따른 소멸/재생성)
            const shouldRespawn = 
                Math.abs(positions[i]) > fieldSize.x / 2 ||
                Math.abs(positions[i + 1]) > fieldSize.y / 2 ||
                Math.abs(positions[i + 2]) > fieldSize.z / 2 ||
                this._deterministicRandom(idx + this.uniforms.time * 1000) < leak * 0.01;
            
            if (shouldRespawn) {
                // 결정론적 재배치
                const seed = idx + Math.floor(this.uniforms.time * 100);
                positions[i] = (this._deterministicRandom(seed * 3) - 0.5) * fieldSize.x;
                positions[i + 1] = (this._deterministicRandom(seed * 3 + 1) - 0.5) * fieldSize.y;
                positions[i + 2] = (this._deterministicRandom(seed * 3 + 2) - 0.5) * fieldSize.z;
                
                this.velocities[i] = (this._deterministicRandom(seed * 7) - 0.5) * 0.02;
                this.velocities[i + 1] = (this._deterministicRandom(seed * 7 + 1) - 0.5) * 0.02;
                this.velocities[i + 2] = (this._deterministicRandom(seed * 7 + 2) - 0.5) * 0.01;
            }
        }
        
        this.particles.geometry.attributes.position.needsUpdate = true;
        
        // Shader time uniform 업데이트
        if (this.particles.material.uniforms) {
            this.particles.material.uniforms.uTime.value = this.uniforms.time;
        }
        
        // 전체 시스템 느린 회전
        this.particles.rotation.y += deltaTime * 0.02;
    }
    
    /**
     * 가시성 설정
     */
    setVisible(visible) {
        if (this.particles) {
            this.particles.visible = visible;
        }
    }
    
    /**
     * 리소스 정리
     */
    dispose() {
        if (this.particles) {
            this.particles.geometry.dispose();
            this.particles.material.dispose();
            this.scene.remove(this.particles);
            this.particles = null;
        }
        this.velocities = null;
    }
}

export default FlowLayer;





