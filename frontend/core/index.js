// ================================================================
// AUTUS CORE MODULE INDEX
// Access-Reference Architecture + All-Senses Intelligence
// ================================================================

// Holy Trinity Physics Engine
export { PhysicsKernel, ElonPhysicsEngine } from './PhysicsKernel.js';

// Access-Reference Model
export { AccessRequester } from './AccessRequester.js';

// Persistent Data Bridge
export { DataBridge } from './DataBridge.js';

// Client-Side Processing
export { ClientProcessor } from './ClientProcessor.js';

// Pack Management
export { PackManager } from './PackManager.js';

// Learning Engine
export { LearningEngine } from './LearningEngine.js';

// ================================================================
// ALL-SENSES INTELLIGENCE CORE (NEW)
// ================================================================

// Core Physics Kernel (3-Law Logic)
export { 
    CorePhysicsKernel, 
    InertiaLaw, 
    ReactionLaw, 
    ConservationLaw,
    SYSTEM_CONSTANTS 
} from './CorePhysicsKernel.js';

// Eight Sensors System
export { 
    EightSensors,
    ScreenSensor,
    VoiceSensor,
    VideoSensor,
    LogSensor,
    LinkSensor,
    BioSensor,
    ContextSensor,
    IntuitionSensor
} from './sensors/EightSensors.js';

// Resource Manager (Bezos Mode)
export { 
    ResourceManager,
    CPUScheduler,
    MemoryManager,
    WebGPUAccelerator,
    PerformanceMonitor,
    RESOURCE_LIMITS
} from './ResourceManager.js';

// Security Protocol (Zero-Server)
export { 
    SecurePurge,
    MemoryWiper,
    LocalStorageHandler,
    IndexedDBHandler,
    PURGE_CONFIG
} from './security/SecurePurge.js';

// Proactive Suggestion Engine
export { 
    ProactiveSuggestion,
    SuggestionGenerator,
    SuggestionTemplates,
    PopupManager,
    SUGGESTION_CONFIG
} from './ProactiveSuggestion.js';

// All-Senses Core (Unified System)
export { 
    AllSensesCore,
    deployAllSenses,
    getSystemStatus,
    shutdownSystem
} from './AllSensesCore.js';

// ================================================================
// ARCHITECTURE SUMMARY
// ================================================================
/*

┌─────────────────────────────────────────────────────────────────┐
│                    ACCESS-REFERENCE MODEL                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   USER'S DEVICE                          │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │   │
│  │  │  DataBridge   │──│AccessRequester│──│ClientProcess│  │   │
│  │  │  (Persistent) │  │ (Temporary)   │  │ (Heavy CPU) │  │   │
│  │  └───────────────┘  └───────────────┘  └─────────────┘  │   │
│  │         │                   │                 │          │   │
│  │         ▼                   ▼                 ▼          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │              RAW DATA (Local Only)               │    │   │
│  │  │    ✓ Calendar    ✓ Finance    ✓ Relationships   │    │   │
│  │  │    (Never sent to server, only converted)        │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                           │                              │   │
│  │                           ▼                              │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │           PHYSICS ATTRIBUTES ONLY               │    │   │
│  │  │    node_mass, connection_gravity, entropy...    │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────│───────────────────────────┘   │
│                                 │                               │
│                                 ▼ (Physics Only)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    AUTUS SERVER                           │  │
│  │  ┌────────────────┐  ┌─────────────────────────────────┐ │  │
│  │  │ Bridge Metadata│  │      PhysicsKernel              │ │  │
│  │  │   (DB Record)  │  │  ┌─────────────────────────────┐│ │  │
│  │  │ - bridge_id    │  │  │ LAW 1: Inertia              ││ │  │
│  │  │ - storage_type │  │  │ LAW 2: Action-Reaction      ││ │  │
│  │  │ - access_path  │  │  │ LAW 3: Energy Conservation  ││ │  │
│  │  │ - NO RAW DATA  │  │  └─────────────────────────────┘│ │  │
│  │  └────────────────┘  └─────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  KEY PRINCIPLE: Server NEVER sees raw data, only physics       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

*/

// ================================================================
// UNIFIED API
// ================================================================

export const AutusCore = {
    // Initialize core systems
    init: async function(config = {}) {
        console.log('[AutusCore] Initializing Access-Reference Model...');
        
        // All-Senses Intelligence 배포 여부
        let allSenses = null;
        if (config.enableAllSenses !== false) {
            const { AllSensesCore } = await import('./AllSensesCore.js');
            await AllSensesCore.init(config.allSensesConfig);
            allSenses = AllSensesCore;
        }
        
        return {
            physics: PhysicsKernel,
            accessor: AccessRequester,
            bridge: DataBridge,
            processor: ClientProcessor,
            packs: PackManager,
            learning: LearningEngine,
            allSenses,
            
            version: '3.0.0',
            architecture: 'all-senses-intelligence',
            dataRetention: false
        };
    },
    
    // Process data through full pipeline
    processData: async function(sourceId, dataType) {
        return await ClientProcessor.process(sourceId, dataType);
    },
    
    // Establish data bridge
    connectBridge: async function(config) {
        return await DataBridge.establish(config);
    },
    
    // Get system health
    getHealth: function(nodes) {
        return PhysicsKernel.getSystemHealth(nodes);
    },
    
    // Deploy All-Senses Intelligence
    deployAllSenses: async function(config) {
        const { deployAllSenses } = await import('./AllSensesCore.js');
        return deployAllSenses(config);
    },
    
    // Get comprehensive status
    getFullStatus: function() {
        const { getSystemStatus } = require('./AllSensesCore.js');
        return getSystemStatus();
    }
};

export default AutusCore;




