// ================================================================
// AUTUS RENDERING MODULE INDEX
// Three.js based visualization
// ================================================================

// Re-export from js/core (Three.js layers)
export * from '../js/core/index.js';

// Re-export physics visualizer
export { default as PhysicsVisualizer } from '../js/physics-map.js';

// ================================================================
// RENDERING CONFIGURATION
// ================================================================

export const RENDER_CONFIG = {
    // Post-processing
    BLOOM_STRENGTH: 1.5,
    BLOOM_RADIUS: 0.4,
    BLOOM_THRESHOLD: 0.8,
    
    // Colors
    COLORS: {
        CYAN: 0x00f0ff,
        SUCCESS: 0x00ff88,
        WARNING: 0xffaa00,
        DANGER: 0xff3344,
        GOLD: 0xffd700,
        ATTRACTION: 0x00aaff,
        REPULSION: 0xff4466
    },
    
    // Animation
    PARTICLE_COUNT: 100,
    ANIMATION_SPEED: 1.0,
    
    // Quality presets
    QUALITY: {
        LOW: { particles: 50, bloom: false, antiAlias: false },
        MEDIUM: { particles: 100, bloom: true, antiAlias: false },
        HIGH: { particles: 200, bloom: true, antiAlias: true }
    }
};

// ================================================================
// LAYER FACTORY
// ================================================================

/**
 * Create core layer
 */
export async function createCoreLayer(scene, state) {
    const { CoreLayer } = await import('../js/core/CoreLayer.js');
    return new CoreLayer(scene, state);
}

/**
 * Create graph layer
 */
export async function createGraphLayer(scene, state) {
    const { GraphLayer } = await import('../js/core/GraphLayer.js');
    return new GraphLayer(scene, state);
}

/**
 * Create flow layer
 */
export async function createFlowLayer(scene, state) {
    const { FlowLayer } = await import('../js/core/FlowLayer.js');
    return new FlowLayer(scene, state);
}

/**
 * Setup post processing
 */
export async function setupPostProcessing(renderer, scene, camera) {
    const { PostProcessing } = await import('../js/core/PostProcessing.js');
    return new PostProcessing(renderer, scene, camera, RENDER_CONFIG);
}

// ================================================================
// QUICK SETUP
// ================================================================

/**
 * Quick setup for all layers
 */
export async function setupAllLayers(container, state) {
    const { AutusRenderer } = await import('../js/core/AutusRenderer.js');
    
    const renderer = new AutusRenderer(container);
    renderer.updateState(state);
    
    return {
        renderer,
        update: (newState) => renderer.updateState(newState),
        dispose: () => renderer.dispose()
    };
}

export default {
    RENDER_CONFIG,
    createCoreLayer,
    createGraphLayer,
    createFlowLayer,
    setupPostProcessing,
    setupAllLayers
};




