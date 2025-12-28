// ================================================================
// CLIENT PROCESSOR
// Heavy processing runs on User's device
// Server receives ONLY the resulting Physics Map update
// ================================================================

import { PhysicsKernel } from './PhysicsKernel.js';
import { AccessRequester } from './AccessRequester.js';
import { DataBridge } from './DataBridge.js';

export const ClientProcessor = {
    // Processing queue
    queue: [],
    isProcessing: false,
    
    // Worker pool (if Web Workers available)
    workers: [],
    maxWorkers: navigator.hardwareConcurrency || 4,
    
    // Results cache (physics only)
    resultsCache: new Map(),
    
    // ================================================================
    // MAIN PROCESSING PIPELINE
    // All heavy lifting happens here, on the client
    // ================================================================
    
    /**
     * Process raw data into physics update
     * @param {string} sourceId - Data source identifier
     * @param {string} dataType - Type of data (calendar, financial, etc.)
     * @returns {Promise<Object>} Physics map update (to be sent to server)
     */
    process: async function(sourceId, dataType) {
        const jobId = `job_${Date.now()}`;
        
        console.log(`[ClientProcessor] Starting job ${jobId} for ${sourceId}`);
        
        try {
            // Step 1: Get converter for data type
            const converter = AccessRequester.getConverter(dataType);
            
            // Step 2: Request data through bridge (temporary)
            const result = await AccessRequester.requestForCalculation(
                sourceId,
                DataBridge,
                converter
            );
            
            // Step 3: Apply physics calculations
            const physicsUpdate = this.applyPhysicsCalculations(result.attributes);
            
            // Step 4: Create server-ready payload
            const serverPayload = this.createServerPayload(sourceId, physicsUpdate);
            
            console.log(`[ClientProcessor] Job ${jobId} complete`);
            
            return serverPayload;
            
        } catch (error) {
            console.error(`[ClientProcessor] Job ${jobId} failed:`, error);
            throw error;
        }
    },
    
    /**
     * Batch process multiple sources
     * @param {Array} sources - Array of {sourceId, dataType}
     * @returns {Promise<Object>} Combined physics map update
     */
    batchProcess: async function(sources) {
        const results = await Promise.all(
            sources.map(s => this.process(s.sourceId, s.dataType))
        );
        
        // Combine into single physics map
        return this.combinePhysicsUpdates(results);
    },
    
    // ================================================================
    // PHYSICS CALCULATIONS (Heavy Processing)
    // ================================================================
    
    /**
     * Apply physics calculations to attributes
     * This is where heavy computation happens
     */
    applyPhysicsCalculations: function(attributes) {
        const node = {
            mass: attributes.node_mass,
            frictionCoefficient: attributes.friction_coefficient,
            potential: attributes.potential_energy,
            kinetic: attributes.kinetic_energy,
            entropy: attributes.entropy_level,
            stability: attributes.stability_index
        };
        
        // Calculate inertia
        const inertia = PhysicsKernel.calculateInertia(node);
        
        // Calculate energy totals
        const totalEnergy = node.potential + node.kinetic;
        
        // Calculate stability metrics
        const stabilityFactor = 1 / (1 + node.entropy);
        
        // Calculate momentum (if velocity exists)
        const momentum = node.kinetic * Math.sqrt(2 * node.mass);
        
        // Calculate action-reaction potential
        const reactionPotential = PhysicsKernel.getReactionYield(
            node.kinetic,
            stabilityFactor
        );
        
        // Calculate break threshold
        const breakThreshold = PhysicsKernel.calculateInertiaBreak(
            node.mass,
            node.frictionCoefficient
        );
        
        return {
            // Original attributes (validated)
            ...attributes,
            
            // Calculated physics
            _calculated: {
                inertia,
                totalEnergy,
                stabilityFactor,
                momentum,
                reactionPotential,
                breakThreshold,
                
                // Derived metrics
                efficiency: totalEnergy > 0 ? reactionPotential / totalEnergy : 0,
                mobility: breakThreshold > 0 ? 1 / breakThreshold : 1,
                healthScore: stabilityFactor * (1 - attributes.entropy_level)
            },
            
            _processed_at: Date.now(),
            _processed_on: 'client'
        };
    },
    
    // ================================================================
    // PATTERN LEARNING (Heavy Processing - Client Side)
    // ================================================================
    
    /**
     * Learn patterns from historical data
     * All processing happens on client device
     * @param {Array} historicalData - Array of physics snapshots
     * @returns {Object} Learned patterns (physics only)
     */
    learnPatterns: function(historicalData) {
        if (historicalData.length < 5) {
            return { patterns: [], insufficient_data: true };
        }
        
        const patterns = [];
        
        // Pattern 1: Energy trends
        const energyTrend = this.calculateTrend(
            historicalData.map(d => d.potential_energy + d.kinetic_energy)
        );
        
        if (Math.abs(energyTrend.slope) > 0.1) {
            patterns.push({
                type: 'energy_trend',
                direction: energyTrend.slope > 0 ? 'increasing' : 'decreasing',
                magnitude: Math.abs(energyTrend.slope),
                confidence: energyTrend.r_squared
            });
        }
        
        // Pattern 2: Stability oscillations
        const stabilityVar = this.calculateVariance(
            historicalData.map(d => d.stability_index)
        );
        
        if (stabilityVar > 0.05) {
            patterns.push({
                type: 'stability_oscillation',
                variance: stabilityVar,
                suggestion: 'increase_friction'
            });
        }
        
        // Pattern 3: Entropy accumulation
        const entropyTrend = this.calculateTrend(
            historicalData.map(d => d.entropy_level)
        );
        
        if (entropyTrend.slope > 0.05) {
            patterns.push({
                type: 'entropy_accumulation',
                rate: entropyTrend.slope,
                time_to_critical: (1 - historicalData[historicalData.length - 1].entropy_level) / entropyTrend.slope
            });
        }
        
        // Pattern 4: Mass-Energy correlation
        const correlation = this.calculateCorrelation(
            historicalData.map(d => d.node_mass),
            historicalData.map(d => d.potential_energy + d.kinetic_energy)
        );
        
        if (Math.abs(correlation) > 0.7) {
            patterns.push({
                type: 'mass_energy_correlation',
                coefficient: correlation,
                interpretation: correlation > 0 ? 'growth_phase' : 'consolidation_phase'
            });
        }
        
        return {
            patterns,
            sample_size: historicalData.length,
            analyzed_at: Date.now(),
            _processed_on: 'client'
        };
    },
    
    /**
     * Calculate linear trend
     */
    calculateTrend: function(values) {
        const n = values.length;
        if (n < 2) return { slope: 0, intercept: 0, r_squared: 0 };
        
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let denominator = 0;
        
        values.forEach((y, x) => {
            numerator += (x - xMean) * (y - yMean);
            denominator += (x - xMean) * (x - xMean);
        });
        
        const slope = denominator !== 0 ? numerator / denominator : 0;
        const intercept = yMean - slope * xMean;
        
        // Calculate R-squared
        let ssRes = 0;
        let ssTot = 0;
        
        values.forEach((y, x) => {
            const predicted = slope * x + intercept;
            ssRes += (y - predicted) * (y - predicted);
            ssTot += (y - yMean) * (y - yMean);
        });
        
        const r_squared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
        
        return { slope, intercept, r_squared };
    },
    
    /**
     * Calculate variance
     */
    calculateVariance: function(values) {
        const n = values.length;
        if (n < 2) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const squaredDiffs = values.map(v => (v - mean) * (v - mean));
        
        return squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);
    },
    
    /**
     * Calculate correlation coefficient
     */
    calculateCorrelation: function(x, y) {
        const n = x.length;
        if (n !== y.length || n < 2) return 0;
        
        const xMean = x.reduce((a, b) => a + b, 0) / n;
        const yMean = y.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let xDenom = 0;
        let yDenom = 0;
        
        for (let i = 0; i < n; i++) {
            const xDiff = x[i] - xMean;
            const yDiff = y[i] - yMean;
            numerator += xDiff * yDiff;
            xDenom += xDiff * xDiff;
            yDenom += yDiff * yDiff;
        }
        
        const denominator = Math.sqrt(xDenom * yDenom);
        return denominator !== 0 ? numerator / denominator : 0;
    },
    
    // ================================================================
    // SERVER PAYLOAD CREATION
    // Only physics attributes are sent to server
    // ================================================================
    
    /**
     * Create server-ready payload
     * Contains ONLY physics attributes, no raw data
     */
    createServerPayload: function(sourceId, physicsUpdate) {
        return {
            type: 'PHYSICS_MAP_UPDATE',
            source_ref: this.hashSourceId(sourceId), // Hash, not actual ID
            timestamp: Date.now(),
            
            // Core physics attributes
            physics: {
                node_mass: physicsUpdate.node_mass,
                connection_gravity: physicsUpdate.connection_gravity,
                friction_coefficient: physicsUpdate.friction_coefficient,
                potential_energy: physicsUpdate.potential_energy,
                kinetic_energy: physicsUpdate.kinetic_energy,
                entropy_level: physicsUpdate.entropy_level,
                stability_index: physicsUpdate.stability_index,
                influence_radius: physicsUpdate.influence_radius,
                decay_rate: physicsUpdate.decay_rate,
                resonance_frequency: physicsUpdate.resonance_frequency
            },
            
            // Calculated metrics (physics only)
            metrics: physicsUpdate._calculated,
            
            // Metadata
            _processed_on: 'client',
            _data_retained: false,
            _raw_data_sent: false
        };
    },
    
    /**
     * Combine multiple physics updates
     */
    combinePhysicsUpdates: function(updates) {
        return {
            type: 'BATCH_PHYSICS_UPDATE',
            count: updates.length,
            timestamp: Date.now(),
            updates: updates,
            
            // Aggregate metrics
            aggregate: {
                total_energy: updates.reduce((sum, u) => 
                    sum + (u.physics.potential_energy || 0) + (u.physics.kinetic_energy || 0), 0
                ),
                avg_stability: updates.reduce((sum, u) => 
                    sum + (u.physics.stability_index || 0), 0
                ) / updates.length,
                total_mass: updates.reduce((sum, u) => 
                    sum + (u.physics.node_mass || 0), 0
                )
            }
        };
    },
    
    /**
     * Hash source ID for privacy
     */
    hashSourceId: function(sourceId) {
        let hash = 0;
        for (let i = 0; i < sourceId.length; i++) {
            const char = sourceId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `src_${Math.abs(hash).toString(16)}`;
    },
    
    // ================================================================
    // WEB WORKER SUPPORT (For heavy processing)
    // ================================================================
    
    /**
     * Initialize worker pool
     */
    initWorkers: function() {
        if (typeof Worker === 'undefined') {
            console.warn('[ClientProcessor] Web Workers not available');
            return;
        }
        
        // Create worker blob for pattern learning
        const workerCode = `
            self.onmessage = function(e) {
                const { type, data } = e.data;
                
                if (type === 'learn_patterns') {
                    // Heavy pattern learning logic here
                    const result = analyzePatterns(data);
                    self.postMessage({ type: 'result', result });
                }
            };
            
            function analyzePatterns(data) {
                // Pattern analysis implementation
                return { patterns: [], processed: true };
            }
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        for (let i = 0; i < this.maxWorkers; i++) {
            try {
                const worker = new Worker(workerUrl);
                this.workers.push(worker);
            } catch (e) {
                console.warn(`[ClientProcessor] Failed to create worker ${i}`);
            }
        }
        
        console.log(`[ClientProcessor] Initialized ${this.workers.length} workers`);
    },
    
    /**
     * Process in worker
     */
    processInWorker: function(type, data) {
        return new Promise((resolve, reject) => {
            if (this.workers.length === 0) {
                // Fallback to main thread
                if (type === 'learn_patterns') {
                    resolve(this.learnPatterns(data));
                }
                return;
            }
            
            const worker = this.workers[0]; // Simple round-robin could be added
            
            worker.onmessage = (e) => {
                if (e.data.type === 'result') {
                    resolve(e.data.result);
                }
            };
            
            worker.onerror = reject;
            worker.postMessage({ type, data });
        });
    },
    
    // ================================================================
    // CACHE MANAGEMENT
    // ================================================================
    
    /**
     * Cache physics result
     */
    cacheResult: function(key, result) {
        this.resultsCache.set(key, {
            result,
            timestamp: Date.now()
        });
        
        // Limit cache size
        if (this.resultsCache.size > 100) {
            const oldest = this.resultsCache.keys().next().value;
            this.resultsCache.delete(oldest);
        }
    },
    
    /**
     * Get cached result
     */
    getCached: function(key, maxAge = 60000) {
        const cached = this.resultsCache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > maxAge) {
            this.resultsCache.delete(key);
            return null;
        }
        
        return cached.result;
    },
    
    /**
     * Clear cache
     */
    clearCache: function() {
        this.resultsCache.clear();
    }
};

export default ClientProcessor;




