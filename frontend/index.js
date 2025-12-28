// ================================================================
// AUTUS FRONTEND — UNIFIED MODULE INDEX
// ================================================================
// 
// 단일 진입점: 모든 모듈을 이 파일에서 import
// 
// 구조:
//   /core       - 핵심 물리 엔진 (PhysicsKernel, DataBridge)
//   /engine     - 비즈니스 로직 (ValueInference, PatternExtractor)
//   /rendering  - Three.js 렌더링 (CoreLayer, GraphLayer)
//   /api        - 백엔드 통신 (AutusEngine)
//   /packs      - 자동화 팩 (automation, education, professional)
// 
// ================================================================

// ================================================================
// CORE MODULES (Physics Engine)
// ================================================================
export { PhysicsKernel, ElonPhysicsEngine } from './core/PhysicsKernel.js';
export { AccessRequester } from './core/AccessRequester.js';
export { DataBridge } from './core/DataBridge.js';
export { ClientProcessor } from './core/ClientProcessor.js';
export { PackManager } from './core/PackManager.js';
export { LearningEngine } from './core/LearningEngine.js';
export { AutusCore } from './core/index.js';

// ================================================================
// ALL-SENSES INTELLIGENCE CORE (NEW)
// ================================================================
export { 
    CorePhysicsKernel, 
    InertiaLaw, 
    ReactionLaw, 
    ConservationLaw,
    SYSTEM_CONSTANTS 
} from './core/CorePhysicsKernel.js';

export { EightSensors } from './core/sensors/EightSensors.js';

export { 
    ResourceManager,
    CPUScheduler,
    MemoryManager,
    WebGPUAccelerator,
    RESOURCE_LIMITS
} from './core/ResourceManager.js';

export { 
    SecurePurge,
    LocalStorageHandler,
    IndexedDBHandler,
    PURGE_CONFIG
} from './core/security/SecurePurge.js';

export { 
    ProactiveSuggestion,
    SuggestionTemplates,
    SUGGESTION_CONFIG
} from './core/ProactiveSuggestion.js';

export { 
    AllSensesCore,
    deployAllSenses,
    getSystemStatus,
    shutdownSystem
} from './core/AllSensesCore.js';

// ================================================================
// ENGINE MODULES (Business Logic)
// ================================================================
export { ValueInferenceEngine } from './engine/ValueInferenceEngine.js';
export { PatternExtractor } from './engine/PatternExtractor.js';
export { RawToVectorEngine, Converter } from './engine/converter.js';
export { PhysicsMap, ElonEngine } from './engine/PhysicsMap.js';
export { 
    AdvancedPhysics, 
    AUTUS_Physics, 
    MemberEnergyAnalyzer, 
    EnergyScanner 
} from './engine/AdvancedPhysics.js';
export { AutusSimulator, ORBIT_TYPES } from './engine/AutusSimulator.js';
export { AutusEngine as BusinessEngine } from './engine/index.js';

// ================================================================
// API MODULES (Backend Communication)
// ================================================================
export { AutusEngine as APIEngine } from './js/api/AutusEngine.js';

// ================================================================
// RENDERING MODULES (Three.js)
// → js/core 폴더의 모듈 re-export
// ================================================================
export * from './js/core/index.js';

// ================================================================
// AUTOMATION PACKS
// ================================================================
export * as AutomationPack from './packs/automation/index.js';
export * as EducationPack from './packs/education/index.js';
export * as ProfessionalPack from './packs/professional/index.js';

// ================================================================
// UNIFIED SYSTEM
// ================================================================
export { AutusSystem, initAutusSystem } from './autus-system.js';

// ================================================================
// QUICK START HELPERS
// ================================================================

/**
 * Initialize complete AUTUS system
 */
export async function initAutus(config = {}) {
    const { AutusSystem, initAutusSystem } = await import('./autus-system.js');
    await initAutusSystem();
    return AutusSystem.init(config);
}

/**
 * Get physics kernel instance
 */
export function getPhysicsKernel() {
    return import('./core/PhysicsKernel.js').then(m => m.PhysicsKernel);
}

/**
 * Load automation pack
 */
export async function loadPack(packName) {
    const { PackManager } = await import('./core/PackManager.js');
    return PackManager.loadPack(packName);
}

/**
 * Initialize Three.js renderer
 */
export async function initRenderer(container, state) {
    const { AutusRenderer } = await import('./js/core/AutusRenderer.js');
    const renderer = new AutusRenderer(container);
    if (state) renderer.updateState(state);
    return renderer;
}

// ================================================================
// MODULE REGISTRY
// ================================================================

export const ModuleRegistry = {
    core: [
        'PhysicsKernel',
        'AccessRequester', 
        'DataBridge',
        'ClientProcessor',
        'PackManager',
        'LearningEngine',
        // All-Senses Intelligence
        'CorePhysicsKernel',
        'EightSensors',
        'ResourceManager',
        'SecurePurge',
        'ProactiveSuggestion',
        'AllSensesCore'
    ],
    engine: [
        'ValueInferenceEngine',
        'PatternExtractor',
        'RawToVectorEngine',
        'PhysicsMap',
        'AdvancedPhysics',
        'AUTUS_Physics',
        'MemberEnergyAnalyzer',
        'EnergyScanner',
        'AutusSimulator'
    ],
    rendering: [
        'CoreLayer',
        'GraphLayer',
        'FlowLayer',
        'StateUniform',
        'DeterminismSampler',
        'AutusRenderer',
        'PostProcessing',
        'ParticleTrail'
    ],
    packs: [
        'automation',
        'education',
        'professional'
    ],
    sensors: [
        'ScreenSensor',
        'VoiceSensor',
        'VideoSensor',
        'LogSensor',
        'LinkSensor',
        'BioSensor',
        'ContextSensor',
        'IntuitionSensor'
    ]
};

// ================================================================
// DEFAULT EXPORT
// ================================================================

export default {
    initAutus,
    getPhysicsKernel,
    loadPack,
    initRenderer,
    ModuleRegistry
};




