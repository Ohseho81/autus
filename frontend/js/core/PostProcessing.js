/**
 * AUTUS Post Processing
 * =====================
 * 
 * Bloom, FXAA, Vignette 등 후처리 효과
 * 
 * Version: 1.0.0
 * Status: PRODUCTION
 */

export class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        this.composer = null;
        this.passes = {};
        this.enabled = true;
        
        this._init();
    }
    
    _init() {
        // EffectComposer 생성
        this.composer = new THREE.EffectComposer(this.renderer);
        
        // Render Pass
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        this.passes.render = renderPass;
        
        // Bloom Pass
        const bloomPass = this._createBloomPass();
        this.composer.addPass(bloomPass);
        this.passes.bloom = bloomPass;
        
        // FXAA Pass (안티앨리어싱)
        const fxaaPass = this._createFXAAPass();
        this.composer.addPass(fxaaPass);
        this.passes.fxaa = fxaaPass;
        
        // Vignette Pass
        const vignettePass = this._createVignettePass();
        this.composer.addPass(vignettePass);
        this.passes.vignette = vignettePass;
    }
    
    _createBloomPass() {
        const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
        const bloomPass = new THREE.UnrealBloomPass(resolution, 1.5, 0.4, 0.85);
        
        // AUTUS 스타일 블룸 설정
        bloomPass.threshold = 0.2;
        bloomPass.strength = 1.2;
        bloomPass.radius = 0.5;
        
        return bloomPass;
    }
    
    _createFXAAPass() {
        const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
        const pixelRatio = this.renderer.getPixelRatio();
        
        fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
        fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
        
        return fxaaPass;
    }
    
    _createVignettePass() {
        const vignetteShader = {
            uniforms: {
                tDiffuse: { value: null },
                offset: { value: 1.0 },
                darkness: { value: 1.2 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float offset;
                uniform float darkness;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    
                    // Vignette
                    vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
                    float vignette = 1.0 - dot(uv, uv);
                    vignette = clamp(pow(vignette, darkness), 0.0, 1.0);
                    
                    // Color grading (사이언 강조)
                    color.rgb = mix(color.rgb, color.rgb * vec3(0.9, 1.0, 1.0), 0.1);
                    
                    gl_FragColor = vec4(color.rgb * vignette, color.a);
                }
            `
        };
        
        const vignettePass = new THREE.ShaderPass(vignetteShader);
        return vignettePass;
    }
    
    /**
     * 블룸 강도 설정
     */
    setBloomStrength(value) {
        if (this.passes.bloom) {
            this.passes.bloom.strength = value;
        }
    }
    
    /**
     * 블룸 반경 설정
     */
    setBloomRadius(value) {
        if (this.passes.bloom) {
            this.passes.bloom.radius = value;
        }
    }
    
    /**
     * Vignette 설정
     */
    setVignette(offset, darkness) {
        if (this.passes.vignette) {
            this.passes.vignette.uniforms.offset.value = offset;
            this.passes.vignette.uniforms.darkness.value = darkness;
        }
    }
    
    /**
     * 물리량에 따른 동적 효과
     */
    updateFromState(state) {
        if (!state?.measure) return;
        
        const { density, stability, sigma } = state.measure;
        
        // Density → Bloom 강도
        const bloomStrength = 0.8 + density * 0.8;
        this.setBloomStrength(bloomStrength);
        
        // Stability → Bloom 반경
        const bloomRadius = 0.3 + stability * 0.4;
        this.setBloomRadius(bloomRadius);
        
        // Sigma → Vignette 어둡기
        const vignetteDarkness = 1.0 + sigma * 0.5;
        this.setVignette(1.0, vignetteDarkness);
    }
    
    /**
     * 리사이즈 처리
     */
    resize(width, height) {
        this.composer.setSize(width, height);
        
        const pixelRatio = this.renderer.getPixelRatio();
        if (this.passes.fxaa) {
            this.passes.fxaa.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
            this.passes.fxaa.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
        }
    }
    
    /**
     * 렌더링
     */
    render() {
        if (this.enabled && this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * 활성화/비활성화
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    dispose() {
        if (this.composer) {
            this.composer.dispose();
        }
    }
}

/**
 * Three.js 후처리 모듈 로더
 * CDN에서 로드하거나 번들에 포함
 */
export function loadPostProcessingModules() {
    return new Promise((resolve, reject) => {
        // 이미 로드되었는지 확인
        if (THREE.EffectComposer) {
            resolve();
            return;
        }
        
        // CDN에서 로드
        const scripts = [
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js',
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js',
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js',
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js',
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js',
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js',
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/FXAAShader.js'
        ];
        
        let loaded = 0;
        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loaded++;
                if (loaded === scripts.length) {
                    resolve();
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    });
}

export default PostProcessing;





