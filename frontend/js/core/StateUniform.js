/**
 * AUTUS StateUniform — A-4
 * State → Uniform 변환 계약
 * 
 * 서버 상태(state_contract)를 Three.js uniform 값으로 변환하는 결정론적 매핑
 */

/**
 * 물리량 범위 상수
 */
export const MEASURE_RANGES = {
    mass: { min: 0, max: 1, default: 0.5 },
    E: { min: 0, max: 1, default: 0.5 },
    energy: { min: 0, max: 1, default: 0.5 },
    volume: { min: 0.01, max: 1, default: 0.5 },
    density: { min: 0, max: 10, default: 1 },
    stability: { min: 0, max: 1, default: 0.5 },
    sigma: { min: 0, max: 1, default: 0.3 },
    pressure: { min: 0, max: 10, default: 1 },
    leak: { min: 0, max: 1, default: 0.1 }
};

/**
 * 시각 매핑 상수
 */
export const VISUAL_MAPPING = {
    // CoreLayer
    core: {
        density_to_brightness: { min: 0.15, max: 0.5 },
        density_to_opacity: { min: 0.25, max: 0.45 },
        stability_to_pulse_hz: { min: 0.6, max: 1.6 },
        sigma_to_jitter_amp: { min: 0, max: 0.1 }
    },
    // GraphLayer
    graph: {
        mass_to_radius: { min: 0.08, max: 0.25 },
        sigma_to_jitter: { min: 0, max: 0.05 },
        weight_to_opacity: { min: 0.1, max: 0.5 }
    },
    // FlowLayer
    flow: {
        energy_to_speed: { min: 0.5, max: 1.5 },
        energy_to_brightness: { min: 0.3, max: 0.7 },
        leak_to_respawn_rate: { min: 0, max: 0.01 }
    }
};

/**
 * 값 클램프 함수
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * 선형 보간 함수
 */
export function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
}

/**
 * 범위 매핑 함수
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
    const t = (value - inMin) / (inMax - inMin);
    return lerp(outMin, outMax, t);
}

/**
 * 상태를 CoreLayer uniform으로 변환
 * @param {Object} state - 서버 상태
 * @returns {Object} CoreLayer uniform 값
 */
export function stateToCoreUniform(state) {
    const measure = state.measure || {};
    const mapping = VISUAL_MAPPING.core;
    
    const density = measure.density ?? MEASURE_RANGES.density.default;
    const stability = measure.stability ?? MEASURE_RANGES.stability.default;
    const sigma = measure.sigma ?? MEASURE_RANGES.sigma.default;
    
    // Density 정규화 (0~10 → 0~1)
    const normalizedDensity = clamp(density / 10, 0, 1);
    
    return {
        brightness: mapRange(
            normalizedDensity, 0, 1,
            mapping.density_to_brightness.min,
            mapping.density_to_brightness.max
        ),
        opacity: mapRange(
            normalizedDensity, 0, 1,
            mapping.density_to_opacity.min,
            mapping.density_to_opacity.max
        ),
        pulseHz: mapRange(
            1 - stability, 0, 1,  // 낮은 stability = 높은 주파수
            mapping.stability_to_pulse_hz.min,
            mapping.stability_to_pulse_hz.max
        ),
        jitterAmp: mapRange(
            sigma, 0, 1,
            mapping.sigma_to_jitter_amp.min,
            mapping.sigma_to_jitter_amp.max
        ),
        // 원본 값도 포함
        density: normalizedDensity,
        stability,
        sigma
    };
}

/**
 * 상태를 GraphLayer uniform으로 변환
 * @param {Object} state - 서버 상태
 * @returns {Object} GraphLayer uniform 값 및 노드/엣지 데이터
 */
export function stateToGraphUniform(state) {
    const graph = state.graph || { nodes: [], edges: [] };
    const mapping = VISUAL_MAPPING.graph;
    
    // 노드 변환
    const nodes = graph.nodes.map(node => ({
        id: node.id,
        type: node.type || 'POTENTIAL',
        radius: mapRange(
            node.mass || 0.5, 0, 1,
            mapping.mass_to_radius.min,
            mapping.mass_to_radius.max
        ),
        jitter: mapRange(
            node.sigma || 0.1, 0, 1,
            mapping.sigma_to_jitter.min,
            mapping.sigma_to_jitter.max
        ),
        // 원본 값
        mass: node.mass || 0.5,
        sigma: node.sigma || 0.1,
        x: node.x,
        y: node.y,
        angle: node.angle,
        radiusPos: node.radius
    }));
    
    // 엣지 변환
    const edges = graph.edges.map(edge => ({
        a: edge.a,
        b: edge.b,
        opacity: mapRange(
            edge.weight || 0.5, 0, 1,
            mapping.weight_to_opacity.min,
            mapping.weight_to_opacity.max
        ),
        // 원본 값
        weight: edge.weight || 0.5
    }));
    
    return { nodes, edges };
}

/**
 * 상태를 FlowLayer uniform으로 변환
 * @param {Object} state - 서버 상태
 * @returns {Object} FlowLayer uniform 값
 */
export function stateToFlowUniform(state) {
    const measure = state.measure || {};
    const mapping = VISUAL_MAPPING.flow;
    
    const energy = measure.E ?? measure.energy ?? MEASURE_RANGES.energy.default;
    const leak = measure.leak ?? MEASURE_RANGES.leak.default;
    
    return {
        speed: mapRange(
            energy, 0, 1,
            mapping.energy_to_speed.min,
            mapping.energy_to_speed.max
        ),
        brightness: mapRange(
            energy, 0, 1,
            mapping.energy_to_brightness.min,
            mapping.energy_to_brightness.max
        ),
        respawnRate: mapRange(
            leak, 0, 1,
            mapping.leak_to_respawn_rate.min,
            mapping.leak_to_respawn_rate.max
        ),
        // 원본 값
        energy,
        leak
    };
}

/**
 * 전체 상태를 렌더 uniform으로 변환
 * @param {Object} state - 서버 상태 (state_contract 형식)
 * @returns {Object} 모든 레이어의 uniform 값
 */
export function stateToUniform(state) {
    return {
        core: stateToCoreUniform(state),
        graph: stateToGraphUniform(state),
        flow: stateToFlowUniform(state),
        ui: {
            mode: state.ui?.mode || 'SIM',
            currentPage: state.ui?.current_page || 1,
            hudVisible: state.ui?.hud_visible || false
        },
        forecast: {
            P_outcome: state.forecast?.P_outcome || 0,
            horizon: state.forecast?.horizon || 'D30',
            trajectory: state.forecast?.trajectory_samples || []
        },
        meta: {
            sessionId: state.session_id,
            stateHash: state.state_hash,
            timestamp: state.t_ms
        }
    };
}

/**
 * Draft 패치를 uniform 델타로 변환
 * @param {Object} patch - Draft 패치
 * @param {number} page - 페이지 번호 (1, 2, 3)
 * @returns {Object} uniform 델타 값
 */
export function patchToUniformDelta(patch, page) {
    const delta = {};
    
    switch (page) {
        case 1:
            if (patch.mass_mod !== undefined) {
                delta.massDelta = patch.mass_mod;
            }
            if (patch.volume_override !== undefined) {
                delta.volumeOverride = patch.volume_override;
            }
            if (patch.horizon !== undefined) {
                delta.horizon = patch.horizon;
            }
            break;
            
        case 2:
            if (patch.sigma_delta !== undefined) {
                delta.sigmaDelta = patch.sigma_delta;
            }
            if (patch.ops !== undefined) {
                delta.ops = patch.ops;
            }
            break;
            
        case 3:
            if (patch.allocations !== undefined) {
                delta.allocations = patch.allocations;
            }
            break;
    }
    
    return delta;
}

/**
 * SIM/LIVE 모드에 따른 스타일 반환
 * @param {string} mode - 'SIM' 또는 'LIVE'
 * @returns {Object} 모드별 스타일 값
 */
export function getModeStyle(mode) {
    const isSim = mode === 'SIM';
    
    return {
        lineStyle: isSim ? 'dashed' : 'solid',
        lineOpacity: isSim ? 0.4 : 1.0,
        dashPattern: isSim ? [6, 4] : [],
        glowIntensity: isSim ? 0.5 : 1.0,
        commitButtonActive: !isSim
    };
}

export default {
    MEASURE_RANGES,
    VISUAL_MAPPING,
    clamp,
    lerp,
    mapRange,
    stateToCoreUniform,
    stateToGraphUniform,
    stateToFlowUniform,
    stateToUniform,
    patchToUniformDelta,
    getModeStyle
};





