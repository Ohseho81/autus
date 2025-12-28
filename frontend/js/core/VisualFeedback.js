/**
 * AUTUS Visual Feedback System (LOCK)
 * ====================================
 * 
 * 물리적 변곡점에서 시각/촉각 피드백 제공
 * 
 * 기능:
 * - 실선/점선 구분 (SIM/LIVE)
 * - 물리적 변곡점 애니메이션
 * - 햅틱 피드백 (지원 기기)
 * - 페이지 전환 트랜지션
 * 
 * Version: 1.0.0
 * Status: LOCKED
 */

// ================================================================
// VISUAL TOKENS (spec/tokens.autus.json 기반)
// ================================================================

const TOKENS = {
    colors: {
        bg_base: '#050608',
        core_glow: '#FFFFFF',
        cyan_primary: '#00F0FF',
        cyan_bright: '#00FFFF',
        red_alert: '#FF3030',
        yellow_warning: '#FFD700',
        green_success: '#00FF88',
        sim_dashed: '#00F0FF',
        live_solid: '#FFFFFF'
    },
    motion: {
        transition_ms: 300,
        pulse_hz_min: 0.5,
        pulse_hz_max: 2.0,
        lerp_alpha: 0.08
    },
    thresholds: {
        density_high: 0.9,
        stability_high: 0.8,
        p_outcome_high: 0.7,
        sigma_low: 0.2
    }
};

// ================================================================
// LINE STYLE CONTROLLER
// ================================================================

/**
 * SIM/LIVE 모드에 따른 라인 스타일 반환
 */
export function getLineStyle(mode) {
    if (mode === 'SIM') {
        return {
            color: TOKENS.colors.sim_dashed,
            dashArray: [10, 5],  // 점선
            dashOffset: 0,
            opacity: 0.7,
            lineWidth: 1.5
        };
    } else {
        return {
            color: TOKENS.colors.live_solid,
            dashArray: [],  // 실선
            dashOffset: 0,
            opacity: 1.0,
            lineWidth: 2.0
        };
    }
}

/**
 * Three.js LineMaterial 설정 업데이트
 */
export function updateLineMaterial(material, mode) {
    const style = getLineStyle(mode);
    
    if (material.uniforms) {
        material.uniforms.dashSize.value = style.dashArray[0] || 0;
        material.uniforms.gapSize.value = style.dashArray[1] || 0;
        material.uniforms.opacity.value = style.opacity;
    }
    
    material.color?.setStyle?.(style.color);
    material.linewidth = style.lineWidth;
    material.transparent = true;
    material.needsUpdate = true;
}

// ================================================================
// MILESTONE EFFECTS
// ================================================================

/**
 * 물리적 변곡점 체크
 */
export function checkMilestone(measure, forecast) {
    const { density, stability, sigma } = measure || {};
    const { P_outcome } = forecast || {};
    
    const milestones = [];
    
    if (density >= TOKENS.thresholds.density_high) {
        milestones.push({ type: 'DENSITY_HIGH', value: density, color: TOKENS.colors.green_success });
    }
    
    if (stability >= TOKENS.thresholds.stability_high) {
        milestones.push({ type: 'STABILITY_HIGH', value: stability, color: TOKENS.colors.cyan_bright });
    }
    
    if (P_outcome >= TOKENS.thresholds.p_outcome_high) {
        milestones.push({ type: 'P_OUTCOME_HIGH', value: P_outcome, color: TOKENS.colors.yellow_warning });
    }
    
    if (sigma <= TOKENS.thresholds.sigma_low) {
        milestones.push({ type: 'SIGMA_LOW', value: sigma, color: TOKENS.colors.cyan_primary });
    }
    
    return milestones;
}

/**
 * 변곡점 도달 시 시각 효과 실행
 */
export function triggerMilestoneEffect(milestone, scene, camera) {
    console.log(`[AUTUS] Milestone reached: ${milestone.type} = ${milestone.value}`);
    
    // 화면 플래시 효과
    flashScreen(milestone.color);
    
    // 햅틱 피드백
    triggerHaptic('heavy');
    
    // 파티클 버스트 (선택적)
    // createParticleBurst(scene, camera, milestone.color);
}

/**
 * 화면 플래시 효과
 */
export function flashScreen(color = '#FFFFFF', duration = 200) {
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: ${color};
        opacity: 0.3;
        pointer-events: none;
        z-index: 9999;
        transition: opacity ${duration}ms ease-out;
    `;
    
    document.body.appendChild(flash);
    
    requestAnimationFrame(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), duration);
    });
}

// ================================================================
// HAPTIC FEEDBACK
// ================================================================

/**
 * 햅틱 피드백 트리거
 * @param {string} type - 'light' | 'medium' | 'heavy'
 */
export function triggerHaptic(type = 'medium') {
    // Vibration API (모바일)
    if ('vibrate' in navigator) {
        const patterns = {
            light: [10],
            medium: [50],
            heavy: [100, 30, 100]
        };
        navigator.vibrate(patterns[type] || patterns.medium);
    }
    
    // Gamepad Haptic (지원 기기)
    if ('getGamepads' in navigator) {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
            if (gp?.vibrationActuator) {
                const intensities = { light: 0.3, medium: 0.6, heavy: 1.0 };
                gp.vibrationActuator.playEffect('dual-rumble', {
                    duration: 100,
                    strongMagnitude: intensities[type] || 0.6,
                    weakMagnitude: intensities[type] * 0.5 || 0.3
                });
            }
        }
    }
}

// ================================================================
// PAGE TRANSITION
// ================================================================

/**
 * 페이지 전환 트랜지션
 * @param {number} fromPage - 현재 페이지 (1, 2, 3)
 * @param {number} toPage - 목표 페이지 (1, 2, 3)
 * @param {THREE.Camera} camera - Three.js 카메라
 */
export function pageTransition(fromPage, toPage, camera, onComplete) {
    const duration = TOKENS.motion.transition_ms;
    const startTime = performance.now();
    
    // 페이지별 카메라 위치
    const cameraPositions = {
        1: { x: 0, y: 0, z: 5 },    // Goal: 정면
        2: { x: 0, y: 2, z: 6 },    // Route: 약간 위
        3: { x: 0, y: -1, z: 4.5 }  // Mandala: 약간 가까이
    };
    
    const from = cameraPositions[fromPage] || cameraPositions[1];
    const to = cameraPositions[toPage] || cameraPositions[1];
    
    function animate() {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        
        // Easing: ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        
        camera.position.x = from.x + (to.x - from.x) * eased;
        camera.position.y = from.y + (to.y - from.y) * eased;
        camera.position.z = from.z + (to.z - from.z) * eased;
        
        if (t < 1) {
            requestAnimationFrame(animate);
        } else if (onComplete) {
            onComplete();
        }
    }
    
    animate();
    
    // 가벼운 햅틱
    triggerHaptic('light');
}

// ================================================================
// CORE PULSE ANIMATION (Stability 연동)
// ================================================================

/**
 * 코어 맥동 파라미터 계산
 * @param {number} stability - 안정성 [0, 1]
 * @returns {{ hz: number, amplitude: number }}
 */
export function calcCorePulse(stability) {
    // 안정성 높을수록:
    // - Hz 낮아짐 (느린 맥동)
    // - 진폭 일정화 (균일한 크기)
    
    const hz = TOKENS.motion.pulse_hz_max - 
               (TOKENS.motion.pulse_hz_max - TOKENS.motion.pulse_hz_min) * stability;
    
    // 진폭: 불안정할수록 불규칙
    const baseAmplitude = 0.1;
    const variance = (1 - stability) * 0.15;
    const amplitude = baseAmplitude + (Math.random() - 0.5) * variance * 2;
    
    return { hz, amplitude: Math.max(0.05, amplitude) };
}

/**
 * 코어 글로우 강도 계산
 * @param {number} density - 밀도 [0, 1]
 * @returns {number} - 글로우 강도 [0.2, 1.0]
 */
export function calcCoreGlow(density) {
    // density ↑ → 밝기 ↑
    return 0.2 + density * 0.8;
}

// ================================================================
// JITTER (Sigma 연동)
// ================================================================

/**
 * 시그마 기반 지터 계산
 * @param {number} sigma - 엔트로피 [0, 1]
 * @param {number} seed - 결정론적 시드
 * @returns {{ x: number, y: number }}
 */
export function calcJitter(sigma, seed = 0) {
    // 결정론적 난수 (Mulberry32)
    function mulberry32(a) {
        return function() {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    
    const rand = mulberry32(seed);
    
    // sigma 높을수록 지터 큼
    const maxJitter = sigma * 0.1;
    
    return {
        x: (rand() - 0.5) * maxJitter * 2,
        y: (rand() - 0.5) * maxJitter * 2
    };
}

// ================================================================
// EXPORT
// ================================================================

export default {
    TOKENS,
    getLineStyle,
    updateLineMaterial,
    checkMilestone,
    triggerMilestoneEffect,
    flashScreen,
    triggerHaptic,
    pageTransition,
    calcCorePulse,
    calcCoreGlow,
    calcJitter
};





