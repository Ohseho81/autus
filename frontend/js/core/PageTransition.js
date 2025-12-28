/**
 * AUTUS Page Transition
 * =====================
 * 
 * 3페이지 간 부드러운 전환 애니메이션
 * 
 * Version: 1.0.0
 * Status: PRODUCTION
 */

export class PageTransition {
    constructor(options = {}) {
        this.duration = options.duration || 600;
        this.easing = options.easing || 'easeInOutCubic';
        
        this.currentPage = 1;
        this.isTransitioning = false;
        
        // 페이지별 카메라 설정
        this.cameraConfigs = {
            1: { position: { x: 0, y: 0, z: 5 }, lookAt: { x: 0, y: 0, z: 0 } },
            2: { position: { x: 0, y: 1.5, z: 6 }, lookAt: { x: 0, y: 0, z: 0 } },
            3: { position: { x: 0, y: -0.5, z: 4.5 }, lookAt: { x: 0, y: 0, z: 0 } }
        };
        
        // 페이지별 레이어 가시성
        this.layerVisibility = {
            1: { core: true, graph: false, mandala: false, flow: true },
            2: { core: false, graph: true, mandala: false, flow: true },
            3: { core: true, graph: false, mandala: true, flow: false }
        };
        
        this.callbacks = {
            onStart: null,
            onProgress: null,
            onComplete: null
        };
    }
    
    /**
     * 이징 함수
     */
    _ease(t) {
        switch (this.easing) {
            case 'easeInOutCubic':
                return t < 0.5 
                    ? 4 * t * t * t 
                    : 1 - Math.pow(-2 * t + 2, 3) / 2;
            case 'easeOutExpo':
                return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            case 'easeInOutQuart':
                return t < 0.5 
                    ? 8 * t * t * t * t 
                    : 1 - Math.pow(-2 * t + 2, 4) / 2;
            default:
                return t;
        }
    }
    
    /**
     * 선형 보간
     */
    _lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * 페이지 전환
     */
    transitionTo(targetPage, camera, layers, onComplete) {
        if (this.isTransitioning) return;
        if (targetPage === this.currentPage) return;
        if (targetPage < 1 || targetPage > 3) return;
        
        this.isTransitioning = true;
        
        const fromPage = this.currentPage;
        const fromConfig = this.cameraConfigs[fromPage];
        const toConfig = this.cameraConfigs[targetPage];
        
        const startTime = performance.now();
        const startPos = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
        };
        
        // 콜백
        if (this.callbacks.onStart) {
            this.callbacks.onStart(fromPage, targetPage);
        }
        
        // 레이어 페이드 아웃
        this._fadeOutLayers(layers, fromPage);
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / this.duration, 1);
            const easedProgress = this._ease(progress);
            
            // 카메라 위치 보간
            camera.position.x = this._lerp(startPos.x, toConfig.position.x, easedProgress);
            camera.position.y = this._lerp(startPos.y, toConfig.position.y, easedProgress);
            camera.position.z = this._lerp(startPos.z, toConfig.position.z, easedProgress);
            
            // 콜백
            if (this.callbacks.onProgress) {
                this.callbacks.onProgress(progress, easedProgress);
            }
            
            // 중간 지점에서 레이어 전환
            if (progress >= 0.5 && this._pendingLayerSwitch) {
                this._switchLayers(layers, targetPage);
                this._pendingLayerSwitch = false;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 완료
                this.currentPage = targetPage;
                this.isTransitioning = false;
                this._fadeInLayers(layers, targetPage);
                
                if (this.callbacks.onComplete) {
                    this.callbacks.onComplete(targetPage);
                }
                
                if (onComplete) {
                    onComplete(targetPage);
                }
            }
        };
        
        this._pendingLayerSwitch = true;
        requestAnimationFrame(animate);
    }
    
    /**
     * 레이어 페이드 아웃
     */
    _fadeOutLayers(layers, page) {
        const visibility = this.layerVisibility[page];
        
        Object.keys(layers).forEach(key => {
            const layer = layers[key];
            if (!layer) return;
            
            if (visibility[key] && layer.group) {
                this._animateOpacity(layer.group, 1, 0, this.duration / 2);
            }
        });
    }
    
    /**
     * 레이어 전환
     */
    _switchLayers(layers, targetPage) {
        const visibility = this.layerVisibility[targetPage];
        
        Object.keys(layers).forEach(key => {
            const layer = layers[key];
            if (!layer || !layer.group) return;
            
            layer.group.visible = visibility[key];
            if (visibility[key]) {
                this._setGroupOpacity(layer.group, 0);
            }
        });
    }
    
    /**
     * 레이어 페이드 인
     */
    _fadeInLayers(layers, targetPage) {
        const visibility = this.layerVisibility[targetPage];
        
        Object.keys(layers).forEach(key => {
            const layer = layers[key];
            if (!layer || !layer.group) return;
            
            if (visibility[key]) {
                layer.group.visible = true;
                this._animateOpacity(layer.group, 0, 1, this.duration / 2);
            }
        });
    }
    
    /**
     * 불투명도 애니메이션
     */
    _animateOpacity(group, from, to, duration) {
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const opacity = this._lerp(from, to, this._ease(progress));
            
            this._setGroupOpacity(group, opacity);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * 그룹 불투명도 설정
     */
    _setGroupOpacity(group, opacity) {
        group.traverse(child => {
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.transparent = true;
                        mat.opacity = opacity * (mat.userData.baseOpacity || 1);
                    });
                } else {
                    child.material.transparent = true;
                    child.material.opacity = opacity * (child.material.userData?.baseOpacity || 1);
                }
            }
        });
    }
    
    /**
     * 콜백 설정
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
        return this;
    }
    
    /**
     * 다음 페이지로
     */
    next(camera, layers, onComplete) {
        const next = this.currentPage < 3 ? this.currentPage + 1 : 1;
        this.transitionTo(next, camera, layers, onComplete);
    }
    
    /**
     * 이전 페이지로
     */
    prev(camera, layers, onComplete) {
        const prev = this.currentPage > 1 ? this.currentPage - 1 : 3;
        this.transitionTo(prev, camera, layers, onComplete);
    }
    
    /**
     * 현재 페이지
     */
    getCurrentPage() {
        return this.currentPage;
    }
    
    /**
     * 전환 중인지
     */
    isInTransition() {
        return this.isTransitioning;
    }
}

/**
 * 햅틱 피드백 (전환 시)
 */
export function triggerTransitionHaptic() {
    if ('vibrate' in navigator) {
        navigator.vibrate([20, 10, 20]);
    }
}

/**
 * 페이지 전환 사운드 (선택적)
 */
export function playTransitionSound(type = 'whoosh') {
    // Web Audio API로 간단한 사운드 생성
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.frequency.value = type === 'whoosh' ? 200 : 400;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
        // Audio not available
    }
}

export default PageTransition;





