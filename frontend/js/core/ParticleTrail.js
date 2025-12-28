/**
 * AUTUS Particle Trail System
 * ===========================
 * 
 * 고급 파티클 트레일 효과
 * 
 * Version: 1.0.0
 * Status: PRODUCTION
 */

export class ParticleTrail {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            count: options.count || 500,
            size: options.size || 0.03,
            color: options.color || 0x00f0ff,
            trailLength: options.trailLength || 20,
            speed: options.speed || 0.5,
            spread: options.spread || 3,
            ...options
        };
        
        this.particles = null;
        this.trails = [];
        this.time = 0;
        
        this._init();
    }
    
    _init() {
        this._createParticles();
        this._createTrailSystem();
    }
    
    /**
     * 메인 파티클 생성
     */
    _createParticles() {
        const { count, size, color, spread } = this.options;
        
        // Geometry
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const lifetimes = new Float32Array(count);
        
        const baseColor = new THREE.Color(color);
        
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            
            // 초기 위치 (구형 분포)
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = spread * (0.5 + Math.random() * 0.5);
            
            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);
            
            // 속도 (중심 방향으로)
            const dirX = -positions[i3] * 0.1;
            const dirY = -positions[i3 + 1] * 0.1;
            const dirZ = -positions[i3 + 2] * 0.1;
            
            velocities[i3] = dirX + (Math.random() - 0.5) * 0.02;
            velocities[i3 + 1] = dirY + (Math.random() - 0.5) * 0.02;
            velocities[i3 + 2] = dirZ + (Math.random() - 0.5) * 0.02;
            
            // 색상 변화
            const hueShift = Math.random() * 0.1;
            const shiftedColor = baseColor.clone().offsetHSL(hueShift, 0, 0);
            colors[i3] = shiftedColor.r;
            colors[i3 + 1] = shiftedColor.g;
            colors[i3 + 2] = shiftedColor.b;
            
            // 크기 변화
            sizes[i] = size * (0.5 + Math.random());
            
            // 라이프타임
            lifetimes[i] = Math.random();
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        
        // Shader Material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uEnergy: { value: 0.5 },
                uFlow: { value: 0.5 },
                uPixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uEnergy;
                uniform float uPixelRatio;
                
                attribute vec3 velocity;
                attribute float size;
                attribute float lifetime;
                
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    vColor = color;
                    
                    // 라이프타임 기반 알파
                    float life = mod(lifetime + uTime * 0.1, 1.0);
                    vAlpha = sin(life * 3.14159) * uEnergy;
                    
                    // 위치 업데이트
                    vec3 pos = position + velocity * uTime * 10.0;
                    
                    // 중심으로 끌림
                    float dist = length(pos);
                    if (dist > 0.1) {
                        pos -= normalize(pos) * uTime * 0.5;
                    }
                    
                    // 회전
                    float angle = uTime * 0.2;
                    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                    pos.xz = rot * pos.xz;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    
                    // 크기 (거리에 따라)
                    gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z) * (0.5 + uEnergy * 0.5);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    // 원형 파티클
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    
                    if (dist > 0.5) discard;
                    
                    // 부드러운 가장자리
                    float alpha = vAlpha * (1.0 - dist * 2.0);
                    alpha = clamp(alpha, 0.0, 1.0);
                    
                    // 글로우 효과
                    vec3 glow = vColor * (1.0 + (1.0 - dist * 2.0) * 0.5);
                    
                    gl_FragColor = vec4(glow, alpha);
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
     * 트레일 시스템 생성
     */
    _createTrailSystem() {
        const { trailLength, color } = this.options;
        const trailCount = 8;
        
        for (let i = 0; i < trailCount; i++) {
            const points = [];
            const angle = (i / trailCount) * Math.PI * 2;
            
            for (let j = 0; j < trailLength; j++) {
                const t = j / trailLength;
                const r = 1.5 + t * 1.5;
                points.push(new THREE.Vector3(
                    Math.cos(angle + t * 2) * r,
                    (Math.random() - 0.5) * 0.5,
                    Math.sin(angle + t * 2) * r
                ));
            }
            
            const curve = new THREE.CatmullRomCurve3(points);
            const geometry = new THREE.TubeGeometry(curve, trailLength * 2, 0.02, 8, false);
            
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(color) },
                    uAlpha: { value: 0.5 }
                },
                vertexShader: `
                    varying float vProgress;
                    varying vec3 vPosition;
                    
                    void main() {
                        vPosition = position;
                        vProgress = uv.x;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float uTime;
                    uniform vec3 uColor;
                    uniform float uAlpha;
                    
                    varying float vProgress;
                    varying vec3 vPosition;
                    
                    void main() {
                        // 흐르는 효과
                        float flow = fract(vProgress - uTime * 0.5);
                        float alpha = flow * uAlpha * (1.0 - vProgress);
                        
                        gl_FragColor = vec4(uColor, alpha);
                    }
                `,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });
            
            const trail = new THREE.Mesh(geometry, material);
            trail.userData.baseAngle = angle;
            this.trails.push(trail);
            this.scene.add(trail);
        }
    }
    
    /**
     * 업데이트
     */
    update(deltaTime, state = {}) {
        this.time += deltaTime;
        
        const energy = state?.measure?.E || 0.5;
        const flow = 0.5;
        
        // 파티클 업데이트
        if (this.particles) {
            this.particles.material.uniforms.uTime.value = this.time;
            this.particles.material.uniforms.uEnergy.value = energy;
            this.particles.material.uniforms.uFlow.value = flow;
            
            // 전체 회전
            this.particles.rotation.y = this.time * 0.1;
        }
        
        // 트레일 업데이트
        this.trails.forEach((trail, i) => {
            trail.material.uniforms.uTime.value = this.time;
            trail.material.uniforms.uAlpha.value = 0.3 + energy * 0.4;
            
            // 개별 회전
            trail.rotation.y = this.time * 0.2 + trail.userData.baseAngle;
            trail.rotation.x = Math.sin(this.time * 0.5 + i) * 0.1;
        });
    }
    
    /**
     * 물리량 업데이트
     */
    updateFromState(state) {
        if (!state?.measure) return;
        
        const { E, sigma } = state.measure;
        
        // 파티클 수 조절 (성능)
        // Energy가 높을수록 더 많은 파티클 활성화
        
        // 트레일 알파 조절
        this.trails.forEach(trail => {
            trail.material.uniforms.uAlpha.value = 0.3 + E * 0.5 - sigma * 0.2;
        });
    }
    
    /**
     * 버스트 효과
     */
    burst(position, color = 0x00f0ff, count = 50) {
        const burstGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;
            
            // 랜덤 방향 속도
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = 0.5 + Math.random() * 0.5;
            
            velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
            velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
            velocities[i3 + 2] = Math.cos(phi) * speed;
        }
        
        burstGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        burstGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const burstMaterial = new THREE.PointsMaterial({
            color: color,
            size: 0.05,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const burst = new THREE.Points(burstGeometry, burstMaterial);
        this.scene.add(burst);
        
        // 애니메이션
        const startTime = performance.now();
        const duration = 1000;
        
        const animateBurst = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const posAttr = burstGeometry.getAttribute('position');
                const velAttr = burstGeometry.getAttribute('velocity');
                
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    posAttr.array[i3] += velAttr.array[i3] * 0.02;
                    posAttr.array[i3 + 1] += velAttr.array[i3 + 1] * 0.02;
                    posAttr.array[i3 + 2] += velAttr.array[i3 + 2] * 0.02;
                }
                
                posAttr.needsUpdate = true;
                burstMaterial.opacity = 1 - progress;
                
                requestAnimationFrame(animateBurst);
            } else {
                this.scene.remove(burst);
                burstGeometry.dispose();
                burstMaterial.dispose();
            }
        };
        
        requestAnimationFrame(animateBurst);
    }
    
    /**
     * 가시성
     */
    setVisible(visible) {
        if (this.particles) {
            this.particles.visible = visible;
        }
        this.trails.forEach(trail => {
            trail.visible = visible;
        });
    }
    
    /**
     * 정리
     */
    dispose() {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
        
        this.trails.forEach(trail => {
            this.scene.remove(trail);
            trail.geometry.dispose();
            trail.material.dispose();
        });
        
        this.trails = [];
    }
}

export default ParticleTrail;





