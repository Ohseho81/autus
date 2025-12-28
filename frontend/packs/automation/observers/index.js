// ================================================================
// AUTUS 3-WAY MULTI-OBSERVER INDEX
// Unified observer system for automation pattern detection
// ================================================================

// Individual Observers
export { WebObserver } from './WebObserver.js';
export { DataObserver } from './DataObserver.js';
export { CommObserver } from './CommObserver.js';

// Pattern Matcher - Cross-reference engine
export { PatternMatcher } from './PatternMatcher.js';

// ================================================================
// UNIFIED OBSERVER MANAGER
// ================================================================

export const ObserverManager = {
    observers: {},
    isRunning: false,
    analysisInterval: null,
    
    /**
     * Initialize all observers
     */
    init: async function() {
        console.log('[ObserverManager] Initializing 3-Way Multi-Observer...');
        
        const { WebObserver } = await import('./WebObserver.js');
        const { DataObserver } = await import('./DataObserver.js');
        const { CommObserver } = await import('./CommObserver.js');
        const { PatternMatcher } = await import('./PatternMatcher.js');
        
        this.observers = {
            web: WebObserver,
            data: DataObserver,
            comm: CommObserver,
            matcher: PatternMatcher
        };
        
        console.log('[ObserverManager] Observers initialized');
        
        return Object.keys(this.observers);
    },
    
    /**
     * Start all observers
     */
    startAll: function() {
        if (this.isRunning) {
            console.warn('[ObserverManager] Already running');
            return;
        }
        
        this.observers.web?.start();
        this.observers.data?.start();
        this.observers.comm?.start();
        
        this.isRunning = true;
        
        // Auto-analyze every 5 minutes
        this.analysisInterval = setInterval(() => {
            this.analyze();
        }, 5 * 60 * 1000);
        
        console.log('[ObserverManager] All observers started');
    },
    
    /**
     * Stop all observers
     */
    stopAll: function() {
        this.observers.web?.stop();
        this.observers.data?.stop();
        this.observers.comm?.stop();
        
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }
        
        this.isRunning = false;
        console.log('[ObserverManager] All observers stopped');
    },
    
    /**
     * Run pattern analysis
     */
    analyze: function() {
        if (!this.observers.matcher) {
            console.warn('[ObserverManager] PatternMatcher not initialized');
            return null;
        }
        
        console.log('[ObserverManager] Running pattern analysis...');
        return this.observers.matcher.analyze();
    },
    
    /**
     * Get all automation opportunities
     */
    getOpportunities: function() {
        const results = this.analyze();
        return results?.high_roi_opportunities || [];
    },
    
    /**
     * Get top opportunity for toast display
     */
    getTopOpportunity: function() {
        return this.observers.matcher?.getTopOpportunity();
    },
    
    /**
     * Get individual observer stats
     */
    getStats: function() {
        return {
            web: {
                active: this.observers.web?.isActive || false,
                url_clusters: this.observers.web?.urlClusters?.size || 0,
                click_patterns: this.observers.web?.clickPatterns?.length || 0
            },
            data: {
                active: this.observers.data?.isActive || false,
                clipboard_patterns: this.observers.data?.clipboardPatterns?.length || 0,
                file_patterns: this.observers.data?.filePatterns?.length || 0
            },
            comm: {
                active: this.observers.comm?.isActive || false,
                message_patterns: this.observers.comm?.messagePatterns?.length || 0,
                templates: this.observers.comm?.responseTemplates?.length || 0
            },
            matcher: {
                patterns: this.observers.matcher?.combinedPatterns?.length || 0,
                high_roi: this.observers.matcher?.highROIOpportunities?.length || 0
            }
        };
    },
    
    /**
     * Get total potential time savings
     */
    getTotalTimeSavings: function() {
        const results = this.analyze();
        return results?.total_potential_savings || { weekly_minutes: 0, monthly_hours: 0 };
    }
};

// ================================================================
// QUICK START HELPER
// ================================================================

export async function startObservation() {
    await ObserverManager.init();
    ObserverManager.startAll();
    return ObserverManager;
}

export async function stopObservation() {
    ObserverManager.stopAll();
}

export async function getAutomationInsights() {
    if (!ObserverManager.isRunning) {
        await startObservation();
        // Wait a bit for initial data
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return ObserverManager.analyze();
}

export default ObserverManager;




