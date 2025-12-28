// ================================================================
// AUTUS UNIFIED SYSTEM MODULE
// Single entry point for all AUTUS functionality
// Import this in HTML to get everything
// ================================================================

// ================================================================
// MODULE IMPORTS (Dynamic for browser compatibility)
// ================================================================

let AutusCore, AutusEngine, AutomationManager, PackManager;

/**
 * Initialize all AUTUS systems
 */
export async function initAutusSystem() {
    console.log('[AUTUS] Initializing Unified System...');
    
    try {
        // Core modules
        const coreModule = await import('./core/index.js');
        AutusCore = coreModule.AutusCore;
        
        // Engine modules
        const engineModule = await import('./engine/index.js');
        AutusEngine = engineModule.AutusEngine;
        
        // Automation pack
        const automationModule = await import('./packs/automation/index.js');
        AutomationManager = automationModule.AutomationManager;
        
        // Pack manager
        const packModule = await import('./core/PackManager.js');
        PackManager = packModule.PackManager;
        
        console.log('[AUTUS] All modules loaded');
        
    } catch (e) {
        console.warn('[AUTUS] Module loading failed, using inline fallbacks:', e);
    }
    
    return AutusSystem;
}

// ================================================================
// AUTUS UNIFIED SYSTEM
// ================================================================

export const AutusSystem = {
    // System state
    initialized: false,
    running: false,
    
    // Components
    core: null,
    engine: null,
    automation: null,
    
    // Physics state
    physicsMap: null,
    
    // Callbacks
    onOpportunityFound: null,
    onTimeSaved: null,
    onPhysicsUpdate: null,
    
    /**
     * Initialize the complete system
     */
    init: async function(config = {}) {
        console.log('[AutusSystem] Starting initialization...');
        
        // Initialize core
        if (AutusCore) {
            this.core = await AutusCore.init();
        }
        
        // Initialize engine
        if (AutusEngine) {
            this.engine = await AutusEngine.init();
            this.physicsMap = this.engine.physicsMap;
        }
        
        // Initialize automation
        if (AutomationManager) {
            await AutomationManager.init();
            this.automation = AutomationManager;
        }
        
        // Setup callbacks
        if (config.onOpportunityFound) {
            this.onOpportunityFound = config.onOpportunityFound;
        }
        if (config.onTimeSaved) {
            this.onTimeSaved = config.onTimeSaved;
        }
        if (config.onPhysicsUpdate) {
            this.onPhysicsUpdate = config.onPhysicsUpdate;
        }
        
        this.initialized = true;
        console.log('[AutusSystem] Initialization complete');
        
        return this;
    },
    
    /**
     * Start observation and automation
     */
    start: function() {
        if (!this.initialized) {
            console.warn('[AutusSystem] Not initialized');
            return;
        }
        
        if (this.automation) {
            this.automation.startObservation();
        }
        
        this.running = true;
        
        // Start periodic analysis
        this._analysisInterval = setInterval(() => {
            this.analyzePatterns();
        }, 60000); // Every minute
        
        console.log('[AutusSystem] Started');
    },
    
    /**
     * Stop all systems
     */
    stop: function() {
        if (this.automation) {
            this.automation.stopObservation();
        }
        
        if (this._analysisInterval) {
            clearInterval(this._analysisInterval);
        }
        
        this.running = false;
        console.log('[AutusSystem] Stopped');
    },
    
    // ================================================================
    // PHYSICS OPERATIONS
    // ================================================================
    
    /**
     * Set user goal
     */
    setGoal: function(goalConfig) {
        if (this.physicsMap) {
            return this.physicsMap.setGoal(goalConfig);
        }
        return null;
    },
    
    /**
     * Process raw data through physics pipeline
     */
    processData: async function(rawData) {
        if (!this.engine) return null;
        
        const result = await this.engine.processRawData(rawData, this.physicsMap?.goalNode);
        
        if (this.onPhysicsUpdate) {
            this.onPhysicsUpdate(result);
        }
        
        return result;
    },
    
    /**
     * Get current physics state
     */
    getPhysicsState: function() {
        if (!this.physicsMap) return null;
        return this.physicsMap.exportState();
    },
    
    /**
     * Calculate success probability
     */
    getSuccessProbability: function() {
        if (!this.physicsMap) return 0.5;
        
        const user = this.physicsMap.getUserNode();
        if (!user) return 0.5;
        
        const prediction = this.physicsMap.predictActionChange(user);
        return prediction?.success_probability || 0.5;
    },
    
    // ================================================================
    // AUTOMATION OPERATIONS
    // ================================================================
    
    /**
     * Analyze patterns and find opportunities
     */
    analyzePatterns: function() {
        if (!this.automation) return null;
        
        const results = this.automation.analyzePatterns();
        
        // Check for high-ROI opportunities
        const top = this.automation.getTopOpportunity();
        if (top && this.onOpportunityFound) {
            this.onOpportunityFound(top);
        }
        
        return results;
    },
    
    /**
     * Get total time saved
     */
    getTotalTimeSaved: function() {
        if (!this.automation) return { total_minutes: 0 };
        return this.automation.getTotalTimeSaved();
    },
    
    /**
     * Process file for report automation
     */
    processReport: async function(file) {
        if (!this.automation?.agents?.ReportAgent) {
            console.warn('[AutusSystem] ReportAgent not available');
            return null;
        }
        
        const result = await this.automation.processReport(file);
        
        if (result?.success && this.onTimeSaved) {
            this.onTimeSaved(result.time_saved);
        }
        
        return result;
    },
    
    // ================================================================
    // NETWORK VALUE
    // ================================================================
    
    /**
     * Get n² network value
     */
    getNetworkValue: function() {
        if (this.engine?.valueInference) {
            return this.engine.valueInference.calculateNetworkValue();
        }
        return { user_count: 0, base_value: 0, adjusted_value: 0 };
    },
    
    /**
     * Get value insights
     */
    getValueInsights: function() {
        if (this.engine?.valueInference) {
            return this.engine.valueInference.getInsights();
        }
        return null;
    },
    
    // ================================================================
    // DATA FOR SERVER
    // ================================================================
    
    /**
     * Get server-ready payload (physics only, no PII)
     */
    getServerPayload: function() {
        if (this.engine?.patternExtractor) {
            return this.engine.patternExtractor.generateServerPayload();
        }
        return null;
    }
};

// ================================================================
// INLINE FALLBACKS (for non-module environments)
// ================================================================

export const InlinePhysicsKernel = {
    SYSTEM_EFFICIENCY: 0.85,
    GRAVITY_CONSTANT: 9.8,
    
    calculateInertia: function(node) {
        return (node.mass || 1) * (node.friction || 0.5);
    },
    
    applyReaction: function(force) {
        return {
            money_output: force * this.SYSTEM_EFFICIENCY,
            energy_consumed: force * (1 - this.SYSTEM_EFFICIENCY)
        };
    },
    
    trackTotalEnergy: function(nodes) {
        return nodes.reduce((sum, n) => 
            sum + (n.potential || 0) + (n.kinetic || 0), 0);
    }
};

export const InlinePatternMatcher = {
    patterns: [],
    
    addPattern: function(pattern) {
        this.patterns.push({
            ...pattern,
            id: 'pat_' + Date.now(),
            timestamp: Date.now()
        });
    },
    
    findOpportunities: function() {
        return this.patterns
            .filter(p => p.frequency > 3)
            .map(p => ({
                pattern_id: p.id,
                type: p.type || 'general',
                potential_time_save: (p.duration || 5) * (p.frequency || 1),
                confidence: Math.min(p.frequency / 10, 0.95)
            }));
    },
    
    getTopOpportunity: function() {
        const ops = this.findOpportunities();
        if (ops.length === 0) return null;
        
        return ops.sort((a, b) => b.potential_time_save - a.potential_time_save)[0];
    }
};

// ================================================================
// GLOBAL EXPOSURE (for HTML script access)
// ================================================================

if (typeof window !== 'undefined') {
    window.AutusSystem = AutusSystem;
    window.initAutusSystem = initAutusSystem;
    window.InlinePhysicsKernel = InlinePhysicsKernel;
    window.InlinePatternMatcher = InlinePatternMatcher;
}

export default AutusSystem;




