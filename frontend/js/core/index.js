/**
 * AUTUS Three.js Core — Module Index
 * 
 * A-1 ~ A-5 모듈 및 통합 렌더러 내보내기
 * 
 * Version: 1.1.0 (Enhanced Graphics)
 */

// ================================================================
// A-1: CoreLayer
// ================================================================
export { CoreLayer } from './CoreLayer.js';

// ================================================================
// A-2: GraphLayer
// ================================================================
export { GraphLayer } from './GraphLayer.js';

// ================================================================
// A-3: FlowLayer
// ================================================================
export { FlowLayer } from './FlowLayer.js';

// ================================================================
// A-4: StateUniform
// ================================================================
export {
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
} from './StateUniform.js';

// ================================================================
// A-5: DeterminismSampler
// ================================================================
export {
    TIME_BUCKET_MS,
    sha256,
    simpleHash,
    getTimeBucket,
    generateSeed,
    DeterministicRandom,
    DeterministicNoise,
    ParticleSampler,
    ReplayVerifier
} from './DeterminismSampler.js';

// ================================================================
// NEW: Visual Feedback (Milestones, Haptic)
// ================================================================
export { default as VisualFeedback } from './VisualFeedback.js';

// ================================================================
// NEW: Post Processing (Bloom, FXAA, Vignette)
// ================================================================
export { PostProcessing, loadPostProcessingModules } from './PostProcessing.js';

// ================================================================
// NEW: Page Transition (Smooth camera animation)
// ================================================================
export { PageTransition, triggerTransitionHaptic, playTransitionSound } from './PageTransition.js';

// ================================================================
// NEW: Particle Trail (Advanced effects)
// ================================================================
export { ParticleTrail } from './ParticleTrail.js';

// ================================================================
// 통합 렌더러
// ================================================================
export { AutusRenderer } from './AutusRenderer.js';

// ================================================================
// Default export (Lazy loading)
// ================================================================
export default {
    CoreLayer: () => import('./CoreLayer.js'),
    GraphLayer: () => import('./GraphLayer.js'),
    FlowLayer: () => import('./FlowLayer.js'),
    StateUniform: () => import('./StateUniform.js'),
    DeterminismSampler: () => import('./DeterminismSampler.js'),
    VisualFeedback: () => import('./VisualFeedback.js'),
    PostProcessing: () => import('./PostProcessing.js'),
    PageTransition: () => import('./PageTransition.js'),
    ParticleTrail: () => import('./ParticleTrail.js'),
    AutusRenderer: () => import('./AutusRenderer.js')
};





